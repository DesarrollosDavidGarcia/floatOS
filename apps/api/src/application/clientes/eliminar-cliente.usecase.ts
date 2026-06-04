import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

/** Caso de uso: eliminar un cliente que no tenga viajes asociados. */
@Injectable()
export class EliminarClienteUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string): Promise<void> {
    const cliente = await this.prisma.cliente.findUnique({ where: { id } });
    if (!cliente) {
      throw new NotFoundException(`Cliente con id ${id} no encontrado`);
    }

    const viajesAsociados = await this.prisma.viaje.count({
      where: { clienteId: id },
    });
    if (viajesAsociados > 0) {
      throw new ConflictException(
        'No se puede eliminar el cliente porque tiene viajes asociados',
      );
    }

    await this.prisma.cliente.delete({ where: { id } });
  }
}
