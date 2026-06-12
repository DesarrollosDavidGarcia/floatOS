import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/auth_repository.dart';
import '../domain/conductor.dart';

/// Estado de sesión de la app.
sealed class AuthState {
  const AuthState();
}

/// Aún restaurando la sesión guardada (splash).
class AuthCargando extends AuthState {
  const AuthCargando();
}

class AuthSinSesion extends AuthState {
  const AuthSinSesion({this.mensaje});

  /// Mensaje informativo (p. ej. "tu sesión expiró").
  final String? mensaje;
}

class AuthConSesion extends AuthState {
  const AuthConSesion(this.conductor);
  final Conductor conductor;
}

class AuthNotifier extends Notifier<AuthState> {
  AuthRepository get _repo => ref.read(authRepositoryProvider);

  @override
  AuthState build() {
    _restaurar();
    return const AuthCargando();
  }

  Future<void> _restaurar() async {
    final conductor = await _repo.sesionGuardada();
    if (!ref.mounted) return;
    state = conductor == null
        ? const AuthSinSesion()
        : AuthConSesion(conductor);
  }

  Future<void> login(String usuario, String password) async {
    final conductor = await _repo.login(usuario: usuario, password: password);
    state = AuthConSesion(conductor);
  }

  Future<void> logout() async {
    await _cerrarServiciosDeSesion();
    await _repo.logout();
    state = const AuthSinSesion();
  }

  /// Invocado por el ApiClient cuando el refresh token venció.
  void sesionExpirada() {
    if (state is! AuthConSesion) return;
    _cerrarServiciosDeSesion();
    state = const AuthSinSesion(
      mensaje: 'Tu sesión expiró, inicia sesión de nuevo.',
    );
  }

  /// Sin sesión no debe quedar nada vivo: ni el GPS (notificación
  /// persistente + batería) ni el socket autenticado del usuario anterior.
  Future<void> _cerrarServiciosDeSesion() async {
    await ref.read(trackingControllerProvider.notifier).detener();
    ref.read(socketServiceProvider).desconectar();
  }
}

final authProvider =
    NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
