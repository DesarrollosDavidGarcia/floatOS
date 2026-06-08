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
  it('desglosa conceptos, margen, IVA y retención', () => {
    const r = cotizar(BASE, DATOS);
    // Flete 2000 + Distancia 5000 + Combustible 1600 + Casetas 800 + Maniobras 1000
    expect(r.subtotalConceptos).toBe(10400);
    expect(r.margen).toBe(2080); // 20%
    expect(r.subtotal).toBe(12480);
    expect(r.iva).toBe(1996.8); // 16%
    expect(r.retencion).toBe(499.2); // 4%
    expect(r.total).toBe(13977.6); // subtotal + IVA - retención
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
});
