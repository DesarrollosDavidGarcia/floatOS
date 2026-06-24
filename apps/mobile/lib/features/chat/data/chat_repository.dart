import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_exception.dart';
import '../domain/mensaje_chat.dart';

/// Tipos de adjunto permitidos por extensión → mimetype (debe coincidir con el
/// backend). Es imprescindible fijar el Content-Type del MultipartFile: sin él,
/// dio lo envía como application/octet-stream y el API lo rechaza.
const _mimePorExtension = <String, String>{
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'webp': 'image/webp',
  'pdf': 'application/pdf',
};

class ChatRepository {
  ChatRepository(this._api);

  final ApiClient _api;

  /// Historial del chat del viaje (orden cronológico).
  Future<List<MensajeChat>> historial(String viajeId) async {
    try {
      final res =
          await _api.dio.get<List<dynamic>>('/viajes/$viajeId/chat');
      return (res.data ?? [])
          .map((e) => MensajeChat.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.desdeDio(e);
    }
  }

  /// Envía un mensaje (texto y/o un adjunto imagen/PDF).
  Future<MensajeChat> enviar(
    String viajeId, {
    String? texto,
    String? archivoPath,
    String? archivoNombre,
  }) async {
    try {
      final form = FormData.fromMap({
        if (texto != null && texto.trim().isNotEmpty) 'texto': texto.trim(),
        if (archivoPath != null)
          'archivo': await MultipartFile.fromFile(
            archivoPath,
            filename: archivoNombre,
            contentType: _mediaType(archivoNombre ?? archivoPath),
          ),
      });
      final res = await _api.dio
          .post<Map<String, dynamic>>('/viajes/$viajeId/chat', data: form);
      return MensajeChat.fromJson(res.data!);
    } on DioException catch (e) {
      throw ApiException.desdeDio(e);
    }
  }

  /// Marca como leídos los mensajes del panel en este viaje.
  Future<void> marcarLeido(String viajeId) async {
    try {
      await _api.dio.post<void>('/viajes/$viajeId/chat/leer');
    } on DioException {
      // No crítico: el badge se corregirá en la próxima carga.
    }
  }

  /// Nº de mensajes del panel sin leer para este viaje (para el badge).
  Future<int> noLeidos(String viajeId) async {
    try {
      final res = await _api.dio.get<Map<String, dynamic>>('/chat/no-leidos');
      final porViaje =
          (res.data?['porViaje'] as List<dynamic>? ?? []).cast<dynamic>();
      for (final v in porViaje) {
        final m = v as Map<String, dynamic>;
        if (m['viajeId'] == viajeId) {
          return (m['cantidad'] as num?)?.toInt() ?? 0;
        }
      }
      return 0;
    } on DioException {
      return 0;
    }
  }

  DioMediaType? _mediaType(String nombre) {
    final punto = nombre.lastIndexOf('.');
    if (punto < 0) return null;
    final ext = nombre.substring(punto + 1).toLowerCase();
    final mime = _mimePorExtension[ext];
    return mime == null ? null : DioMediaType.parse(mime);
  }
}
