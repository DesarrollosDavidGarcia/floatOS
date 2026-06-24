import { NotFoundException } from '@nestjs/common';

/**
 * Ejecuta una búsqueda que puede devolver `null` (típicamente un
 * `findUnique`/`findFirst` de Prisma) y, si no encuentra el registro, lanza
 * `NotFoundException` con el mensaje indicado. Devuelve el resultado ya tipado
 * como no-null para que el llamador no tenga que volver a comprobarlo.
 *
 * @example
 * const cliente = await obtenerOFallar(
 *   () => prisma.cliente.findUnique({ where: { id } }),
 *   `Cliente con id ${id} no encontrado`,
 * );
 */
export async function obtenerOFallar<T>(
  buscar: () => Promise<T | null>,
  mensaje: string,
): Promise<T> {
  const resultado = await buscar();
  if (resultado === null || resultado === undefined) {
    throw new NotFoundException(mensaje);
  }
  return resultado;
}
