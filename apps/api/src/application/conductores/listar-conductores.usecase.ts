import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Paginado } from '@flotaos/shared-types';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { paginar } from '../shared/paginar';
import {
  aConductorPublico,
  ConductorPublico,
} from './conductores.types';

export interface ListarConductoresInput {
  q?: string;
  page?: number;
  pageSize?: number;
}

/** Caso de uso: listar conductores con búsqueda y paginación. */
@Injectable()
export class ListarConductoresUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    input: ListarConductoresInput,
  ): Promise<Paginado<ConductorPublico>> {
    const where: Prisma.ConductorWhereInput = input.q
      ? {
          OR: [
            { nombre: { contains: input.q, mode: 'insensitive' } },
            { apellidos: { contains: input.q, mode: 'insensitive' } },
            { usuario: { contains: input.q, mode: 'insensitive' } },
            { email: { contains: input.q, mode: 'insensitive' } },
          ],
        }
      : {};

    const resultado = await paginar(this.prisma.conductor, {
      where,
      orderBy: { createdAt: 'desc' },
      page: input.page,
      pageSize: input.pageSize,
    });

    // Excluye campos sensibles (passwordHash, refreshTokenHash) de cada conductor.
    return {
      ...resultado,
      data: resultado.data.map(aConductorPublico),
    };
  }
}
