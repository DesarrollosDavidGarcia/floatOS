import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EstadoViaje } from '@flotaos/shared-types';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { mensajeTransicionInvalida } from '../../domain/viaje/transiciones-viaje';
import { TrackingGateway } from '../../presentation/ws/tracking/tracking.gateway';
import { CambiarEstadoInput, RELACIONES_RESUMEN } from './viajes.types';

/**
 * Caso de uso: cambiar el estado de un viaje validando la transición contra
 * TRANSICIONES_VIAJE. Registra HistorialEstadoViaje, aplica efectos de fechas
 * y reemite el cambio de estado a la sala de tiempo real del viaje.
 */
@Injectable()
export class CambiarEstadoViajeUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tracking: TrackingGateway,
  ) {}

  /**
   * @param conductorId si se provee (acción de un conductor), el viaje debe
   *   pertenecerle; en caso contrario se lanza ForbiddenException.
   */
  async execute(
    id: string,
    input: CambiarEstadoInput,
    registradoPor: string,
    conductorId?: string,
  ) {
    const viaje = await this.prisma.viaje.findUnique({
      where: { id },
      select: {
        id: true,
        estado: true,
        conductorId: true,
        fechaInicio: true,
        fechaEntrega: true,
      },
    });
    if (!viaje) {
      throw new NotFoundException(`Viaje con id ${id} no encontrado`);
    }

    // El conductor solo puede avanzar el estado de SUS viajes.
    if (conductorId && viaje.conductorId !== conductorId) {
      throw new ForbiddenException(
        'No tiene permiso para cambiar el estado de este viaje',
      );
    }

    const estadoAnterior = viaje.estado as EstadoViaje;
    const estadoNuevo = input.estado;

    const error = mensajeTransicionInvalida(estadoAnterior, estadoNuevo);
    if (error) {
      throw new BadRequestException(error);
    }

    const ahora = new Date();
    const data: Prisma.ViajeUpdateInput = {
      estado: estadoNuevo,
      historial: {
        create: {
          estadoAnterior,
          estadoNuevo,
          nota: input.nota,
          registradoPor,
        },
      },
    };

    // Efectos de fecha según el nuevo estado.
    if (estadoNuevo === EstadoViaje.EN_CAMINO_ORIGEN && !viaje.fechaInicio) {
      data.fechaInicio = ahora;
    }
    if (estadoNuevo === EstadoViaje.ENTREGADO && !viaje.fechaEntrega) {
      data.fechaEntrega = ahora;
    }

    // Update condicional al estado leído: si otra petición concurrente ya cambió
    // el estado, el WHERE no matchea, Prisma lanza P2025 y lo traducimos a 409.
    // Garantiza que solo una transición concurrente gane (sin doble historial).
    let actualizado;
    try {
      actualizado = await this.prisma.viaje.update({
        where: { id, estado: estadoAnterior },
        data,
        include: RELACIONES_RESUMEN,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new ConflictException(
          'El estado del viaje cambió mientras se procesaba la petición; reintente.',
        );
      }
      throw e;
    }

    // Reemite el cambio de estado a la sala de tiempo real del viaje.
    this.tracking.emitirCambioEstado(id, {
      viajeId: id,
      estadoAnterior,
      estadoNuevo,
      nota: input.nota,
      registradoPor,
    });

    return actualizado;
  }
}
