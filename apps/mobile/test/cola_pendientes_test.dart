import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:flotaos_conductor/core/api/api_exception.dart';
import 'package:flotaos_conductor/core/offline/cola_pendientes.dart';
import 'package:flotaos_conductor/core/offline/operacion_pendiente.dart';
import 'package:flotaos_conductor/core/offline/sincronizador.dart';

/// Encola una revisión y su cambio de estado, en ese orden.
Future<void> _encolarTurno(ColaPendientes cola, String viajeId) async {
  await cola.encolar(
    tipo: TipoPendiente.revision,
    viajeId: viajeId,
    datos: {'tipo': 'SALIDA', 'odometro': 100},
  );
  await cola.encolar(
    tipo: TipoPendiente.cambioEstado,
    viajeId: viajeId,
    datos: {'estado': 'EN_CAMINO_ORIGEN'},
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late ColaPendientes cola;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    cola = ColaPendientes(await SharedPreferences.getInstance());
  });

  test('la cola sobrevive a reabrir la app', () async {
    await _encolarTurno(cola, 'v1');
    final otra = ColaPendientes(await SharedPreferences.getInstance());
    expect(otra.leer(), hasLength(2));
  });

  test('envía en el orden de captura', () async {
    await _encolarTurno(cola, 'v1');
    final enviadas = <TipoPendiente>[];
    final sync = Sincronizador(cola, (op) async => enviadas.add(op.tipo));

    final r = await sync.sincronizar();

    // El backend rechaza el cambio de estado si su revisión no llegó antes.
    expect(enviadas, [TipoPendiente.revision, TipoPendiente.cambioEstado]);
    expect(r.enviadas, 2);
    expect(cola.leer(), isEmpty);
  });

  test('sin señal se detiene y conserva todo en orden', () async {
    await _encolarTurno(cola, 'v1');
    var intentos = 0;
    final sync = Sincronizador(cola, (op) async {
      intentos++;
      throw ApiException('Sin conexión con el servidor.');
    });

    final r = await sync.sincronizar();

    // Solo se intenta el primero: saltar al siguiente adelantaría el cambio de
    // estado por delante de su revisión.
    expect(intentos, 1);
    expect(r.enviadas, 0);
    expect(cola.leer(), hasLength(2));
    expect(cola.leer().first.tipo, TipoPendiente.revision);
    expect(cola.leer().first.intentos, 1);
  });

  test('un rechazo del servidor no atasca la cola', () async {
    await _encolarTurno(cola, 'v1');
    final vistas = <TipoPendiente>[];
    final sync = Sincronizador(cola, (op) async {
      vistas.add(op.tipo);
      if (op.tipo == TipoPendiente.revision) {
        throw ApiException('Odómetro inválido', statusCode: 400);
      }
    });

    final r = await sync.sincronizar();

    // La revisión se descarta (reintentarla daría 400 para siempre) y la cola
    // sigue avanzando en vez de quedarse bloqueada.
    expect(vistas, [TipoPendiente.revision, TipoPendiente.cambioEstado]);
    expect(r.descartadas, 1);
    expect(r.enviadas, 1);
    expect(cola.leer(), isEmpty);
  });

  test('la sesión vencida NO descarta lo capturado', () async {
    await _encolarTurno(cola, 'v1');
    final sync = Sincronizador(cola, (op) async {
      throw ApiException('No autorizado', statusCode: 401);
    });

    final r = await sync.sincronizar();

    // Un 401 se arregla volviendo a entrar: tirar la captura del conductor por
    // una sesión vencida sería perder trabajo hecho.
    expect(r.descartadas, 0);
    expect(cola.leer(), hasLength(2));
  });
}
