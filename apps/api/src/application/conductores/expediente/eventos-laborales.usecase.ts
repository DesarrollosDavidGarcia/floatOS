import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventoLaboralConductor, Prisma } from '@prisma/client';
import { TipoEventoLaboral } from '@flotaos/shared-types';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface CrearEventoLaboralInput {
  tipo: TipoEventoLaboral;
  titulo: string;
  descripcion?: string;
  puestoNuevo?: string;
  fecha: string;
  registradoPor?: string;
}

export interface ActualizarEventoLaboralInput {
  tipo?: TipoEventoLaboral;
  titulo?: string;
  descripcion?: string;
  puestoNuevo?: string;
  fecha?: string;
  registradoPor?: string;
}

/** Casos de uso para los eventos laborales (trayectoria) de un conductor. */
@Injectable()
export class EventosLaboralesUseCase {
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
    input: CrearEventoLaboralInput,
  ): Promise<EventoLaboralConductor> {
    await this.asegurarConductor(conductorId);

    return this.prisma.eventoLaboralConductor.create({
      data: {
        conductorId,
        tipo: input.tipo,
        titulo: input.titulo,
        descripcion: input.descripcion ?? null,
        puestoNuevo: input.puestoNuevo ?? null,
        fecha: new Date(input.fecha),
        registradoPor: input.registradoPor ?? null,
      },
    });
  }

  async listar(conductorId: string): Promise<EventoLaboralConductor[]> {
    await this.asegurarConductor(conductorId);

    return this.prisma.eventoLaboralConductor.findMany({
      where: { conductorId },
      orderBy: { fecha: 'desc' },
    });
  }

  async obtener(
    conductorId: string,
    eventoId: string,
  ): Promise<EventoLaboralConductor> {
    const evento = await this.prisma.eventoLaboralConductor.findUnique({
      where: { id: eventoId },
    });
    if (!evento || evento.conductorId !== conductorId) {
      throw new NotFoundException(`Evento laboral con id ${eventoId} no encontrado`);
    }
    return evento;
  }

  async actualizar(
    conductorId: string,
    eventoId: string,
    input: ActualizarEventoLaboralInput,
  ): Promise<EventoLaboralConductor> {
    await this.obtener(conductorId, eventoId);

    const data: Prisma.EventoLaboralConductorUpdateInput = {};
    if (input.tipo !== undefined) data.tipo = input.tipo;
    if (input.titulo !== undefined) data.titulo = input.titulo;
    if (input.descripcion !== undefined) data.descripcion = input.descripcion;
    if (input.puestoNuevo !== undefined) data.puestoNuevo = input.puestoNuevo;
    if (input.fecha !== undefined) data.fecha = new Date(input.fecha);
    if (input.registradoPor !== undefined) data.registradoPor = input.registradoPor;

    return this.prisma.eventoLaboralConductor.update({
      where: { id: eventoId },
      data,
    });
  }

  async eliminar(conductorId: string, eventoId: string): Promise<void> {
    await this.obtener(conductorId, eventoId);
    await this.prisma.eventoLaboralConductor.delete({ where: { id: eventoId } });
  }
}
