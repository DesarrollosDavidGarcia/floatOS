import { Injectable } from '@nestjs/common';
import { CapacitacionConductor } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ArchivosExpedienteUseCase } from '../archivos-expediente.usecase';
import { ExpedienteSubrecursoService } from './expediente-subrecurso.service';

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
export class CapacitacionesUseCase extends ExpedienteSubrecursoService<
  CapacitacionConductor,
  CrearCapacitacionInput,
  ActualizarCapacitacionInput
> {
  constructor(prisma: PrismaService, archivos: ArchivosExpedienteUseCase) {
    super(
      prisma,
      {
        delegate: (p) => p.capacitacionConductor,
        etiqueta: 'Capacitación',
        noEncontrado: 'no encontrada',
        orderBy: { createdAt: 'desc' },
        seccionArchivo: 'CAPACITACION',
        campos: [
          { nombre: 'nombre', tipo: 'requerido' },
          { nombre: 'instructor', tipo: 'opcionalNull' },
          { nombre: 'institucion', tipo: 'opcionalNull' },
          { nombre: 'horas', tipo: 'opcionalNull' },
          { nombre: 'fechaInicio', tipo: 'fechaOpcional' },
          { nombre: 'fechaFin', tipo: 'fechaOpcional' },
          { nombre: 'aprobado', tipo: 'opcionalNull' },
          { nombre: 'calificacion', tipo: 'opcionalNull' },
          { nombre: 'constanciaKey', tipo: 'opcionalNull' },
          { nombre: 'notas', tipo: 'opcionalNull' },
        ],
      },
      archivos,
    );
  }
}
