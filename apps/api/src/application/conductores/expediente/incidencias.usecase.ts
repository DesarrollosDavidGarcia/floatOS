import { Injectable } from '@nestjs/common';
import { IncidenciaConductor } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ArchivosExpedienteUseCase } from '../archivos-expediente.usecase';
import { ExpedienteSubrecursoService } from './expediente-subrecurso.service';

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
export class IncidenciasUseCase extends ExpedienteSubrecursoService<
  IncidenciaConductor,
  CrearIncidenciaInput,
  ActualizarIncidenciaInput
> {
  constructor(prisma: PrismaService, archivos: ArchivosExpedienteUseCase) {
    super(
      prisma,
      {
        delegate: (p) => p.incidenciaConductor,
        etiqueta: 'Incidencia',
        noEncontrado: 'no encontrada',
        orderBy: { fecha: 'desc' },
        seccionArchivo: 'INCIDENCIA',
        campos: [
          { nombre: 'tipo', tipo: 'requerido' },
          // Sin valor explícito se aplica el @default("MEDIA") del schema.
          { nombre: 'gravedad', tipo: 'opcionalUndefined' },
          { nombre: 'titulo', tipo: 'requerido' },
          { nombre: 'descripcion', tipo: 'opcionalNull' },
          { nombre: 'fecha', tipo: 'fechaRequerida' },
          { nombre: 'lugar', tipo: 'opcionalNull' },
          { nombre: 'costoEstimado', tipo: 'decimalOpcional' },
          { nombre: 'resuelta', tipo: 'boolDefault', valorDefault: false },
          { nombre: 'evidenciaKey', tipo: 'opcionalNull' },
          { nombre: 'registradoPor', tipo: 'opcionalNull' },
          { nombre: 'viajeId', tipo: 'opcionalNull' },
        ],
      },
      archivos,
    );
  }
}
