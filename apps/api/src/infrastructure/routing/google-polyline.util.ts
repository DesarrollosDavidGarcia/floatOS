import type { PuntoLatLng } from './route-provider';

/**
 * Decodifica una *encoded polyline* de Google (algoritmo de Google) a una lista
 * de pares [lat, lng]. La Routes API devuelve la geometría así (no como array de
 * puntos como TomTom). Tras decodificar, el llamador la pasa por
 * `normalizarGeometria` (simplifica + redondea) igual que el resto de rutas.
 *
 * Algoritmo: cada coordenada se codifica como delta respecto a la anterior, en
 * incrementos de 1e-5 grados, "zigzag"-encoded en grupos de 5 bits (chunks ASCII
 * desplazados +63). Ver developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
export function decodificarPolilinea(encoded: string): PuntoLatLng[] {
  const puntos: PuntoLatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    lat += siguienteDelta();
    lng += siguienteDelta();
    puntos.push([lat / 1e5, lng / 1e5]);
  }
  return puntos;

  /** Lee un valor zigzag de longitud variable a partir de `index`. */
  function siguienteDelta(): number {
    let resultado = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      resultado |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    // Bit menos significativo = signo (zigzag): impar → negativo.
    return resultado & 1 ? ~(resultado >> 1) : resultado >> 1;
  }
}
