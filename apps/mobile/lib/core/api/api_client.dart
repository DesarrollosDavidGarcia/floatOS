import 'package:dio/dio.dart';

import '../config/app_config.dart';
import '../storage/token_storage.dart';

/// Cliente HTTP central: adjunta el Bearer token y renueva la sesión
/// automáticamente con el refresh token cuando el access token vence (401).
class ApiClient {
  ApiClient(this._tokens, {required this.onSesionExpirada}) {
    final opcionesBase = BaseOptions(
      baseUrl: AppConfig.apiUrl,
      connectTimeout: const Duration(seconds: 12),
      receiveTimeout: const Duration(seconds: 20),
    );
    dio = Dio(opcionesBase);
    // Cliente "plano" SIN interceptores para el refresh y el reintento.
    // Si usaran el `dio` principal, su 401 entraría a la cola de errores del
    // QueuedInterceptorsWrapper — que está bloqueada por el handler en curso
    // (el que espera ese mismo refresh) → deadlock circular y la app nunca
    // regresa al login. (Auditoría 2026-06-11, hallazgo 🔴 #1.)
    _dioPlano = Dio(opcionesBase);

    dio.interceptors.add(
      QueuedInterceptorsWrapper(
        onRequest: (options, handler) async {
          if (options.extra['sinAuth'] != true) {
            final token = await _tokens.accessToken;
            if (token != null) {
              options.headers['Authorization'] = 'Bearer $token';
            }
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final esLoginORefresh =
              error.requestOptions.path.contains('/auth/login') ||
                  error.requestOptions.path.contains('/auth/conductor/login') ||
                  error.requestOptions.path.contains('/auth/refresh');

          if (error.response?.statusCode != 401 || esLoginORefresh) {
            return handler.next(error);
          }

          // Access token vencido → intentar refresh y reintentar la petición.
          // QueuedInterceptorsWrapper serializa los errores concurrentes, por
          // lo que solo un refresh corre a la vez.
          final renovado = await _intentarRefresh();
          if (!renovado) {
            await _tokens.limpiar();
            onSesionExpirada();
            return handler.next(error);
          }

          try {
            final token = await _tokens.accessToken;
            final opts = error.requestOptions;
            opts.headers['Authorization'] = 'Bearer $token';
            // Reintento por el cliente plano: si volviera a fallar, el error
            // llega directo aquí en vez de re-entrar a la cola bloqueada.
            final respuesta = await _dioPlano.fetch<dynamic>(opts);
            return handler.resolve(respuesta);
          } on DioException catch (e) {
            return handler.next(e);
          }
        },
      ),
    );
  }

  late final Dio dio;
  late final Dio _dioPlano;
  final TokenStorage _tokens;

  /// Se invoca cuando el refresh token también venció: la app debe
  /// regresar al login.
  final void Function() onSesionExpirada;

  Future<bool> _intentarRefresh() async {
    final refreshToken = await _tokens.refreshToken;
    if (refreshToken == null) return false;

    try {
      final res = await _dioPlano.post<Map<String, dynamic>>(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
      );
      final data = res.data!;
      await _tokens.guardarSesion(
        accessToken: data['accessToken'] as String,
        refreshToken: data['refreshToken'] as String,
        conductor: data['user'] as Map<String, dynamic>,
      );
      return true;
    } on DioException {
      return false;
    }
  }
}
