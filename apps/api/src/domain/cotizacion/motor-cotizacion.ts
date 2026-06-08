/**
 * Motor de cotización (TS puro, sin Nest/Prisma). Modelo "mixto configurable":
 * arma líneas de concepto (flete base + $/km + $/kg + combustible + casetas +
 * maniobras), aplica margen y luego IVA y retención. Todos los parámetros se
 * capturan por cotización; los datos del viaje (km, kg, escalas) se inyectan.
 */

export const IVA_TASA = 0.16;
/** Retención de ISR por servicios de autotransporte de carga (cliente moral). */
export const RETENCION_TASA = 0.04;

/** Parámetros (tarifas) que captura el monitorista para esta cotización. */
export interface ParamsCotizacion {
  tarifaBase: number;
  precioPorKm: number;
  precioPorKg: number;
  precioDiesel: number;
  /** km/L de la unidad; 0 = no se cobra combustible. */
  rendimientoKmL: number;
  casetas: number;
  maniobrasPorEscala: number;
  margenPct: number;
  aplicaIva: boolean;
  aplicaRetencion: boolean;
}

/** Datos del viaje que alimentan el cálculo. */
export interface DatosCotizacion {
  distanciaKm: number;
  pesoKg: number;
  numEscalas: number;
}

/** Una línea del desglose. */
export interface LineaCotizacion {
  concepto: string;
  monto: number;
  detalle?: string;
}

/** Resultado del motor: líneas + subtotales + impuestos + total. */
export interface ResultadoCotizacion {
  lineas: LineaCotizacion[];
  subtotalConceptos: number;
  margen: number;
  /** Base gravable: conceptos + margen. */
  subtotal: number;
  iva: number;
  retencion: number;
  total: number;
}

const r2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;
const num = (v: number): number => (Number.isFinite(v) ? v : 0);

export function cotizar(
  params: ParamsCotizacion,
  datos: DatosCotizacion,
): ResultadoCotizacion {
  const p = params;
  const km = Math.max(0, num(datos.distanciaKm));
  const kg = Math.max(0, num(datos.pesoKg));
  const escalas = Math.max(0, Math.trunc(num(datos.numEscalas)));

  const lineas: LineaCotizacion[] = [];
  const agregar = (concepto: string, monto: number, detalle?: string): void => {
    const m = r2(num(monto));
    if (m > 0) lineas.push({ concepto, monto: m, detalle });
  };

  agregar('Flete base', p.tarifaBase);
  agregar('Distancia', num(p.precioPorKm) * km, `${km} km × $${num(p.precioPorKm)}/km`);
  agregar('Peso', num(p.precioPorKg) * kg, `${kg} kg × $${num(p.precioPorKg)}/kg`);
  if (num(p.rendimientoKmL) > 0 && num(p.precioDiesel) > 0) {
    const litros = km / p.rendimientoKmL;
    agregar('Combustible', litros * p.precioDiesel, `${r2(litros)} L × $${num(p.precioDiesel)}/L`);
  }
  agregar('Casetas', p.casetas);
  agregar(
    'Maniobras',
    num(p.maniobrasPorEscala) * escalas,
    `${escalas} escala(s) × $${num(p.maniobrasPorEscala)}`,
  );

  const subtotalConceptos = r2(lineas.reduce((s, l) => s + l.monto, 0));
  const margen = r2(subtotalConceptos * (num(p.margenPct) / 100));
  const subtotal = r2(subtotalConceptos + margen);
  const iva = p.aplicaIva ? r2(subtotal * IVA_TASA) : 0;
  const retencion = p.aplicaRetencion ? r2(subtotal * RETENCION_TASA) : 0;
  const total = r2(subtotal + iva - retencion);

  return { lineas, subtotalConceptos, margen, subtotal, iva, retencion, total };
}
