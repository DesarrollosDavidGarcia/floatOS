import { ConflictException } from '@nestjs/common';
import { EstadoViaje } from '@flotaos/shared-types';
import { PrismaService } from '../../infrastructure/database/prisma.service';

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
 * Lanza 409 si el conductor ya tiene un viaje abierto. `viajeIdActual`
 * excluye al propio viaje (reasignar al mismo conductor no es conflicto).
 */
export async function asegurarConductorDisponible(
  prisma: PrismaService,
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
