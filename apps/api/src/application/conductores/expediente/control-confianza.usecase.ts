import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ControlConfianzaConductor, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { asegurarConductorExiste } from './asegurar-conductor';
import { ArchivosExpedienteUseCase } from '../archivos-expediente.usecase';

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
export class ControlConfianzaUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly archivos: ArchivosExpedienteUseCase,
  ) {}

  private asegurarConductor(conductorId: string): Promise<void> {
    return asegurarConductorExiste(this.prisma, conductorId);
  }

  async crear(
    conductorId: string,
    input: CrearControlConfianzaInput,
  ): Promise<ControlConfianzaConductor> {
    await this.asegurarConductor(conductorId);

    return this.prisma.controlConfianzaConductor.create({
      data: {
        conductorId,
        tipo: input.tipo,
        resultado: input.resultado ?? undefined,
        institucion: input.institucion ?? null,
        folio: input.folio ?? null,
        fechaEvaluacion: new Date(input.fechaEvaluacion),
        fechaVencimiento: input.fechaVencimiento
          ? new Date(input.fechaVencimiento)
          : null,
        observaciones: input.observaciones ?? null,
        archivoKey: input.archivoKey ?? null,
      },
    });
  }

  async listar(conductorId: string): Promise<ControlConfianzaConductor[]> {
    await this.asegurarConductor(conductorId);

    return this.prisma.controlConfianzaConductor.findMany({
      where: { conductorId },
      orderBy: { fechaEvaluacion: 'desc' },
    });
  }

  async obtener(
    conductorId: string,
    registroId: string,
  ): Promise<ControlConfianzaConductor> {
    const registro = await this.prisma.controlConfianzaConductor.findUnique({
      where: { id: registroId },
    });
    if (!registro || registro.conductorId !== conductorId) {
      throw new NotFoundException(
        `Registro de control de confianza con id ${registroId} no encontrado`,
      );
    }
    return registro;
  }

  async actualizar(
    conductorId: string,
    registroId: string,
    input: ActualizarControlConfianzaInput,
  ): Promise<ControlConfianzaConductor> {
    await this.obtener(conductorId, registroId);

    const data: Prisma.ControlConfianzaConductorUpdateInput = {};
    if (input.tipo !== undefined) data.tipo = input.tipo;
    if (input.resultado !== undefined) data.resultado = input.resultado;
    if (input.institucion !== undefined) data.institucion = input.institucion;
    if (input.folio !== undefined) data.folio = input.folio;
    if (input.fechaEvaluacion !== undefined) {
      data.fechaEvaluacion = new Date(input.fechaEvaluacion);
    }
    if (input.fechaVencimiento !== undefined) {
      data.fechaVencimiento = new Date(input.fechaVencimiento);
    }
    if (input.observaciones !== undefined) data.observaciones = input.observaciones;
    if (input.archivoKey !== undefined) data.archivoKey = input.archivoKey;

    return this.prisma.controlConfianzaConductor.update({
      where: { id: registroId },
      data,
    });
  }

  async eliminar(conductorId: string, registroId: string): Promise<void> {
    await this.obtener(conductorId, registroId);
    await this.archivos.eliminarDeRegistro('CONTROL_CONFIANZA', registroId);
    await this.prisma.controlConfianzaConductor.delete({ where: { id: registroId } });
  }
}
