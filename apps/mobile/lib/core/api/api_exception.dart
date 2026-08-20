import 'package:dio/dio.dart';

/// Error de API normalizado para mostrar al usuario.
class ApiException implements Exception {
  ApiException(this.mensaje, {this.statusCode});

  final String mensaje;
  final int? statusCode;

  bool get esSesionExpirada => statusCode == 401;

  /// No hubo respuesta del servidor: sin red, timeout o el servidor caído. Es
  /// lo que distingue "no llegó" de "llegó y lo rechazó", y decide si la
  /// operación se guarda para reintentarla o se le muestra el error al usuario.
  bool get esSinConexion => statusCode == null;

  factory ApiException.desdeDio(DioException e) {
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.sendTimeout ||
        e.type == DioExceptionType.connectionError) {
      return ApiException('Sin conexión con el servidor. Revisa tu internet.');
    }

    final data = e.response?.data;
    String? mensaje;
    if (data is Map<String, dynamic>) {
      final m = data['message'];
      if (m is String) mensaje = m;
      if (m is List && m.isNotEmpty) mensaje = m.join('\n');
    }
    return ApiException(
      mensaje ?? 'Ocurrió un error inesperado. Intenta de nuevo.',
      statusCode: e.response?.statusCode,
    );
  }

  @override
  String toString() => mensaje;
}

/// Mensaje apto para mostrar en UI: nunca expone errores internos de Dart
/// (parseos, null checks) — solo los mensajes ya normalizados.
String mensajeDeError(Object error) => error is ApiException
    ? error.mensaje
    : 'Algo salió mal. Intenta de nuevo.';
