import { Injectable, NotFoundException } from '@nestjs/common';
import { Viaje } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

/** Caso de uso: historial de viajes de un conductor. */
@Injectable()
export class ListarViajesConductorUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(conductorId: string): Promise<Viaje[]> {
    const conductor = await this.prisma.conductor.findUnique({
      where: { id: conductorId },
    });
    if (!conductor) {
      throw new NotFoundException('Conductor no encontrado');
    }

    return this.prisma.viaje.findMany({
      where: { conductorId },
      orderBy: { createdAt: 'desc' },
      include: { cliente: true, unidad: true },
    });
  }
}
