import { describe, it, expect } from 'vitest';
import {
  defaultsCrear as defaultsConductor,
  toPayload as toPayloadConductor,
} from '@/components/conductores/form/form-types';
import {
  defaultsCrear as defaultsViaje,
  toCrearPayload,
} from '@/components/viajes/form/form-types';

/**
 * El formulario guarda los importes como texto y el API los espera numéricos.
 * Estos tests fijan esa conversión y, sobre todo, la regla de que el pago del
 * conductor NO depende de su tipo de contratación: la empresa proveedora y la
 * vigencia sí se limpian según el tipo, y es fácil arrastrar los componentes de
 * pago a esa misma poda por descuido.
 */
describe('payload del conductor: componentes de pago', () => {
  it('manda los importes como número', () => {
    const p = toPayloadConductor({
      ...defaultsConductor(),
      nombre: 'Ana',
      usuario: 'ana',
      sueldoPeriodo: '4500.50',
      periodicidadSueldo: 'SEMANAL',
      pagoPorKm: '2.4',
      porcentajeFlete: '3.5',
    });
    expect(p.sueldoPeriodo).toBe(4500.5);
    expect(p.periodicidadSueldo).toBe('SEMANAL');
    expect(p.pagoPorKm).toBe(2.4);
    expect(p.porcentajeFlete).toBe(3.5);
    // Un componente vacío se omite en vez de mandarse como 0.
    expect(p.tarifaPorViaje).toBeUndefined();
  });

  it('conserva el pago aunque el conductor sea de PLANTA', () => {
    const p = toPayloadConductor({
      ...defaultsConductor(),
      nombre: 'Ana',
      usuario: 'ana',
      tipoContratacion: 'PLANTA',
      sueldoPeriodo: '4500',
      porcentajeFlete: '3',
    });
    // PLANTA sí limpia los datos de empresa proveedora y vigencia…
    expect(p.empresaProveedor).toBeUndefined();
    expect(p.vigenciaDesde).toBeUndefined();
    // …pero el pago se combina libremente (sueldo base + comisión).
    expect(p.sueldoPeriodo).toBe(4500);
    expect(p.porcentajeFlete).toBe(3);
  });
});

describe('payload del viaje: precio acordado', () => {
  it('manda el precio como número', () => {
    const p = toCrearPayload({
      ...defaultsViaje(),
      clienteId: 'c1',
      precioAcordado: '18500.50',
    });
    expect(p.precioAcordado).toBe(18500.5);
  });

  it('omite el precio si el campo va vacío', () => {
    const p = toCrearPayload({ ...defaultsViaje(), clienteId: 'c1' });
    expect(p.precioAcordado).toBeUndefined();
  });
});
