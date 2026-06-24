import { Injectable } from '@nestjs/common';
import { ExamenMedicoConductor } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ArchivosExpedienteUseCase } from '../archivos-expediente.usecase';
import { ExpedienteSubrecursoService } from './expediente-subrecurso.service';

export interface CrearExamenMedicoInput {
  tipo: string;
  resultado?: string;
  fechaExamen: string;
  fechaVencimiento?: string;
  institucion?: string;
  medico?: string;
  observaciones?: string;
  archivoKey?: string;
}

export interface ActualizarExamenMedicoInput {
  tipo?: string;
  resultado?: string;
  fechaExamen?: string;
  fechaVencimiento?: string;
  institucion?: string;
  medico?: string;
  observaciones?: string;
  archivoKey?: string;
}

/** Casos de uso para los exámenes médicos de un conductor. */
@Injectable()
export class ExamenesMedicosUseCase extends ExpedienteSubrecursoService<
  ExamenMedicoConductor,
  CrearExamenMedicoInput,
  ActualizarExamenMedicoInput
> {
  constructor(prisma: PrismaService, archivos: ArchivosExpedienteUseCase) {
    super(
      prisma,
      {
        delegate: (p) => p.examenMedicoConductor,
        etiqueta: 'Examen médico',
        noEncontrado: 'no encontrado',
        orderBy: { fechaExamen: 'desc' },
        seccionArchivo: 'EXAMEN_MEDICO',
        campos: [
          { nombre: 'tipo', tipo: 'requerido' },
          { nombre: 'resultado', tipo: 'opcionalUndefined' },
          { nombre: 'fechaExamen', tipo: 'fechaRequerida' },
          { nombre: 'fechaVencimiento', tipo: 'fechaOpcional' },
          { nombre: 'institucion', tipo: 'opcionalNull' },
          { nombre: 'medico', tipo: 'opcionalNull' },
          { nombre: 'observaciones', tipo: 'opcionalNull' },
          { nombre: 'archivoKey', tipo: 'opcionalNull' },
        ],
      },
      archivos,
    );
  }
}
