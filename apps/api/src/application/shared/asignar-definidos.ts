/**
 * Construye un objeto `data` para un `update` parcial copiando, desde `input`,
 * solo las claves cuyo valor sea distinto de `undefined`. Reemplaza el patrón
 * repetido `if (input.x !== undefined) data.x = input.x`.
 *
 * Si se pasa `claves`, solo se consideran esas; si se omite, se toman todas las
 * claves propias de `input`. Los valores `null` SÍ se copian (borrado explícito);
 * únicamente se descarta `undefined`.
 *
 * @example
 * const data = asignarDefinidos<Prisma.ClienteUpdateInput>(input, [
 *   'razonSocial',
 *   'rfc',
 * ]);
 */
export function asignarDefinidos<T = Record<string, unknown>>(
  input: object,
  claves?: readonly string[],
): T {
  const fuente = input as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  const llaves = claves ?? Object.keys(fuente);
  for (const clave of llaves) {
    const valor = fuente[clave];
    if (valor !== undefined) {
      data[clave] = valor;
    }
  }
  return data as T;
}
