import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  aConductorPublico,
  ConductorPublico,
} from './conductores.types';

/** Caso de uso: detalle de un conductor por id. */
@Injectable()
export class ObtenerConductorUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string): Promise<ConductorPublico> {
    const conductor = await this.prisma.conductor.findUnique({
      where: { id },
    });
    if (!conductor) {
      throw new NotFoundException(`Conductor con id ${id} no encontrado`);
    }
    return aConductorPublico(conductor);
  }
}
