import 'package:flutter_test/flutter_test.dart';
import 'package:flotaos_conductor/features/viajes/domain/estado_viaje.dart';
import 'package:flotaos_conductor/features/viajes/domain/viaje.dart';

void main() {
  group('Viaje.fromJson', () {
    test('parsea la respuesta del API con relaciones y escalas', () {
      final viaje = Viaje.fromJson({
        'id': 'v1',
        'folio': 42,
        'estado': 'EN_TRANSITO',
        'origenDireccion': 'CDMX',
        'origenLat': 19.43,
        'origenLng': -99.13,
        'destinoDireccion': 'Querétaro',
        'destinoLat': 20.59,
        'destinoLng': -100.39,
        'tipoCarga': 'GENERAL',
        'descripcionCarga': 'Tarimas',
        'pesoKg': 1500,
        'distanciaEstimadaKm': '216.76', // el API puede mandar Decimal string
        'fechaProgramada': '2026-06-11T08:00:00.000Z',
        'cliente': {'id': 'c1', 'razonSocial': 'ACME SA', 'rfc': 'AAA010101AAA'},
        'unidad': {
          'id': 'u1',
          'placas': 'ABC-123',
          'tipo': 'CAMION',
          'marca': 'Kenworth',
          'modelo': 'T680',
        },
        'escalas': [
          {
            'id': 'e2',
            'orden': 1,
            'accion': 'ENTREGAR',
            'direccion': 'Querétaro',
            'lat': 20.59,
            'lng': -100.39,
            'cargas': [
              {
                'id': 'cg1',
                'sentido': 'DESCARGA',
                'tipoCarga': 'GENERAL',
                'pesoKg': 1500,
              }
            ],
          },
          {
            'id': 'e1',
            'orden': 0,
            'accion': 'RECOGER',
            'direccion': 'CDMX',
            'lat': 19.43,
            'lng': -99.13,
            'cargas': <Map<String, dynamic>>[],
          },
        ],
        'historial': [
          {
            'id': 'h1',
            'estadoAnterior': 'CARGANDO',
            'estadoNuevo': 'EN_TRANSITO',
            'nota': null,
            'createdAt': '2026-06-11T10:00:00.000Z',
          }
        ],
      });

      expect(viaje.folio, 42);
      expect(viaje.estado, EstadoViaje.enTransito);
      expect(viaje.clienteNombre, 'ACME SA');
      expect(viaje.unidadPlacas, 'ABC-123');
      expect(viaje.unidadDescripcion, 'Kenworth T680');
      // Las escalas vienen desordenadas → se ordenan por `orden`.
      expect(viaje.escalas.map((e) => e.orden).toList(), [0, 1]);
      expect(viaje.escalas.last.cargas.single.esRecoger, isFalse);
      expect(viaje.historial.single.estadoNuevo, EstadoViaje.enTransito);
    });

    test('tolera campos opcionales nulos', () {
      final viaje = Viaje.fromJson({
        'id': 'v2',
        'folio': 7,
        'estado': 'ASIGNADO',
        'origenDireccion': 'A',
        'destinoDireccion': 'B',
        'tipoCarga': 'GENERAL',
        'pesoKg': 100,
        'distanciaEstimadaKm': 0,
      });
      expect(viaje.clienteNombre, isNull);
      expect(viaje.escalas, isEmpty);
      expect(viaje.fechaProgramada, isNull);
    });
  });
}
