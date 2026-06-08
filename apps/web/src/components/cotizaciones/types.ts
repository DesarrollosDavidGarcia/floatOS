export type EstadoCotizacion = 'BORRADOR' | 'ENVIADA' | 'ACEPTADA' | 'RECHAZADA';

/** Tarifas/parámetros que captura el monitorista (modelo mixto configurable). */
export interface ParamsCotizacion {
  tarifaBase: number;
  precioPorKm: number;
  precioPorKg: number;
  precioDiesel: number;
  rendimientoKmL: number;
  casetas: number;
  maniobrasPorEscala: number;
  margenPct: number;
  aplicaIva: boolean;
  aplicaRetencion: boolean;
}

export interface LineaCotizacion {
  concepto: string;
  monto: number;
  detalle?: string;
  /** true = pass-through (a costo, sin margen). */
  pasaCosto?: boolean;
}

/** Resultado del motor (lo devuelve /cotizaciones/calcular). */
export interface ResultadoCotizacion {
  lineas: LineaCotizacion[];
  subtotalConceptos: number;
  margen: number;
  subtotal: number;
  iva: number;
  retencion: number;
  total: number;
}

/** Cotización persistida. */
export interface Cotizacion {
  id: string;
  folio: number;
  viajeId: string;
  estado: EstadoCotizacion;
  moneda: string;
  params: ParamsCotizacion;
  distanciaKm?: number | string | null;
  pesoKg?: number | string | null;
  numEscalas: number;
  desglose: { lineas: LineaCotizacion[]; subtotalConceptos: number; margen: number };
  subtotal: number | string;
  iva: number | string;
  retencion: number | string;
  total: number | string;
  notas?: string | null;
  enviadaEn?: string | null;
  createdAt: string;
}

export const PARAMS_COTIZACION_DEFAULT: ParamsCotizacion = {
  tarifaBase: 0,
  precioPorKm: 25,
  precioPorKg: 0,
  precioDiesel: 24,
  rendimientoKmL: 0,
  casetas: 0,
  maniobrasPorEscala: 0,
  margenPct: 15,
  aplicaIva: true,
  aplicaRetencion: false,
};
