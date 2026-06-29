import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/providers/auth_provider.dart';
import '../providers.dart';
import '../router.dart';
import 'notification_service.dart';

/// Envuelve la app y conecta los eventos del socket con notificaciones locales
/// del sistema. Vive mientras la app esté abierta (raíz del árbol), por lo que
/// recibe los eventos sin depender de qué pantalla esté visible.
///
/// Reglas:
/// - Chat (solo del MONITORISTA): notifica siempre salvo que ESE chat esté
///   abierto en primer plano (ya lo estás viendo).
/// - Alertas / reasignación / cambio de estado: notifica cuando la app NO está
///   en primer plano; en primer plano lo cubre la UI in-app existente.
class NotificationCoordinator extends ConsumerStatefulWidget {
  const NotificationCoordinator({required this.child, super.key});

  final Widget child;

  @override
  ConsumerState<NotificationCoordinator> createState() =>
      _NotificationCoordinatorState();
}

class _NotificationCoordinatorState
    extends ConsumerState<NotificationCoordinator> with WidgetsBindingObserver {
  final _subs = <StreamSubscription<Map<String, dynamic>>>[];
  AppLifecycleState _ciclo = AppLifecycleState.resumed;
  bool _permisosPedidos = false;
  // Viaje al que navegar si la app se abrió tocando una notificación en frío;
  // se difiere hasta que haya sesión iniciada.
  Map<String, dynamic>? _rutaPendiente;
  StreamSubscription<String>? _subTokenPush;
  StreamSubscription<({String? titulo, String? cuerpo, Map<String, dynamic> data})>?
      _subPushPrimerPlano;
  bool _tokenRegistrado = false;

  bool get _enPrimerPlano => _ciclo == AppLifecycleState.resumed;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    Future.microtask(_inicializar);
  }

  Future<void> _inicializar() async {
    final notif = ref.read(notificationServiceProvider);
    await notif.init();
    // Al tocar una notificación: abrir el detalle del viaje.
    notif.onTap = (payload) {
      final viajeId = payload['viajeId'];
      if (viajeId is String && viajeId.isNotEmpty) {
        ref.read(routerProvider).push('/viajes/$viajeId');
      }
    };

    final socket = ref.read(socketServiceProvider);
    _subs
      ..add(socket.chatMensajes.listen(_alMensajeChat))
      ..add(socket.alertas.listen(_alAlerta))
      ..add(socket.reasignaciones.listen(_alReasignacion))
      ..add(socket.cambiosEstado.listen(_alCambioEstado));

    // Push (FCM): tap con app en background → navegar; refresh de token → re-registrar.
    final push = ref.read(pushMessagingServiceProvider);
    _subs.add(push.alAbrirDesdePush.listen((data) {
      _rutaPendiente = data;
      _intentarRutaPendiente();
    }));
    _subTokenPush = push.onTokenRefresh.listen((_) {
      if (ref.read(authProvider) is AuthConSesion) push.registrar();
    });
    // Push recibido con la app en primer plano (FCM no lo muestra solo): lo
    // mostramos como notificación local, con la misma supresión del chat abierto.
    _subPushPrimerPlano =
        push.alRecibirEnPrimerPlano.listen(_alPushPrimerPlano);

    // ¿Se abrió la app tocando una notificación en frío (local o push)?
    _rutaPendiente =
        await notif.payloadDeLanzamiento() ?? await push.dataDeLanzamiento();
    _intentarRutaPendiente();
  }

  /// Navega al viaje de la notificación que lanzó la app, en cuanto haya sesión.
  void _intentarRutaPendiente() {
    final viajeId = _rutaPendiente?['viajeId'];
    if (viajeId is! String || viajeId.isEmpty) {
      _rutaPendiente = null;
      return;
    }
    if (ref.read(authProvider) is! AuthConSesion) return; // espera login
    _rutaPendiente = null;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(routerProvider).push('/viajes/$viajeId');
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    for (final s in _subs) {
      s.cancel();
    }
    _subTokenPush?.cancel();
    _subPushPrimerPlano?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState estado) {
    _ciclo = estado;
  }

  NotificationService get _notif => ref.read(notificationServiceProvider);

  /// Muestra un push recibido en primer plano como notificación local.
  void _alPushPrimerPlano(
    ({String? titulo, String? cuerpo, Map<String, dynamic> data}) msg,
  ) {
    final viajeId = msg.data['viajeId'] as String?;
    final esChat = msg.data['tipo'] == 'chat';
    // No molestar si es de un chat que ya tienes abierto.
    if (esChat && viajeId != null && ref.read(chatAbiertoProvider) == viajeId) {
      return;
    }
    final titulo = msg.titulo ?? 'FlotaOS';
    final cuerpo = msg.cuerpo ?? '';
    if (esChat && viajeId != null) {
      _notif.mostrarChat(viajeId: viajeId, autor: titulo, cuerpo: cuerpo);
    } else {
      _notif.mostrarGeneral(titulo: titulo, cuerpo: cuerpo, viajeId: viajeId);
    }
  }

  void _alMensajeChat(Map<String, dynamic> data) {
    // Solo lo que escribe el monitorista (no el eco de los propios mensajes).
    if (data['autorTipo'] != 'MONITORISTA') return;
    final viajeId = data['viajeId'] as String?;
    if (viajeId == null) return;
    final chatAbierto = ref.read(chatAbiertoProvider) == viajeId;
    // Acusa "entregado" en cuanto el dispositivo recibe el mensaje (aunque el
    // chat esté cerrado o la app en background): el monitorista verá la palomita.
    // Si el chat está abierto, lo cubre `marcarLeido` (leído implica recibido):
    // evitamos un POST extra y el parpadeo entregado→leído en el emisor.
    if (!chatAbierto) {
      ref.read(chatRepositoryProvider).marcarRecibido(viajeId);
    }
    // Si ya tienes ESE chat abierto en primer plano, no molestar.
    if (_enPrimerPlano && chatAbierto) return;

    final autor = (data['autorNombre'] as String?)?.trim();
    final texto = (data['texto'] as String?)?.trim();
    final tieneArchivo = data['archivoUrl'] != null;
    final cuerpo = (texto != null && texto.isNotEmpty)
        ? texto
        : (tieneArchivo ? '📎 Adjunto' : 'Nuevo mensaje');

    _notif.mostrarChat(
      viajeId: viajeId,
      autor: (autor != null && autor.isNotEmpty) ? autor : 'Monitorista',
      cuerpo: cuerpo,
    );
  }

  void _alAlerta(Map<String, dynamic> data) {
    if (_enPrimerPlano) return; // la UI in-app ya lo muestra
    final mensaje =
        (data['mensaje'] ?? data['tipo'] ?? 'Nueva alerta').toString();
    _notif.mostrarGeneral(
      titulo: '⚠ Alerta',
      cuerpo: mensaje,
      viajeId: data['viajeId'] as String?,
    );
  }

  void _alReasignacion(Map<String, dynamic> data) {
    if (_enPrimerPlano) return;
    final auth = ref.read(authProvider);
    final yo = auth is AuthConSesion ? auth.conductor.id : null;
    final folio = data['folio'];
    final cual = folio != null ? 'el viaje #$folio' : 'un viaje';
    final String cuerpo;
    if (yo != null && data['conductorNuevoId'] == yo) {
      cuerpo = 'Te asignaron $cual';
    } else if (yo != null && data['conductorAnteriorId'] == yo) {
      cuerpo = 'Ya no tienes $cual (reasignado)';
    } else {
      cuerpo = 'Cambió la asignación de $cual';
    }
    _notif.mostrarGeneral(
      titulo: 'Reasignación de viaje',
      cuerpo: cuerpo,
      viajeId: data['viajeId'] as String?,
    );
  }

  void _alCambioEstado(Map<String, dynamic> data) {
    if (_enPrimerPlano) return;
    final folio = data['folio'];
    final cual = folio != null ? 'tu viaje #$folio' : 'tu viaje';
    _notif.mostrarGeneral(
      titulo: 'Viaje actualizado',
      cuerpo: 'El monitorista actualizó $cual',
      viajeId: data['viajeId'] as String?,
    );
  }

  @override
  Widget build(BuildContext context) {
    // Pide permiso de notificaciones una sola vez, al haber sesión iniciada.
    ref.listen<AuthState>(authProvider, (anterior, actual) {
      if (actual is AuthConSesion) {
        if (!_permisosPedidos) {
          _permisosPedidos = true;
          ref.read(notificationServiceProvider).pedirPermisos();
        }
        // Registra el token FCM del dispositivo para recibir push (app cerrada).
        if (!_tokenRegistrado) {
          _tokenRegistrado = true;
          ref.read(pushMessagingServiceProvider).registrar();
        }
        // Si la app se abrió desde una notificación antes de tener sesión,
        // ahora sí navegamos al viaje.
        _intentarRutaPendiente();
      }
    });
    return widget.child;
  }
}
