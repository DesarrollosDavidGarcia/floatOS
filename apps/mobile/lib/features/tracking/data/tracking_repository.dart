import 'package:dio/dio.dart';
import 'package:geolocator/geolocator.dart';

import '../../../core/api/api_client.dart';

/// Punto GPS pendiente de enviar (cola offline en memoria;
/// migrará a drift/SQLite en Fase 2). Lleva su `viajeId` para que un
/// cambio de viaje no envíe puntos del viaje anterior al nuevo.
class PuntoPendiente {
  PuntoPendiente.desdePosicion(this.viajeId, Position p)
      : lat = p.latitude,
        lng = p.longitude,
        velocidad = p.speed >= 0 ? p.speed : null,
        rumbo = p.heading >= 0 ? p.heading : null,
        precision = p.accuracy >= 0 ? p.accuracy : null,
        capturadoEn = p.timestamp.toUtc();

  final String viajeId;
  final double lat;
  final double lng;
  final double? velocidad;
  final double? rumbo;
  final double? precision;
  final DateTime capturadoEn;

  Map<String, dynamic> toJson() => {
        'lat': lat,
        'lng': lng,
        if (velocidad != null) 'velocidad': velocidad,
        if (rumbo != null) 'rumbo': rumbo,
        if (precision != null) 'precision': precision,
        'capturadoEn': capturadoEn.toIso8601String(),
      };
}

class TrackingRepository {
  TrackingRepository(this._api);

  final ApiClient _api;

  /// POST /viajes/:id/ubicacion — punto individual.
  Future<void> enviarPunto(PuntoPendiente punto) async {
    await _api.dio.post<void>(
      '/viajes/${punto.viajeId}/ubicacion',
      data: punto.toJson(),
    );
  }

  /// POST /viajes/:id/ubicaciones — lote offline (máx 500 por llamada).
  /// Todos los puntos deben ser del mismo viaje.
  Future<void> enviarLote(String viajeId, List<PuntoPendiente> puntos) async {
    for (var i = 0; i < puntos.length; i += 500) {
      final bloque = puntos.sublist(
        i,
        i + 500 > puntos.length ? puntos.length : i + 500,
      );
      await _api.dio.post<void>(
        '/viajes/$viajeId/ubicaciones',
        data: {'puntos': bloque.map((p) => p.toJson()).toList()},
      );
    }
  }

  /// true si el error es de red (punto se guarda en cola), false si es
  /// un rechazo del servidor (punto se descarta).
  static bool esErrorDeRed(Object error) =>
      error is DioException &&
      (error.type == DioExceptionType.connectionError ||
          error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.sendTimeout ||
          error.type == DioExceptionType.receiveTimeout);
}
