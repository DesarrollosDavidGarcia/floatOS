import 'dart:async';

import 'package:socket_io_client/socket_io_client.dart' as io;

import '../config/app_config.dart';
import '../storage/token_storage.dart';

/// Eventos espejo de WS_EVENTS en packages/shared-types.
abstract final class WsEvents {
  static const ubicacionActualizada = 'ubicacion:actualizada';
  static const viajeEstadoCambiado = 'viaje:estado';
  static const alerta = 'alerta';
  static const viajeReasignado = 'viaje:reasignado';
}

/// Conexión Socket.io al namespace /tracking del API.
/// El conductor se suscribe a la sala de su viaje activo para recibir
/// alertas y cambios de estado hechos desde el panel en tiempo real.
class SocketService {
  SocketService(this._tokens);

  final TokenStorage _tokens;
  io.Socket? _socket;
  String? _viajeSuscrito;

  final _alertas = StreamController<Map<String, dynamic>>.broadcast();
  final _cambiosEstado = StreamController<Map<String, dynamic>>.broadcast();
  final _reasignaciones = StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get alertas => _alertas.stream;
  Stream<Map<String, dynamic>> get cambiosEstado => _cambiosEstado.stream;

  /// Reasignaciones de viaje (sala personal `conductor:<id>`): el conductor
  /// saliente o entrante recibe el aviso aunque no esté en la sala del viaje.
  Stream<Map<String, dynamic>> get reasignaciones => _reasignaciones.stream;

  Future<void> conectar() async {
    if (_socket?.connected == true) return;
    final token = await _tokens.accessToken;
    if (token == null) return;

    _socket?.dispose();
    _socket = io.io(
      '${AppConfig.socketUrl}${AppConfig.trackingNamespace}',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .enableReconnection()
          .build(),
    );

    _socket!
      ..on(WsEvents.alerta, (data) {
        if (data is Map) _alertas.add(Map<String, dynamic>.from(data));
      })
      ..on(WsEvents.viajeEstadoCambiado, (data) {
        if (data is Map) _cambiosEstado.add(Map<String, dynamic>.from(data));
      })
      ..on(WsEvents.viajeReasignado, (data) {
        if (data is Map) _reasignaciones.add(Map<String, dynamic>.from(data));
      })
      ..onReconnectAttempt((_) async {
        // El access token dura 15 min y un viaje dura horas: si el payload
        // de auth quedara congelado, toda reconexión posterior sería
        // rechazada por el gateway y el tiempo real moriría en silencio.
        final tokenVigente = await _tokens.accessToken;
        if (tokenVigente != null) {
          _socket?.auth = {'token': tokenVigente};
        }
      })
      ..onReconnect((_) {
        // Tras reconectar hay que volver a entrar a la sala.
        final viajeId = _viajeSuscrito;
        if (viajeId != null) suscribirViaje(viajeId);
      });
  }

  void suscribirViaje(String viajeId) {
    _viajeSuscrito = viajeId;
    _socket?.emit('suscribir', {'viajeId': viajeId});
  }

  void desuscribirViaje(String viajeId) {
    if (_viajeSuscrito == viajeId) _viajeSuscrito = null;
    _socket?.emit('desuscribir', {'viajeId': viajeId});
  }

  /// Cierra la conexión (logout / sesión expirada). El servicio queda
  /// utilizable: el siguiente login llama `conectar()` con el token nuevo.
  void desconectar() {
    _viajeSuscrito = null;
    _socket?.dispose();
    _socket = null;
  }

  /// Libera todo (solo al destruir el contenedor de providers).
  void dispose() {
    desconectar();
    _alertas.close();
    _cambiosEstado.close();
    _reasignaciones.close();
  }
}
