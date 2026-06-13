import 'package:flutter_test/flutter_test.dart';
import 'package:flotaos_conductor/features/viajes/domain/estado_viaje.dart';

void main() {
  group('EstadoViaje', () {
    test('espeja los valores del API (shared-types)', () {
      expect(EstadoViaje.desdeApi('ASIGNADO'), EstadoViaje.asignado);
      expect(EstadoViaje.desdeApi('EN_CAMINO_ORIGEN'),
          EstadoViaje.enCaminoOrigen);
      expect(EstadoViaje.desdeApi('FACTURADO'), EstadoViaje.facturado);
    });

    test('el flujo del conductor sigue TRANSICIONES_VIAJE', () {
      expect(EstadoViaje.asignado.siguiente, EstadoViaje.aceptado);
      expect(EstadoViaje.aceptado.siguiente, EstadoViaje.enCaminoOrigen);
      expect(EstadoViaje.enCaminoOrigen.siguiente, EstadoViaje.cargando);
      expect(EstadoViaje.cargando.siguiente, EstadoViaje.enTransito);
      expect(EstadoViaje.enTransito.siguiente, EstadoViaje.entregado);
      // Estados finales para el conductor: sin acción.
      expect(EstadoViaje.entregado.siguiente, isNull);
      expect(EstadoViaje.facturado.siguiente, isNull);
      expect(EstadoViaje.cancelado.siguiente, isNull);
    });

    test('tracking solo durante la fase operativa del viaje', () {
      final conTracking = EstadoViaje.values.where((e) => e.requiereTracking);
      expect(conTracking, [
        EstadoViaje.enCaminoOrigen,
        EstadoViaje.cargando,
        EstadoViaje.enTransito,
      ]);
    });

    test('todo estado con siguiente tiene texto de acción', () {
      for (final estado in EstadoViaje.values) {
        expect(
          estado.accionSiguiente != null,
          estado.siguiente != null,
          reason: '$estado debe tener acción si tiene siguiente',
        );
      }
    });
  });
}
