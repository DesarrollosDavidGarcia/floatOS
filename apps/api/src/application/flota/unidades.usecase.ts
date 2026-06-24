import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma, Unidad } from '@prisma/client';
import { Paginado } from '@flotaos/shared-types';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { paginar } from '../shared/paginar';
import { obtenerOFallar } from '../shared/obtener-o-fallar';
import {
  ActualizarUnidadInput,
  CrearUnidadInput,
  ListarUnidadesInput,
} from './flota.types';
import { ArchivoSubido } from './archivos-unidad.usecase';

/**
 * Vista pública de una unidad: oculta la object key interna (`fotoKey`) y en su
 * lugar expone una URL temporal lista para mostrar la foto (`fotoUrl`).
 */
export type UnidadVista = Omit<Unidad, 'fotoKey'> & { fotoUrl: string | null };

/** Tipos de imagen aceptados para la foto de la unidad (no PDF: es una foto). */
const TIPOS_FOTO = new Set(['image/jpeg', 'image/png', 'image/webp']);
const TAMANO_MAX_FOTO = 10 * 1024 * 1024; // 10 MB

/** Casos de uso del CRUD de unidades de la flota. */
@Injectable()
export class UnidadesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** Mapea la fila de Prisma a la vista pública (firma la URL de la foto). */
  private async aVista(unidad: Unidad): Promise<UnidadVista> {
    const { fotoKey, ...resto } = unidad;
    const fotoUrl = fotoKey
      ? await this.storage.urlVisualizacion(fotoKey)
      : null;
    return { ...resto, fotoUrl };
  }

  /** Crea una unidad. Las placas son únicas. */
  async crear(input: CrearUnidadInput): Promise<UnidadVista> {
    const existente = await this.prisma.unidad.findUnique({
      where: { placas: input.placas },
    });
    if (existente) {
      throw new ConflictException(
        `Ya existe una unidad con las placas ${input.placas}`,
      );
    }

    const unidad = await this.prisma.unidad.create({
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
    return this.aVista(unidad);
  }

  /** Lista unidades con búsqueda por placas/tipo y paginación. */
  async listar(input: ListarUnidadesInput): Promise<Paginado<UnidadVista>> {
    const where: Prisma.UnidadWhereInput = input.q
      ? {
          OR: [
            { placas: { contains: input.q, mode: 'insensitive' } },
            { tipo: { contains: input.q, mode: 'insensitive' } },
          ],
        }
      : {};

    const pagina = await paginar<Unidad>(this.prisma.unidad, {
      where,
      orderBy: { createdAt: 'desc' },
      page: input.page,
      pageSize: input.pageSize,
    });
    return {
      ...pagina,
      data: await Promise.all(pagina.data.map((u) => this.aVista(u))),
    };
  }

  /** Obtiene la fila cruda o lanza NotFoundException (uso interno). */
  private async obtenerFila(id: string): Promise<Unidad> {
    return obtenerOFallar(
      () => this.prisma.unidad.findUnique({ where: { id } }),
      `Unidad con id ${id} no encontrada`,
    );
  }

  /** Obtiene una unidad por id o lanza NotFoundException. */
  async obtener(id: string): Promise<UnidadVista> {
    return this.aVista(await this.obtenerFila(id));
  }

  /** Actualiza una unidad. Valida unicidad de placas si cambian. */
  async actualizar(
    id: string,
    input: ActualizarUnidadInput,
  ): Promise<UnidadVista> {
    await this.obtenerFila(id);

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

    const unidad = await this.prisma.unidad.update({
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
    return this.aVista(unidad);
  }

  /** Sube/reemplaza la foto de referencia de la unidad. Solo imágenes. */
  async subirFoto(id: string, archivo?: ArchivoSubido): Promise<UnidadVista> {
    const unidad = await this.obtenerFila(id);

    if (!archivo) {
      throw new BadRequestException('No se recibió ninguna imagen.');
    }
    if (!TIPOS_FOTO.has(archivo.mimetype)) {
      throw new BadRequestException(
        'Formato no permitido. La foto debe ser JPG, PNG o WEBP.',
      );
    }
    if (archivo.size > TAMANO_MAX_FOTO) {
      throw new BadRequestException('La foto supera el tamaño máximo de 10 MB.');
    }

    const key = this.storage.generarKey(
      `unidades/${id}/foto`,
      archivo.originalname,
    );
    await this.storage.subir(key, archivo.buffer, archivo.mimetype);

    // Borra la foto anterior (best-effort) para no dejar huérfanos en MinIO.
    if (unidad.fotoKey) {
      await this.storage.eliminar(unidad.fotoKey);
    }

    const actualizada = await this.prisma.unidad.update({
      where: { id },
      data: { fotoKey: key },
    });
    return this.aVista(actualizada);
  }

  /** Elimina la foto de referencia de la unidad (si tiene). */
  async eliminarFoto(id: string): Promise<UnidadVista> {
    const unidad = await this.obtenerFila(id);
    if (unidad.fotoKey) {
      await this.storage.eliminar(unidad.fotoKey);
    }
    const actualizada = await this.prisma.unidad.update({
      where: { id },
      data: { fotoKey: null },
    });
    return this.aVista(actualizada);
  }

  /** Elimina una unidad. Falla con conflicto si tiene viajes asociados. */
  async eliminar(id: string): Promise<void> {
    const unidad = await this.obtenerFila(id);

    const viajes = await this.prisma.viaje.count({ where: { unidadId: id } });
    if (viajes > 0) {
      throw new ConflictException(
        'No se puede eliminar la unidad porque tiene viajes asociados',
      );
    }

    // Limpia la foto en MinIO antes de borrar la fila (best-effort).
    if (unidad.fotoKey) {
      await this.storage.eliminar(unidad.fotoKey);
    }
    await this.prisma.unidad.delete({ where: { id } });
  }
}
