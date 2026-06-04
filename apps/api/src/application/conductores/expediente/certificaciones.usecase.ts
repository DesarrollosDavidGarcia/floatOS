import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CertificacionConductor, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface CrearCertificacionInput {
  tipo: string;
  nombre: string;
  emisor?: string;
  folio?: string;
  fechaEmision?: string;
  fechaVencimiento?: string;
  archivoKey?: string;
}

export interface ActualizarCertificacionInput {
  tipo?: string;
  nombre?: string;
  emisor?: string;
  folio?: string;
  fechaEmision?: string;
  fechaVencimiento?: string;
  archivoKey?: string;
}

@Injectable()
export class CertificacionesUseCase {
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
    input: CrearCertificacionInput,
  ): Promise<CertificacionConductor> {
    await this.asegurarConductor(conductorId);

    return this.prisma.certificacionConductor.create({
      data: {
        conductorId,
        tipo: input.tipo as any,
        nombre: input.nombre,
        emisor: input.emisor ?? null,
        folio: input.folio ?? null,
        fechaEmision: input.fechaEmision ? new Date(input.fechaEmision) : null,
        fechaVencimiento: input.fechaVencimiento
          ? new Date(input.fechaVencimiento)
          : null,
        archivoKey: input.archivoKey ?? null,
      },
    });
  }

  async listar(conductorId: string): Promise<CertificacionConductor[]> {
    await this.asegurarConductor(conductorId);

    return this.prisma.certificacionConductor.findMany({
      where: { conductorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async obtener(
    conductorId: string,
    certId: string,
  ): Promise<CertificacionConductor> {
    const cert = await this.prisma.certificacionConductor.findUnique({
      where: { id: certId },
    });
    if (!cert || cert.conductorId !== conductorId) {
      throw new NotFoundException(`Certificación con id ${certId} no encontrada`);
    }
    return cert;
  }

  async actualizar(
    conductorId: string,
    certId: string,
    input: ActualizarCertificacionInput,
  ): Promise<CertificacionConductor> {
    await this.obtener(conductorId, certId);

    const data: Prisma.CertificacionConductorUpdateInput = {};
    if (input.tipo !== undefined) data.tipo = input.tipo as any;
    if (input.nombre !== undefined) data.nombre = input.nombre;
    if (input.emisor !== undefined) data.emisor = input.emisor;
    if (input.folio !== undefined) data.folio = input.folio;
    if (input.fechaEmision !== undefined) {
      data.fechaEmision = new Date(input.fechaEmision);
    }
    if (input.fechaVencimiento !== undefined) {
      data.fechaVencimiento = new Date(input.fechaVencimiento);
    }
    if (input.archivoKey !== undefined) data.archivoKey = input.archivoKey;

    return this.prisma.certificacionConductor.update({
      where: { id: certId },
      data,
    });
  }

  async eliminar(conductorId: string, certId: string): Promise<void> {
    await this.obtener(conductorId, certId);
    await this.prisma.certificacionConductor.delete({ where: { id: certId } });
  }
}
