import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Persistencia segura de la sesión del conductor.
/// Android → AES-GCM con llave envuelta en Keystore · iOS → Keychain.
class TokenStorage {
  TokenStorage([FlutterSecureStorage? storage])
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  static const _kAccessToken = 'flotaos_access_token';
  static const _kRefreshToken = 'flotaos_refresh_token';
  static const _kConductor = 'flotaos_conductor';

  /// Minimización de datos: el login devuelve el perfil completo del
  /// conductor (incluye CURP/RFC/NSS), pero la app solo necesita estos
  /// campos — el resto no se persiste en el dispositivo.
  static const _camposPerfil = [
    'id',
    'nombre',
    'apellidos',
    'usuario',
    'email',
    'telefono',
    'numeroEmpleado',
    'categoriaLicencia',
    'fotoKey',
    'activo',
    'type',
  ];

  Future<String?> get accessToken => _storage.read(key: _kAccessToken);

  Future<String?> get refreshToken => _storage.read(key: _kRefreshToken);

  Future<Map<String, dynamic>?> get conductor async {
    final raw = await _storage.read(key: _kConductor);
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  Future<void> guardarSesion({
    required String accessToken,
    required String refreshToken,
    required Map<String, dynamic> conductor,
  }) async {
    final perfilMinimo = {
      for (final campo in _camposPerfil)
        if (conductor.containsKey(campo)) campo: conductor[campo],
    };
    await Future.wait([
      _storage.write(key: _kAccessToken, value: accessToken),
      _storage.write(key: _kRefreshToken, value: refreshToken),
      _storage.write(key: _kConductor, value: jsonEncode(perfilMinimo)),
    ]);
  }

  Future<void> limpiar() async {
    await Future.wait([
      _storage.delete(key: _kAccessToken),
      _storage.delete(key: _kRefreshToken),
      _storage.delete(key: _kConductor),
    ]);
  }
}
