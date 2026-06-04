import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AsignarViajeInput, RELACIONES_RESUMEN } from './viajes.types';

/** Caso de uso: asignar o reasignar unidad y/o conductor a un viaje. */
@Injectable()
export class AsignarViajeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string, input: AsignarViajeInput) {
    if (input.unidadId === undefined && input.conductorId === undefined) {
      throw new BadRequestException(
        'Debe indicar al menos unidadId o conductorId',
      );
    }

    // Validaciones de existencia independientes en paralelo.
    const [unidad, conductor] = await Promise.all([
      input.unidadId !== undefined
        ? this.prisma.unidad.findUnique({ where: { id: input.unidadId } })
        : Promise.resolve(null),
      input.conductorId !== undefined
        ? this.prisma.conductor.findUnique({ where: { id: input.conductorId } })
        : Promise.resolve(null),
    ]);

    const data: Prisma.ViajeUpdateInput = {};

    if (input.unidadId !== undefined) {
      if (!unidad) {
        throw new NotFoundException(
          `Unidad con id ${input.unidadId} no encontrada`,
        );
      }
      if (!unidad.activo) {
        throw new BadRequestException(
          `La unidad ${input.unidadId} está inactiva`,
        );
      }
      data.unidad = { connect: { id: input.unidadId } };
    }

    if (input.conductorId !== undefined) {
      if (!conductor) {
        throw new NotFoundException(
          `Conductor con id ${input.conductorId} no encontrado`,
        );
      }
      if (!conductor.activo) {
        throw new BadRequestException(
          `El conductor ${input.conductorId} está inactivo`,
        );
      }
      data.conductor = { connect: { id: input.conductorId } };
    }

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
