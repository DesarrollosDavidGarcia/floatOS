import { Injectable, NotFoundException } from '@nestjs/common';
import { Cliente } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

/** Caso de uso: obtener el detalle de un cliente por su id. */
@Injectable()
export class ObtenerClienteUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string): Promise<Cliente> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      include: {
        contactos: { orderBy: { orden: 'asc' } },
        sucursales: {
          orderBy: [{ esPrincipal: 'desc' }, { orden: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
    if (!cliente) {
      throw new NotFoundException(`Cliente con id ${id} no encontrado`);
    }
    return cliente;
  }
}
