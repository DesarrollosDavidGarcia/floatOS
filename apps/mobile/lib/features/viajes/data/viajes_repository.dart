import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_exception.dart';
import '../domain/estado_viaje.dart';
import '../domain/viaje.dart';

class ViajesRepository {
  ViajesRepository(this._api);

  final ApiClient _api;

  /// GET /viajes — el API ya filtra por el conductor autenticado.
  /// Recorre todas las páginas (pageSize máx del API = 100) para que un
  /// viaje activo antiguo no desaparezca de la lista por la paginación.
  Future<List<Viaje>> listar({EstadoViaje? estado}) async {
    const topePaginas = 20; // tope de seguridad: 2,000 viajes
    try {
      final viajes = <Viaje>[];
      var page = 1;
      while (true) {
        final res = await _api.dio.get<Map<String, dynamic>>(
          '/viajes',
          queryParameters: {
            if (estado != null) 'estado': estado.api,
            'page': page,
            'pageSize': 100,
          },
        );
        final data = res.data!;
        viajes.addAll((data['data'] as List<dynamic>)
            .map((v) => Viaje.fromJson(v as Map<String, dynamic>)));
        final totalPaginas = (data['totalPaginas'] as num?)?.toInt() ?? 1;
        if (page >= totalPaginas || page >= topePaginas) return viajes;
        page++;
      }
    } on DioException catch (e) {
      throw ApiException.desdeDio(e);
    }
  }

  Future<Viaje> detalle(String id) async {
    try {
      final res = await _api.dio.get<Map<String, dynamic>>('/viajes/$id');
      return Viaje.fromJson(res.data!);
    } on DioException catch (e) {
      throw ApiException.desdeDio(e);
    }
  }

  /// PATCH /viajes/:id/estado — el backend valida TRANSICIONES_VIAJE.
  Future<Viaje> cambiarEstado(
    String id,
    EstadoViaje estado, {
    String? nota,
  }) async {
    try {
      final res = await _api.dio.patch<Map<String, dynamic>>(
        '/viajes/$id/estado',
        data: {
          'estado': estado.api,
          if (nota != null && nota.isNotEmpty) 'nota': nota,
        },
      );
      return Viaje.fromJson(res.data!);
    } on DioException catch (e) {
      throw ApiException.desdeDio(e);
    }
  }
}
