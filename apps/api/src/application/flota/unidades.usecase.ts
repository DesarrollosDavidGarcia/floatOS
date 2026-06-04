import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Unidad } from '@prisma/client';
import { Paginado } from '@flotaos/shared-types';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { paginar } from '../shared/paginar';
import {
  ActualizarUnidadInput,
  CrearUnidadInput,
  ListarUnidadesInput,
} from './flota.types';

/** Casos de uso del CRUD de unidades de la flota. */
@Injectable()
export class UnidadesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  /** Crea una unidad. Las placas son únicas. */
  async crear(input: CrearUnidadInput): Promise<Unidad> {
    const existente = await this.prisma.unidad.findUnique({
      where: { placas: input.placas },
    });
    if (existente) {
      throw new ConflictException(
        `Ya existe una unidad con las placas ${input.placas}`,
      );
    }

    return this.prisma.unidad.create({
      data: {
        placas: input.placas,
        tipo: input.tipo,
        marca: input.marca,
        modelo: input.modelo,
        anio: input.anio,
        capacidadKg: input.capacidadKg,
        aseguradora: input.aseguradora,
        numeroPoliza: input.numeroPoliza,
      },
    });
  }

  /** Lista unidades con búsqueda por placas/tipo y paginación. */
  async listar(input: ListarUnidadesInput): Promise<Paginado<Unidad>> {
    const where: Prisma.UnidadWhereInput = input.q
      ? {
          OR: [
            { placas: { contains: input.q, mode: 'insensitive' } },
            { tipo: { contains: input.q, mode: 'insensitive' } },
          ],
        }
      : {};

    return paginar<Unidad>(this.prisma.unidad, {
      where,
      orderBy: { createdAt: 'desc' },
      page: input.page,
      pageSize: input.pageSize,
    });
  }

  /** Obtiene una unidad por id o lanza NotFoundException. */
  async obtener(id: string): Promise<Unidad> {
    const unidad = await this.prisma.unidad.findUnique({ where: { id } });
    if (!unidad) {
      throw new NotFoundException(`Unidad con id ${id} no encontrada`);
    }
    return unidad;
  }

  /** Actualiza una unidad. Valida unicidad de placas si cambian. */
  async actualizar(
    id: string,
    input: ActualizarUnidadInput,
  ): Promise<Unidad> {
    await this.obtener(id);

    if (input.placas) {
      const conMismasPlacas = await this.prisma.unidad.findUnique({
        where: { placas: input.placas },
      });
      if (conMismasPlacas && conMismasPlacas.id !== id) {
        throw new ConflictException(
          `Ya existe una unidad con las placas ${input.placas}`,
        );
      }
    }

    return this.prisma.unidad.update({
      where: { id },
      data: {
        placas: input.placas,
        tipo: input.tipo,
        marca: input.marca,
        modelo: input.modelo,
        anio: input.anio,
        capacidadKg: input.capacidadKg,
        aseguradora: input.aseguradora,
        numeroPoliza: input.numeroPoliza,
        activo: input.activo,
      },
    });
  }

  /** Elimina una unidad. Falla con conflicto si tiene viajes asociados. */
  async eliminar(id: string): Promise<void> {
    await this.obtener(id);

    const viajes = await this.prisma.viaje.count({ where: { unidadId: id } });
    if (viajes > 0) {
      throw new ConflictException(
        'No se puede eliminar la unidad porque tiene viajes asociados',
      );
    }

    await this.prisma.unidad.delete({ where: { id } });
  }
}
