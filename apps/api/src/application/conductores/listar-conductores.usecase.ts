import { Injectable } from '@nestjs/common';
import { Conductor, Prisma } from '@prisma/client';
import { Paginado } from '@flotaos/shared-types';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { paginar } from '../shared/paginar';
import { ESTADOS_VIAJE_ABIERTOS } from '../viajes/disponibilidad-conductor.helper';
import {
  aConductorPublico,
  ConductorPublico,
  ViajeActivoConductor,
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
  ): Promise<
    Paginado<ConductorPublico & { viajeActivo: ViajeActivoConductor | null }>
  > {
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

    const resultado = await paginar<
      Conductor & { viajes: ViajeActivoConductor[] }
    >(this.prisma.conductor, {
      where,
      orderBy: { createdAt: 'desc' },
      // El viaje abierto (si existe) que ocupa al conductor — alimenta el
      // chip Disponible/estado en los selectores del panel.
      include: {
        viajes: {
          where: { estado: { in: ESTADOS_VIAJE_ABIERTOS } },
          select: { id: true, folio: true, estado: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      page: input.page,
      pageSize: input.pageSize,
    });

    // Excluye campos sensibles (passwordHash, refreshTokenHash) de cada
    // conductor y aplana el viaje abierto a `viajeActivo`.
    return {
      ...resultado,
      data: resultado.data.map(({ viajes, ...conductor }) => ({
        ...aConductorPublico(conductor),
        viajeActivo: viajes[0] ?? null,
      })),
    };
  }
}
