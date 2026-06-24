import { Injectable } from '@nestjs/common';
import { EventoLaboralConductor } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ExpedienteSubrecursoService } from './expediente-subrecurso.service';

export interface CrearEventoLaboralInput {
  tipo: string;
  titulo: string;
  descripcion?: string;
  puestoNuevo?: string;
  fecha: string;
  registradoPor?: string;
}

export interface ActualizarEventoLaboralInput {
  tipo?: string;
  titulo?: string;
  descripcion?: string;
  puestoNuevo?: string;
  fecha?: string;
  registradoPor?: string;
}

/** Casos de uso para los eventos laborales (trayectoria) de un conductor. */
@Injectable()
export class EventosLaboralesUseCase extends ExpedienteSubrecursoService<
  EventoLaboralConductor,
  CrearEventoLaboralInput,
  ActualizarEventoLaboralInput
> {
  constructor(prisma: PrismaService) {
    super(prisma, {
      delegate: (p) => p.eventoLaboralConductor,
      etiqueta: 'Evento laboral',
      noEncontrado: 'no encontrado',
      orderBy: { fecha: 'desc' },
      campos: [
        { nombre: 'tipo', tipo: 'requerido' },
        { nombre: 'titulo', tipo: 'requerido' },
        { nombre: 'descripcion', tipo: 'opcionalNull' },
        { nombre: 'puestoNuevo', tipo: 'opcionalNull' },
        { nombre: 'fecha', tipo: 'fechaRequerida' },
        { nombre: 'registradoPor', tipo: 'opcionalNull' },
      ],
    });
  }
}
