import { Injectable, NotFoundException } from '@nestjs/common';
import { Paginado } from '@flotaos/shared-types';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { paginar } from '../shared/paginar';
import { SELECCION_LISTADO } from '../viajes/viajes.types';

/** Caso de uso: historial paginado de viajes de un conductor. */
@Injectable()
export class ListarViajesConductorUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    conductorId: string,
    page?: number,
    pageSize?: number,
  ): Promise<Paginado<unknown>> {
    const conductor = await this.prisma.conductor.findUnique({
      where: { id: conductorId },
      select: { id: true },
    });
    if (!conductor) {
      throw new NotFoundException('Conductor no encontrado');
    }

    // `select: SELECCION_LISTADO` omite el trackingToken y acota las relaciones.
    return paginar(this.prisma.viaje, {
      where: { conductorId },
      orderBy: { createdAt: 'desc' },
      select: SELECCION_LISTADO,
      page,
      pageSize,
    });
  }
}
