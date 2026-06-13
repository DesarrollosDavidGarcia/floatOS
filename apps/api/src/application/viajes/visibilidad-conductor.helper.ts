import { EstadoCotizacion, Prisma } from '@prisma/client';
import { EstadoViaje } from '@flotaos/shared-types';
import { PrismaService } from '../../infrastructure/database/prisma.service';

/**
 * Regla de negocio: un viaje cuya cotización no ha sido aceptada por el
 * cliente no debe llegar al conductor.
 *
 * - Aplica solo mientras el viaje sigue en ASIGNADO (el conductor aún no lo
 *   acepta): un viaje ya en curso nunca se oculta, aunque la cotización se
 *   reabra después — no desaparecer operaciones en marcha con GPS activo.
 * - Los viajes SIN cotización no se ven afectados (cotizar es opcional).
 * - "No aceptada" cubre BORRADOR, ENVIADA y RECHAZADA: existe al menos una
 *   cotización y ninguna está ACEPTADA.
 */
export const FILTRO_VISIBLE_PARA_CONDUCTOR: Prisma.ViajeWhereInput = {
  NOT: {
    AND: [
      { estado: EstadoViaje.ASIGNADO },
      { cotizaciones: { some: {} } },
      { cotizaciones: { none: { estado: EstadoCotizacion.ACEPTADA } } },
    ],
  },
};

/**
 * True si el viaje tiene cotizaciones y ninguna fue aceptada (la condición
 * que lo oculta al conductor mientras está en ASIGNADO).
 */
export async function cotizacionSinAceptar(
  prisma: PrismaService,
  viajeId: string,
): Promise<boolean> {
  const porEstado = await prisma.cotizacion.groupBy({
    by: ['estado'],
    where: { viajeId },
    _count: true,
  });
  if (porEstado.length === 0) return false;
  return !porEstado.some((g) => g.estado === EstadoCotizacion.ACEPTADA);
}
