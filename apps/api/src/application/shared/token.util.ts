import { randomBytes } from 'node:crypto';

/**
 * Genera un token aleatorio criptográficamente seguro y URL-safe.
 *
 * Se usa para el `trackingToken` del link público de seguimiento: a diferencia
 * de cuid(), el resultado no es predecible, por lo que el enlace no puede
 * adivinarse para filtrar la ubicación en vivo ni los datos del viaje.
 *
 * @param bytes Entropía en bytes (por defecto 24 → 32 caracteres base64url).
 */
export function generarTokenSeguro(bytes = 24): string {
  return randomBytes(bytes).toString('base64url');
}
