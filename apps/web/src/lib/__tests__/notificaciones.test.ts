import { describe, it, expect } from 'vitest';
import { tituloLlegada } from '@/lib/notificaciones';

/**
 * Tests de la lógica pura exportada por `@/lib/notificaciones`.
 *
 * NOTA: las funciones `mezclar` (dedupe/merge por id) y `aNotificacion` NO se
 * exportan del módulo —son privadas del componente proveedor— por lo que no se
 * testean aquí sin refactorizar producción (fuera del alcance). La única lógica
 * pura exportada es `tituloLlegada`, que se cubre exhaustivamente.
 */
describe('tituloLlegada', () => {
  it('usa "Viaje #folio" cuando hay folio', () => {
    expect(
      tituloLlegada({ folio: 123, escalaOrden: 0, esDestino: true }),
    ).toBe('Viaje #123 llegó a su destino');
  });

  it('usa "Un viaje" cuando el folio es null', () => {
    expect(
      tituloLlegada({ folio: null, escalaOrden: 0, esDestino: true }),
    ).toBe('Un viaje llegó a su destino');
  });

  it('prioriza el destino sobre el orden de escala', () => {
    expect(
      tituloLlegada({ folio: 7, escalaOrden: 3, esDestino: true }),
    ).toBe('Viaje #7 llegó a su destino');
  });

  it('para una parada usa el orden +1 (1-indexado para el usuario)', () => {
    expect(
      tituloLlegada({ folio: 7, escalaOrden: 0, esDestino: false }),
    ).toBe('Viaje #7 llegó a la parada 1');

    expect(
      tituloLlegada({ folio: 7, escalaOrden: 4, esDestino: false }),
    ).toBe('Viaje #7 llegó a la parada 5');
  });

  it('cae al texto genérico si no es destino y no hay orden de escala', () => {
    expect(
      tituloLlegada({ folio: 7, escalaOrden: null, esDestino: false }),
    ).toBe('Viaje #7 llegó a una parada');
  });

  it('combina folio null + parada genérica', () => {
    expect(
      tituloLlegada({ folio: null, escalaOrden: null, esDestino: false }),
    ).toBe('Un viaje llegó a una parada');
  });
});
