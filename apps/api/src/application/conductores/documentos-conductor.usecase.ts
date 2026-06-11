import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DocumentoConductor,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  diasEntre,
  finDelDiaUTC,
  inicioDelDiaUTC,
  sumarDias,
} from '../shared/fecha.util';

/** Resumen del conductor embebido en los documentos por vencer. */
export interface ConductorResumen {
  id: string;
  nombre: string;
  apellidos: string | null;
  usuario: string;
  email: string | null;
  telefono: string | null;
  activo: boolean;
}

/** Documento por vencer con los días restantes calculados y el conductor. */
export interface DocumentoConductorPorVencer extends DocumentoConductor {
  conductor: ConductorResumen;
  diasRestantes: number;
}

export interface CrearDocumentoConductorInput {
  tipo: string;
  numero?: string;
  fechaEmision?: string;
  fechaVencimiento: string;
}

export interface ActualizarDocumentoConductorInput {
  tipo?: string;
  numero?: string;
  fechaEmision?: string;
  fechaVencimiento?: string;
}

/** Casos de uso para los documentos de un conductor. */
@Injectable()
export class DocumentosConductorUseCase {
  constructor(private readonly prisma: PrismaService) {}

  private async asegurarConductor(conductorId: string): Promise<void> {
    const conductor = await this.prisma.conductor.findUnique({
      where: { id: conductorId },
    });
    if (!conductor) {
      throw new NotFoundException(`Conductor con id ${conductorId} no encontrado`);
    }
  }

  async crear(
    conductorId: string,
    input: CrearDocumentoConductorInput,
  ): Promise<DocumentoConductor> {
    await this.asegurarConductor(conductorId);

    return this.prisma.documentoConductor.create({
      data: {
        conductorId,
        tipo: input.tipo,
        numero: input.numero ?? null,
        fechaEmision: input.fechaEmision
          ? new Date(input.fechaEmision)
          : null,
        fechaVencimiento: new Date(input.fechaVencimiento),
      },
    });
  }

  async listar(conductorId: string) {
    await this.asegurarConductor(conductorId);

    // Incluye el conteo de archivos adjuntos por documento (para la UI).
    return this.prisma.documentoConductor.findMany({
      where: { conductorId },
      orderBy: { fechaVencimiento: 'asc' },
      include: { _count: { select: { archivos: true } } },
    });
  }

  async obtener(
    conductorId: string,
    docId: string,
  ): Promise<DocumentoConductor> {
    const documento = await this.prisma.documentoConductor.findUnique({
      where: { id: docId },
    });
    if (!documento || documento.conductorId !== conductorId) {
      throw new NotFoundException(`Documento con id ${docId} no encontrado`);
    }
    return documento;
  }

  async actualizar(
    conductorId: string,
    docId: string,
    input: ActualizarDocumentoConductorInput,
  ): Promise<DocumentoConductor> {
    await this.obtener(conductorId, docId);

    const data: Prisma.DocumentoConductorUpdateInput = {};
    if (input.tipo !== undefined) data.tipo = input.tipo;
    if (input.numero !== undefined) data.numero = input.numero;
    if (input.fechaEmision !== undefined) {
      data.fechaEmision = new Date(input.fechaEmision);
    }
    if (input.fechaVencimiento !== undefined) {
      data.fechaVencimiento = new Date(input.fechaVencimiento);
    }

    return this.prisma.documentoConductor.update({
      where: { id: docId },
      data,
    });
  }

  async eliminar(conductorId: string, docId: string): Promise<void> {
    await this.obtener(conductorId, docId);
    await this.prisma.documentoConductor.delete({ where: { id: docId } });
  }

  /**
   * Documentos cuya fechaVencimiento cae en el rango [inicio de hoy,
   * fin de (hoy + `dias`)] en UTC. Excluye lo vencido hace tiempo e incluye
   * desde hoy hasta hoy+dias. Orden ascendente por fechaVencimiento.
   */
  async porVencer(dias: number): Promise<DocumentoConductorPorVencer[]> {
    const inicio = inicioDelDiaUTC();
    const limite = finDelDiaUTC(sumarDias(inicio, dias));

    const documentos = await this.prisma.documentoConductor.findMany({
      where: { fechaVencimiento: { gte: inicio, lte: limite } },
      orderBy: { fechaVencimiento: 'asc' },
      include: {
        conductor: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            usuario: true,
            email: true,
            telefono: true,
            activo: true,
          },
        },
      },
    });

    return documentos.map((doc) => ({
      ...doc,
      diasRestantes: diasEntre(inicio, doc.fechaVencimiento),
    }));
  }
}
