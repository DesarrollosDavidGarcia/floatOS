/**
 * Cliente de geocodificación con la API de Google Maps (servicio `Geocoder` del
 * Maps JavaScript API, autorizado por la key del navegador). Acotado a México.
 * Conserva las mismas firmas que la versión anterior (Nominatim) para no tocar a
 * los consumidores. Las funciones se llaman en el navegador, una vez que el
 * <APIProvider> cargó el bootstrap de Google Maps.
 */

export interface LugarGeocodificado {
  direccion: string;
  lat: number;
  lng: number;
}

/** Campos de una dirección capturados por separado (búsqueda estructurada). */
export interface DireccionEstructurada {
  calle?: string;
  numero?: string;
  colonia?: string;
  cp?: string;
  municipio?: string;
  ciudad?: string;
  estado?: string;
  pais?: string;
}

const LIMITE = 6;

/** Carga perezosa del Geocoder (una sola instancia, tras cargar la librería). */
let geocoderPromise: Promise<google.maps.Geocoder> | null = null;
async function obtenerGeocoder(): Promise<google.maps.Geocoder | null> {
  if (typeof google === 'undefined' || !google.maps?.importLibrary) return null;
  if (!geocoderPromise) {
    geocoderPromise = (async () => {
      await google.maps.importLibrary('geocoding');
      return new google.maps.Geocoder();
    })();
  }
  return geocoderPromise;
}

/** Mapea un resultado de Google a LugarGeocodificado. */
function aLugar(r: google.maps.GeocoderResult): LugarGeocodificado {
  return {
    direccion: r.formatted_address,
    lat: r.geometry.location.lat(),
    lng: r.geometry.location.lng(),
  };
}

/**
 * Caché en memoria de geocoding (ahorra requests facturables de duplicados en la
 * sesión). Los términos de Google permiten cacheo temporal de resultados; este
 * vive solo mientras la pestaña está abierta. Acotado por tamaño (FIFO simple).
 */
const CACHE_MAX = 200;
const cache = new Map<string, LugarGeocodificado[]>();

/**
 * Clave de caché estable para una petición. Las coordenadas (reverse) se redondean
 * a ~11 m, así arrastrar el pin unos metros reusa la misma entrada en vez de
 * pedir otra geocodificación.
 */
function claveCache(request: google.maps.GeocoderRequest): string {
  if (request.location) {
    const loc = request.location as google.maps.LatLngLiteral;
    return `r:${loc.lat.toFixed(4)},${loc.lng.toFixed(4)}`;
  }
  const cr = request.componentRestrictions
    ? JSON.stringify(request.componentRestrictions)
    : '';
  return `a:${(request.address ?? '').trim().toLowerCase()}|${cr}`;
}

function guardarEnCache(clave: string, valor: LugarGeocodificado[]): void {
  if (cache.size >= CACHE_MAX) {
    // Evicción FIFO: descarta la entrada más antigua.
    const primera = cache.keys().next().value;
    if (primera !== undefined) cache.delete(primera);
  }
  cache.set(clave, valor);
}

/**
 * Ejecuta una petición al Geocoder y devuelve los resultados mapeados. Cachea por
 * petición (dedup de llamadas facturables). Tolera el error de "sin resultados"
 * (devuelve []) y respeta un `signal` opcional (Google no permite abortar la
 * llamada, así que se descartan los resultados si ya se abortó al resolver).
 */
async function pedir(
  request: google.maps.GeocoderRequest,
  signal?: AbortSignal,
): Promise<LugarGeocodificado[]> {
  const clave = claveCache(request);
  const cacheado = cache.get(clave);
  if (cacheado) return cacheado;

  const geocoder = await obtenerGeocoder();
  if (!geocoder) return [];
  try {
    const { results } = await geocoder.geocode({ region: 'mx', ...request });
    if (signal?.aborted) return [];
    const lugares = results.slice(0, LIMITE).map(aLugar);
    guardarEnCache(clave, lugares);
    return lugares;
  } catch (e) {
    // ZERO_RESULTS es normal (sin coincidencias). Otros estados suelen ser
    // configuración de la key (Geocoding API deshabilitada, restricción de
    // referrer o billing sin activar): los exponemos para diagnóstico.
    const code = (e as { code?: string } | null)?.code;
    if (code !== 'ZERO_RESULTS') {
      // eslint-disable-next-line no-console
      console.warn('[geocoding] el Geocoder de Google falló:', code ?? e);
    }
    // Se cachea vacío para no reintentar la misma consulta fallida.
    guardarEnCache(clave, []);
    return [];
  }
}

/** Busca direcciones por texto libre (sesgado a México). */
export async function buscarDirecciones(
  q: string,
  signal?: AbortSignal,
): Promise<LugarGeocodificado[]> {
  const query = q.trim();
  if (query.length < 3) return [];
  return pedir(
    { address: query, componentRestrictions: { country: 'MX' } },
    signal,
  );
}

/**
 * Búsqueda por dirección estructurada. Arma una dirección de texto a partir de
 * los campos y la geocodifica restringida a México. Si la dirección exacta no da
 * resultados, reintenta con una versión más laxa (sin número/calle) para caer
 * cerca y que el usuario afine arrastrando el pin.
 */
export async function buscarDireccionEstructurada(
  d: DireccionEstructurada,
  signal?: AbortSignal,
): Promise<LugarGeocodificado[]> {
  const calleNum = [d.calle?.trim(), d.numero?.trim()].filter(Boolean).join(' ');
  const localidad = d.ciudad?.trim() || d.municipio?.trim();
  // Solo se restringe por país. El CP va dentro del texto de la dirección; NO se
  // pasa como componentRestrictions.postalCode porque esa restricción sesga al
  // geocoder hacia el CENTRO del código postal y arruina la precisión a nivel
  // calle/número (por eso la búsqueda por campos separados caía peor que la
  // combinada en un solo input).
  const restricciones: google.maps.GeocoderComponentRestrictions = { country: 'MX' };

  const completa = [calleNum, d.colonia?.trim(), d.cp?.trim(), localidad, d.estado?.trim()]
    .filter(Boolean)
    .join(', ');
  if (completa) {
    const exactos = await pedir(
      { address: completa, componentRestrictions: restricciones },
      signal,
    );
    if (exactos.length > 0) return exactos;
  }

  // Reintento laxo: colonia/CP + localidad + estado (sin calle/número).
  const laxa = [d.colonia?.trim(), d.cp?.trim(), localidad, d.estado?.trim()]
    .filter(Boolean)
    .join(', ');
  if (laxa && laxa !== completa) {
    return pedir({ address: laxa, componentRestrictions: restricciones }, signal);
  }
  return [];
}

/** Geocodificación inversa: de coordenadas a una dirección legible. */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<string | null> {
  const r = await pedir({ location: { lat, lng } }, signal);
  return r[0]?.direccion ?? null;
}
