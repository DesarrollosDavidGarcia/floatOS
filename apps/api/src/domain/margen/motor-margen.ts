/**
 * Motor de margen por viaje: función pura que arma el desglose de ingreso y
 * costos de UN viaje. No toca la base de datos; quien la llama reúne los datos.
 *
 * La regla de fondo es que el dato REAL siempre gana sobre el estimado, y que
 * cuando falta un dato el resultado lo dice en `faltantes` en vez de rellenar
 * con cero: un margen que se ve bien porque el costo está incompleto engaña
 * más que uno que se declara incompleto.
 */

import { r2 } from '../cotizacion/motor-cotizacion';

/** De dónde salieron los kilómetros del viaje. */
export type OrigenKm = 'ODOMETRO' | 'ESTIMADO' | 'SIN_DATO';

/** De dónde salió el costo de combustible. */
export type OrigenDiesel = 'TICKET' | 'ESTIMADO' | 'SIN_DATO';

/** Un gasto capturado del viaje (tipo del catálogo TIPO_GASTO). */
export interface GastoMargen {
  tipo: string;
  monto: number;
}

/** Datos de la unidad que afectan al costo. */
export interface UnidadMargen {
  rendimientoKmL?: number | null;
  costoMantenimientoPorKm?: number | null;
  costoFijoMensual?: number | null;
  /** Viajes de esa unidad en el mes, para repartir el costo fijo. */
  viajesDelMes?: number | null;
}

/** Componentes de pago del conductor; se aplica cada uno que tenga valor. */
export interface ConductorMargen {
  sueldoPeriodo?: number | null;
  periodicidadSueldo?: string | null;
  tarifaPorViaje?: number | null;
  pagoPorKm?: number | null;
  porcentajeFlete?: number | null;
  /** Viajes del conductor en el periodo de su sueldo, para repartirlo. */
  viajesDelPeriodo?: number | null;
}

export interface DatosMargen {
  precioAcordado?: number | null;
  distanciaEstimadaKm?: number | null;
  odometroInicial?: number | null;
  odometroFinal?: number | null;
  unidad?: UnidadMargen | null;
  conductor?: ConductorMargen | null;
  /** Precio por litro vigente en la fecha del viaje (catálogo de costos). */
  precioDieselPorLitro?: number | null;
  gastos?: GastoMargen[];
}

/** Una línea del desglose de costos. */
export interface LineaMargen {
  concepto: string;
  monto: number;
  detalle?: string;
  /** true si el monto sale de un dato capturado, no de una estimación. */
  real: boolean;
}

export interface ResultadoMargen {
  ingreso: number;
  costos: LineaMargen[];
  costoTotal: number;
  margen: number;
  /** Margen sobre el ingreso, en porcentaje. null si no hay ingreso. */
  margenPct: number | null;
  km: number;
  origenKm: OrigenKm;
  origenDiesel: OrigenDiesel;
  /** Qué no se pudo calcular y por qué. Vacío = el desglose está completo. */
  faltantes: string[];
}

const num = (v?: number | string | null): number => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
};
const positivo = (v?: number | string | null): boolean => num(v) > 0;

/**
 * Kilómetros del viaje. El odómetro manda porque son los recorridos de verdad;
 * la distancia estimada es la de la ruta planeada y no incluye desvíos.
 */
function calcularKm(datos: DatosMargen): { km: number; origen: OrigenKm } {
  const ini = datos.odometroInicial;
  const fin = datos.odometroFinal;
  if (ini != null && fin != null && num(fin) > num(ini)) {
    return { km: num(fin) - num(ini), origen: 'ODOMETRO' };
  }
  if (positivo(datos.distanciaEstimadaKm)) {
    return { km: num(datos.distanciaEstimadaKm), origen: 'ESTIMADO' };
  }
  return { km: 0, origen: 'SIN_DATO' };
}

export function calcularMargen(datos: DatosMargen): ResultadoMargen {
  const faltantes: string[] = [];
  const costos: LineaMargen[] = [];
  const agregar = (
    concepto: string,
    monto: number,
    real: boolean,
    detalle?: string,
  ): void => {
    const m = r2(num(monto));
    if (m > 0) costos.push({ concepto, monto: m, detalle, real });
  };

  const ingreso = r2(num(datos.precioAcordado));
  if (!positivo(ingreso)) {
    faltantes.push(
      'El viaje no tiene precio acordado: sin ingreso no hay margen que calcular.',
    );
  }

  const { km, origen: origenKm } = calcularKm(datos);
  if (origenKm === 'ESTIMADO') {
    faltantes.push(
      'Sin odómetro capturado: los kilómetros son los de la ruta planeada, no los recorridos.',
    );
  } else if (origenKm === 'SIN_DATO') {
    faltantes.push('El viaje no tiene kilómetros: ni odómetro ni ruta calculada.');
  }

  const gastos = datos.gastos ?? [];
  const sumaPorTipo = (tipo: string): number =>
    gastos.filter((g) => g.tipo === tipo).reduce((t, g) => t + num(g.monto), 0);

  // ── Combustible: el ticket manda sobre la estimación ──
  const combustibleReal = sumaPorTipo('COMBUSTIBLE');
  const unidad = datos.unidad ?? null;
  const rendimiento = num(unidad?.rendimientoKmL);
  const precioLitro = num(datos.precioDieselPorLitro);
  let origenDiesel: OrigenDiesel;
  if (combustibleReal > 0) {
    origenDiesel = 'TICKET';
    agregar('Combustible', combustibleReal, true, 'Tickets capturados del viaje');
  } else if (km > 0 && rendimiento > 0 && precioLitro > 0) {
    origenDiesel = 'ESTIMADO';
    const litros = km / rendimiento;
    // El detalle va como fórmula para que cuadre con el monto sin exponer un
    // producto intermedio ya redondeado.
    agregar(
      'Combustible (estimado)',
      litros * precioLitro,
      false,
      r2(km) + ' km / ' + rendimiento + ' km/L x $' + precioLitro + '/L',
    );
  } else {
    origenDiesel = 'SIN_DATO';
    if (rendimiento <= 0) {
      faltantes.push(
        'La unidad no tiene rendimiento (km/L): el combustible no se pudo estimar.',
      );
    }
    if (precioLitro <= 0) {
      faltantes.push(
        'No hay precio de diesel cargado para la fecha del viaje: el combustible no se pudo estimar.',
      );
    }
  }

  // ── Resto de gastos capturados: siempre son reales ──
  agregar('Casetas', sumaPorTipo('CASETA'), true);
  agregar('Viáticos', sumaPorTipo('VIATICOS'), true);
  agregar('Otros gastos', sumaPorTipo('OTRO'), true);

  // ── Costos de la unidad ──
  const mantenimientoPorKm = num(unidad?.costoMantenimientoPorKm);
  if (mantenimientoPorKm > 0 && km > 0) {
    agregar(
      'Mantenimiento',
      km * mantenimientoPorKm,
      false,
      r2(km) + ' km x $' + mantenimientoPorKm + '/km',
    );
  } else if (unidad && mantenimientoPorKm <= 0) {
    faltantes.push('La unidad no tiene costo de mantenimiento por km.');
  }

  const fijoMensual = num(unidad?.costoFijoMensual);
  if (fijoMensual > 0) {
    // El fijo se reparte entre los viajes de la unidad en el mes: cargárselo
    // entero a un viaje pondría en rojo al único viaje de un mes flojo.
    const viajesMes = Math.max(1, Math.trunc(num(unidad?.viajesDelMes)) || 1);
    agregar(
      'Costo fijo de la unidad',
      fijoMensual / viajesMes,
      false,
      '$' + fijoMensual + '/mes entre ' + viajesMes + ' viaje(s) del mes',
    );
  }

  // ── Pago del conductor: se suma cada componente con valor ──
  const conductor = datos.conductor ?? null;
  const sueldo = num(conductor?.sueldoPeriodo);
  const tarifa = num(conductor?.tarifaPorViaje);
  const porKm = num(conductor?.pagoPorKm);
  const pctFlete = num(conductor?.porcentajeFlete);
  if (conductor && sueldo <= 0 && tarifa <= 0 && porKm <= 0 && pctFlete <= 0) {
    faltantes.push('El conductor no tiene ningún componente de pago capturado.');
  }
  if (sueldo > 0) {
    const viajesPeriodo = Math.max(
      1,
      Math.trunc(num(conductor?.viajesDelPeriodo)) || 1,
    );
    agregar(
      'Sueldo del conductor (prorrateado)',
      sueldo / viajesPeriodo,
      false,
      '$' + sueldo + ' entre ' + viajesPeriodo + ' viaje(s) del periodo',
    );
  }
  if (tarifa > 0) agregar('Tarifa del conductor', tarifa, true);
  if (porKm > 0 && km > 0) {
    agregar(
      'Pago por km del conductor',
      km * porKm,
      origenKm === 'ODOMETRO',
      r2(km) + ' km x $' + porKm + '/km',
    );
  }
  if (pctFlete > 0 && ingreso > 0) {
    agregar(
      'Comisión del conductor',
      (ingreso * pctFlete) / 100,
      true,
      pctFlete + '% de $' + ingreso,
    );
  }

  if (gastos.length === 0) {
    faltantes.push(
      'El viaje no tiene gastos capturados (combustible, casetas, viáticos).',
    );
  }

  const costoTotal = r2(costos.reduce((t, l) => t + l.monto, 0));
  const margen = r2(ingreso - costoTotal);

  return {
    ingreso,
    costos,
    costoTotal,
    margen,
    margenPct: ingreso > 0 ? r2((margen / ingreso) * 100) : null,
    km: r2(km),
    origenKm,
    origenDiesel,
    faltantes,
  };
}
