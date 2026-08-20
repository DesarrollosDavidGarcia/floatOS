import { ConflictException } from '@nestjs/common';
import { EstadoViaje } from '@flotaos/shared-types';
import { Prisma } from '@prisma/client';

/**
 * Cliente Prisma: sirve tanto el global (`PrismaService`) como el de una
 * transacción interactiva. Los checks de disponibilidad se ejecutan en ambos:
 * fuera de la transacción como validación temprana (respuesta rápida) y dentro
 * de ella como verificación autoritativa, ya con los locks tomados.
 */
export type ClientePrisma = Prisma.TransactionClient;

/**
 * Estados en los que un viaje sigue abierto y por tanto OCUPA a su conductor
 * (no aparece como "Disponible" ni puede recibir otro viaje). Los cerrados
 * (ENTREGADO, FACTURADO, CANCELADO) lo liberan.
 */
export const ESTADOS_VIAJE_ABIERTOS: EstadoViaje[] = [
  EstadoViaje.ASIGNADO,
  EstadoViaje.ACEPTADO,
  EstadoViaje.EN_CAMINO_ORIGEN,
  EstadoViaje.CARGANDO,
  EstadoViaje.EN_TRANSITO,
  EstadoViaje.VARADO,
];

/** Etiqueta legible de un estado para mensajes de error. */
function etiquetaEstado(estado: string): string {
  return estado.replace(/_/g, ' ').toLowerCase();
}

/**
 * Toma un lock de fila (`SELECT … FOR UPDATE`) sobre **caja y conductor**, los
 * dos recursos que tienen regla de exclusividad (`asegurar*Disponible`). Sin
 * esto hay TOCTOU: dos requests concurrentes leen "libre" a la vez, ambas pasan
 * el check y ambas reservan el mismo recurso. Con el lock, la segunda espera a
 * que la primera confirme y al re-verificar ya ve el viaje recién creado → 409.
 *
 * **La unidad (tractor) queda fuera a propósito**: hoy no existe ninguna regla
 * de disponibilidad para ella — un mismo tractor puede acabar en dos viajes
 * abiertos, y no solo por concurrencia: tampoco se comprueba en el camino
 * secuencial. Bloquearla aquí no arreglaría nada mientras no haya un
 * `asegurarUnidadDisponible`; si algún día se añade, este es su sitio (y el
 * orden de locks de abajo debe incluirla).
 *
 * El orden de los locks (viaje → caja → conductor) es fijo **a propósito**: dos
 * transacciones que toman los mismos locks en el mismo orden no se
 * interbloquean. Cualquier caso de uso nuevo que bloquee estos recursos debe
 * respetar el mismo orden.
 *
 * Los nombres de tabla del SQL crudo son los **físicos** (`@@map` de
 * `schema.prisma`: `cajas`, `conductores`, `viajes`), no los del modelo Prisma.
 * Si se renombra un `@@map` hay que tocarlos aquí a mano: el compilador no los
 * ve y los tests mockean `$queryRaw`, así que el fallo saldría en producción
 * como P2010.
 */
export async function bloquearRecursosAsignacion(
  tx: ClientePrisma,
  recursos: { cajaId?: string | null; conductorId?: string | null },
): Promise<void> {
  if (recursos.cajaId) {
    await tx.$queryRaw`SELECT id FROM "cajas" WHERE id = ${recursos.cajaId} FOR UPDATE`;
  }
  if (recursos.conductorId) {
    await tx.$queryRaw`SELECT id FROM "conductores" WHERE id = ${recursos.conductorId} FOR UPDATE`;
  }
}

/**
 * Bloquea la fila del viaje dentro de la transacción. Serializa dos
 * reasignaciones simultáneas del mismo viaje, para que la segunda vea el estado
 * ya confirmado por la primera (y no audite una asignación previa obsoleta).
 * Devuelve `false` si el viaje ya no existe.
 */
export async function bloquearViaje(
  tx: ClientePrisma,
  viajeId: string,
): Promise<boolean> {
  const filas = await tx.$queryRaw<
    { id: string }[]
  >`SELECT id FROM "viajes" WHERE id = ${viajeId} FOR UPDATE`;
  return filas.length > 0;
}

/**
 * Lanza 409 si el conductor ya tiene un viaje abierto. `viajeIdActual`
 * excluye al propio viaje (reasignar al mismo conductor no es conflicto).
 */
export async function asegurarConductorDisponible(
  prisma: ClientePrisma,
  conductorId: string,
  viajeIdActual?: string,
): Promise<void> {
  const ocupadoEn = await prisma.viaje.findFirst({
    where: {
      conductorId,
      estado: { in: ESTADOS_VIAJE_ABIERTOS },
      ...(viajeIdActual ? { NOT: { id: viajeIdActual } } : {}),
    },
    select: { folio: true, estado: true },
    orderBy: { createdAt: 'desc' },
  });
  if (ocupadoEn) {
    throw new ConflictException(
      `El conductor ya tiene el viaje #${ocupadoEn.folio} en curso (${etiquetaEstado(ocupadoEn.estado)})`,
    );
  }
}

/**
 * Lanza 409 si la caja ya está enganchada a otro viaje abierto. La caja física
 * no se clona: no puede ir en dos viajes a la vez. `viajeIdActual` excluye al
 * propio viaje (reasignar la misma caja al mismo viaje no es conflicto).
 */
export async function asegurarCajaDisponible(
  prisma: ClientePrisma,
  cajaId: string,
  viajeIdActual?: string,
): Promise<void> {
  const ocupadaEn = await prisma.viaje.findFirst({
    where: {
      cajaId,
      estado: { in: ESTADOS_VIAJE_ABIERTOS },
      ...(viajeIdActual ? { NOT: { id: viajeIdActual } } : {}),
    },
    select: { folio: true, estado: true },
    orderBy: { createdAt: 'desc' },
  });
  if (ocupadaEn) {
    throw new ConflictException(
      `La caja ya está en el viaje #${ocupadaEn.folio} en curso (${etiquetaEstado(ocupadaEn.estado)})`,
    );
  }
}
