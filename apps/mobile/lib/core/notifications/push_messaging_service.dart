import 'package:dio/dio.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

import '../api/api_client.dart';

/// Integración con FCM: registra el token del dispositivo en el API y expone
/// los mensajes/taps de push. El servidor solo manda push cuando el conductor
/// NO está conectado por socket (app cerrada), así que no duplica las
/// notificaciones locales.
class PushMessagingService {
  PushMessagingService(this._api);

  final ApiClient _api;
  final _fm = FirebaseMessaging.instance;

  /// Registra el token FCM del dispositivo para el conductor autenticado.
  Future<void> registrar() async {
    final token = await _fm.getToken();
    if (token != null) await _enviar(token);
  }

  Future<void> _enviar(String token) async {
    try {
      await _api.dio.post<void>(
        '/push/registrar',
        data: {'token': token, 'plataforma': 'android'},
      );
    } on DioException {
      // No crítico: se reintenta en el próximo arranque / refresh de token.
    }
  }

  /// Reenvía a la API cada vez que FCM rota el token.
  Stream<String> get onTokenRefresh => _fm.onTokenRefresh;

  /// Da de baja el token (logout) para no seguir recibiendo push.
  Future<void> baja() async {
    try {
      final token = await _fm.getToken();
      if (token != null) {
        await _api.dio.post<void>('/push/baja', data: {'token': token});
      }
      await _fm.deleteToken();
    } catch (_) {
      // No crítico.
    }
  }

  /// `data` del push que abrió la app desde estado terminado (tap en frío).
  Future<Map<String, dynamic>?> dataDeLanzamiento() async {
    final mensaje = await _fm.getInitialMessage();
    return mensaje?.data;
  }

  /// `data` de los taps en push con la app en background (no terminada).
  Stream<Map<String, dynamic>> get alAbrirDesdePush =>
      FirebaseMessaging.onMessageOpenedApp.map((m) => m.data);

  /// Push recibido con la app EN PRIMER PLANO. FCM no lo muestra solo en este
  /// estado, así que hay que mostrarlo manualmente. Solo ocurre si el servidor
  /// nos creyó desconectados (socket caído un instante), por lo que no duplica.
  Stream<({String? titulo, String? cuerpo, Map<String, dynamic> data})>
      get alRecibirEnPrimerPlano => FirebaseMessaging.onMessage.map(
            (m) => (
              titulo: m.notification?.title,
              cuerpo: m.notification?.body,
              data: m.data,
            ),
          );
}
