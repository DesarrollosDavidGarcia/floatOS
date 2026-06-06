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

/** Busca direcciones por texto (máx. 6 resultados, sesgado a México). */
export async function buscarDirecciones(
  q: string,
  signal?: AbortSignal,
): Promise<LugarGeocodificado[]> {
  const query = q.trim();
  if (query.length < 3) return [];
  const url =
    `${BASE}/search?format=jsonv2&limit=6&addressdetails=0` +
    `&accept-language=es&countrycodes=mx&q=${encodeURIComponent(query)}`;
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
