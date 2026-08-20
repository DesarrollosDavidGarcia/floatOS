import { BadRequestException, Injectable } from '@nestjs/common';
import { ConceptoCostoUnidad, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { obtenerOFallar } from '../shared/obtener-o-fallar';

export interface CrearConceptoCostoInput {
  concepto: string;
  costo: number;
  vidaUtilKm: number;
  notas?: string;
}

export type ActualizarConceptoCostoInput = Partial<CrearConceptoCostoInput>;

/** Un concepto con su aportación al costo por km ya calculada. */
export interface ConceptoCostoVista {
  id: string;
  concepto: string;
  costo: number;
  vidaUtilKm: number;
  notas: string | null;
  /** costo ÷ vidaUtilKm, redondeado a 4 decimales (céntimos por km importan). */
  costoPorKm: number;
}

export interface CostosUnidadVista {
  conceptos: ConceptoCostoVista[];
  /** Suma de los conceptos: el costo variable por km de la unidad. */
  totalPorKm: number;
}

/** Redondeo a 4 decimales: a $/km, dos decimales esconden diferencias reales. */
const r4 = (n: number): number => Math.round((n + Number.EPSILON) * 10000) / 10000;

function aVista(c: ConceptoCostoUnidad): ConceptoCostoVista {
  const costo = Number(c.costo);
  return {
    id: c.id,
    concepto: c.concepto,
    costo,
    vidaUtilKm: c.vidaUtilKm,
    notas: c.notas,
    costoPorKm: c.vidaUtilKm > 0 ? r4(costo / c.vidaUtilKm) : 0,
  };
}

/**
 * Conceptos del costo de operación de una unidad. Cada uno aporta
 * `costo / vidaUtilKm` al costo por kilómetro, y la suma es lo que el motor de
 * margen le carga a cada viaje.
 */
@Injectable()
export class ConceptosCostoUseCase {
  constructor(private readonly prisma: PrismaService) {}

  /** Falla si la unidad no existe: evita colgar conceptos de un id inventado. */
  private async asegurarUnidad(unidadId: string): Promise<void> {
    await obtenerOFallar(
      () => this.prisma.unidad.findUnique({ where: { id: unidadId } }),
      `Unidad con id ${unidadId} no encontrada`,
    );
  }

  async listar(unidadId: string): Promise<CostosUnidadVista> {
    await this.asegurarUnidad(unidadId);
    const filas = await this.prisma.conceptoCostoUnidad.findMany({
      where: { unidadId },
      orderBy: { createdAt: 'asc' },
    });
    const conceptos = filas.map(aVista);
    return {
      conceptos,
      totalPorKm: r4(conceptos.reduce((t, c) => t + c.costoPorKm, 0)),
    };
  }

  async crear(
    unidadId: string,
    input: CrearConceptoCostoInput,
  ): Promise<ConceptoCostoVista> {
    await this.asegurarUnidad(unidadId);
    if (input.vidaUtilKm <= 0) {
      throw new BadRequestException(
        'La vida útil en kilómetros debe ser mayor a 0',
      );
    }
    const creado = await this.prisma.conceptoCostoUnidad.create({
      data: {
        unidadId,
        concepto: input.concepto,
        costo: input.costo,
        vidaUtilKm: input.vidaUtilKm,
        notas: input.notas ?? null,
      },
    });
    return aVista(creado);
  }

  async actualizar(
    id: string,
    input: ActualizarConceptoCostoInput,
  ): Promise<ConceptoCostoVista> {
    await obtenerOFallar(
      () => this.prisma.conceptoCostoUnidad.findUnique({ where: { id } }),
      `Concepto de costo con id ${id} no encontrado`,
    );
    if (input.vidaUtilKm !== undefined && input.vidaUtilKm <= 0) {
      throw new BadRequestException(
        'La vida útil en kilómetros debe ser mayor a 0',
      );
    }
    const data: Prisma.ConceptoCostoUnidadUpdateInput = {};
    if (input.concepto !== undefined) data.concepto = input.concepto;
    if (input.costo !== undefined) data.costo = input.costo;
    if (input.vidaUtilKm !== undefined) data.vidaUtilKm = input.vidaUtilKm;
    if (input.notas !== undefined) data.notas = input.notas;

    const actualizado = await this.prisma.conceptoCostoUnidad.update({
      where: { id },
      data,
    });
    return aVista(actualizado);
  }

  async eliminar(id: string): Promise<{ id: string }> {
    await obtenerOFallar(
      () => this.prisma.conceptoCostoUnidad.findUnique({ where: { id } }),
      `Concepto de costo con id ${id} no encontrado`,
    );
    await this.prisma.conceptoCostoUnidad.delete({ where: { id } });
    return { id };
  }
}
