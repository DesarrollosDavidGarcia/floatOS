import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/storage/token_storage.dart';
import '../domain/conductor.dart';

class AuthRepository {
  AuthRepository(this._api, this._tokens);

  final ApiClient _api;
  final TokenStorage _tokens;

  /// POST /auth/conductor/login → guarda tokens + perfil.
  Future<Conductor> login({
    required String usuario,
    required String password,
  }) async {
    try {
      final res = await _api.dio.post<Map<String, dynamic>>(
        '/auth/conductor/login',
        data: {'usuario': usuario, 'password': password},
        options: Options(extra: {'sinAuth': true}),
      );
      final data = res.data!;
      final user = data['user'] as Map<String, dynamic>;
      await _tokens.guardarSesion(
        accessToken: data['accessToken'] as String,
        refreshToken: data['refreshToken'] as String,
        conductor: user,
      );
      return Conductor.fromJson(user);
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw ApiException('Usuario o contraseña incorrectos.',
            statusCode: 401);
      }
      throw ApiException.desdeDio(e);
    }
  }

  /// Restaura la sesión guardada (si existe) sin tocar la red.
  Future<Conductor?> sesionGuardada() async {
    final token = await _tokens.accessToken;
    final perfil = await _tokens.conductor;
    if (token == null || perfil == null) return null;
    return Conductor.fromJson(perfil);
  }

  Future<void> logout() async {
    try {
      await _api.dio.post<void>('/auth/logout');
    } on DioException {
      // El logout local procede aunque el servidor no responda.
    } finally {
      await _tokens.limpiar();
    }
  }
}
