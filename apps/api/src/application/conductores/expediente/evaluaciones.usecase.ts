import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EvaluacionDesempenoConductor, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface CrearEvaluacionInput {
  periodoInicio: string;
  periodoFin: string;
  puntuacionGeneral?: number;
  puntualidad?: number;
  consumoCombustible?: number;
  cumplimientoRutas?: number;
  incidenciasPeriodo?: number;
  viajesCompletados?: number;
  comentarios?: string;
  evaluadoPor?: string;
}

export interface ActualizarEvaluacionInput {
  periodoInicio?: string;
  periodoFin?: string;
  puntuacionGeneral?: number;
  puntualidad?: number;
  consumoCombustible?: number;
  cumplimientoRutas?: number;
  incidenciasPeriodo?: number;
  viajesCompletados?: number;
  comentarios?: string;
  evaluadoPor?: string;
}

/** Casos de uso para las evaluaciones de desempeño de un conductor. */
@Injectable()
export class EvaluacionesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  private async asegurarConductor(conductorId: string): Promise<void> {
    const conductor = await this.prisma.conductor.findUnique({
      where: { id: conductorId },
      select: { id: true },
    });
    if (!conductor) {
      throw new NotFoundException(`Conductor con id ${conductorId} no encontrado`);
    }
  }

  async crear(
    conductorId: string,
    input: CrearEvaluacionInput,
  ): Promise<EvaluacionDesempenoConductor> {
    await this.asegurarConductor(conductorId);

    return this.prisma.evaluacionDesempenoConductor.create({
      data: {
        conductorId,
        periodoInicio: new Date(input.periodoInicio),
        periodoFin: new Date(input.periodoFin),
        puntuacionGeneral: input.puntuacionGeneral ?? null,
        puntualidad: input.puntualidad ?? null,
        consumoCombustible: input.consumoCombustible ?? null,
        cumplimientoRutas: input.cumplimientoRutas ?? null,
        incidenciasPeriodo: input.incidenciasPeriodo ?? null,
        viajesCompletados: input.viajesCompletados ?? null,
        comentarios: input.comentarios ?? null,
        evaluadoPor: input.evaluadoPor ?? null,
      },
    });
  }

  async listar(conductorId: string): Promise<EvaluacionDesempenoConductor[]> {
    await this.asegurarConductor(conductorId);

    return this.prisma.evaluacionDesempenoConductor.findMany({
      where: { conductorId },
      orderBy: { periodoFin: 'desc' },
    });
  }

  async obtener(
    conductorId: string,
    evaluacionId: string,
  ): Promise<EvaluacionDesempenoConductor> {
    const evaluacion = await this.prisma.evaluacionDesempenoConductor.findUnique({
      where: { id: evaluacionId },
    });
    if (!evaluacion || evaluacion.conductorId !== conductorId) {
      throw new NotFoundException(`Evaluación con id ${evaluacionId} no encontrada`);
    }
    return evaluacion;
  }

  async actualizar(
    conductorId: string,
    evaluacionId: string,
    input: ActualizarEvaluacionInput,
  ): Promise<EvaluacionDesempenoConductor> {
    await this.obtener(conductorId, evaluacionId);

    const data: Prisma.EvaluacionDesempenoConductorUpdateInput = {};
    if (input.periodoInicio !== undefined) {
      data.periodoInicio = new Date(input.periodoInicio);
    }
    if (input.periodoFin !== undefined) {
      data.periodoFin = new Date(input.periodoFin);
    }
    if (input.puntuacionGeneral !== undefined) data.puntuacionGeneral = input.puntuacionGeneral;
    if (input.puntualidad !== undefined) data.puntualidad = input.puntualidad;
    if (input.consumoCombustible !== undefined) data.consumoCombustible = input.consumoCombustible;
    if (input.cumplimientoRutas !== undefined) data.cumplimientoRutas = input.cumplimientoRutas;
    if (input.incidenciasPeriodo !== undefined) data.incidenciasPeriodo = input.incidenciasPeriodo;
    if (input.viajesCompletados !== undefined) data.viajesCompletados = input.viajesCompletados;
    if (input.comentarios !== undefined) data.comentarios = input.comentarios;
    if (input.evaluadoPor !== undefined) data.evaluadoPor = input.evaluadoPor;

    return this.prisma.evaluacionDesempenoConductor.update({
      where: { id: evaluacionId },
      data,
    });
  }

  async eliminar(conductorId: string, evaluacionId: string): Promise<void> {
    await this.obtener(conductorId, evaluacionId);
    await this.prisma.evaluacionDesempenoConductor.delete({ where: { id: evaluacionId } });
  }
}
