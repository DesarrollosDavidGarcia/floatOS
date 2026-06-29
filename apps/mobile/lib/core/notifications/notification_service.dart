import 'dart:convert';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// IDs de canal de Android. Cada canal lo agrupa el sistema con su propio
/// sonido/importancia y el usuario lo puede silenciar por separado.
abstract final class _Canal {
  static const chat = 'chat';
  static const general = 'general'; // alertas, reasignaciones, cambios de estado
}

/// Callback al tocar una notificación: recibe el payload decodificado.
typedef NotificacionTapHandler = void Function(Map<String, dynamic> payload);

/// Notificaciones locales del sistema (sin Firebase). Se disparan desde el
/// coordinador al recibir eventos por socket mientras el isolate está vivo
/// (app en primer plano o en background durante un viaje activo).
class NotificationService {
  final _plugin = FlutterLocalNotificationsPlugin();
  bool _inicializado = false;
  int _idGeneral = 1000;

  /// Lo fija el coordinador para navegar al tocar la notificación.
  NotificacionTapHandler? onTap;

  Future<void> init() async {
    if (_inicializado) return;
    // Icono pequeño monocromo (evita el cuadro blanco del ic_launcher a color).
    const android = AndroidInitializationSettings('@drawable/ic_notification');
    // Permisos se piden aparte (tras login), no al inicializar.
    const darwin = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );
    await _plugin.initialize(
      settings: const InitializationSettings(android: android, iOS: darwin),
      onDidReceiveNotificationResponse: _alTocar,
    );
    await _crearCanales();
    _inicializado = true;
  }

  void _alTocar(NotificationResponse respuesta) {
    final payload = respuesta.payload;
    if (payload == null || payload.isEmpty) return;
    try {
      final data = jsonDecode(payload) as Map<String, dynamic>;
      onTap?.call(data);
    } catch (_) {
      // Payload corrupto: ignorar (solo abrir la app es aceptable).
    }
  }

  Future<void> _crearCanales() async {
    final android = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    if (android == null) return;
    await android.createNotificationChannel(const AndroidNotificationChannel(
      _Canal.chat,
      'Mensajes de chat',
      description: 'Mensajes del monitorista en el chat del viaje',
      importance: Importance.high,
    ));
    await android.createNotificationChannel(const AndroidNotificationChannel(
      _Canal.general,
      'Avisos del viaje',
      description: 'Alertas, reasignaciones y cambios de estado',
      importance: Importance.high,
    ));
  }

  /// Si la app fue ABIERTA tocando una notificación (arranque en frío), devuelve
  /// su payload decodificado; si no, null. `onDidReceiveNotificationResponse` no
  /// se dispara para la notificación que lanzó el proceso, hay que consultarlo.
  Future<Map<String, dynamic>?> payloadDeLanzamiento() async {
    final detalles = await _plugin.getNotificationAppLaunchDetails();
    if (detalles?.didNotificationLaunchApp != true) return null;
    final payload = detalles!.notificationResponse?.payload;
    if (payload == null || payload.isEmpty) return null;
    try {
      return jsonDecode(payload) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  /// Pide permiso de notificaciones (Android 13+ e iOS). Idempotente: el SO
  /// solo muestra el diálogo la primera vez.
  Future<void> pedirPermisos() async {
    await _plugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();
    await _plugin
        .resolvePlatformSpecificImplementation<
            IOSFlutterLocalNotificationsPlugin>()
        ?.requestPermissions(alert: true, badge: true, sound: true);
  }

  /// Notificación de un mensaje de chat. Usa un id estable por viaje para que
  /// un mensaje nuevo reemplace al anterior (una notificación por chat).
  Future<void> mostrarChat({
    required String viajeId,
    required String autor,
    required String cuerpo,
  }) {
    return _mostrar(
      id: viajeId.hashCode & 0x7fffffff,
      canal: _Canal.chat,
      canalNombre: 'Mensajes de chat',
      titulo: autor,
      cuerpo: cuerpo,
      payload: {'tipo': 'chat', 'viajeId': viajeId},
    );
  }

  /// Notificación de aviso general (alerta, reasignación, cambio de estado).
  Future<void> mostrarGeneral({
    required String titulo,
    required String cuerpo,
    String? viajeId,
  }) {
    return _mostrar(
      id: _idGeneral++,
      canal: _Canal.general,
      canalNombre: 'Avisos del viaje',
      titulo: titulo,
      cuerpo: cuerpo,
      payload: {'tipo': 'general', 'viajeId': ?viajeId},
    );
  }

  Future<void> _mostrar({
    required int id,
    required String canal,
    required String canalNombre,
    required String titulo,
    required String cuerpo,
    required Map<String, dynamic> payload,
  }) {
    final detalles = NotificationDetails(
      android: AndroidNotificationDetails(
        canal,
        canalNombre,
        importance: Importance.high,
        priority: Priority.high,
        styleInformation: BigTextStyleInformation(cuerpo),
      ),
      iOS: const DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      ),
    );
    return _plugin.show(
      id: id,
      title: titulo,
      body: cuerpo,
      notificationDetails: detalles,
      payload: jsonEncode(payload),
    );
  }
}
