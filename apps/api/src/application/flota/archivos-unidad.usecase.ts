import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoriaArchivoUnidad } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { StorageService } from '../../infrastructure/storage/storage.service';

/** Archivo recibido por multipart (subconjunto de Express.Multer.File). */
export interface ArchivoSubido {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
}

/** Tipos permitidos: PDF e imágenes (documentos escaneados / fotos). */
const TIPOS_PERMITIDOS = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);
export const TAMANO_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/** Vista pública: omite la object key interna de MinIO. */
const SELECCION = {
  id: true,
  unidadId: true,
  categoria: true,
  nombre: true,
  contentType: true,
  tamanoBytes: true,
  createdAt: true,
} as const;

@Injectable()
export class ArchivosUnidadUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private async asegurarUnidad(unidadId: string): Promise<void> {
    const unidad = await this.prisma.unidad.findUnique({
      where: { id: unidadId },
      select: { id: true },
    });
    if (!unidad) {
      throw new NotFoundException(`Unidad con id ${unidadId} no encontrada`);
    }
  }

  /** Sube uno o varios archivos a una categoría de la unidad. */
  async subir(
    unidadId: string,
    categoria: CategoriaArchivoUnidad,
    archivos: ArchivoSubido[],
  ) {
    await this.asegurarUnidad(unidadId);

    if (!archivos || archivos.length === 0) {
      throw new BadRequestException('No se recibió ningún archivo.');
    }
    for (const a of archivos) {
      if (!TIPOS_PERMITIDOS.has(a.mimetype)) {
        throw new BadRequestException(
          `Tipo no permitido en "${a.originalname}". Se aceptan PDF, JPG, PNG y WEBP.`,
        );
      }
      if (a.size > TAMANO_MAX_BYTES) {
        throw new BadRequestException(
          `"${a.originalname}" supera el tamaño máximo de 10 MB.`,
        );
      }
    }

    const creados = [];
    for (const a of archivos) {
      const key = this.storage.generarKey(
        `unidades/${unidadId}/${categoria.toLowerCase()}`,
        a.originalname,
      );
      await this.storage.subir(key, a.buffer, a.mimetype);
      creados.push(
        await this.prisma.archivoUnidad.create({
          data: {
            unidadId,
            categoria,
            nombre: a.originalname,
            key,
            contentType: a.mimetype,
            tamanoBytes: a.size,
          },
          select: SELECCION,
        }),
      );
    }
    return creados;
  }

  /** Lista los archivos de la unidad (opcionalmente filtrados por categoría). */
  async listar(unidadId: string, categoria?: CategoriaArchivoUnidad) {
    await this.asegurarUnidad(unidadId);
    return this.prisma.archivoUnidad.findMany({
      where: { unidadId, ...(categoria ? { categoria } : {}) },
      orderBy: { createdAt: 'desc' },
      select: SELECCION,
    });
  }

  /** Devuelve una URL temporal de descarga del archivo. */
  async urlDescarga(
    unidadId: string,
    archivoId: string,
  ): Promise<{ url: string }> {
    const archivo = await this.prisma.archivoUnidad.findUnique({
      where: { id: archivoId },
    });
    if (!archivo || archivo.unidadId !== unidadId) {
      throw new NotFoundException('Archivo no encontrado.');
    }
    const url = await this.storage.urlDescarga(archivo.key, archivo.nombre);
    return { url };
  }

  /** Elimina el archivo (objeto en MinIO + registro). */
  async eliminar(unidadId: string, archivoId: string): Promise<void> {
    const archivo = await this.prisma.archivoUnidad.findUnique({
      where: { id: archivoId },
    });
    if (!archivo || archivo.unidadId !== unidadId) {
      throw new NotFoundException('Archivo no encontrado.');
    }
    await this.storage.eliminar(archivo.key);
    await this.prisma.archivoUnidad.delete({ where: { id: archivoId } });
  }
}
