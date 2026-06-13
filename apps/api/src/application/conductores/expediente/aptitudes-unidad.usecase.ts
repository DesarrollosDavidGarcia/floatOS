import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AptitudUnidadConductor, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { asegurarConductorExiste } from './asegurar-conductor';

export interface CrearAptitudUnidadInput {
  tipoUnidad: string;
  nivel?: string;
  aniosExperiencia?: number;
  notas?: string;
}

export interface ActualizarAptitudUnidadInput {
  tipoUnidad?: string;
  nivel?: string;
  aniosExperiencia?: number;
  notas?: string;
}

@Injectable()
export class AptitudesUnidadUseCase {
  constructor(private readonly prisma: PrismaService) {}

  private asegurarConductor(conductorId: string): Promise<void> {
    return asegurarConductorExiste(this.prisma, conductorId);
  }

  async crear(
    conductorId: string,
    input: CrearAptitudUnidadInput,
  ): Promise<AptitudUnidadConductor> {
    await this.asegurarConductor(conductorId);

    try {
      return await this.prisma.aptitudUnidadConductor.create({
        data: {
          conductorId,
          tipoUnidad: input.tipoUnidad,
          nivel: input.nivel ?? undefined,
          aniosExperiencia: input.aniosExperiencia ?? null,
          notas: input.notas ?? null,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ya existe una aptitud registrada para ese tipo de unidad',
        );
      }
      throw err;
    }
  }

  async listar(conductorId: string): Promise<AptitudUnidadConductor[]> {
    await this.asegurarConductor(conductorId);

    return this.prisma.aptitudUnidadConductor.findMany({
      where: { conductorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async obtener(
    conductorId: string,
    aptitudId: string,
  ): Promise<AptitudUnidadConductor> {
    const aptitud = await this.prisma.aptitudUnidadConductor.findUnique({
      where: { id: aptitudId },
    });
    if (!aptitud || aptitud.conductorId !== conductorId) {
      throw new NotFoundException(`Aptitud con id ${aptitudId} no encontrada`);
    }
    return aptitud;
  }

  async actualizar(
    conductorId: string,
    aptitudId: string,
    input: ActualizarAptitudUnidadInput,
  ): Promise<AptitudUnidadConductor> {
    await this.obtener(conductorId, aptitudId);

    const data: Prisma.AptitudUnidadConductorUpdateInput = {};
    if (input.tipoUnidad !== undefined) data.tipoUnidad = input.tipoUnidad;
    if (input.nivel !== undefined) data.nivel = input.nivel;
    if (input.aniosExperiencia !== undefined) data.aniosExperiencia = input.aniosExperiencia;
    if (input.notas !== undefined) data.notas = input.notas;

    try {
      return await this.prisma.aptitudUnidadConductor.update({
        where: { id: aptitudId },
        data,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ya existe una aptitud registrada para ese tipo de unidad',
        );
      }
      throw err;
    }
  }

  async eliminar(conductorId: string, aptitudId: string): Promise<void> {
    await this.obtener(conductorId, aptitudId);
    await this.prisma.aptitudUnidadConductor.delete({ where: { id: aptitudId } });
  }
}
