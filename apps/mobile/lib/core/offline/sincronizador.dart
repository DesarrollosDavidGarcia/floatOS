import 'dart:async';

import '../api/api_exception.dart';
import '../../features/viajes/data/viajes_repository.dart';
import '../../features/viajes/domain/estado_viaje.dart';
import '../../features/viajes/domain/revision_viaje.dart';
import 'cola_pendientes.dart';
import 'operacion_pendiente.dart';

/// Resultado de una pasada de sincronización.
class ResultadoSync {
  const ResultadoSync({
    this.enviadas = 0,
    this.descartadas = 0,
    this.pendientes = 0,
  });

  final int enviadas;

  /// Operaciones que el servidor rechazó y no se pueden reintentar.
  final int descartadas;

  final int pendientes;
}

/// Envía la cola en orden estricto.
///
/// Distingue dos fracasos que no se tratan igual:
/// - **Sin red** (o el servidor caído): se para la pasada y se conserva el
///   orden. Reintentar el siguiente adelantaría un cambio de estado por delante
///   de su revisión, y el backend lo rechazaría por una razón falsa.
/// - **Rechazo del servidor** (4xx): reintentarlo eternamente bloquearía la cola
///   para siempre, así que se saca y se guarda como fallida para poder decirle
///   al conductor qué pasó.
typedef EjecutorPendiente = Future<void> Function(OperacionPendiente op);

class Sincronizador {
  Sincronizador(this._cola, this._ejecutar);

  /// Fábrica con el ejecutor real. La ejecución entra como función para que la
  /// lógica de orden y reintentos se pueda probar sin red ni dispositivo.
  factory Sincronizador.conRepositorio(
    ColaPendientes cola,
    ViajesRepository repo,
  ) =>
      Sincronizador(cola, (op) => _enviar(repo, op));

  final ColaPendientes _cola;
  final EjecutorPendiente _ejecutar;

  bool _corriendo = false;

  Future<ResultadoSync> sincronizar() async {
    // Una sola pasada a la vez: dos en paralelo mandarían lo mismo dos veces.
    if (_corriendo) {
      return ResultadoSync(pendientes: _cola.leer().length);
    }
    _corriendo = true;
    var enviadas = 0;
    var descartadas = 0;
    try {
      while (true) {
        final ops = _cola.leer();
        if (ops.isEmpty) break;
        final op = ops.first;
        try {
          await _ejecutar(op);
          await _cola.quitar(op.id);
          enviadas++;
        } on ApiException catch (e) {
          // El repositorio ya normalizó el DioException: un statusCode 4xx es un
          // rechazo definitivo; sin statusCode es que no hubo respuesta (sin red).
          final codigo = e.statusCode;
          if (codigo != null && _esRechazoDefinitivo(codigo)) {
            await _cola.quitar(op.id);
            descartadas++;
            continue;
          }
          await _cola.marcarIntento(op.id, e.mensaje);
          break;
        } catch (e) {
          await _cola.marcarIntento(op.id, e.toString());
          break;
        }
      }
    } finally {
      _corriendo = false;
    }
    return ResultadoSync(
      enviadas: enviadas,
      descartadas: descartadas,
      pendientes: _cola.leer().length,
    );
  }

  /// 4xx que no tiene sentido reintentar. Se dejan fuera los que sí se
  /// resuelven solos: 401 se arregla al volver a entrar —descartar por sesión
  /// vencida tiraría a la basura lo que el conductor capturó—, y 408 y 429 son
  /// "vuelve a intentarlo" del propio servidor.
  bool _esRechazoDefinitivo(int codigo) =>
      codigo >= 400 &&
      codigo < 500 &&
      codigo != 401 &&
      codigo != 408 &&
      codigo != 429;

  static Future<void> _enviar(ViajesRepository repo, OperacionPendiente op) async {
    final d = op.datos;
    switch (op.tipo) {
      case TipoPendiente.revision:
        await repo.capturarRevision(
          op.viajeId,
          d['tipo'] == 'SALIDA' ? TipoRevision.salida : TipoRevision.llegada,
          odometro: (d['odometro'] as num).toInt(),
          nivelCombustiblePct: (d['nivelCombustiblePct'] as num?)?.toInt(),
          novedades: d['novedades'] as String?,
          checklist: (d['checklist'] as List<dynamic>? ?? [])
              .map(
                (e) =>
                    ItemChecklist.fromJson(Map<String, dynamic>.from(e as Map)),
              )
              .toList(),
          fotoPath: op.fotoPath,
        );
      case TipoPendiente.gasto:
        await repo.crearGasto(
          op.viajeId,
          tipo: d['tipo'] as String,
          monto: (d['monto'] as num).toDouble(),
          descripcion: d['descripcion'] as String?,
          litros: (d['litros'] as num?)?.toDouble(),
          ticketPath: op.fotoPath,
        );
      case TipoPendiente.cambioEstado:
        await repo.cambiarEstado(
          op.viajeId,
          EstadoViaje.values.firstWhere((e) => e.api == d['estado']),
          nota: d['nota'] as String?,
        );
    }
  }
}
