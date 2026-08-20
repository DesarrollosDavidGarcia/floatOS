/// Momento de la revisión del vehículo.
enum TipoRevision {
  salida,
  llegada;

  String get api => name.toUpperCase();

  String get titulo =>
      this == TipoRevision.salida ? 'Revisión de salida' : 'Revisión de llegada';

  String get explicacion => this == TipoRevision.salida
      ? 'Antes de arrancar, captura con qué odómetro y en qué estado sale la unidad.'
      : 'Antes de cerrar el servicio, captura con qué odómetro y en qué estado llegó.';
}

/// Estado de un punto del check list.
enum EstadoItem {
  ok('OK', 'Bien'),
  mal('MAL', 'Mal'),
  na('NA', 'No aplica');

  const EstadoItem(this.api, this.etiqueta);
  final String api;
  final String etiqueta;
}

/// Un punto revisado de la unidad.
class ItemChecklist {
  const ItemChecklist({required this.clave, required this.estado, this.nota});

  final String clave;
  final EstadoItem estado;
  final String? nota;

  Map<String, dynamic> toJson() => {
        'clave': clave,
        'estado': estado.api,
        if (nota != null && nota!.trim().isNotEmpty) 'nota': nota!.trim(),
      };

  static ItemChecklist fromJson(Map<String, dynamic> json) => ItemChecklist(
        clave: json['clave'] as String,
        estado: EstadoItem.values.firstWhere(
          (e) => e.api == json['estado'],
          orElse: () => EstadoItem.na,
        ),
        nota: json['nota'] as String?,
      );
}

/// Revisión del vehículo capturada para un viaje.
class RevisionViaje {
  const RevisionViaje({
    required this.id,
    required this.tipo,
    required this.odometro,
    this.nivelCombustiblePct,
    this.novedades,
    this.checklist = const [],
    this.fotoTableroUrl,
  });

  final String id;
  final TipoRevision tipo;
  final int odometro;
  final int? nivelCombustiblePct;
  final String? novedades;
  final List<ItemChecklist> checklist;
  final String? fotoTableroUrl;

  static RevisionViaje fromJson(Map<String, dynamic> json) => RevisionViaje(
        id: json['id'] as String,
        tipo: (json['tipo'] as String) == 'SALIDA'
            ? TipoRevision.salida
            : TipoRevision.llegada,
        odometro: (json['odometro'] as num).toInt(),
        nivelCombustiblePct: (json['nivelCombustiblePct'] as num?)?.toInt(),
        novedades: json['novedades'] as String?,
        checklist: (json['checklist'] as List<dynamic>? ?? [])
            .map((e) => ItemChecklist.fromJson(e as Map<String, dynamic>))
            .toList(),
        fotoTableroUrl: json['fotoTableroUrl'] as String?,
      );
}

/// Gasto capturado durante el viaje.
class GastoViaje {
  const GastoViaje({
    required this.id,
    required this.tipo,
    required this.monto,
    this.descripcion,
    this.litros,
    this.fotoTicketUrl,
  });

  final String id;
  final String tipo;
  final double monto;
  final String? descripcion;
  final double? litros;
  final String? fotoTicketUrl;

  static GastoViaje fromJson(Map<String, dynamic> json) => GastoViaje(
        id: json['id'] as String,
        tipo: json['tipo'] as String,
        // Los Decimal de Prisma llegan como String en el JSON.
        monto: double.parse(json['monto'].toString()),
        descripcion: json['descripcion'] as String?,
        litros: json['litros'] == null
            ? null
            : double.parse(json['litros'].toString()),
        fotoTicketUrl: json['fotoTicketUrl'] as String?,
      );
}

/// Etiquetas de los tipos de gasto (catálogo TIPO_GASTO del backend).
const etiquetasTipoGasto = <String, String>{
  'COMBUSTIBLE': 'Combustible',
  'CASETA': 'Caseta',
  'VIATICOS': 'Viáticos',
  'OTRO': 'Otro',
};
