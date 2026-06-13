/**
 * Modelo de planeación multi-día (cliente, en hora LOCAL del navegador, que es
 * la del monitorista). A partir del tiempo de conducción de TomTom, la salida
 * programada y los parámetros que asigna el monitorista, estima la fecha de
 * llegada repartiendo la conducción en jornadas con descanso y tiempo por escala.
 */

export interface PlanRutaParams {
  /** Tope de horas efectivas de conducción por día. */
  horasConduccionDia: number;
  /** Descanso mínimo entre jornadas (pernocta). */
  horasDescanso: number;
  /** Minutos de carga/descarga por escala. */
  minutosPorEscala: number;
  /** Hora local a la que se reanuda la conducción cada día (0-23). */
  horaInicio: number;
}

export const PLAN_RUTA_DEFAULT: PlanRutaParams = {
  horasConduccionDia: 9,
  horasDescanso: 11,
  minutosPorEscala: 60,
  horaInicio: 8,
};

export interface PlanRutaResultado {
  /** Fecha/hora estimada de llegada. */
  llegada: Date;
  /** Jornadas de conducción que abarca el viaje. */
  diasConduccion: number;
  /** Minutos de conducción (= ETA de TomTom). */
  conduccionMin: number;
  /** Minutos de carga/descarga (tiempo por escala × escalas). */
  servicioMin: number;
  /** Minutos de descanso/espera (incluye la espera hasta la hora de inicio). */
  descansoMin: number;
  /** Tiempo total transcurrido salida→llegada. */
  totalMin: number;
}

const MIN = 60_000;
const HORA = 3_600_000;

/** Formatea minutos como "N d H h", "H h M min" o "M min". */
export function formatearDuracion(min?: number | null): string {
  if (min == null || !Number.isFinite(min)) return '—';
  const total = Math.max(0, Math.round(min));
  const dias = Math.floor(total / 1440);
  const horas = Math.floor((total % 1440) / 60);
  const mins = total % 60;
  if (dias > 0) return `${dias} d ${horas} h`;
  if (horas > 0) return `${horas} h ${mins} min`;
  return `${mins} min`;
}

/** Normaliza/acota los parámetros (evita topes inválidos del input). */
export function sanearPlan(p: Partial<PlanRutaParams> | null | undefined): PlanRutaParams {
  const n = (v: unknown, def: number) =>
    Number.isFinite(Number(v)) ? Number(v) : def;
  return {
    horasConduccionDia: Math.min(24, Math.max(1, n(p?.horasConduccionDia, PLAN_RUTA_DEFAULT.horasConduccionDia))),
    horasDescanso: Math.min(24, Math.max(0, n(p?.horasDescanso, PLAN_RUTA_DEFAULT.horasDescanso))),
    minutosPorEscala: Math.min(600, Math.max(0, n(p?.minutosPorEscala, PLAN_RUTA_DEFAULT.minutosPorEscala))),
    horaInicio: Math.min(23, Math.max(0, Math.round(n(p?.horaInicio, PLAN_RUTA_DEFAULT.horaInicio)))),
  };
}

/**
 * Estima la llegada repartiendo `conduccionMin` en jornadas de hasta
 * `horasConduccionDia`, con `horasDescanso` entre días reanudando a `horaInicio`,
 * más `minutosPorEscala` por cada escala.
 */
export function planificarRuta(
  salida: Date,
  conduccionMin: number,
  numEscalas: number,
  params: Partial<PlanRutaParams> | null | undefined,
): PlanRutaResultado {
  const p = sanearPlan(params);
  const capMin = Math.round(p.horasConduccionDia * 60);
  const conduccion = Math.max(0, Math.round(conduccionMin));
  const servicioMin = p.minutosPorEscala * Math.max(0, numEscalas);

  let clock = new Date(salida.getTime());
  let restante = conduccion;
  let diasConduccion = 1;

  while (restante > capMin) {
    clock = new Date(clock.getTime() + capMin * MIN); // jornada completa
    restante -= capMin;
    // Descanso mínimo y reanudar a la hora de inicio del día siguiente.
    const minReanudar = clock.getTime() + p.horasDescanso * HORA;
    let reanudar = new Date(minReanudar);
    reanudar.setHours(p.horaInicio, 0, 0, 0);
    if (reanudar.getTime() < minReanudar) {
      reanudar = new Date(minReanudar);
      reanudar.setDate(reanudar.getDate() + 1);
      reanudar.setHours(p.horaInicio, 0, 0, 0);
    }
    clock = reanudar;
    diasConduccion += 1;
  }

  clock = new Date(clock.getTime() + (restante + servicioMin) * MIN);
  const totalMin = Math.round((clock.getTime() - salida.getTime()) / MIN);

  return {
    llegada: clock,
    diasConduccion,
    conduccionMin: conduccion,
    servicioMin,
    descansoMin: Math.max(0, totalMin - conduccion - servicioMin),
    totalMin,
  };
}
