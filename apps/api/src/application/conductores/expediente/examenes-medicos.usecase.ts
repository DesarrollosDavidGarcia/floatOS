import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExamenMedicoConductor, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

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
export class ExamenesMedicosUseCase {
  constructor(private readonly prisma: PrismaService) {}

  private async asegurarConductor(conductorId: string): Promise<void> {
    const conductor = await this.prisma.conductor.findUnique({
      where: { id: conductorId },
    });
    if (!conductor) {
      throw new NotFoundException(`Conductor con id ${conductorId} no encontrado`);
    }
  }

  async crear(
    conductorId: string,
    input: CrearExamenMedicoInput,
  ): Promise<ExamenMedicoConductor> {
    await this.asegurarConductor(conductorId);

    return this.prisma.examenMedicoConductor.create({
      data: {
        conductorId,
        tipo: input.tipo,
        resultado: input.resultado ?? undefined,
        fechaExamen: new Date(input.fechaExamen),
        fechaVencimiento: input.fechaVencimiento
          ? new Date(input.fechaVencimiento)
          : null,
        institucion: input.institucion ?? null,
        medico: input.medico ?? null,
        observaciones: input.observaciones ?? null,
        archivoKey: input.archivoKey ?? null,
      },
    });
  }

  async listar(conductorId: string): Promise<ExamenMedicoConductor[]> {
    await this.asegurarConductor(conductorId);

    return this.prisma.examenMedicoConductor.findMany({
      where: { conductorId },
      orderBy: { fechaExamen: 'desc' },
    });
  }

  async obtener(
    conductorId: string,
    examenId: string,
  ): Promise<ExamenMedicoConductor> {
    const examen = await this.prisma.examenMedicoConductor.findUnique({
      where: { id: examenId },
    });
    if (!examen || examen.conductorId !== conductorId) {
      throw new NotFoundException(`Examen médico con id ${examenId} no encontrado`);
    }
    return examen;
  }

  async actualizar(
    conductorId: string,
    examenId: string,
    input: ActualizarExamenMedicoInput,
  ): Promise<ExamenMedicoConductor> {
    await this.obtener(conductorId, examenId);

    const data: Prisma.ExamenMedicoConductorUpdateInput = {};
    if (input.tipo !== undefined) data.tipo = input.tipo;
    if (input.resultado !== undefined) data.resultado = input.resultado;
    if (input.fechaExamen !== undefined) {
      data.fechaExamen = new Date(input.fechaExamen);
    }
    if (input.fechaVencimiento !== undefined) {
      data.fechaVencimiento = new Date(input.fechaVencimiento);
    }
    if (input.institucion !== undefined) data.institucion = input.institucion;
    if (input.medico !== undefined) data.medico = input.medico;
    if (input.observaciones !== undefined) data.observaciones = input.observaciones;
    if (input.archivoKey !== undefined) data.archivoKey = input.archivoKey;

    return this.prisma.examenMedicoConductor.update({
      where: { id: examenId },
      data,
    });
  }

  async eliminar(conductorId: string, examenId: string): Promise<void> {
    await this.obtener(conductorId, examenId);
    await this.prisma.examenMedicoConductor.delete({ where: { id: examenId } });
  }
}
