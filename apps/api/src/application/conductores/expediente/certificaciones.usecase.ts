import { Injectable } from '@nestjs/common';
import { CertificacionConductor } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ArchivosExpedienteUseCase } from '../archivos-expediente.usecase';
import { ExpedienteSubrecursoService } from './expediente-subrecurso.service';

export interface CrearCertificacionInput {
  tipo: string;
  nombre: string;
  emisor?: string;
  folio?: string;
  fechaEmision?: string;
  fechaVencimiento?: string;
  archivoKey?: string;
}

export interface ActualizarCertificacionInput {
  tipo?: string;
  nombre?: string;
  emisor?: string;
  folio?: string;
  fechaEmision?: string;
  fechaVencimiento?: string;
  archivoKey?: string;
}

@Injectable()
export class CertificacionesUseCase extends ExpedienteSubrecursoService<
  CertificacionConductor,
  CrearCertificacionInput,
  ActualizarCertificacionInput
> {
  constructor(prisma: PrismaService, archivos: ArchivosExpedienteUseCase) {
    super(
      prisma,
      {
        delegate: (p) => p.certificacionConductor,
        etiqueta: 'Certificación',
        noEncontrado: 'no encontrada',
        orderBy: { createdAt: 'desc' },
        seccionArchivo: 'CERTIFICACION',
        campos: [
          { nombre: 'tipo', tipo: 'requerido' },
          { nombre: 'nombre', tipo: 'requerido' },
          { nombre: 'emisor', tipo: 'opcionalNull' },
          { nombre: 'folio', tipo: 'opcionalNull' },
          { nombre: 'fechaEmision', tipo: 'fechaOpcional' },
          { nombre: 'fechaVencimiento', tipo: 'fechaOpcional' },
          { nombre: 'archivoKey', tipo: 'opcionalNull' },
        ],
      },
      archivos,
    );
  }
}
