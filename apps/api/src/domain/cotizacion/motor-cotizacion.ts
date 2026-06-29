/**
 * Motor de cotización (TS puro, sin Nest/Prisma). Modelo "mixto configurable":
 * arma líneas de concepto (flete base + $/km + $/kg + combustible + casetas +
 * maniobras). El **margen aplica solo al servicio** (flete + km + kg + maniobras);
 * **combustible y casetas van a costo** (pass-through, sin margen) pero suman al
 * total. Luego IVA y retención sobre la base gravable. Todos los parámetros se
 * capturan por cotización; los datos del viaje (km, kg, escalas) se inyectan.
 */

/** Conceptos pass-through: se cobran a costo (el margen NO aplica sobre ellos). */
const CONCEPTOS_A_COSTO = new Set(['Combustible', 'Casetas']);

export const IVA_TASA = 0.16;
/** Retención de ISR por servicios de autotransporte de carga (cliente moral). */
export const RETENCION_TASA = 0.04;

/** Modo de precio para el servicio de personal. */
export type ModoPrecioPersonal = 'POR_VIAJE' | 'POR_KM' | 'POR_PASAJERO';

/** Parámetros (tarifas) que captura el monitorista para esta cotización. */
export interface ParamsCotizacion {
  /** CARGA (default) usa el modelo mixto; PERSONAL usa modoPrecio. */
  tipoServicio?: 'CARGA' | 'PERSONAL';
  tarifaBase: number;
  precioPorKm: number;
  precioPorKg: number;
  precioDiesel: number;
  /** km/L de la unidad; 0 = no se cobra combustible. */
  rendimientoKmL: number;
  casetas: number;
  maniobrasPorEscala: number;
  // Personal:
  /** Cómo se cobra el servicio de personal (default POR_VIAJE). */
  modoPrecio?: ModoPrecioPersonal;
  /** Precio por pasajero (modo POR_PASAJERO). */
  precioPorPasajero?: number;
  margenPct: number;
  aplicaIva: boolean;
  aplicaRetencion: boolean;
}

/**
 * Tarifas por defecto (placeholders razonables) cuando la empresa no ha
 * configurado las suyas. Fuente única: la usan el bot y cualquier consumidor del
 * motor que necesite un punto de partida; la config de empresa siempre manda.
 */
export const TARIFAS_DEFECTO: ParamsCotizacion = {
  tarifaBase: 1500,
  precioPorKm: 25,
  precioPorKg: 0,
  precioDiesel: 24,
  rendimientoKmL: 2.5,
  casetas: 0,
  maniobrasPorEscala: 500,
  margenPct: 20,
  aplicaIva: true,
  aplicaRetencion: false,
};

/** Datos del viaje que alimentan el cálculo. */
export interface DatosCotizacion {
  distanciaKm: number;
  pesoKg: number;
  /** Nº de pasajeros (servicio de personal). */
  numPasajeros?: number;
  numEscalas: number;
}

/** Una línea del desglose. */
export interface LineaCotizacion {
  concepto: string;
  monto: number;
  detalle?: string;
  /** true = pass-through (a costo, sin margen). */
  pasaCosto?: boolean;
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

/** Redondea a 2 decimales de forma estable (evita el sesgo binario de toFixed). */
export const r2 = (n: number): number =>
  Math.round((n + Number.EPSILON) * 100) / 100;
const num = (v?: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : 0;

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
    if (m > 0) {
      lineas.push({ concepto, monto: m, detalle, pasaCosto: CONCEPTOS_A_COSTO.has(concepto) });
    }
  };

  if (p.tipoServicio === 'PERSONAL') {
    // Servicio de personal: precio por viaje, por km o por pasajero.
    const pax = Math.max(0, Math.trunc(num(datos.numPasajeros)));
    const modo: ModoPrecioPersonal = p.modoPrecio ?? 'POR_VIAJE';
    if (modo === 'POR_KM') {
      agregar('Distancia', num(p.precioPorKm) * km, `${km} km × $${num(p.precioPorKm)}/km`);
    } else if (modo === 'POR_PASAJERO') {
      agregar(
        'Por pasajero',
        num(p.precioPorPasajero) * pax,
        `${pax} pasajero(s) × $${num(p.precioPorPasajero)}`,
      );
    } else {
      agregar('Servicio de personal', num(p.tarifaBase));
    }
    agregar('Casetas', p.casetas);
  } else {
    agregar('Flete base', p.tarifaBase);
    agregar('Distancia', num(p.precioPorKm) * km, `${km} km × $${num(p.precioPorKm)}/km`);
    agregar('Peso', num(p.precioPorKg) * kg, `${kg} kg × $${num(p.precioPorKg)}/kg`);
    if (num(p.rendimientoKmL) > 0 && num(p.precioDiesel) > 0) {
      const litros = km / p.rendimientoKmL;
      // Detalle como fórmula (km ÷ rendimiento × precio) para que sea consistente
      // con el monto sin mostrar un producto intermedio redondeado que no cuadre.
      agregar(
        'Combustible',
        litros * p.precioDiesel,
        `${km} km ÷ ${num(p.rendimientoKmL)} km/L × $${num(p.precioDiesel)}/L`,
      );
    }
    agregar('Casetas', p.casetas);
    agregar(
      'Maniobras',
      num(p.maniobrasPorEscala) * escalas,
      `${escalas} escala(s) × $${num(p.maniobrasPorEscala)}`,
    );
  }

  const subtotalConceptos = r2(lineas.reduce((s, l) => s + l.monto, 0));
  // El margen aplica solo al servicio (excluye los conceptos a costo).
  const baseServicio = r2(
    lineas.filter((l) => !l.pasaCosto).reduce((s, l) => s + l.monto, 0),
  );
  const margen = r2(baseServicio * (num(p.margenPct) / 100));
  const subtotal = r2(subtotalConceptos + margen);
  const iva = p.aplicaIva ? r2(subtotal * IVA_TASA) : 0;
  const retencion = p.aplicaRetencion ? r2(subtotal * RETENCION_TASA) : 0;
  const total = r2(subtotal + iva - retencion);

  return { lineas, subtotalConceptos, margen, subtotal, iva, retencion, total };
}
