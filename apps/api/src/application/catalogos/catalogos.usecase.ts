import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CatalogoItem, Prisma } from '@prisma/client';
import { CATALOGO_GRUPOS, CatalogoGrupoMeta } from '@flotaos/shared-types';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface CrearCatalogoItemInput {
  codigo: string;
  nombre: string;
  orden?: number;
  color?: string;
  activo?: boolean;
}

export interface ActualizarCatalogoItemInput {
  codigo?: string;
  nombre?: string;
  orden?: number;
  color?: string | null;
  activo?: boolean;
}

/** Casos de uso del catálogo genérico autoadministrable. */
@Injectable()
export class CatalogosUseCase {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista los grupos administrables (metadatos). */
  listarGrupos(): CatalogoGrupoMeta[] {
    return CATALOGO_GRUPOS;
  }

  /** Items de un grupo, ordenados; `soloActivos` para alimentar dropdowns. */
  listar(grupo: string, soloActivos = false): Promise<CatalogoItem[]> {
    return this.prisma.catalogoItem.findMany({
      where: { grupo, ...(soloActivos ? { activo: true } : {}) },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    });
  }

  async crear(
    grupo: string,
    input: CrearCatalogoItemInput,
  ): Promise<CatalogoItem> {
    try {
      return await this.prisma.catalogoItem.create({
        data: {
          grupo,
          codigo: input.codigo.trim(),
          nombre: input.nombre.trim(),
          orden: input.orden ?? 0,
          color: input.color ?? null,
          activo: input.activo ?? true,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          `Ya existe un item con código '${input.codigo}' en el grupo ${grupo}`,
        );
      }
      throw e;
    }
  }

  private async obtenerEnGrupo(
    grupo: string,
    id: string,
  ): Promise<CatalogoItem> {
    const item = await this.prisma.catalogoItem.findUnique({ where: { id } });
    if (!item || item.grupo !== grupo) {
      throw new NotFoundException(`Item de catálogo ${id} no encontrado`);
    }
    return item;
  }

  async actualizar(
    grupo: string,
    id: string,
    input: ActualizarCatalogoItemInput,
  ): Promise<CatalogoItem> {
    await this.obtenerEnGrupo(grupo, id);

    const data: Prisma.CatalogoItemUpdateInput = {};
    if (input.codigo !== undefined) data.codigo = input.codigo.trim();
    if (input.nombre !== undefined) data.nombre = input.nombre.trim();
    if (input.orden !== undefined) data.orden = input.orden;
    if (input.color !== undefined) data.color = input.color;
    if (input.activo !== undefined) data.activo = input.activo;

    try {
      return await this.prisma.catalogoItem.update({ where: { id }, data });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          `Ya existe un item con código '${input.codigo}' en el grupo ${grupo}`,
        );
      }
      throw e;
    }
  }

  async eliminar(grupo: string, id: string): Promise<void> {
    await this.obtenerEnGrupo(grupo, id);
    await this.prisma.catalogoItem.delete({ where: { id } });
  }
}
