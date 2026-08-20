import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../providers.dart';
import 'cola_pendientes.dart';
import 'operacion_pendiente.dart';
import 'sincronizador.dart';

/// SharedPreferences ya abierto. Se inicializa en el arranque de la app.
final prefsProvider = Provider<SharedPreferences>(
  (ref) => throw UnimplementedError('prefsProvider se sobreescribe en main()'),
);

final colaPendientesProvider = Provider<ColaPendientes>(
  (ref) => ColaPendientes(ref.watch(prefsProvider)),
);

final sincronizadorProvider = Provider<Sincronizador>(
  (ref) => Sincronizador.conRepositorio(
    ref.watch(colaPendientesProvider),
    ref.watch(viajesRepositoryProvider),
  ),
);

/// Operaciones esperando envío. La UI la observa para avisar al conductor de
/// que su captura todavía no llegó al servidor.
class PendientesNotifier extends Notifier<List<OperacionPendiente>> {
  Timer? _timer;

  ColaPendientes get _cola => ref.read(colaPendientesProvider);
  Sincronizador get _sync => ref.read(sincronizadorProvider);

  @override
  List<OperacionPendiente> build() {
    // Reintento periódico: sin paquete de conectividad, la señal se descubre
    // intentando. El intervalo es corto porque cada intento fallido cuesta poco
    // y el conductor puede recuperar cobertura en cualquier curva.
    _timer = Timer.periodic(const Duration(seconds: 45), (_) {
      if (state.isNotEmpty) sincronizar();
    });
    ref.onDispose(() => _timer?.cancel());
    return _cola.leer();
  }

  void refrescar() => state = _cola.leer();

  Future<void> encolar({
    required TipoPendiente tipo,
    required String viajeId,
    required Map<String, dynamic> datos,
    String? fotoPath,
  }) async {
    await _cola.encolar(
      tipo: tipo,
      viajeId: viajeId,
      datos: datos,
      fotoPath: fotoPath,
    );
    refrescar();
    // Intento inmediato: si solo se cayó una petición suelta, el pendiente dura
    // un segundo y el conductor ni se entera.
    unawaited(sincronizar());
  }

  Future<ResultadoSync> sincronizar() async {
    final resultado = await _sync.sincronizar();
    refrescar();
    return resultado;
  }
}

final pendientesProvider =
    NotifierProvider<PendientesNotifier, List<OperacionPendiente>>(
      PendientesNotifier.new,
    );

/// Pendientes de un viaje concreto, para marcarlo en su pantalla.
final pendientesDeViajeProvider =
    Provider.family<List<OperacionPendiente>, String>(
      (ref, viajeId) => ref
          .watch(pendientesProvider)
          .where((o) => o.viajeId == viajeId)
          .toList(),
    );
