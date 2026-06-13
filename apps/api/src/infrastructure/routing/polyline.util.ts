import type { PuntoLatLng } from './route-provider';

/** Decimales para pintar la ruta (6 ≈ 0.1 m); distinto de la clave de caché. */
export const DECIMALES_GEOMETRIA = 6;

/** Tolerancia de simplificación en grados (~3 m). */
export const TOLERANCIA_SIMPLIFICACION = 0.00003;

/** Redondea un punto a `decimales`. */
export function redondearPunto(
  [lat, lng]: PuntoLatLng,
  decimales = DECIMALES_GEOMETRIA,
): PuntoLatLng {
  const f = 10 ** decimales;
  return [Math.round(lat * f) / f, Math.round(lng * f) / f];
}

/** Distancia perpendicular punto→segmento en el plano lat/lng (aprox. suficiente). */
function distanciaASegmento(p: PuntoLatLng, a: PuntoLatLng, b: PuntoLatLng): number {
  const [py, px] = p;
  const [ay, ax] = a;
  const [by, bx] = b;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Simplifica una polilínea con Ramer–Douglas–Peucker (tolerancia en grados).
 * Reduce drásticamente los puntos de una ruta densa (~2600 → cientos) sin cambio
 * visual perceptible, abaratando storage y payload.
 */
export function simplificarPolilinea(
  pts: PuntoLatLng[],
  tolerancia = TOLERANCIA_SIMPLIFICACION,
): PuntoLatLng[] {
  if (pts.length <= 2) return pts;

  const keep = new Array<boolean>(pts.length).fill(false);
  keep[0] = true;
  keep[pts.length - 1] = true;

  // Pila explícita (evita recursión profunda en rutas muy densas).
  const stack: Array<[number, number]> = [[0, pts.length - 1]];
  while (stack.length) {
    const [lo, hi] = stack.pop() as [number, number];
    let maxD = 0;
    let idx = -1;
    for (let i = lo + 1; i < hi; i++) {
      const d = distanciaASegmento(pts[i], pts[lo], pts[hi]);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > tolerancia && idx !== -1) {
      keep[idx] = true;
      stack.push([lo, idx], [idx, hi]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

/** Simplifica y redondea una polilínea en un solo paso (para persistir/servir). */
export function normalizarGeometria(pts: PuntoLatLng[]): PuntoLatLng[] {
  return simplificarPolilinea(pts).map((p) => redondearPunto(p));
}
