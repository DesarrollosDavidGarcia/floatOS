import { ConflictException, Injectable } from '@nestjs/common';
import { PrecioDiesel, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { obtenerOFallar } from '../shared/obtener-o-fallar';
import { paginar } from '../shared/paginar';
import { Paginado } from '@flotaos/shared-types';

/** Alta de un precio de diesel con su fecha de vigencia. */
export interface CrearPrecioDieselInput {
  precioPorLitro: number;
  /** Fecha ISO desde la que rige el precio. */
  vigenteDesde: string;
  notas?: string;
}

export type ActualizarPrecioDieselInput = Partial<CrearPrecioDieselInput>;

export interface ListarPreciosDieselInput {
  page?: number;
  pageSize?: number;
}

/**
 * Catálogo histórico del precio del diesel. Sirve para ESTIMAR el combustible de
 * un viaje cuando el conductor no capturó litros en el ticket: se toma el precio
 * con la vigencia más reciente que no sea posterior a la fecha del viaje.
 *
 * Es distinto del `precioDiesel` que vive en las tarifas de cotización de la
 * empresa: aquel sirve para PONER PRECIO al cliente y se congela en cada
 * cotización; este mide lo que costó.
 */
@Injectable()
export class PreciosDieselUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async crear(input: CrearPrecioDieselInput): Promise<PrecioDiesel> {
    const vigenteDesde = new Date(input.vigenteDesde);
    // La vigencia es única: dos precios el mismo día dejarían el costo del viaje
    // dependiendo de cuál gane el desempate.
    const existente = await this.prisma.precioDiesel.findUnique({
      where: { vigenteDesde },
    });
    if (existente) {
      throw new ConflictException(
        'Ya hay un precio de diesel con esa fecha de vigencia',
      );
    }
    return this.prisma.precioDiesel.create({
      data: {
        precioPorLitro: input.precioPorLitro,
        vigenteDesde,
        notas: input.notas ?? null,
      },
    });
  }

  /** Historial, del más reciente al más antiguo. */
  async listar(
    input: ListarPreciosDieselInput,
  ): Promise<Paginado<PrecioDiesel>> {
    return paginar<PrecioDiesel>(this.prisma.precioDiesel, {
      where: {},
      orderBy: { vigenteDesde: 'desc' },
      page: input.page,
      pageSize: input.pageSize,
    });
  }

  /**
   * Precio aplicable en una fecha: el de mayor `vigenteDesde` que no la supere.
   * Null si no hay ninguno cargado antes de esa fecha (viajes viejos), y el
   * cálculo de costo tiene que tratarlo como "sin dato", no como cero.
   */
  async vigenteEn(fecha: Date): Promise<PrecioDiesel | null> {
    return this.prisma.precioDiesel.findFirst({
      where: { vigenteDesde: { lte: fecha } },
      orderBy: { vigenteDesde: 'desc' },
    });
  }

  async obtener(id: string): Promise<PrecioDiesel> {
    return obtenerOFallar(
      () => this.prisma.precioDiesel.findUnique({ where: { id } }),
      `Precio de diesel con id ${id} no encontrado`,
    );
  }

  async actualizar(
    id: string,
    input: ActualizarPrecioDieselInput,
  ): Promise<PrecioDiesel> {
    await this.obtener(id);

    const data: Prisma.PrecioDieselUpdateInput = {};
    if (input.precioPorLitro !== undefined) {
      data.precioPorLitro = input.precioPorLitro;
    }
    if (input.notas !== undefined) data.notas = input.notas;
    if (input.vigenteDesde !== undefined) {
      const vigenteDesde = new Date(input.vigenteDesde);
      const otro = await this.prisma.precioDiesel.findUnique({
        where: { vigenteDesde },
      });
      if (otro && otro.id !== id) {
        throw new ConflictException(
          'Ya hay un precio de diesel con esa fecha de vigencia',
        );
      }
      data.vigenteDesde = vigenteDesde;
    }

    return this.prisma.precioDiesel.update({ where: { id }, data });
  }

  async eliminar(id: string): Promise<{ id: string }> {
    await this.obtener(id);
    await this.prisma.precioDiesel.delete({ where: { id } });
    return { id };
  }
}
