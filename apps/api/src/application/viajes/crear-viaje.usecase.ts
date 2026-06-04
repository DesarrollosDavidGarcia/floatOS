import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EstadoViaje } from '@flotaos/shared-types';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CrearViajeInput, RELACIONES_RESUMEN } from './viajes.types';

/**
 * Caso de uso: crear un viaje. Valida que el cliente (y la unidad/conductor
 * si se proporcionan) existan. Estado inicial ASIGNADO + historial inicial.
 */
@Injectable()
export class CrearViajeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: CrearViajeInput, registradoPor: string) {
    // Validaciones de existencia independientes en paralelo.
    const [cliente, unidad, conductor] = await Promise.all([
      this.prisma.cliente.findUnique({ where: { id: input.clienteId } }),
      input.unidadId
        ? this.prisma.unidad.findUnique({ where: { id: input.unidadId } })
        : Promise.resolve(null),
      input.conductorId
        ? this.prisma.conductor.findUnique({ where: { id: input.conductorId } })
        : Promise.resolve(null),
    ]);

    if (!cliente) {
      throw new NotFoundException(
        `Cliente con id ${input.clienteId} no encontrado`,
      );
    }

    if (input.unidadId) {
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
    }

    if (input.conductorId) {
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
    }

    const data: Prisma.ViajeCreateInput = {
      cliente: { connect: { id: input.clienteId } },
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
      fechaProgramada: input.fechaProgramada
        ? new Date(input.fechaProgramada)
        : undefined,
      estado: EstadoViaje.ASIGNADO,
      ...(input.unidadId
        ? { unidad: { connect: { id: input.unidadId } } }
        : {}),
      ...(input.conductorId
        ? { conductor: { connect: { id: input.conductorId } } }
        : {}),
      historial: {
        create: {
          estadoAnterior: null,
          estadoNuevo: EstadoViaje.ASIGNADO,
          nota: 'Viaje creado',
          registradoPor,
        },
      },
    };

    return this.prisma.viaje.create({
      data,
      include: RELACIONES_RESUMEN,
    });
  }
}
