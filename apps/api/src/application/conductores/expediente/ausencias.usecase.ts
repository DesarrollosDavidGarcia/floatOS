import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AusenciaConductor, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface CrearAusenciaInput {
  tipo: string;
  fechaInicio: string;
  fechaFin?: string;
  dias?: number;
  motivo?: string;
  folioIncapacidad?: string;
  autorizadoPor?: string;
  documentoKey?: string;
}

export interface ActualizarAusenciaInput {
  tipo?: string;
  fechaInicio?: string;
  fechaFin?: string;
  dias?: number;
  motivo?: string;
  folioIncapacidad?: string;
  autorizadoPor?: string;
  documentoKey?: string;
}

/** Casos de uso para las ausencias de un conductor. */
@Injectable()
export class AusenciasUseCase {
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
    input: CrearAusenciaInput,
  ): Promise<AusenciaConductor> {
    await this.asegurarConductor(conductorId);

    return this.prisma.ausenciaConductor.create({
      data: {
        conductorId,
        tipo: input.tipo,
        fechaInicio: new Date(input.fechaInicio),
        fechaFin: input.fechaFin ? new Date(input.fechaFin) : null,
        dias: input.dias ?? null,
        motivo: input.motivo ?? null,
        folioIncapacidad: input.folioIncapacidad ?? null,
        autorizadoPor: input.autorizadoPor ?? null,
        documentoKey: input.documentoKey ?? null,
      },
    });
  }

  async listar(conductorId: string): Promise<AusenciaConductor[]> {
    await this.asegurarConductor(conductorId);

    return this.prisma.ausenciaConductor.findMany({
      where: { conductorId },
      orderBy: { fechaInicio: 'desc' },
    });
  }

  async obtener(
    conductorId: string,
    ausenciaId: string,
  ): Promise<AusenciaConductor> {
    const ausencia = await this.prisma.ausenciaConductor.findUnique({
      where: { id: ausenciaId },
    });
    if (!ausencia || ausencia.conductorId !== conductorId) {
      throw new NotFoundException(`Ausencia con id ${ausenciaId} no encontrada`);
    }
    return ausencia;
  }

  async actualizar(
    conductorId: string,
    ausenciaId: string,
    input: ActualizarAusenciaInput,
  ): Promise<AusenciaConductor> {
    await this.obtener(conductorId, ausenciaId);

    const data: Prisma.AusenciaConductorUpdateInput = {};
    if (input.tipo !== undefined) data.tipo = input.tipo;
    if (input.fechaInicio !== undefined) {
      data.fechaInicio = new Date(input.fechaInicio);
    }
    if (input.fechaFin !== undefined) {
      data.fechaFin = new Date(input.fechaFin);
    }
    if (input.dias !== undefined) data.dias = input.dias;
    if (input.motivo !== undefined) data.motivo = input.motivo;
    if (input.folioIncapacidad !== undefined) data.folioIncapacidad = input.folioIncapacidad;
    if (input.autorizadoPor !== undefined) data.autorizadoPor = input.autorizadoPor;
    if (input.documentoKey !== undefined) data.documentoKey = input.documentoKey;

    return this.prisma.ausenciaConductor.update({
      where: { id: ausenciaId },
      data,
    });
  }

  async eliminar(conductorId: string, ausenciaId: string): Promise<void> {
    await this.obtener(conductorId, ausenciaId);
    await this.prisma.ausenciaConductor.delete({ where: { id: ausenciaId } });
  }
}
