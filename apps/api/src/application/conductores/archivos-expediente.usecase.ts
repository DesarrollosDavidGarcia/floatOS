import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SeccionExpediente } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { StorageService } from '../../infrastructure/storage/storage.service';

/** Archivo recibido por multipart (subconjunto de Express.Multer.File). */
export interface ArchivoSubido {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
}

/** Tipos permitidos: PDF e imágenes (evidencia escaneada / fotos). */
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
  seccion: true,
  registroId: true,
  nombre: true,
  contentType: true,
  tamanoBytes: true,
  createdAt: true,
} as const;

/**
 * Slug de URL → enum de sección. El slug coincide con la ruta REST de cada
 * sección del expediente (p. ej. `/conductores/:id/examenes-medicos`).
 */
export const SECCIONES_EXPEDIENTE: Record<string, SeccionExpediente> = {
  'examenes-medicos': 'EXAMEN_MEDICO',
  certificaciones: 'CERTIFICACION',
  capacitaciones: 'CAPACITACION',
  'control-confianza': 'CONTROL_CONFIANZA',
  incidencias: 'INCIDENCIA',
  evaluaciones: 'EVALUACION',
};

/**
 * Casos de uso de los archivos de evidencia del expediente (genérico sobre las
 * secciones médico / certificaciones / capacitaciones / control de confianza /
 * incidencias / evaluaciones). Una sola tabla `archivos_expediente` keyed por
 * (seccion, registroId), con FK a conductor para el cascade.
 */
@Injectable()
export class ArchivosExpedienteUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** Traduce el slug de URL al enum; 404 si no es una sección válida. */
  resolverSeccion(slug: string): SeccionExpediente {
    const seccion = SECCIONES_EXPEDIENTE[slug];
    if (!seccion) {
      throw new NotFoundException(`Sección de expediente "${slug}" no encontrada`);
    }
    return seccion;
  }

  /** Valida que el registro exista en su sección y pertenezca al conductor. */
  private async asegurarRegistro(
    conductorId: string,
    seccion: SeccionExpediente,
    registroId: string,
  ): Promise<void> {
    const where = { id: registroId };
    const select = { conductorId: true };
    let registro: { conductorId: string } | null;

    switch (seccion) {
      case 'EXAMEN_MEDICO':
        registro = await this.prisma.examenMedicoConductor.findUnique({ where, select });
        break;
      case 'CERTIFICACION':
        registro = await this.prisma.certificacionConductor.findUnique({ where, select });
        break;
      case 'CAPACITACION':
        registro = await this.prisma.capacitacionConductor.findUnique({ where, select });
        break;
      case 'CONTROL_CONFIANZA':
        registro = await this.prisma.controlConfianzaConductor.findUnique({ where, select });
        break;
      case 'INCIDENCIA':
        registro = await this.prisma.incidenciaConductor.findUnique({ where, select });
        break;
      case 'EVALUACION':
        registro = await this.prisma.evaluacionDesempenoConductor.findUnique({ where, select });
        break;
    }

    if (!registro || registro.conductorId !== conductorId) {
      throw new NotFoundException(`Registro con id ${registroId} no encontrado`);
    }
  }

  /** Sube uno o varios archivos (PDF o imagen) al registro del expediente. */
  async subir(
    conductorId: string,
    seccion: SeccionExpediente,
    registroId: string,
    archivos: ArchivoSubido[],
  ) {
    await this.asegurarRegistro(conductorId, seccion, registroId);

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
        `conductores/${conductorId}/expediente/${seccion}/${registroId}`,
        a.originalname,
      );
      await this.storage.subir(key, a.buffer, a.mimetype);
      creados.push(
        await this.prisma.archivoExpediente.create({
          data: {
            conductorId,
            seccion,
            registroId,
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

  /** Lista los archivos del registro (más reciente primero). */
  async listar(
    conductorId: string,
    seccion: SeccionExpediente,
    registroId: string,
  ) {
    await this.asegurarRegistro(conductorId, seccion, registroId);
    return this.prisma.archivoExpediente.findMany({
      where: { seccion, registroId },
      orderBy: { createdAt: 'desc' },
      select: SELECCION,
    });
  }

  /**
   * Conteo de archivos por registro de una sección del conductor (para el badge
   * "📎 N" del listado). Devuelve `{ [registroId]: cantidad }`.
   */
  async conteos(
    conductorId: string,
    seccion: SeccionExpediente,
  ): Promise<Record<string, number>> {
    const grupos = await this.prisma.archivoExpediente.groupBy({
      by: ['registroId'],
      where: { conductorId, seccion },
      _count: { _all: true },
    });
    return Object.fromEntries(grupos.map((g) => [g.registroId, g._count._all]));
  }

  /** Devuelve una URL temporal de descarga del archivo. */
  async urlDescarga(
    conductorId: string,
    seccion: SeccionExpediente,
    registroId: string,
    archivoId: string,
  ): Promise<{ url: string }> {
    await this.asegurarRegistro(conductorId, seccion, registroId);
    const archivo = await this.prisma.archivoExpediente.findUnique({
      where: { id: archivoId },
    });
    if (!archivo || archivo.registroId !== registroId || archivo.seccion !== seccion) {
      throw new NotFoundException('Archivo no encontrado.');
    }
    const url = await this.storage.urlDescarga(archivo.key, archivo.nombre);
    return { url };
  }

  /** Elimina el archivo (objeto en MinIO + registro). */
  async eliminar(
    conductorId: string,
    seccion: SeccionExpediente,
    registroId: string,
    archivoId: string,
  ): Promise<void> {
    await this.asegurarRegistro(conductorId, seccion, registroId);
    const archivo = await this.prisma.archivoExpediente.findUnique({
      where: { id: archivoId },
    });
    if (!archivo || archivo.registroId !== registroId || archivo.seccion !== seccion) {
      throw new NotFoundException('Archivo no encontrado.');
    }
    await this.storage.eliminar(archivo.key);
    await this.prisma.archivoExpediente.delete({ where: { id: archivoId } });
  }

  /**
   * Limpia todos los archivos de un registro (objetos en MinIO + filas). Lo
   * llaman los casos de uso de cada sección al borrar un registro individual,
   * ya que la tabla solo tiene FK a conductor (no al registro), por lo que el
   * borrado del registro no cascada sus archivos por sí solo.
   */
  async eliminarDeRegistro(
    seccion: SeccionExpediente,
    registroId: string,
  ): Promise<void> {
    const archivos = await this.prisma.archivoExpediente.findMany({
      where: { seccion, registroId },
      select: { key: true },
    });
    if (archivos.length === 0) return;
    await Promise.all(archivos.map((a) => this.storage.eliminar(a.key)));
    await this.prisma.archivoExpediente.deleteMany({ where: { seccion, registroId } });
  }
}
