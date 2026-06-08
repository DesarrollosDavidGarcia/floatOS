import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  cotizar,
  type DatosCotizacion,
  type ParamsCotizacion,
} from '../../domain/cotizacion/motor-cotizacion';

const dec = (v: Prisma.Decimal | null): number => (v == null ? 0 : Number(v));

/**
 * Servicio de cotizaciones: ejecuta el motor de cálculo y persiste/consulta las
 * cotizaciones de un viaje. La lógica de precio es pura (domain/cotizacion).
 */
@Injectable()
export class CotizacionesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Previsualización (no persiste): corre el motor con params + datos dados. */
  calcular(params: ParamsCotizacion, datos: DatosCotizacion) {
    return cotizar(params, datos);
  }

  /** Crea una cotización tomando los datos (km/kg/escalas) del viaje. */
  async crear(viajeId: string, params: ParamsCotizacion, notas?: string) {
    const viaje = await this.prisma.viaje.findUnique({
      where: { id: viajeId },
      select: {
        distanciaEstimadaKm: true,
        pesoMaxKg: true,
        pesoKg: true,
        _count: { select: { escalas: true } },
      },
    });
    if (!viaje) {
      throw new NotFoundException(`Viaje con id ${viajeId} no encontrado`);
    }

    const datos: DatosCotizacion = {
      distanciaKm: dec(viaje.distanciaEstimadaKm),
      pesoKg: dec(viaje.pesoMaxKg) || dec(viaje.pesoKg),
      numEscalas: viaje._count.escalas,
    };
    const r = cotizar(params, datos);

    return this.prisma.cotizacion.create({
      data: {
        viaje: { connect: { id: viajeId } },
        params: params as unknown as Prisma.InputJsonValue,
        distanciaKm: datos.distanciaKm,
        pesoKg: datos.pesoKg,
        numEscalas: datos.numEscalas,
        desglose: {
          lineas: r.lineas,
          subtotalConceptos: r.subtotalConceptos,
          margen: r.margen,
        } as unknown as Prisma.InputJsonValue,
        subtotal: r.subtotal,
        iva: r.iva,
        retencion: r.retencion,
        total: r.total,
        notas: notas ?? null,
      },
    });
  }

  /** Lista las cotizaciones de un viaje (más reciente primero). */
  listarPorViaje(viajeId: string) {
    return this.prisma.cotizacion.findMany({
      where: { viajeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async obtener(id: string) {
    const cot = await this.prisma.cotizacion.findUnique({ where: { id } });
    if (!cot) throw new NotFoundException(`Cotización con id ${id} no encontrada`);
    return cot;
  }
}
