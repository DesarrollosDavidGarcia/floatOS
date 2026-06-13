import { Injectable } from '@nestjs/common';
import { Cliente, Prisma } from '@prisma/client';
import { Paginado } from '@flotaos/shared-types';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { paginar } from '../shared/paginar';
import { ListarClientesInput } from './clientes.types';

/** Caso de uso: listar clientes con búsqueda opcional y paginación. */
@Injectable()
export class ListarClientesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: ListarClientesInput): Promise<Paginado<Cliente>> {
    const q = input.q?.trim();
    const where: Prisma.ClienteWhereInput = q
      ? {
          OR: [
            { razonSocial: { contains: q, mode: 'insensitive' } },
            { rfc: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};

    return paginar<Cliente>(this.prisma.cliente, {
      where,
      orderBy: { razonSocial: 'asc' },
      // Contacto principal (o el primero) para mostrarlo en la tabla.
      include: {
        contactos: {
          orderBy: [{ esPrincipal: 'desc' }, { orden: 'asc' }],
          take: 1,
        },
      },
      page: input.page,
      pageSize: input.pageSize,
    });
  }
}
