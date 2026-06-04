import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

/** Caso de uso: eliminar conductor (bloqueado si tiene viajes asociados). */
@Injectable()
export class EliminarConductorUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string): Promise<void> {
    const conductor = await this.prisma.conductor.findUnique({
      where: { id },
    });
    if (!conductor) {
      throw new NotFoundException('Conductor no encontrado');
    }

    const viajes = await this.prisma.viaje.count({
      where: { conductorId: id },
    });
    if (viajes > 0) {
      throw new ConflictException(
        'No se puede eliminar un conductor con viajes asociados',
      );
    }

    await this.prisma.conductor.delete({ where: { id } });
  }
}
