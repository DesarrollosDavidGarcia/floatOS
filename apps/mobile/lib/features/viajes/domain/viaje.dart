import 'estado_viaje.dart';

/// Tolerante a num y string: Prisma serializa Decimal como string JSON.
double? _aDouble(dynamic v) => switch (v) {
      null => null,
      num n => n.toDouble(),
      String s => double.tryParse(s),
      _ => null,
    };
DateTime? _aFecha(dynamic v) =>
    v == null ? null : DateTime.parse(v as String).toLocal();

/// Carga de una escala (recoger / entregar).
class CargaEscala {
  CargaEscala({
    required this.id,
    required this.sentido,
    required this.tipoCarga,
    required this.pesoKg,
    this.descripcion,
    this.cantidad,
  });

  final String id;
  final String sentido; // CARGA | DESCARGA
  final String tipoCarga;
  final double pesoKg;
  final String? descripcion;
  final double? cantidad;

  bool get esRecoger => sentido == 'CARGA';

  factory CargaEscala.fromJson(Map<String, dynamic> json) => CargaEscala(
        id: json['id'] as String,
        sentido: json['sentido'] as String,
        tipoCarga: json['tipoCarga'] as String,
        pesoKg: _aDouble(json['pesoKg']) ?? 0,
        descripcion: json['descripcion'] as String?,
        cantidad: _aDouble(json['cantidad']),
      );
}

/// Parada del itinerario multi-escala.
class Escala {
  Escala({
    required this.id,
    required this.orden,
    required this.accion,
    required this.direccion,
    this.lat,
    this.lng,
    this.notas,
    this.ventanaDesde,
    this.ventanaHasta,
    this.cargas = const [],
  });

  final String id;
  final int orden;
  final String accion;
  final String direccion;
  final double? lat;
  final double? lng;
  final String? notas;
  final DateTime? ventanaDesde;
  final DateTime? ventanaHasta;
  final List<CargaEscala> cargas;

  factory Escala.fromJson(Map<String, dynamic> json) => Escala(
        id: json['id'] as String,
        orden: json['orden'] as int,
        accion: json['accion'] as String? ?? '',
        direccion: json['direccion'] as String,
        lat: _aDouble(json['lat']),
        lng: _aDouble(json['lng']),
        notas: json['notas'] as String?,
        ventanaDesde: _aFecha(json['ventanaDesde']),
        ventanaHasta: _aFecha(json['ventanaHasta']),
        cargas: (json['cargas'] as List<dynamic>? ?? [])
            .map((c) => CargaEscala.fromJson(c as Map<String, dynamic>))
            .toList(),
      );
}

class HistorialEstado {
  HistorialEstado({
    required this.estadoNuevo,
    required this.createdAt,
    this.estadoAnterior,
    this.nota,
  });

  final EstadoViaje estadoNuevo;
  final EstadoViaje? estadoAnterior;
  final String? nota;
  final DateTime createdAt;

  factory HistorialEstado.fromJson(Map<String, dynamic> json) =>
      HistorialEstado(
        estadoNuevo: EstadoViaje.desdeApi(json['estadoNuevo'] as String),
        estadoAnterior: json['estadoAnterior'] == null
            ? null
            : EstadoViaje.desdeApi(json['estadoAnterior'] as String),
        nota: json['nota'] as String?,
        createdAt: _aFecha(json['createdAt'])!,
      );
}

class Viaje {
  Viaje({
    required this.id,
    required this.folio,
    required this.estado,
    required this.origenDireccion,
    required this.destinoDireccion,
    required this.tipoCarga,
    required this.pesoKg,
    required this.distanciaEstimadaKm,
    this.origenLat,
    this.origenLng,
    this.destinoLat,
    this.destinoLng,
    this.descripcionCarga,
    this.fechaProgramada,
    this.fechaInicio,
    this.fechaEntrega,
    this.clienteNombre,
    this.unidadPlacas,
    this.unidadDescripcion,
    this.escalas = const [],
    this.historial = const [],
  });

  final String id;
  final int folio;
  final EstadoViaje estado;
  final String origenDireccion;
  final String destinoDireccion;
  final double? origenLat;
  final double? origenLng;
  final double? destinoLat;
  final double? destinoLng;
  final String tipoCarga;
  final String? descripcionCarga;
  final double pesoKg;
  final double distanciaEstimadaKm;
  final DateTime? fechaProgramada;
  final DateTime? fechaInicio;
  final DateTime? fechaEntrega;
  final String? clienteNombre;
  final String? unidadPlacas;
  final String? unidadDescripcion;
  final List<Escala> escalas;
  final List<HistorialEstado> historial;

  String get folioTexto => 'Viaje #$folio';

  factory Viaje.fromJson(Map<String, dynamic> json) {
    final cliente = json['cliente'] as Map<String, dynamic>?;
    final unidad = json['unidad'] as Map<String, dynamic>?;
    final marcaModelo = [
      unidad?['marca'] as String?,
      unidad?['modelo'] as String?,
    ].whereType<String>().join(' ');

    return Viaje(
      id: json['id'] as String,
      folio: json['folio'] as int,
      estado: EstadoViaje.desdeApi(json['estado'] as String),
      origenDireccion: json['origenDireccion'] as String? ?? '',
      destinoDireccion: json['destinoDireccion'] as String? ?? '',
      origenLat: _aDouble(json['origenLat']),
      origenLng: _aDouble(json['origenLng']),
      destinoLat: _aDouble(json['destinoLat']),
      destinoLng: _aDouble(json['destinoLng']),
      tipoCarga: json['tipoCarga'] as String? ?? '',
      descripcionCarga: json['descripcionCarga'] as String?,
      pesoKg: _aDouble(json['pesoKg']) ?? 0,
      distanciaEstimadaKm: _aDouble(json['distanciaEstimadaKm']) ?? 0,
      fechaProgramada: _aFecha(json['fechaProgramada']),
      fechaInicio: _aFecha(json['fechaInicio']),
      fechaEntrega: _aFecha(json['fechaEntrega']),
      clienteNombre: cliente?['razonSocial'] as String?,
      unidadPlacas: unidad?['placas'] as String?,
      unidadDescripcion: marcaModelo.isEmpty ? null : marcaModelo,
      escalas: (json['escalas'] as List<dynamic>? ?? [])
          .map((e) => Escala.fromJson(e as Map<String, dynamic>))
          .toList()
        ..sort((a, b) => a.orden.compareTo(b.orden)),
      historial: (json['historial'] as List<dynamic>? ?? [])
          .map((h) => HistorialEstado.fromJson(h as Map<String, dynamic>))
          .toList(),
    );
  }
}
