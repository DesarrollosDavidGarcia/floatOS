import { Injectable, NotFoundException } from '@nestjs/common';
import { IncidenciaConductor, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface CrearIncidenciaInput {
  tipo: string;
  gravedad?: string;
  titulo: string;
  descripcion?: string;
  fecha: string;
  lugar?: string;
  costoEstimado?: number;
  resuelta?: boolean;
  evidenciaKey?: string;
  registradoPor?: string;
  viajeId?: string;
}

export interface ActualizarIncidenciaInput {
  tipo?: string;
  gravedad?: string;
  titulo?: string;
  descripcion?: string;
  fecha?: string;
  lugar?: string;
  costoEstimado?: number;
  resuelta?: boolean;
  evidenciaKey?: string;
  registradoPor?: string;
  viajeId?: string;
}

@Injectable()
export class IncidenciasUseCase {
  constructor(private readonly prisma: PrismaService) {}

  private async asegurarConductor(conductorId: string): Promise<void> {
    const conductor = await this.prisma.conductor.findUnique({
      where: { id: conductorId },
      select: { id: true },
    });
    if (!conductor) {
      throw new NotFoundException(
        `Conductor con id ${conductorId} no encontrado`,
      );
    }
  }

  async crear(
    conductorId: string,
    input: CrearIncidenciaInput,
  ): Promise<IncidenciaConductor> {
    await this.asegurarConductor(conductorId);

    return this.prisma.incidenciaConductor.create({
      data: {
        conductorId,
        tipo: input.tipo,
        gravedad: input.gravedad ?? 'MEDIA',
        titulo: input.titulo,
        descripcion: input.descripcion ?? null,
        fecha: new Date(input.fecha),
        lugar: input.lugar ?? null,
        costoEstimado:
          input.costoEstimado !== undefined
            ? new Prisma.Decimal(input.costoEstimado)
            : null,
        resuelta: input.resuelta ?? false,
        evidenciaKey: input.evidenciaKey ?? null,
        registradoPor: input.registradoPor ?? null,
        viajeId: input.viajeId ?? null,
      },
    });
  }

  async listar(conductorId: string): Promise<IncidenciaConductor[]> {
    await this.asegurarConductor(conductorId);

    return this.prisma.incidenciaConductor.findMany({
      where: { conductorId },
      orderBy: { fecha: 'desc' },
    });
  }

  async obtener(
    conductorId: string,
    incidenciaId: string,
  ): Promise<IncidenciaConductor> {
    const incidencia = await this.prisma.incidenciaConductor.findUnique({
      where: { id: incidenciaId },
    });
    if (!incidencia || incidencia.conductorId !== conductorId) {
      throw new NotFoundException(
        `Incidencia con id ${incidenciaId} no encontrada`,
      );
    }
    return incidencia;
  }

  async actualizar(
    conductorId: string,
    incidenciaId: string,
    input: ActualizarIncidenciaInput,
  ): Promise<IncidenciaConductor> {
    await this.obtener(conductorId, incidenciaId);

    const data: Prisma.IncidenciaConductorUncheckedUpdateInput = {};
    if (input.tipo !== undefined) data.tipo = input.tipo;
    if (input.gravedad !== undefined) data.gravedad = input.gravedad;
    if (input.titulo !== undefined) data.titulo = input.titulo;
    if (input.descripcion !== undefined) data.descripcion = input.descripcion;
    if (input.fecha !== undefined) data.fecha = new Date(input.fecha);
    if (input.lugar !== undefined) data.lugar = input.lugar;
    if (input.costoEstimado !== undefined) {
      data.costoEstimado = new Prisma.Decimal(input.costoEstimado);
    }
    if (input.resuelta !== undefined) data.resuelta = input.resuelta;
    if (input.evidenciaKey !== undefined) data.evidenciaKey = input.evidenciaKey;
    if (input.registradoPor !== undefined)
      data.registradoPor = input.registradoPor;
    if (input.viajeId !== undefined) data.viajeId = input.viajeId;

    return this.prisma.incidenciaConductor.update({
      where: { id: incidenciaId },
      data,
    });
  }

  async eliminar(conductorId: string, incidenciaId: string): Promise<void> {
    await this.obtener(conductorId, incidenciaId);
    await this.prisma.incidenciaConductor.delete({
      where: { id: incidenciaId },
    });
  }
}
