/**
 * Cliente ligero de geocodificación con Nominatim (OpenStreetMap). Uso acotado a
 * México. IMPORTANTE (política de uso de Nominatim): llamar con debounce, no en
 * ráfaga, y mantener la atribución de OSM visible (el TileLayer del mapa la
 * muestra). Para producción de alto volumen conviene un proxy propio con caché.
 */
const BASE = 'https://nominatim.openstreetmap.org';

export interface LugarGeocodificado {
  direccion: string;
  lat: number;
  lng: number;
}

/** GET a Nominatim /search y mapea la respuesta a LugarGeocodificado[]. */
async function pedir(
  url: string,
  signal?: AbortSignal,
): Promise<LugarGeocodificado[]> {
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
  }>;
  return data.map((d) => ({
    direccion: d.display_name,
    lat: Number(d.lat),
    lng: Number(d.lon),
  }));
}

/** Busca direcciones por texto (máx. 6 resultados, sesgado a México). */
export async function buscarDirecciones(
  q: string,
  signal?: AbortSignal,
): Promise<LugarGeocodificado[]> {
  const query = q.trim();
  if (query.length < 3) return [];
  return pedir(
    `${BASE}/search?format=jsonv2&limit=6&addressdetails=0&accept-language=es&countrycodes=mx&q=${encodeURIComponent(query)}`,
    signal,
  );
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

/**
 * Búsqueda por dirección estructurada con relajación progresiva. La dirección
 * exacta (con número de casa) muchas veces NO está en OSM para México, así que
 * exigir que todo coincida devuelve 0 resultados. En su lugar:
 *  1. Intenta la búsqueda estructurada (parámetros oficiales, precisa).
 *  2. Si no hay resultados, prueba una cascada de texto libre de más específico
 *     a más general y devuelve el PRIMER nivel con resultados (calle → colonia →
 *     CP → ciudad). Así el usuario cae cerca y afina arrastrando el pin.
 * No incluye la colonia en `street` (Nominatim no tiene ese campo y
 * sobre-restringe). País por defecto: México.
 */
export async function buscarDireccionEstructurada(
  d: DireccionEstructurada,
  signal?: AbortSignal,
): Promise<LugarGeocodificado[]> {
  const numero = d.numero?.trim();
  const calle = d.calle?.trim();
  const calleNum = [numero, calle].filter(Boolean).join(' ');
  const colonia = d.colonia?.trim();
  const cp = d.cp?.trim();
  const ciudad = d.ciudad?.trim();
  const municipio = d.municipio?.trim();
  const localidad = ciudad || municipio; // suelen coincidir en MX
  const estado = d.estado?.trim();
  const pais = d.pais?.trim() || 'México';

  // 1) Estructurada (precisa).
  const params = new URLSearchParams({
    format: 'jsonv2',
    limit: '6',
    addressdetails: '0',
    'accept-language': 'es',
    country: pais,
  });
  if (calleNum) params.set('street', calleNum);
  if (localidad) params.set('city', localidad);
  if (municipio && municipio !== ciudad) params.set('county', municipio);
  if (estado) params.set('state', estado);
  if (cp) params.set('postalcode', cp);
  const estructurados = await pedir(`${BASE}/search?${params.toString()}`, signal);
  if (estructurados.length > 0) return estructurados;

  // 2) Cascada de texto libre, de más específico a más general. Acumula
  // candidatos de varios niveles (deduplicados por coordenadas) para ofrecer
  // alternativas cuando la dirección exacta no está en OSM: p. ej. la calle, la
  // colonia, el centroide del CP y la ciudad. Tope de peticiones por la política
  // de uso de Nominatim.
  const niveles: (string | undefined)[][] = [
    [calleNum, colonia, cp, municipio, ciudad, estado, pais],
    [calleNum, colonia, localidad, estado, pais],
    [calle, localidad, estado, pais], // calle sin número (suele existir aunque el número no)
    [colonia, localidad, estado, pais],
    [cp, estado, pais], // centroide del código postal
    [localidad, estado, pais], // último recurso: la ciudad
  ];

  const MAX_PETICIONES = 4;
  const acumulado: LugarGeocodificado[] = [];
  const consultasVistas = new Set<string>();
  const coordsVistas = new Set<string>();
  let peticiones = 0;

  for (const nivel of niveles) {
    if (peticiones >= MAX_PETICIONES || acumulado.length >= 6) break;
    const q = nivel
      .map((s) => s?.trim())
      .filter(Boolean)
      .join(', ');
    if (!q || consultasVistas.has(q)) continue;
    consultasVistas.add(q);
    peticiones++;
    const r = await pedir(
      `${BASE}/search?format=jsonv2&limit=6&accept-language=es&countrycodes=mx&q=${encodeURIComponent(q)}`,
      signal,
    );
    for (const lugar of r) {
      const clave = `${lugar.lat.toFixed(4)},${lugar.lng.toFixed(4)}`;
      if (coordsVistas.has(clave)) continue;
      coordsVistas.add(clave);
      acumulado.push(lugar);
    }
  }
  return acumulado.slice(0, 6);
}

/** Geocodificación inversa: de coordenadas a una dirección legible. */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<string | null> {
  const url =
    `${BASE}/reverse?format=jsonv2&accept-language=es&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const data = (await res.json()) as { display_name?: string };
  return data.display_name ?? null;
}
