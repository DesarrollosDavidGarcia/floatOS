import { Injectable } from '@nestjs/common';
import { AptitudUnidadConductor } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ExpedienteSubrecursoService } from './expediente-subrecurso.service';

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
export class AptitudesUnidadUseCase extends ExpedienteSubrecursoService<
  AptitudUnidadConductor,
  CrearAptitudUnidadInput,
  ActualizarAptitudUnidadInput
> {
  constructor(prisma: PrismaService) {
    super(prisma, {
      delegate: (p) => p.aptitudUnidadConductor,
      etiqueta: 'Aptitud',
      noEncontrado: 'no encontrada',
      orderBy: { createdAt: 'desc' },
      conflictoUnico:
        'Ya existe una aptitud registrada para ese tipo de unidad',
      campos: [
        { nombre: 'tipoUnidad', tipo: 'requerido' },
        { nombre: 'nivel', tipo: 'opcionalUndefined' },
        { nombre: 'aniosExperiencia', tipo: 'opcionalNull' },
        { nombre: 'notas', tipo: 'opcionalNull' },
      ],
    });
  }
}
