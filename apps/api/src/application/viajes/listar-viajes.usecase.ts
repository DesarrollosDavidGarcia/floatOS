import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Paginado } from '@flotaos/shared-types';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { paginar } from '../shared/paginar';
import { ListarViajesInput, SELECCION_LISTADO } from './viajes.types';
import { FILTRO_VISIBLE_PARA_CONDUCTOR } from './visibilidad-conductor.helper';

/** Caso de uso: listar viajes con filtros, búsqueda y paginación. */
@Injectable()
export class ListarViajesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(filtros: ListarViajesInput): Promise<Paginado<unknown>> {
    const where: Prisma.ViajeWhereInput = {};

    // Conductor: ocultar viajes ASIGNADO cuya cotización no fue aceptada.
    if (filtros.paraConductor) {
      Object.assign(where, FILTRO_VISIBLE_PARA_CONDUCTOR);
    }

    if (filtros.estado) where.estado = filtros.estado;
    if (filtros.clienteId) where.clienteId = filtros.clienteId;
    if (filtros.conductorId) where.conductorId = filtros.conductorId;
    if (filtros.unidadId) where.unidadId = filtros.unidadId;

    if (filtros.desde || filtros.hasta) {
      const fechaFiltro: Prisma.DateTimeFilter = {};
      if (filtros.desde) fechaFiltro.gte = new Date(filtros.desde);
      if (filtros.hasta) fechaFiltro.lte = new Date(filtros.hasta);
      // Filtra por fecha programada; si no existe, por fecha de creación.
      where.OR = [
        { fechaProgramada: fechaFiltro },
        { AND: [{ fechaProgramada: null }, { createdAt: fechaFiltro }] },
      ];
    }

    if (filtros.q) {
      const q = filtros.q.trim();
      const contiene: Prisma.ViajeWhereInput[] = [
        { origenDireccion: { contains: q, mode: 'insensitive' } },
        { destinoDireccion: { contains: q, mode: 'insensitive' } },
        { tipoCarga: { contains: q, mode: 'insensitive' } },
        { descripcionCarga: { contains: q, mode: 'insensitive' } },
        {
          cliente: {
            razonSocial: { contains: q, mode: 'insensitive' },
          },
        },
      ];
      // Si q es numérico, también busca por folio.
      const folio = Number.parseInt(q, 10);
      if (!Number.isNaN(folio)) {
        contiene.push({ folio });
      }
      where.AND = [{ OR: contiene }];
    }

    // El listado no expone el trackingToken (link público de seguimiento):
    // se usa un `select` explícito que omite ese campo.
    return paginar(this.prisma.viaje, {
      where,
      orderBy: { createdAt: 'desc' },
      select: SELECCION_LISTADO,
      page: filtros.page,
      pageSize: filtros.pageSize,
    });
  }
}
