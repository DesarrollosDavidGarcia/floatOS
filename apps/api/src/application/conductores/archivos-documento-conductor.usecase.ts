import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  documentoId: true,
  nombre: true,
  contentType: true,
  tamanoBytes: true,
  createdAt: true,
} as const;

/** Casos de uso de los archivos adjuntos a un documento del conductor. */
@Injectable()
export class ArchivosDocumentoConductorUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** Valida que el documento exista y pertenezca al conductor. */
  private async asegurarDocumento(
    conductorId: string,
    documentoId: string,
  ): Promise<void> {
    const doc = await this.prisma.documentoConductor.findUnique({
      where: { id: documentoId },
      select: { conductorId: true },
    });
    if (!doc || doc.conductorId !== conductorId) {
      throw new NotFoundException(`Documento con id ${documentoId} no encontrado`);
    }
  }

  /** Sube uno o varios archivos (PDF o imagen) al documento. */
  async subir(
    conductorId: string,
    documentoId: string,
    archivos: ArchivoSubido[],
  ) {
    await this.asegurarDocumento(conductorId, documentoId);

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
        `conductores/${conductorId}/documentos/${documentoId}`,
        a.originalname,
      );
      await this.storage.subir(key, a.buffer, a.mimetype);
      creados.push(
        await this.prisma.archivoDocumentoConductor.create({
          data: {
            documentoId,
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

  /** Lista los archivos del documento (más reciente primero). */
  async listar(conductorId: string, documentoId: string) {
    await this.asegurarDocumento(conductorId, documentoId);
    return this.prisma.archivoDocumentoConductor.findMany({
      where: { documentoId },
      orderBy: { createdAt: 'desc' },
      select: SELECCION,
    });
  }

  /** Devuelve una URL temporal de descarga del archivo. */
  async urlDescarga(
    conductorId: string,
    documentoId: string,
    archivoId: string,
  ): Promise<{ url: string }> {
    await this.asegurarDocumento(conductorId, documentoId);
    const archivo = await this.prisma.archivoDocumentoConductor.findUnique({
      where: { id: archivoId },
    });
    if (!archivo || archivo.documentoId !== documentoId) {
      throw new NotFoundException('Archivo no encontrado.');
    }
    const url = await this.storage.urlDescarga(archivo.key, archivo.nombre);
    return { url };
  }

  /** Elimina el archivo (objeto en MinIO + registro). */
  async eliminar(
    conductorId: string,
    documentoId: string,
    archivoId: string,
  ): Promise<void> {
    await this.asegurarDocumento(conductorId, documentoId);
    const archivo = await this.prisma.archivoDocumentoConductor.findUnique({
      where: { id: archivoId },
    });
    if (!archivo || archivo.documentoId !== documentoId) {
      throw new NotFoundException('Archivo no encontrado.');
    }
    await this.storage.eliminar(archivo.key);
    await this.prisma.archivoDocumentoConductor.delete({ where: { id: archivoId } });
  }
}
