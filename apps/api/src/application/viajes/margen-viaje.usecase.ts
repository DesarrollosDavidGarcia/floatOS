import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PreciosDieselUseCase } from '../costos/precios-diesel.usecase';
import { obtenerOFallar } from '../shared/obtener-o-fallar';
import {
  calcularMargen,
  DatosMargen,
  ResultadoMargen,
} from '../../domain/margen/motor-margen';

/** Estancia en una escala: lo que tardó entre entrar y salir de la geocerca. */
export interface EstanciaEscala {
  orden: number;
  accion: string;
  direccion: string;
  llegadaEn: Date | null;
  salidaEn: Date | null;
  /** Minutos dentro de la geocerca; null si la estancia sigue abierta. */
  estanciaMin: number | null;
}

export interface MargenViajeVista extends ResultadoMargen {
  viajeId: string;
  folio: number;
  moneda: string;
  escalas: EstanciaEscala[];
  /** Suma de las estancias cerradas, en minutos. */
  estanciaTotalMin: number;
}

/** Decimal de Prisma a number; null/undefined se conservan. */
function dec(v: Prisma.Decimal | null | undefined): number | null {
  return v == null ? null : Number(v);
}

/** Rango [gte, lt) del mes calendario (UTC) que contiene a `fecha`. */
export function mesDe(fecha: Date): { gte: Date; lt: Date } {
  const y = fecha.getUTCFullYear();
  const m = fecha.getUTCMonth();
  return { gte: new Date(Date.UTC(y, m, 1)), lt: new Date(Date.UTC(y, m + 1, 1)) };
}

/**
 * Rango [gte, lt) del periodo de sueldo que contiene a `fecha`. Los periodos van
 * anclados al calendario, como se paga en la práctica: la semana de lunes a
 * domingo, la quincena 1-15 y 16-fin de mes, y el mes natural.
 */
export function periodoDeSueldo(
  fecha: Date,
  periodicidad?: string | null,
): { gte: Date; lt: Date } {
  const y = fecha.getUTCFullYear();
  const m = fecha.getUTCMonth();
  const d = fecha.getUTCDate();

  if (periodicidad === 'MENSUAL') return mesDe(fecha);

  if (periodicidad === 'SEMANAL') {
    // getUTCDay(): 0 = domingo. Se corre al lunes anterior.
    const diaSemana = fecha.getUTCDay();
    const desdeLunes = (diaSemana + 6) % 7;
    const gte = new Date(Date.UTC(y, m, d - desdeLunes));
    return { gte, lt: new Date(Date.UTC(y, m, d - desdeLunes + 7)) };
  }

  // QUINCENAL (y default): 1-15 y 16-fin de mes.
  return d <= 15
    ? { gte: new Date(Date.UTC(y, m, 1)), lt: new Date(Date.UTC(y, m, 16)) }
    : { gte: new Date(Date.UTC(y, m, 16)), lt: new Date(Date.UTC(y, m + 1, 1)) };
}

/**
 * Filtro de "viajes ocurridos en el rango". Se prefiere la fecha real de inicio;
 * si el viaje no arrancó se usa la programada y, en última instancia, el alta.
 */
function enRango(gte: Date, lt: Date): Prisma.ViajeWhereInput {
  return {
    OR: [
      { fechaInicio: { gte, lt } },
      { fechaInicio: null, fechaProgramada: { gte, lt } },
      { fechaInicio: null, fechaProgramada: null, createdAt: { gte, lt } },
    ],
  };
}

/**
 * Margen real de un viaje: reúne ingreso, costos de flota, pago del conductor y
 * gastos capturados, y se los pasa al motor. También devuelve la estancia por
 * escala, que es la materia prima de las demoras cobrables.
 */
@Injectable()
export class MargenViajeUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly precios: PreciosDieselUseCase,
  ) {}

  async execute(viajeId: string): Promise<MargenViajeVista> {
    const viaje = await obtenerOFallar(
      () =>
        this.prisma.viaje.findUnique({
          where: { id: viajeId },
          select: {
            id: true,
            folio: true,
            moneda: true,
            precioAcordado: true,
            distanciaEstimadaKm: true,
            odometroInicial: true,
            odometroFinal: true,
            fechaInicio: true,
            fechaProgramada: true,
            createdAt: true,
            unidadId: true,
            conductorId: true,
            unidad: {
              select: {
                rendimientoKmL: true,
                costoMantenimientoPorKm: true,
                costoFijoMensual: true,
                conceptosCosto: { select: { costo: true, vidaUtilKm: true } },
              },
            },
            conductor: {
              select: {
                sueldoPeriodo: true,
                periodicidadSueldo: true,
                tarifaPorViaje: true,
                pagoPorKm: true,
                porcentajeFlete: true,
              },
            },
            gastos: { select: { tipo: true, monto: true } },
            escalas: {
              select: {
                orden: true,
                accion: true,
                direccion: true,
                llegadaEn: true,
                salidaRegistradaEn: true,
              },
              orderBy: { orden: 'asc' },
            },
          },
        }),
      `Viaje con id ${viajeId} no encontrado`,
    );

    // Fecha de referencia del viaje: la real si arrancó, si no la planeada.
    const fecha = viaje.fechaInicio ?? viaje.fechaProgramada ?? viaje.createdAt;

    const mes = mesDe(fecha);
    const periodo = periodoDeSueldo(fecha, viaje.conductor?.periodicidadSueldo);

    const [precioDiesel, viajesDelMes, viajesDelPeriodo] = await Promise.all([
      this.precios.vigenteEn(fecha),
      viaje.unidadId
        ? this.prisma.viaje.count({
            where: { unidadId: viaje.unidadId, ...enRango(mes.gte, mes.lt) },
          })
        : Promise.resolve(0),
      viaje.conductorId
        ? this.prisma.viaje.count({
            where: {
              conductorId: viaje.conductorId,
              ...enRango(periodo.gte, periodo.lt),
            },
          })
        : Promise.resolve(0),
    ]);

    // Costo variable por km: manda el desglose por conceptos (llantas, servicios,
    // frenos…) porque es el que se puede auditar. El campo manual de la unidad
    // queda de respaldo para las unidades que aún no lo tengan desmenuzado.
    const porConceptos = (viaje.unidad?.conceptosCosto ?? []).reduce(
      (total, c) => (c.vidaUtilKm > 0 ? total + Number(c.costo) / c.vidaUtilKm : total),
      0,
    );
    const costoPorKm =
      porConceptos > 0 ? porConceptos : dec(viaje.unidad?.costoMantenimientoPorKm);

    const datos: DatosMargen = {
      precioAcordado: dec(viaje.precioAcordado),
      distanciaEstimadaKm: dec(viaje.distanciaEstimadaKm),
      odometroInicial: viaje.odometroInicial,
      odometroFinal: viaje.odometroFinal,
      unidad: viaje.unidad
        ? {
            rendimientoKmL: dec(viaje.unidad.rendimientoKmL),
            costoMantenimientoPorKm: costoPorKm,
            costoFijoMensual: dec(viaje.unidad.costoFijoMensual),
            viajesDelMes,
          }
        : null,
      conductor: viaje.conductor
        ? {
            sueldoPeriodo: dec(viaje.conductor.sueldoPeriodo),
            periodicidadSueldo: viaje.conductor.periodicidadSueldo,
            tarifaPorViaje: dec(viaje.conductor.tarifaPorViaje),
            pagoPorKm: dec(viaje.conductor.pagoPorKm),
            porcentajeFlete: dec(viaje.conductor.porcentajeFlete),
            viajesDelPeriodo,
          }
        : null,
      precioDieselPorLitro: precioDiesel ? Number(precioDiesel.precioPorLitro) : null,
      gastos: viaje.gastos.map((g) => ({ tipo: g.tipo, monto: Number(g.monto) })),
    };

    const resultado = calcularMargen(datos);

    const escalas: EstanciaEscala[] = viaje.escalas.map((e) => ({
      orden: e.orden,
      accion: e.accion,
      direccion: e.direccion,
      llegadaEn: e.llegadaEn,
      salidaEn: e.salidaRegistradaEn,
      estanciaMin:
        e.llegadaEn && e.salidaRegistradaEn
          ? Math.round(
              (e.salidaRegistradaEn.getTime() - e.llegadaEn.getTime()) / 60000,
            )
          : null,
    }));

    const estanciaTotalMin = escalas.reduce((t, e) => t + (e.estanciaMin ?? 0), 0);

    // Sin unidad o sin conductor asignados el costo queda cojo, y conviene que
    // se vea en la lista de faltantes y no solo en un margen sospechosamente alto.
    if (!viaje.unidadId) {
      resultado.faltantes.push(
        'El viaje no tiene unidad asignada: faltan mantenimiento y combustible.',
      );
    }
    if (!viaje.conductorId) {
      resultado.faltantes.push(
        'El viaje no tiene conductor asignado: falta su pago.',
      );
    }

    return {
      ...resultado,
      viajeId: viaje.id,
      folio: viaje.folio,
      moneda: viaje.moneda,
      escalas,
      estanciaTotalMin,
    };
  }
}
