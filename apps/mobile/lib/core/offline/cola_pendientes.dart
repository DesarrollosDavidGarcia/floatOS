import 'dart:async';
import 'dart:io';

import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'operacion_pendiente.dart';

/// Cola persistente de lo capturado sin señal.
///
/// Vive en disco porque el caso que resuelve es justamente el peor: el
/// conductor captura la revisión en un patio sin cobertura, cierra la app y se
/// va. Si la cola estuviera en memoria, ese dato se perdería.
class ColaPendientes {
  ColaPendientes(this._prefs);

  static const _clave = 'flotaos.pendientes';
  static const _carpetaEvidencias = 'pendientes';

  final SharedPreferences _prefs;

  List<OperacionPendiente> leer() =>
      OperacionPendiente.decodificar(_prefs.getString(_clave));

  Future<void> _guardar(List<OperacionPendiente> ops) async {
    await _prefs.setString(_clave, OperacionPendiente.codificar(ops));
  }

  /// Encola al final: el orden de captura es el orden de envío, y el backend
  /// depende de él (sin revisión no acepta el cambio de estado).
  Future<OperacionPendiente> encolar({
    required TipoPendiente tipo,
    required String viajeId,
    required Map<String, dynamic> datos,
    String? fotoPath,
  }) async {
    final ops = leer();
    final copia = fotoPath == null ? null : await _copiarEvidencia(fotoPath);
    final op = OperacionPendiente(
      // Timestamp + tamaño de la cola: único sin necesitar un paquete de uuid.
      id: '${DateTime.now().microsecondsSinceEpoch}-${ops.length}',
      tipo: tipo,
      viajeId: viajeId,
      datos: datos,
      fotoPath: copia,
      creadaEn: DateTime.now(),
    );
    ops.add(op);
    await _guardar(ops);
    return op;
  }

  Future<void> quitar(String id) async {
    final ops = leer();
    final op = ops.where((o) => o.id == id).firstOrNull;
    ops.removeWhere((o) => o.id == id);
    await _guardar(ops);
    // La evidencia ya viajó al servidor: no hace falta seguir ocupando disco.
    if (op?.fotoPath != null) {
      await File(op!.fotoPath!).delete().catchError((_) => File(op.fotoPath!));
    }
  }

  Future<void> marcarIntento(String id, String error) async {
    final ops = leer();
    for (final o in ops) {
      if (o.id == id) {
        o.intentos += 1;
        o.ultimoError = error;
      }
    }
    await _guardar(ops);
  }

  /// Copia la foto a un directorio propio de la app: la que devuelve la cámara
  /// vive en la caché y el sistema puede borrarla antes de que haya señal.
  Future<String?> _copiarEvidencia(String origen) async {
    try {
      final dir = await getApplicationDocumentsDirectory();
      final destino = Directory('${dir.path}/$_carpetaEvidencias');
      if (!await destino.exists()) await destino.create(recursive: true);
      final nombre =
          '${DateTime.now().microsecondsSinceEpoch}_'
          '${origen.split(Platform.pathSeparator).last}';
      final copia = await File(origen).copy('${destino.path}/$nombre');
      return copia.path;
    } catch (_) {
      // Sin copia se intenta con la ruta original: es peor perder la evidencia.
      return origen;
    }
  }
}
