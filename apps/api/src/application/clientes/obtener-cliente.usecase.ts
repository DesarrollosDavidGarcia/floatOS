import { Injectable } from '@nestjs/common';
import { Cliente } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { obtenerOFallar } from '../shared/obtener-o-fallar';

/** Caso de uso: obtener el detalle de un cliente por su id. */
@Injectable()
export class ObtenerClienteUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string): Promise<Cliente> {
    return obtenerOFallar(
      () =>
        this.prisma.cliente.findUnique({
          where: { id },
          include: {
            contactos: { orderBy: { orden: 'asc' } },
            sucursales: {
              orderBy: [
                { esPrincipal: 'desc' },
                { orden: 'asc' },
                { createdAt: 'asc' },
              ],
            },
          },
        }),
      `Cliente con id ${id} no encontrado`,
    );
  }
}
