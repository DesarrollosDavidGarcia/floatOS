import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../../core/providers.dart';
import '../../tracking/service/tracking_controller.dart';

/// Mapa a pantalla completa (estilo navegación). Muestra la ruta y, durante un
/// viaje en curso, sigue la posición del vehículo (reusa el GPS del
/// [TrackingController], sin abrir otro stream) rotando el mapa hacia el rumbo.
class MapaPantallaCompleta extends ConsumerStatefulWidget {
  const MapaPantallaCompleta({
    super.key,
    required this.folio,
    required this.marcadores,
    required this.trazo,
    required this.usaCarretera,
  });

  final int folio;
  final Set<Marker> marcadores;
  final List<LatLng> trazo;
  final bool usaCarretera;

  @override
  ConsumerState<MapaPantallaCompleta> createState() =>
      _MapaPantallaCompletaState();
}

class _MapaPantallaCompletaState extends ConsumerState<MapaPantallaCompleta> {
  GoogleMapController? _controller;
  // Sigue al vehículo (cámara pegada a la posición + rumbo). Se puede pausar
  // para mirar libremente y reactivar con el botón.
  bool _seguir = true;
  bool _miUbicacion = false;
  bool _trafico = true; // capa de tráfico en vivo de Google (congestión)
  double _zoomSeguir = 17;
  LatLng? _ultimaPos;

  /// Inclinación 3D en modo conducción (pin abajo, calles adelante visibles).
  static const double _tiltNav = 55;

  @override
  void initState() {
    super.initState();
    _verificarPermiso();
  }

  Future<void> _verificarPermiso() async {
    final p = await Geolocator.checkPermission();
    final ok = p == LocationPermission.always || p == LocationPermission.whileInUse;
    if (mounted && ok) setState(() => _miUbicacion = true);
  }

  static LatLngBounds _bounds(List<LatLng> pts) {
    var minLat = pts.first.latitude, maxLat = pts.first.latitude;
    var minLng = pts.first.longitude, maxLng = pts.first.longitude;
    for (final p in pts) {
      if (p.latitude < minLat) minLat = p.latitude;
      if (p.latitude > maxLat) maxLat = p.latitude;
      if (p.longitude < minLng) minLng = p.longitude;
      if (p.longitude > maxLng) maxLng = p.longitude;
    }
    return LatLngBounds(
      southwest: LatLng(minLat, minLng),
      northeast: LatLng(maxLat, maxLng),
    );
  }

  /// Lleva la cámara a la posición del vehículo en perspectiva de conducción:
  /// inclinada (tilt) y rotada al rumbo (bearing). Con el `padding` superior del
  /// mapa, el vehículo queda anclado abajo y se ven las calles que vienen.
  void _seguirPosicion(Position p) {
    final c = _controller;
    final destino = LatLng(p.latitude, p.longitude);
    _ultimaPos = destino;
    if (c == null || !_seguir) return;
    c.animateCamera(
      CameraUpdate.newCameraPosition(
        CameraPosition(
          target: destino,
          zoom: _zoomSeguir,
          bearing: p.heading >= 0 ? p.heading : 0,
          tilt: _tiltNav,
        ),
      ),
    );
  }

  void _alternarSeguir() {
    final activar = !_seguir;
    setState(() => _seguir = activar);
    if (activar) {
      final p = ref.read(trackingControllerProvider).ultimaPosicion;
      if (p != null) _seguirPosicion(p);
    } else {
      // Al pausar: vista plana (norte arriba) para mirar libremente.
      final pos = _ultimaPos;
      if (pos != null) {
        _controller?.animateCamera(
          CameraUpdate.newCameraPosition(
            CameraPosition(target: pos, zoom: _zoomSeguir, tilt: 0, bearing: 0),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Sigue al vehículo cuando el tracking emite un punto nuevo.
    ref.listen<TrackingEstado>(trackingControllerProvider, (_, next) {
      final p = next.ultimaPosicion;
      if (p != null) _seguirPosicion(p);
    });

    // Velocidad actual (m/s → km/h); se redibuja solo cuando cambia.
    final velMs = ref.watch(
      trackingControllerProvider.select((e) => e.ultimaPosicion?.speed),
    );

    final colorRuta = Theme.of(context).colorScheme.primary;
    final polilineas = <Polyline>{};
    if (widget.trazo.length > 1) {
      if (widget.usaCarretera) {
        polilineas
          ..add(Polyline(
            polylineId: const PolylineId('ruta_casing'),
            points: widget.trazo,
            width: 9,
            color: Colors.white,
            zIndex: 1,
          ))
          ..add(Polyline(
            polylineId: const PolylineId('ruta'),
            points: widget.trazo,
            width: 5,
            color: colorRuta,
            zIndex: 2,
          ));
      } else {
        polilineas.add(Polyline(
          polylineId: const PolylineId('ruta'),
          points: widget.trazo,
          width: 5,
          color: colorRuta.withValues(alpha: 0.7),
          patterns: [PatternItem.dash(14), PatternItem.gap(10)],
        ));
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Viaje #${widget.folio}'),
        actions: [
          IconButton(
            tooltip: _trafico ? 'Ocultar tráfico' : 'Mostrar tráfico',
            isSelected: _trafico,
            onPressed: () => setState(() => _trafico = !_trafico),
            icon: const Icon(Icons.traffic_outlined),
            selectedIcon: const Icon(Icons.traffic),
          ),
        ],
      ),
      body: Stack(
        children: [
          Positioned.fill(
            child: GoogleMap(
              initialCameraPosition: CameraPosition(
                target: widget.trazo.isNotEmpty
                    ? widget.trazo.first
                    : const LatLng(23.6, -102.5),
                zoom: 13,
              ),
              markers: widget.marcadores,
              polylines: polilineas,
              myLocationEnabled: _miUbicacion,
              myLocationButtonEnabled: false,
              trafficEnabled: _trafico,
              // En modo "seguir", empuja el centro hacia abajo para que el
              // vehículo quede anclado en la parte baja (vista de conducción).
              padding: _seguir
                  ? EdgeInsets.only(top: MediaQuery.sizeOf(context).height * 0.5)
                  : EdgeInsets.zero,
              zoomControlsEnabled: false,
              mapToolbarEnabled: false,
              compassEnabled: true,
              onCameraMove: (pos) => _zoomSeguir = pos.zoom,
              onMapCreated: (c) {
                _controller = c;
                final pos = ref.read(trackingControllerProvider).ultimaPosicion;
                // Si hay viaje en curso y "seguir" está activo, arranca pegado al
                // vehículo; si no, encuadra toda la ruta.
                if (_seguir && pos != null) {
                  _seguirPosicion(pos);
                } else if (widget.trazo.length > 1) {
                  Future.delayed(const Duration(milliseconds: 250), () {
                    c.moveCamera(
                      CameraUpdate.newLatLngBounds(_bounds(widget.trazo), 48),
                    );
                  });
                }
              },
            ),
          ),
          // Velocímetro (abajo-izquierda, frente al botón "Seguir").
          Positioned(
            left: 16,
            bottom: 16,
            child: _Velocimetro(kmh: velMs == null ? null : velMs * 3.6),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _alternarSeguir,
        icon: Icon(_seguir ? Icons.navigation : Icons.navigation_outlined),
        label: Text(_seguir ? 'Siguiendo' : 'Seguir'),
      ),
    );
  }
}

/// Límite de referencia (km/h) para resaltar exceso de velocidad. El límite real
/// por carretera necesitaría la Roads API (Speed Limits, de pago); por ahora es
/// un umbral fijo configurable.
const double _limiteKmh = 95;

/// Velocímetro tipo navegación: número grande de km/h. Se pone rojo si supera
/// el límite de referencia (verificador de velocidad).
class _Velocimetro extends StatelessWidget {
  const _Velocimetro({required this.kmh});

  final double? kmh;

  @override
  Widget build(BuildContext context) {
    final colores = Theme.of(context).colorScheme;
    final v = kmh?.clamp(0, 999).round();
    final excede = v != null && v > _limiteKmh;
    final fondo = excede ? colores.error : colores.surface;
    final texto = excede ? colores.onError : colores.onSurface;

    return Material(
      color: fondo,
      elevation: 4,
      shape: const CircleBorder(),
      child: Container(
        width: 72,
        height: 72,
        alignment: Alignment.center,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              v?.toString() ?? '--',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w800,
                height: 1,
                color: texto,
              ),
            ),
            Text(
              'km/h',
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.w600,
                color: texto.withValues(alpha: 0.8),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
