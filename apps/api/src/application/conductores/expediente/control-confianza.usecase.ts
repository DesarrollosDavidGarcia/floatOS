import { Injectable } from '@nestjs/common';
import { ControlConfianzaConductor } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ArchivosExpedienteUseCase } from '../archivos-expediente.usecase';
import { ExpedienteSubrecursoService } from './expediente-subrecurso.service';

export interface CrearControlConfianzaInput {
  tipo: string;
  resultado?: string;
  institucion?: string;
  folio?: string;
  fechaEvaluacion: string;
  fechaVencimiento?: string;
  observaciones?: string;
  archivoKey?: string;
}

export interface ActualizarControlConfianzaInput {
  tipo?: string;
  resultado?: string;
  institucion?: string;
  folio?: string;
  fechaEvaluacion?: string;
  fechaVencimiento?: string;
  observaciones?: string;
  archivoKey?: string;
}

/** Casos de uso para los registros de control de confianza de un conductor. */
@Injectable()
export class ControlConfianzaUseCase extends ExpedienteSubrecursoService<
  ControlConfianzaConductor,
  CrearControlConfianzaInput,
  ActualizarControlConfianzaInput
> {
  constructor(prisma: PrismaService, archivos: ArchivosExpedienteUseCase) {
    super(
      prisma,
      {
        delegate: (p) => p.controlConfianzaConductor,
        etiqueta: 'Registro de control de confianza',
        noEncontrado: 'no encontrado',
        orderBy: { fechaEvaluacion: 'desc' },
        seccionArchivo: 'CONTROL_CONFIANZA',
        campos: [
          { nombre: 'tipo', tipo: 'requerido' },
          { nombre: 'resultado', tipo: 'opcionalUndefined' },
          { nombre: 'institucion', tipo: 'opcionalNull' },
          { nombre: 'folio', tipo: 'opcionalNull' },
          { nombre: 'fechaEvaluacion', tipo: 'fechaRequerida' },
          { nombre: 'fechaVencimiento', tipo: 'fechaOpcional' },
          { nombre: 'observaciones', tipo: 'opcionalNull' },
          { nombre: 'archivoKey', tipo: 'opcionalNull' },
        ],
      },
      archivos,
    );
  }
}
