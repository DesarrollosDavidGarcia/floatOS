import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PlanRutaInput, RELACIONES_DETALLE } from './viajes.types';

/**
 * Caso de uso: guardar el plan multi-día del viaje (horas de conducción/día,
 * descanso, tiempo por escala, hora de inicio). Es metadata de planeación: se
 * puede ajustar en cualquier estado (no toca el itinerario ni el snapshot de ruta).
 */
@Injectable()
export class ActualizarPlanRutaUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string, input: PlanRutaInput) {
    try {
      return await this.prisma.viaje.update({
        where: { id },
        data: { planRuta: input as unknown as Prisma.InputJsonValue },
        include: RELACIONES_DETALLE,
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
