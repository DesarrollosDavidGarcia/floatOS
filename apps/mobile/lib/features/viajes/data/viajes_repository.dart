import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_exception.dart';
import '../domain/estado_viaje.dart';
import '../domain/revision_viaje.dart';
import '../domain/viaje.dart';

class ViajesRepository {
  ViajesRepository(this._api);

  final ApiClient _api;

  /// Acceso al cliente para la extensión de revisiones y gastos: una extensión
  /// de Dart no puede tocar los campos privados de la clase.
  ApiClient get _apiPublico => _api;

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

  /// PATCH /viajes/:id/reanudar — sale de VARADO al estado previo a la incidencia.
  Future<Viaje> reanudar(String id) async {
    try {
      final res =
          await _api.dio.patch<Map<String, dynamic>>('/viajes/$id/reanudar');
      return Viaje.fromJson(res.data!);
    } on DioException catch (e) {
      throw ApiException.desdeDio(e);
    }
  }

  /// POST /viajes/:id/incidencias — el conductor reporta un problema (avería,
  /// choque, etc.). Devuelve true si además dejó el viaje en VARADO.
  Future<bool> reportarIncidencia(
    String viajeId, {
    required String tipo,
    String? descripcion,
    String? lugar,
    String? gravedad,
    bool marcarVarado = false,
  }) async {
    try {
      final res = await _api.dio.post<Map<String, dynamic>>(
        '/viajes/$viajeId/incidencias',
        data: {
          'tipo': tipo,
          if (descripcion != null && descripcion.isNotEmpty)
            'descripcion': descripcion,
          if (lugar != null && lugar.isNotEmpty) 'lugar': lugar,
          if (gravedad != null && gravedad.isNotEmpty) 'gravedad': gravedad,
          'marcarVarado': marcarVarado,
        },
      );
      return (res.data?['varado'] as bool?) ?? false;
    } on DioException catch (e) {
      throw ApiException.desdeDio(e);
    }
  }
}

// ── Revisión del vehículo y gastos (ingesta de campo) ──

/// Extensión con la captura obligatoria de campo. Va aparte para no engordar el
/// repositorio principal, pero comparte el mismo cliente autenticado.
extension RevisionesYGastos on ViajesRepository {
  /// Revisiones capturadas del viaje (salida y llegada).
  Future<List<RevisionViaje>> revisiones(String viajeId) async {
    try {
      final res =
          await _apiPublico.dio.get<List<dynamic>>('/viajes/$viajeId/revisiones');
      return (res.data ?? [])
          .map((e) => RevisionViaje.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.desdeDio(e);
    }
  }

  /// Captura la revisión y, si hay foto, la sube después.
  ///
  /// La foto va en una segunda petición a propósito: si fallara la subida, la
  /// revisión ya quedó guardada y el conductor puede seguir su viaje en vez de
  /// tener que repetir todo el formulario.
  Future<RevisionViaje> capturarRevision(
    String viajeId,
    TipoRevision tipo, {
    required int odometro,
    int? nivelCombustiblePct,
    List<ItemChecklist> checklist = const [],
    String? novedades,
    String? fotoPath,
  }) async {
    try {
      final res = await _apiPublico.dio.post<Map<String, dynamic>>(
        '/viajes/$viajeId/revisiones/${tipo.api}',
        data: {
          'odometro': odometro,
          'nivelCombustiblePct': ?nivelCombustiblePct,
          if (novedades != null && novedades.trim().isNotEmpty)
            'novedades': novedades.trim(),
          if (checklist.isNotEmpty)
            'checklist': checklist.map((i) => i.toJson()).toList(),
        },
      );
      final revision = RevisionViaje.fromJson(res.data!);
      if (fotoPath != null) {
        await _subirImagen(
          '/viajes/revisiones/${revision.id}/foto',
          'foto',
          fotoPath,
        );
      }
      return revision;
    } on DioException catch (e) {
      throw ApiException.desdeDio(e);
    }
  }

  Future<List<GastoViaje>> gastos(String viajeId) async {
    try {
      final res =
          await _apiPublico.dio.get<List<dynamic>>('/viajes/$viajeId/gastos');
      return (res.data ?? [])
          .map((e) => GastoViaje.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.desdeDio(e);
    }
  }

  Future<GastoViaje> crearGasto(
    String viajeId, {
    required String tipo,
    required double monto,
    String? descripcion,
    double? litros,
    String? ticketPath,
  }) async {
    try {
      final res = await _apiPublico.dio.post<Map<String, dynamic>>(
        '/viajes/$viajeId/gastos',
        data: {
          'tipo': tipo,
          'monto': monto,
          if (descripcion != null && descripcion.trim().isNotEmpty)
            'descripcion': descripcion.trim(),
          'litros': ?litros,
        },
      );
      final gasto = GastoViaje.fromJson(res.data!);
      if (ticketPath != null) {
        await _subirImagen('/viajes/gastos/${gasto.id}/ticket', 'ticket', ticketPath);
      }
      return gasto;
    } on DioException catch (e) {
      throw ApiException.desdeDio(e);
    }
  }

  Future<void> eliminarGasto(String gastoId) async {
    try {
      await _apiPublico.dio.delete<void>('/viajes/gastos/$gastoId');
    } on DioException catch (e) {
      throw ApiException.desdeDio(e);
    }
  }

  /// Sube una imagen de evidencia. El Content-Type del MultipartFile es
  /// obligatorio: sin él dio manda octet-stream y el API lo rechaza.
  Future<void> _subirImagen(String ruta, String campo, String path) async {
    final extension = path.split('.').last.toLowerCase();
    final mime = extension == 'png'
        ? 'png'
        : extension == 'webp'
            ? 'webp'
            : 'jpeg';
    final form = FormData.fromMap({
      campo: await MultipartFile.fromFile(
        path,
        contentType: DioMediaType('image', mime),
      ),
    });
    await _apiPublico.dio.post<void>(ruta, data: form);
  }
}
