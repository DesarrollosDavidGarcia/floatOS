/**
 * Utilidades geoespaciales para geocercas (cálculo en aplicación, sin PostGIS en el MVP).
 */

/** Radio de la geocerca de llegada en metros. */
export const RADIO_GEOCERCA_METROS = 300;

const RADIO_TIERRA_METROS = 6_371_000;

function aRadianes(grados: number): number {
  return (grados * Math.PI) / 180;
}

/**
 * Distancia en metros entre dos coordenadas (lat/lng) usando la fórmula de Haversine.
 */
export function distanciaHaversineMetros(
  latA: number,
  lngA: number,
  latB: number,
  lngB: number,
): number {
  const dLat = aRadianes(latB - latA);
  const dLng = aRadianes(lngB - lngA);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(aRadianes(latA)) *
      Math.cos(aRadianes(latB)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return RADIO_TIERRA_METROS * c;
}

/** Indica si el punto está dentro del radio de geocerca respecto a un centro. */
export function dentroDeGeocerca(
  lat: number,
  lng: number,
  centroLat: number,
  centroLng: number,
  radioMetros: number = RADIO_GEOCERCA_METROS,
): boolean {
  return distanciaHaversineMetros(lat, lng, centroLat, centroLng) <= radioMetros;
}
