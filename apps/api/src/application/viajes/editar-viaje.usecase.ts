import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { simularCarga } from '../../domain/viaje/motor-calculo';
import { MotorViajeService } from './motor-viaje.service';
import {
  derivarResumen,
  itemsDeEscalas,
  nestedEscalasCreate,
} from './viaje-escalas.helper';
import { EditarViajeInput, RELACIONES_DETALLE } from './viajes.types';

/**
 * Caso de uso: editar un viaje (no el estado ni la asignación). Si vienen
 * `escalas`, reemplazan el itinerario completo (borrar + recrear) y se recalcula
 * el resumen y el snapshot del motor.
 */
@Injectable()
export class EditarViajeUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly motor: MotorViajeService,
  ) {}

  // El itinerario solo puede reescribirse antes de iniciar el viaje.
  private static readonly ESTADOS_EDITABLES: readonly string[] = [
    'ASIGNADO',
    'ACEPTADO',
  ];

  async execute(id: string, input: EditarViajeInput) {
    const existe = await this.prisma.viaje.findUnique({
      where: { id },
      select: { id: true, estado: true },
    });
    if (!existe) {
      throw new NotFoundException(`Viaje con id ${id} no encontrado`);
    }

    const fechaProgramada =
      input.fechaProgramada !== undefined
        ? new Date(input.fechaProgramada)
        : undefined;

    if (input.escalas &&
      !EditarViajeUseCase.ESTADOS_EDITABLES.includes(existe.estado)) {
      throw new ConflictException(
        `No se puede modificar el itinerario de un viaje en estado ${existe.estado}`,
      );
    }

    if (!input.escalas) {
      return this.prisma.viaje.update({
        where: { id },
        data: { fechaProgramada },
        include: RELACIONES_DETALLE,
      });
    }

    if (input.escalas.length < 2) {
      throw new BadRequestException(
        'El itinerario requiere al menos origen y destino',
      );
    }

    const sim = simularCarga(itemsDeEscalas(input.escalas));
    const { km } = await this.motor.distanciaKm(input.escalas);
    const resumen = derivarResumen(input.escalas, sim);

    const data: Prisma.ViajeUpdateInput = {
      ...resumen,
      distanciaEstimadaKm: km,
      fechaProgramada,
      escalas: { create: nestedEscalasCreate(input.escalas) },
    };

    // Reemplazo atómico del itinerario: borrar escalas (cascada → cargas) y recrear.
    return this.prisma.$transaction(async (tx) => {
      await tx.escalaViaje.deleteMany({ where: { viajeId: id } });
      return tx.viaje.update({
        where: { id },
        data,
        include: RELACIONES_DETALLE,
      });
    });
  }
}
