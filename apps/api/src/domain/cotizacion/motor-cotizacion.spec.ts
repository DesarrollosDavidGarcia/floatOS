import { cotizar, type ParamsCotizacion } from './motor-cotizacion';

const BASE: ParamsCotizacion = {
  tarifaBase: 2000,
  precioPorKm: 25,
  precioPorKg: 0,
  precioDiesel: 24,
  rendimientoKmL: 3,
  casetas: 800,
  maniobrasPorEscala: 500,
  margenPct: 20,
  aplicaIva: true,
  aplicaRetencion: true,
};
const DATOS = { distanciaKm: 200, pesoKg: 1000, numEscalas: 2 };

describe('cotizar', () => {
  it('desglosa conceptos, margen (solo servicio), IVA y retención', () => {
    const r = cotizar(BASE, DATOS);
    // Conceptos: Flete 2000 + Distancia 5000 + Combustible 1600 + Casetas 800 + Maniobras 1000
    expect(r.subtotalConceptos).toBe(10400);
    // Margen 20% SOLO sobre servicio (Flete+Distancia+Maniobras = 8000), no casetas/combustible.
    expect(r.margen).toBe(1600);
    expect(r.subtotal).toBe(12000); // 10400 + 1600
    expect(r.iva).toBe(1920); // 16%
    expect(r.retencion).toBe(480); // 4%
    expect(r.total).toBe(13440); // subtotal + IVA - retención
  });

  it('casetas y combustible van a costo (sin margen)', () => {
    const r = cotizar(
      { ...BASE, tarifaBase: 0, precioPorKm: 0, precioPorKg: 0, maniobrasPorEscala: 0, margenPct: 50, aplicaIva: false, aplicaRetencion: false },
      DATOS,
    );
    // Solo quedan Combustible (1600) + Casetas (800), ambos pass-through.
    expect(r.lineas.every((l) => l.pasaCosto)).toBe(true);
    expect(r.margen).toBe(0);
    expect(r.subtotal).toBe(2400);
  });

  it('omite la línea de peso cuando $/kg = 0', () => {
    const r = cotizar(BASE, DATOS);
    expect(r.lineas.find((l) => l.concepto === 'Peso')).toBeUndefined();
  });

  it('incluye peso cuando $/kg > 0', () => {
    const r = cotizar({ ...BASE, precioPorKg: 2 }, DATOS);
    const peso = r.lineas.find((l) => l.concepto === 'Peso');
    expect(peso?.monto).toBe(2000); // 1000 kg × $2
  });

  it('sin rendimiento no cobra combustible', () => {
    const r = cotizar({ ...BASE, rendimientoKmL: 0 }, DATOS);
    expect(r.lineas.find((l) => l.concepto === 'Combustible')).toBeUndefined();
  });

  it('sin IVA ni retención: total = subtotal', () => {
    const r = cotizar({ ...BASE, aplicaIva: false, aplicaRetencion: false }, DATOS);
    expect(r.iva).toBe(0);
    expect(r.retencion).toBe(0);
    expect(r.total).toBe(r.subtotal);
  });

  it('combustible = distancia / rendimiento × precio diésel', () => {
    const r = cotizar(BASE, DATOS);
    const comb = r.lineas.find((l) => l.concepto === 'Combustible');
    expect(comb?.monto).toBe(1600); // 200/3 L × $24
  });

  it('inputs negativos o NaN se tratan como 0 (línea omitida)', () => {
    const r = cotizar(
      { ...BASE, precioPorKm: -10, casetas: NaN as unknown as number, tarifaBase: 1000 },
      DATOS,
    );
    expect(r.lineas.find((l) => l.concepto === 'Distancia')).toBeUndefined();
    expect(r.lineas.find((l) => l.concepto === 'Casetas')).toBeUndefined();
    expect(r.lineas.find((l) => l.concepto === 'Flete base')?.monto).toBe(1000);
  });

  it('todos los parámetros en 0 → cotización vacía con total 0', () => {
    const cero = {
      tarifaBase: 0,
      precioPorKm: 0,
      precioPorKg: 0,
      precioDiesel: 0,
      rendimientoKmL: 0,
      casetas: 0,
      maniobrasPorEscala: 0,
      margenPct: 0,
      aplicaIva: true,
      aplicaRetencion: true,
    };
    const r = cotizar(cero, DATOS);
    expect(r.lineas).toHaveLength(0);
    expect(r.subtotalConceptos).toBe(0);
    expect(r.total).toBe(0);
  });

  it('redondea con margen fraccionario', () => {
    const r = cotizar(
      { ...BASE, margenPct: 12.5, aplicaIva: false, aplicaRetencion: false },
      DATOS,
    );
    expect(r.margen).toBe(1000); // 8000 (servicio) × 12.5%
    expect(r.total).toBe(11400); // 10400 + 1000
  });
});

describe('cotizar — servicio de personal', () => {
  const BASE_P: ParamsCotizacion = {
    tipoServicio: 'PERSONAL',
    tarifaBase: 5000,
    precioPorKm: 30,
    precioPorKg: 0,
    precioDiesel: 0,
    rendimientoKmL: 0,
    casetas: 0,
    maniobrasPorEscala: 0,
    precioPorPasajero: 100,
    margenPct: 0,
    aplicaIva: false,
    aplicaRetencion: false,
  };
  const DATOS_P = { distanciaKm: 200, pesoKg: 0, numPasajeros: 30, numEscalas: 2 };

  it('POR_VIAJE cobra la tarifa fija (sin peso/combustible/maniobras)', () => {
    const r = cotizar({ ...BASE_P, modoPrecio: 'POR_VIAJE' }, DATOS_P);
    expect(r.lineas.map((l) => l.concepto)).toEqual(['Servicio de personal']);
    expect(r.total).toBe(5000);
  });

  it('POR_KM cobra distancia × $/km', () => {
    const r = cotizar({ ...BASE_P, modoPrecio: 'POR_KM' }, DATOS_P);
    expect(r.lineas.find((l) => l.concepto === 'Distancia')?.monto).toBe(6000);
    expect(r.total).toBe(6000); // 200 km × $30
  });

  it('POR_PASAJERO cobra pasajeros × $/pax', () => {
    const r = cotizar({ ...BASE_P, modoPrecio: 'POR_PASAJERO' }, DATOS_P);
    expect(r.lineas.find((l) => l.concepto === 'Por pasajero')?.monto).toBe(3000);
    expect(r.total).toBe(3000); // 30 pax × $100
  });

  it('aplica margen e IVA sobre el servicio de personal', () => {
    const r = cotizar(
      { ...BASE_P, modoPrecio: 'POR_VIAJE', margenPct: 20, aplicaIva: true },
      DATOS_P,
    );
    expect(r.margen).toBe(1000); // 5000 × 20%
    expect(r.subtotal).toBe(6000);
    expect(r.iva).toBe(960); // 16%
    expect(r.total).toBe(6960);
  });
});
