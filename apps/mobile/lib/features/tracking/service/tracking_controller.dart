import 'dart:async';

import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, TargetPlatform;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../../../core/providers.dart';
import '../data/tracking_repository.dart';

/// Estado visible del tracking GPS.
class TrackingEstado {
  const TrackingEstado({
    this.viajeId,
    this.ultimaPosicion,
    this.pendientes = 0,
    this.error,
    this.permisoDenegado = false,
  });

  final String? viajeId;
  final Position? ultimaPosicion;

  /// Puntos en cola esperando señal.
  final int pendientes;
  final String? error;

  /// El conductor negó el permiso: no reintentar automáticamente
  /// (evita re-mostrar el diálogo del sistema en cada refresh).
  final bool permisoDenegado;

  bool get activo => viajeId != null;

  TrackingEstado copyWith({
    String? viajeId,
    Position? ultimaPosicion,
    int? pendientes,
    String? error,
    bool? permisoDenegado,
  }) =>
      TrackingEstado(
        viajeId: viajeId ?? this.viajeId,
        ultimaPosicion: ultimaPosicion ?? this.ultimaPosicion,
        pendientes: pendientes ?? this.pendientes,
        error: error,
        permisoDenegado: permisoDenegado ?? this.permisoDenegado,
      );
}

/// Controla el envío de GPS mientras el viaje está activo.
///
/// En Android usa el servicio foreground nativo de geolocator (la
/// notificación persistente mantiene vivo el stream con la app en
/// background). En iOS requiere el background mode `location`.
class TrackingController extends Notifier<TrackingEstado> {
  StreamSubscription<Position>? _suscripcion;
  final List<PuntoPendiente> _cola = [];
  bool _enviandoCola = false;
  bool _iniciando = false;
  Timer? _reintentoStream;

  TrackingRepository get _repo => ref.read(trackingRepositoryProvider);

  @override
  TrackingEstado build() {
    // Solo limpieza síncrona: onDispose no espera Futures y tocar `state`
    // tras el dispose lanza StateError.
    ref.onDispose(() {
      _reintentoStream?.cancel();
      _suscripcion?.cancel();
    });
    return const TrackingEstado();
  }

  /// Pide permisos y arranca el stream de posición para [viajeId].
  /// Devuelve null si arrancó bien, o un mensaje de error para la UI.
  Future<String?> iniciar(String viajeId) async {
    // Guard de reentrada: dos `iniciar` solapados (reanudación automática +
    // avance de estado) crearían streams GPS duplicados.
    if (_iniciando) return null;
    if (state.viajeId == viajeId && _suscripcion != null) return null;
    _iniciando = true;
    try {
      await detener(conservarCola: true);

      final error = await _verificarPermisos();
      if (error != null) {
        state = TrackingEstado(
          error: error,
          permisoDenegado: true,
          pendientes: _cola.length,
        );
        return error;
      }

      state = TrackingEstado(viajeId: viajeId, pendientes: _cola.length);
      _armarStream(viajeId);
      return null;
    } finally {
      _iniciando = false;
    }
  }

  Future<void> detener({bool conservarCola = false}) async {
    _reintentoStream?.cancel();
    await _suscripcion?.cancel();
    _suscripcion = null;
    // Último intento de vaciar la cola (cada punto lleva su viajeId).
    if (_cola.isNotEmpty) {
      await _vaciarCola();
    }
    if (!conservarCola) _cola.clear();
    state = const TrackingEstado();
  }

  void _armarStream(String viajeId) {
    const distancia = 25; // metros entre puntos — balance batería/precisión

    late final LocationSettings ajustes;
    if (defaultTargetPlatform == TargetPlatform.android) {
      ajustes = AndroidSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: distancia,
        intervalDuration: const Duration(seconds: 10),
        foregroundNotificationConfig: const ForegroundNotificationConfig(
          notificationTitle: 'FlotaOS — viaje en curso',
          notificationText: 'Compartiendo tu ubicación con el monitorista',
          notificationIcon:
              AndroidResource(name: 'ic_launcher', defType: 'mipmap'),
          enableWakeLock: true,
        ),
      );
    } else {
      ajustes = AppleSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: distancia,
        activityType: ActivityType.automotiveNavigation,
        showBackgroundLocationIndicator: true,
        allowBackgroundLocationUpdates: true,
      );
    }

    _suscripcion = Geolocator.getPositionStream(locationSettings: ajustes)
        .listen(_alRecibirPosicion, onError: (Object e) {
      // Un error (p. ej. GPS apagado a mitad de viaje) CIERRA el stream de
      // geolocator definitivamente: cancelar y reintentar con backoff para
      // que el tracking no muera en silencio.
      _suscripcion?.cancel();
      _suscripcion = null;
      state = state.copyWith(error: 'Se perdió la señal GPS, reintentando…');
      _programarReintentoStream();
    });
  }

  void _programarReintentoStream() {
    _reintentoStream?.cancel();
    _reintentoStream = Timer(const Duration(seconds: 15), () async {
      final viajeId = state.viajeId;
      if (viajeId == null || _suscripcion != null) return;
      final error = await _verificarPermisos();
      if (error != null) {
        // GPS sigue apagado: seguir reintentando sin tumbar el viaje.
        _programarReintentoStream();
        return;
      }
      _armarStream(viajeId);
      state = state.copyWith(); // limpia `error` (señal recuperada)
    });
  }

  Future<void> _alRecibirPosicion(Position posicion) async {
    final viajeId = state.viajeId;
    if (viajeId == null) return;

    final punto = PuntoPendiente.desdePosicion(viajeId, posicion);
    state = state.copyWith(ultimaPosicion: posicion);

    if (_cola.isNotEmpty) {
      _cola.add(punto);
      state = state.copyWith(pendientes: _cola.length);
      await _vaciarCola();
      return;
    }

    try {
      await _repo.enviarPunto(punto);
    } catch (e) {
      if (TrackingRepository.esErrorDeRed(e)) {
        _cola.add(punto);
        state = state.copyWith(pendientes: _cola.length);
      }
      // Errores del servidor (4xx) se descartan: el punto no es válido.
    }
  }

  /// Envía la cola acumulada con el endpoint de lote (sync offline),
  /// agrupando por viaje — la cola puede tener puntos de un viaje anterior.
  Future<void> _vaciarCola() async {
    if (_enviandoCola || _cola.isEmpty) return;
    _enviandoCola = true;
    try {
      while (_cola.isNotEmpty) {
        final viajeId = _cola.first.viajeId;
        final lote = _cola.where((p) => p.viajeId == viajeId).toList();
        try {
          await _repo.enviarLote(viajeId, lote);
          _cola.removeWhere((p) => p.viajeId == viajeId);
        } catch (e) {
          if (TrackingRepository.esErrorDeRed(e)) {
            // Sigue sin señal: conservar la cola para el siguiente intento.
            break;
          }
          // Rechazo del servidor (p. ej. viaje cerrado): descartar ese
          // grupo para no reintentar por siempre.
          _cola.removeWhere((p) => p.viajeId == viajeId);
        }
        if (ref.mounted) {
          state = state.copyWith(pendientes: _cola.length);
        }
      }
    } finally {
      _enviandoCola = false;
    }
  }

  Future<String?> _verificarPermisos() async {
    final servicioActivo = await Geolocator.isLocationServiceEnabled();
    if (!servicioActivo) {
      return 'Activa el GPS del teléfono para iniciar el viaje.';
    }

    var permiso = await Geolocator.checkPermission();
    if (permiso == LocationPermission.denied) {
      permiso = await Geolocator.requestPermission();
    }
    if (permiso == LocationPermission.denied ||
        permiso == LocationPermission.deniedForever) {
      return 'FlotaOS necesita permiso de ubicación para el seguimiento '
          'del viaje. Actívalo en Ajustes.';
    }
    return null;
  }
}
