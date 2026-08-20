import { mesDe, periodoDeSueldo } from './margen-viaje.usecase';

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Los periodos van anclados al calendario, no a una ventana móvil alrededor del
 * viaje: así dos viajes de la misma quincena reparten el MISMO sueldo entre los
 * mismos viajes, que es lo que hace que el prorrateo sume el sueldo completo.
 */
describe('periodo de sueldo del conductor', () => {
  it('quincenal: del 1 al 15', () => {
    const p = periodoDeSueldo(new Date('2026-08-07T12:00:00Z'), 'QUINCENAL');
    expect(iso(p.gte)).toBe('2026-08-01');
    expect(iso(p.lt)).toBe('2026-08-16');
  });

  it('quincenal: del 16 al fin de mes', () => {
    const p = periodoDeSueldo(new Date('2026-08-20T12:00:00Z'), 'QUINCENAL');
    expect(iso(p.gte)).toBe('2026-08-16');
    expect(iso(p.lt)).toBe('2026-09-01');
  });

  it('quincenal: el día 15 todavía es de la primera quincena', () => {
    const p = periodoDeSueldo(new Date('2026-08-15T23:00:00Z'), 'QUINCENAL');
    expect(iso(p.gte)).toBe('2026-08-01');
  });

  it('semanal: de lunes a lunes', () => {
    // 2026-08-20 es jueves.
    const p = periodoDeSueldo(new Date('2026-08-20T12:00:00Z'), 'SEMANAL');
    expect(iso(p.gte)).toBe('2026-08-17');
    expect(iso(p.lt)).toBe('2026-08-24');
  });

  it('semanal: el domingo cierra la semana que empezó el lunes anterior', () => {
    // 2026-08-23 es domingo; con getUTCDay()=0 es fácil mandarlo a la semana
    // siguiente por error.
    const p = periodoDeSueldo(new Date('2026-08-23T12:00:00Z'), 'SEMANAL');
    expect(iso(p.gte)).toBe('2026-08-17');
  });

  it('mensual: el mes natural', () => {
    const p = periodoDeSueldo(new Date('2026-08-20T12:00:00Z'), 'MENSUAL');
    expect(iso(p.gte)).toBe('2026-08-01');
    expect(iso(p.lt)).toBe('2026-09-01');
  });

  it('sin periodicidad capturada asume quincenal', () => {
    const p = periodoDeSueldo(new Date('2026-08-20T12:00:00Z'), null);
    expect(iso(p.gte)).toBe('2026-08-16');
  });
});

describe('mes del viaje', () => {
  it('cubre el mes completo y cierra en el primero del siguiente', () => {
    const m = mesDe(new Date('2026-12-31T23:59:00Z'));
    expect(iso(m.gte)).toBe('2026-12-01');
    expect(iso(m.lt)).toBe('2027-01-01');
  });
});
