import 'package:flutter/material.dart';

/// Espejo de `EstadoViaje` y `TRANSICIONES_VIAJE` de packages/shared-types.
/// El backend valida cada transición — esto solo guía la UI.
enum EstadoViaje {
  asignado('ASIGNADO', 'Asignado'),
  aceptado('ACEPTADO', 'Aceptado'),
  enCaminoOrigen('EN_CAMINO_ORIGEN', 'En camino al origen'),
  cargando('CARGANDO', 'Cargando'),
  enTransito('EN_TRANSITO', 'En tránsito'),
  entregado('ENTREGADO', 'Entregado'),
  facturado('FACTURADO', 'Facturado'),
  cancelado('CANCELADO', 'Cancelado');

  const EstadoViaje(this.api, this.etiqueta);

  /// Valor tal como viaja por el API.
  final String api;
  final String etiqueta;

  static EstadoViaje desdeApi(String valor) =>
      EstadoViaje.values.firstWhere((e) => e.api == valor);

  /// Transiciones que el conductor avanza desde la app (sin cancelar:
  /// la cancelación la gestiona el monitorista desde el panel).
  EstadoViaje? get siguiente => switch (this) {
        asignado => aceptado,
        aceptado => enCaminoOrigen,
        enCaminoOrigen => cargando,
        cargando => enTransito,
        enTransito => entregado,
        _ => null, // entregado/facturado/cancelado: el conductor ya terminó
      };

  /// Texto del botón de acción para avanzar al siguiente estado.
  String? get accionSiguiente => switch (this) {
        asignado => 'Aceptar viaje',
        aceptado => 'Iniciar camino al origen',
        enCaminoOrigen => 'Llegué — comenzar carga',
        cargando => 'Carga lista — iniciar tránsito',
        enTransito => 'Confirmar entrega',
        _ => null,
      };

  /// Mientras el viaje está en estos estados la app envía GPS.
  bool get requiereTracking =>
      this == enCaminoOrigen || this == cargando || this == enTransito;

  bool get esActivo =>
      this != entregado && this != facturado && this != cancelado;

  Color get color => switch (this) {
        asignado => const Color(0xFF6B7280),
        aceptado => const Color(0xFF2563EB),
        enCaminoOrigen => const Color(0xFF7C3AED),
        cargando => const Color(0xFFD97706),
        enTransito => const Color(0xFF0891B2),
        entregado => const Color(0xFF16A34A),
        facturado => const Color(0xFF15803D),
        cancelado => const Color(0xFFDC2626),
      };

  /// Variante oscura para texto pequeño sobre fondo claro: los tonos de
  /// `color` quedan bajo el contraste WCAG 4.5:1 (ilegibles al sol).
  Color get colorTexto => switch (this) {
        asignado => const Color(0xFF4B5563),
        aceptado => const Color(0xFF1D4ED8),
        enCaminoOrigen => const Color(0xFF6D28D9),
        cargando => const Color(0xFFB45309),
        enTransito => const Color(0xFF0E7490),
        entregado => const Color(0xFF15803D),
        facturado => const Color(0xFF166534),
        cancelado => const Color(0xFFB91C1C),
      };

  IconData get icono => switch (this) {
        asignado => Icons.assignment_outlined,
        aceptado => Icons.thumb_up_outlined,
        enCaminoOrigen => Icons.near_me_outlined,
        cargando => Icons.archive_outlined,
        enTransito => Icons.local_shipping_outlined,
        entregado => Icons.check_circle_outline,
        facturado => Icons.receipt_long_outlined,
        cancelado => Icons.cancel_outlined,
      };
}
