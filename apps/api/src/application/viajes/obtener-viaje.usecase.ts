import { Injectable, NotFoundException } from '@nestjs/common';
import { EstadoViaje } from '@flotaos/shared-types';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RELACIONES_DETALLE } from './viajes.types';
import { cotizacionSinAceptar } from './visibilidad-conductor.helper';

/** Caso de uso: obtener el detalle de un viaje con su historial de estados. */
@Injectable()
export class ObtenerViajeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Devuelve el detalle del viaje. Si se pasa `conductorId`, el viaje debe
   * pertenecer a ese conductor; de lo contrario se responde NotFound (no se
   * revela la existencia del viaje a un conductor ajeno).
   */
  async execute(id: string, conductorId?: string) {
    const viaje = await this.prisma.viaje.findUnique({
      where: { id },
      include: {
        ...RELACIONES_DETALLE,
        historial: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!viaje || (conductorId && viaje.conductorId !== conductorId)) {
      throw new NotFoundException(`Viaje con id ${id} no encontrado`);
    }

    // Mismo criterio que el listado del conductor: un viaje aún no aceptado
    // por él (ASIGNADO) con cotización sin aceptar no existe para la app.
    if (
      conductorId &&
      viaje.estado === EstadoViaje.ASIGNADO &&
      (await cotizacionSinAceptar(this.prisma, id))
    ) {
      throw new NotFoundException(`Viaje con id ${id} no encontrado`);
    }

    // El trackingToken es el secreto del link público: solo el admin debe verlo.
    if (conductorId) {
      const { trackingToken: _omit, ...sinToken } = viaje;
      return sinToken;
    }

    return viaje;
  }

  /**
   * Devuelve solo el historial de estados de un viaje (ordenado desc). Si se
   * pasa `conductorId`, el viaje debe pertenecerle (mismo criterio que `execute`).
   */
  async historial(id: string, conductorId?: string) {
    const viaje = await this.prisma.viaje.findUnique({
      where: { id },
      select: { id: true, conductorId: true },
    });
    if (!viaje || (conductorId && viaje.conductorId !== conductorId)) {
      throw new NotFoundException(`Viaje con id ${id} no encontrado`);
    }

    return this.prisma.historialEstadoViaje.findMany({
      where: { viajeId: id },
      orderBy: { createdAt: 'desc' },
    });
  }
}
