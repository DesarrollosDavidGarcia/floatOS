import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EstadoViaje } from '@flotaos/shared-types';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { simularCarga } from '../../domain/viaje/motor-calculo';
import { generarTokenSeguro } from '../shared/token.util';
import { MotorViajeService } from './motor-viaje.service';
import {
  derivarResumen,
  itemsDeEscalas,
  nestedEscalasCreate,
} from './viaje-escalas.helper';
import { CrearViajeInput, RELACIONES_DETALLE } from './viajes.types';

/**
 * Caso de uso: crear un viaje con su itinerario de escalas. Valida cliente
 * (y unidad/conductor si vienen), deriva el resumen y el snapshot del motor,
 * y crea las escalas + cargas anidadas. Estado inicial ASIGNADO.
 */
@Injectable()
export class CrearViajeUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly motor: MotorViajeService,
  ) {}

  async execute(input: CrearViajeInput, registradoPor: string) {
    if (!input.escalas || input.escalas.length < 2) {
      throw new BadRequestException(
        'El itinerario requiere al menos origen y destino',
      );
    }

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

    const sim = simularCarga(itemsDeEscalas(input.escalas));
    const { km } = await this.motor.distanciaKm(input.escalas);
    const resumen = derivarResumen(input.escalas, sim);

    const data: Prisma.ViajeCreateInput = {
      cliente: { connect: { id: input.clienteId } },
      ...resumen,
      distanciaEstimadaKm: km,
      fechaProgramada: input.fechaProgramada
        ? new Date(input.fechaProgramada)
        : undefined,
      estado: EstadoViaje.ASIGNADO,
      trackingToken: generarTokenSeguro(),
      escalas: { create: nestedEscalasCreate(input.escalas) },
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
      include: RELACIONES_DETALLE,
    });
  }
}
