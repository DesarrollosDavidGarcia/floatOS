import { Injectable } from '@nestjs/common';
import { EvaluacionDesempenoConductor } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ArchivosExpedienteUseCase } from '../archivos-expediente.usecase';
import { ExpedienteSubrecursoService } from './expediente-subrecurso.service';

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
export class EvaluacionesUseCase extends ExpedienteSubrecursoService<
  EvaluacionDesempenoConductor,
  CrearEvaluacionInput,
  ActualizarEvaluacionInput
> {
  constructor(prisma: PrismaService, archivos: ArchivosExpedienteUseCase) {
    super(
      prisma,
      {
        delegate: (p) => p.evaluacionDesempenoConductor,
        etiqueta: 'Evaluación',
        noEncontrado: 'no encontrada',
        orderBy: { periodoFin: 'desc' },
        seccionArchivo: 'EVALUACION',
        campos: [
          { nombre: 'periodoInicio', tipo: 'fechaRequerida' },
          { nombre: 'periodoFin', tipo: 'fechaRequerida' },
          { nombre: 'puntuacionGeneral', tipo: 'opcionalNull' },
          { nombre: 'puntualidad', tipo: 'opcionalNull' },
          { nombre: 'consumoCombustible', tipo: 'opcionalNull' },
          { nombre: 'cumplimientoRutas', tipo: 'opcionalNull' },
          { nombre: 'incidenciasPeriodo', tipo: 'opcionalNull' },
          { nombre: 'viajesCompletados', tipo: 'opcionalNull' },
          { nombre: 'comentarios', tipo: 'opcionalNull' },
          { nombre: 'evaluadoPor', tipo: 'opcionalNull' },
        ],
      },
      archivos,
    );
  }
}
