import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentoUnidad } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  finDelDiaUTC,
  inicioDelDiaUTC,
  sumarDias,
} from '../shared/fecha.util';
import {
  ActualizarDocumentoUnidadInput,
  CrearDocumentoUnidadInput,
} from './flota.types';

/** Casos de uso de los documentos asociados a una unidad. */
@Injectable()
export class DocumentosUnidadUseCase {
  constructor(private readonly prisma: PrismaService) {}

  /** Verifica que la unidad exista o lanza NotFoundException. */
  private async asegurarUnidad(unidadId: string): Promise<void> {
    const unidad = await this.prisma.unidad.findUnique({
      where: { id: unidadId },
      select: { id: true },
    });
    if (!unidad) {
      throw new NotFoundException(`Unidad con id ${unidadId} no encontrada`);
    }
  }

  /** Registra un documento para una unidad. */
  async crear(
    unidadId: string,
    input: CrearDocumentoUnidadInput,
  ): Promise<DocumentoUnidad> {
    await this.asegurarUnidad(unidadId);

    return this.prisma.documentoUnidad.create({
      data: {
        unidadId,
        tipo: input.tipo,
        descripcion: input.descripcion,
        fechaEmision: input.fechaEmision
          ? new Date(input.fechaEmision)
          : undefined,
        fechaVencimiento: new Date(input.fechaVencimiento),
        archivoKey: input.archivoKey,
      },
    });
  }

  /** Lista los documentos de una unidad ordenados por vencimiento. */
  async listar(unidadId: string): Promise<DocumentoUnidad[]> {
    await this.asegurarUnidad(unidadId);

    return this.prisma.documentoUnidad.findMany({
      where: { unidadId },
      orderBy: { fechaVencimiento: 'asc' },
    });
  }

  /** Obtiene un documento validando que pertenezca a la unidad. */
  private async obtenerDeUnidad(
    unidadId: string,
    docId: string,
  ): Promise<DocumentoUnidad> {
    const documento = await this.prisma.documentoUnidad.findUnique({
      where: { id: docId },
    });
    if (!documento || documento.unidadId !== unidadId) {
      throw new NotFoundException(
        `Documento con id ${docId} no encontrado`,
      );
    }
    return documento;
  }

  /** Actualiza un documento de una unidad. */
  async actualizar(
    unidadId: string,
    docId: string,
    input: ActualizarDocumentoUnidadInput,
  ): Promise<DocumentoUnidad> {
    await this.obtenerDeUnidad(unidadId, docId);

    return this.prisma.documentoUnidad.update({
      where: { id: docId },
      data: {
        tipo: input.tipo,
        descripcion: input.descripcion,
        fechaEmision: input.fechaEmision
          ? new Date(input.fechaEmision)
          : undefined,
        fechaVencimiento: input.fechaVencimiento
          ? new Date(input.fechaVencimiento)
          : undefined,
        archivoKey: input.archivoKey,
      },
    });
  }

  /** Elimina un documento de una unidad. */
  async eliminar(unidadId: string, docId: string): Promise<void> {
    await this.obtenerDeUnidad(unidadId, docId);
    await this.prisma.documentoUnidad.delete({ where: { id: docId } });
  }

  /**
   * Documentos cuya fechaVencimiento cae dentro de la ventana
   * [inicio de hoy, fin de hoy + N días]. Excluye lo vencido hace tiempo
   * e incluye desde hoy hasta hoy+N. Para el centro de alertas.
   */
  async porVencer(dias: number): Promise<DocumentoUnidad[]> {
    const inicio = inicioDelDiaUTC();
    const fin = finDelDiaUTC(sumarDias(inicio, dias));

    return this.prisma.documentoUnidad.findMany({
      where: { fechaVencimiento: { gte: inicio, lte: fin } },
      orderBy: { fechaVencimiento: 'asc' },
      include: { unidad: true },
    });
  }
}
