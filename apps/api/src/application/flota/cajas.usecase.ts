import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Caja, Prisma } from '@prisma/client';
import { Paginado } from '@flotaos/shared-types';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { paginar } from '../shared/paginar';
import {
  ActualizarCajaInput,
  CrearCajaInput,
  ListarCajasInput,
} from './flota.types';

/** Casos de uso del CRUD de cajas / remolques de la flota. */
@Injectable()
export class CajasUseCase {
  constructor(private readonly prisma: PrismaService) {}

  /** Crea una caja. Las placas son únicas. */
  async crear(input: CrearCajaInput): Promise<Caja> {
    const existente = await this.prisma.caja.findUnique({
      where: { placas: input.placas },
    });
    if (existente) {
      throw new ConflictException(
        `Ya existe una caja con las placas ${input.placas}`,
      );
    }

    return this.prisma.caja.create({
      data: {
        placas: input.placas,
        tipo: input.tipo,
        marca: input.marca,
        anio: input.anio,
        capacidadKg: input.capacidadKg,
        capacidadM3: input.capacidadM3,
        aseguradora: input.aseguradora,
        numeroPoliza: input.numeroPoliza,
      },
    });
  }

  /** Lista cajas con búsqueda por placas/tipo y paginación. */
  async listar(input: ListarCajasInput): Promise<Paginado<Caja>> {
    const where: Prisma.CajaWhereInput = input.q
      ? {
          OR: [
            { placas: { contains: input.q, mode: 'insensitive' } },
            { tipo: { contains: input.q, mode: 'insensitive' } },
          ],
        }
      : {};

    return paginar<Caja>(this.prisma.caja, {
      where,
      orderBy: { createdAt: 'desc' },
      page: input.page,
      pageSize: input.pageSize,
    });
  }

  /** Obtiene una caja por id o lanza NotFoundException. */
  async obtener(id: string): Promise<Caja> {
    const caja = await this.prisma.caja.findUnique({ where: { id } });
    if (!caja) {
      throw new NotFoundException(`Caja con id ${id} no encontrada`);
    }
    return caja;
  }

  /** Actualiza una caja. Valida unicidad de placas si cambian. */
  async actualizar(id: string, input: ActualizarCajaInput): Promise<Caja> {
    await this.obtener(id);

    if (input.placas) {
      const conMismasPlacas = await this.prisma.caja.findUnique({
        where: { placas: input.placas },
      });
      if (conMismasPlacas && conMismasPlacas.id !== id) {
        throw new ConflictException(
          `Ya existe una caja con las placas ${input.placas}`,
        );
      }
    }

    return this.prisma.caja.update({
      where: { id },
      data: {
        placas: input.placas,
        tipo: input.tipo,
        marca: input.marca,
        anio: input.anio,
        capacidadKg: input.capacidadKg,
        capacidadM3: input.capacidadM3,
        aseguradora: input.aseguradora,
        numeroPoliza: input.numeroPoliza,
        activo: input.activo,
      },
    });
  }

  /** Elimina una caja. Falla con conflicto si tiene viajes asociados. */
  async eliminar(id: string): Promise<void> {
    await this.obtener(id);

    const viajes = await this.prisma.viaje.count({ where: { cajaId: id } });
    if (viajes > 0) {
      throw new ConflictException(
        'No se puede eliminar la caja porque tiene viajes asociados',
      );
    }

    await this.prisma.caja.delete({ where: { id } });
  }
}
