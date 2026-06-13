import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CapacitacionConductor, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { asegurarConductorExiste } from './asegurar-conductor';
import { ArchivosExpedienteUseCase } from '../archivos-expediente.usecase';

export interface CrearCapacitacionInput {
  nombre: string;
  instructor?: string;
  institucion?: string;
  horas?: number;
  fechaInicio?: string;
  fechaFin?: string;
  aprobado?: boolean;
  calificacion?: number;
  constanciaKey?: string;
  notas?: string;
}

export interface ActualizarCapacitacionInput {
  nombre?: string;
  instructor?: string;
  institucion?: string;
  horas?: number;
  fechaInicio?: string;
  fechaFin?: string;
  aprobado?: boolean;
  calificacion?: number;
  constanciaKey?: string;
  notas?: string;
}

@Injectable()
export class CapacitacionesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly archivos: ArchivosExpedienteUseCase,
  ) {}

  private asegurarConductor(conductorId: string): Promise<void> {
    return asegurarConductorExiste(this.prisma, conductorId);
  }

  async crear(
    conductorId: string,
    input: CrearCapacitacionInput,
  ): Promise<CapacitacionConductor> {
    await this.asegurarConductor(conductorId);

    return this.prisma.capacitacionConductor.create({
      data: {
        conductorId,
        nombre: input.nombre,
        instructor: input.instructor ?? null,
        institucion: input.institucion ?? null,
        horas: input.horas ?? null,
        fechaInicio: input.fechaInicio ? new Date(input.fechaInicio) : null,
        fechaFin: input.fechaFin ? new Date(input.fechaFin) : null,
        aprobado: input.aprobado ?? null,
        calificacion: input.calificacion ?? null,
        constanciaKey: input.constanciaKey ?? null,
        notas: input.notas ?? null,
      },
    });
  }

  async listar(conductorId: string): Promise<CapacitacionConductor[]> {
    await this.asegurarConductor(conductorId);

    return this.prisma.capacitacionConductor.findMany({
      where: { conductorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async obtener(
    conductorId: string,
    capacitacionId: string,
  ): Promise<CapacitacionConductor> {
    const capacitacion = await this.prisma.capacitacionConductor.findUnique({
      where: { id: capacitacionId },
    });
    if (!capacitacion || capacitacion.conductorId !== conductorId) {
      throw new NotFoundException(
        `Capacitación con id ${capacitacionId} no encontrada`,
      );
    }
    return capacitacion;
  }

  async actualizar(
    conductorId: string,
    capacitacionId: string,
    input: ActualizarCapacitacionInput,
  ): Promise<CapacitacionConductor> {
    await this.obtener(conductorId, capacitacionId);

    const data: Prisma.CapacitacionConductorUpdateInput = {};
    if (input.nombre !== undefined) data.nombre = input.nombre;
    if (input.instructor !== undefined) data.instructor = input.instructor;
    if (input.institucion !== undefined) data.institucion = input.institucion;
    if (input.horas !== undefined) data.horas = input.horas;
    if (input.fechaInicio !== undefined) {
      data.fechaInicio = new Date(input.fechaInicio);
    }
    if (input.fechaFin !== undefined) {
      data.fechaFin = new Date(input.fechaFin);
    }
    if (input.aprobado !== undefined) data.aprobado = input.aprobado;
    if (input.calificacion !== undefined) data.calificacion = input.calificacion;
    if (input.constanciaKey !== undefined) data.constanciaKey = input.constanciaKey;
    if (input.notas !== undefined) data.notas = input.notas;

    return this.prisma.capacitacionConductor.update({
      where: { id: capacitacionId },
      data,
    });
  }

  async eliminar(conductorId: string, capacitacionId: string): Promise<void> {
    await this.obtener(conductorId, capacitacionId);
    await this.archivos.eliminarDeRegistro('CAPACITACION', capacitacionId);
    await this.prisma.capacitacionConductor.delete({ where: { id: capacitacionId } });
  }
}
