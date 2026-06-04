import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { EditarViajeInput, RELACIONES_RESUMEN } from './viajes.types';

/**
 * Caso de uso: editar datos generales del viaje (no el estado ni la asignación
 * de unidad/conductor).
 */
@Injectable()
export class EditarViajeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string, input: EditarViajeInput) {
    const data: Prisma.ViajeUpdateInput = {
      origenDireccion: input.origenDireccion,
      origenLat: input.origenLat,
      origenLng: input.origenLng,
      destinoDireccion: input.destinoDireccion,
      destinoLat: input.destinoLat,
      destinoLng: input.destinoLng,
      tipoCarga: input.tipoCarga,
      descripcionCarga: input.descripcionCarga,
      pesoKg: input.pesoKg,
      dimensiones: input.dimensiones,
      fechaProgramada:
        input.fechaProgramada !== undefined
          ? new Date(input.fechaProgramada)
          : undefined,
    };

    try {
      return await this.prisma.viaje.update({
        where: { id },
        data,
        include: RELACIONES_RESUMEN,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Viaje con id ${id} no encontrado`);
      }
      throw error;
    }
  }
}
