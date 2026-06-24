import { Injectable } from '@nestjs/common';
import { AusenciaConductor } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ExpedienteSubrecursoService } from './expediente-subrecurso.service';

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
export class AusenciasUseCase extends ExpedienteSubrecursoService<
  AusenciaConductor,
  CrearAusenciaInput,
  ActualizarAusenciaInput
> {
  constructor(prisma: PrismaService) {
    super(prisma, {
      delegate: (p) => p.ausenciaConductor,
      etiqueta: 'Ausencia',
      noEncontrado: 'no encontrada',
      orderBy: { fechaInicio: 'desc' },
      campos: [
        { nombre: 'tipo', tipo: 'requerido' },
        { nombre: 'fechaInicio', tipo: 'fechaRequerida' },
        { nombre: 'fechaFin', tipo: 'fechaOpcional' },
        { nombre: 'dias', tipo: 'opcionalNull' },
        { nombre: 'motivo', tipo: 'opcionalNull' },
        { nombre: 'folioIncapacidad', tipo: 'opcionalNull' },
        { nombre: 'autorizadoPor', tipo: 'opcionalNull' },
        { nombre: 'documentoKey', tipo: 'opcionalNull' },
      ],
    });
  }
}
