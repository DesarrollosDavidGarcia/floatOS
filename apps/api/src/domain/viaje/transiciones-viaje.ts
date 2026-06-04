import { EstadoViaje, TRANSICIONES_VIAJE } from '@flotaos/shared-types';

/**
 * Lógica de dominio (TS puro) para validar el ciclo de vida de un viaje.
 * Se apoya en TRANSICIONES_VIAJE de '@flotaos/shared-types'.
 */

/** Indica si se permite pasar de `actual` a `siguiente`. */
export function esTransicionValida(
  actual: EstadoViaje,
  siguiente: EstadoViaje,
): boolean {
  const permitidos = TRANSICIONES_VIAJE[actual] ?? [];
  return permitidos.includes(siguiente);
}

/** Devuelve los estados a los que se puede transicionar desde `actual`. */
export function transicionesPermitidas(actual: EstadoViaje): EstadoViaje[] {
  return TRANSICIONES_VIAJE[actual] ?? [];
}

/**
 * Valida la transición y, si es inválida, devuelve un mensaje claro en español.
 * Devuelve null cuando la transición es válida.
 */
export function mensajeTransicionInvalida(
  actual: EstadoViaje,
  siguiente: EstadoViaje,
): string | null {
  if (actual === siguiente) {
    return `El viaje ya se encuentra en estado ${actual}`;
  }
  if (esTransicionValida(actual, siguiente)) {
    return null;
  }
  const permitidos = transicionesPermitidas(actual);
  const destinos =
    permitidos.length > 0
      ? permitidos.join(', ')
      : 'ninguno (estado terminal)';
  return `Transición de estado no permitida: ${actual} → ${siguiente}. Desde ${actual} solo se permite: ${destinos}`;
}
