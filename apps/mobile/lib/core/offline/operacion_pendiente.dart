import 'dart:convert';

/// Qué operación quedó pendiente de enviar.
enum TipoPendiente {
  revision,
  gasto,
  cambioEstado;

  static TipoPendiente desde(String v) =>
      TipoPendiente.values.firstWhere((t) => t.name == v);
}

/// Una operación capturada sin señal, esperando a sincronizarse.
///
/// El orden importa: el backend rechaza el cambio de estado si la revisión aún
/// no llegó, así que la cola es estrictamente FIFO y no se salta elementos.
class OperacionPendiente {
  OperacionPendiente({
    required this.id,
    required this.tipo,
    required this.viajeId,
    required this.datos,
    required this.creadaEn,
    this.fotoPath,
    this.intentos = 0,
    this.ultimoError,
  });

  final String id;
  final TipoPendiente tipo;
  final String viajeId;

  /// Payload de la operación, tal como lo espera el repositorio.
  final Map<String, dynamic> datos;

  /// Copia local de la evidencia (tablero o ticket), si la hubo.
  final String? fotoPath;

  final DateTime creadaEn;
  int intentos;
  String? ultimoError;

  /// Descripción corta para la pantalla de pendientes.
  String get resumen {
    switch (tipo) {
      case TipoPendiente.revision:
        return datos['tipo'] == 'SALIDA'
            ? 'Revisión de salida'
            : 'Revisión de llegada';
      case TipoPendiente.gasto:
        return 'Gasto: ${datos['tipo']}';
      case TipoPendiente.cambioEstado:
        return 'Cambio de estado a ${datos['estado']}';
    }
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'tipo': tipo.name,
    'viajeId': viajeId,
    'datos': datos,
    'fotoPath': fotoPath,
    'creadaEn': creadaEn.toIso8601String(),
    'intentos': intentos,
    'ultimoError': ultimoError,
  };

  static OperacionPendiente fromJson(Map<String, dynamic> json) =>
      OperacionPendiente(
        id: json['id'] as String,
        tipo: TipoPendiente.desde(json['tipo'] as String),
        viajeId: json['viajeId'] as String,
        datos: Map<String, dynamic>.from(json['datos'] as Map),
        fotoPath: json['fotoPath'] as String?,
        creadaEn: DateTime.parse(json['creadaEn'] as String),
        intentos: (json['intentos'] as num?)?.toInt() ?? 0,
        ultimoError: json['ultimoError'] as String?,
      );

  static String codificar(List<OperacionPendiente> ops) =>
      jsonEncode(ops.map((o) => o.toJson()).toList());

  static List<OperacionPendiente> decodificar(String? raw) {
    if (raw == null || raw.isEmpty) return [];
    try {
      return (jsonDecode(raw) as List<dynamic>)
          .map((e) => OperacionPendiente.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      // Cola corrupta: mejor perderla que dejar la app sin arrancar.
      return [];
    }
  }
}
