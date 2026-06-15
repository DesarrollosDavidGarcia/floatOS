import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/providers.dart';
import '../domain/estado_viaje.dart';
import '../domain/viaje.dart';
import '../providers/viajes_providers.dart';
import 'widgets/estado_chip.dart';

class ViajeDetailScreen extends ConsumerStatefulWidget {
  const ViajeDetailScreen({super.key, required this.viajeId});

  final String viajeId;

  @override
  ConsumerState<ViajeDetailScreen> createState() => _ViajeDetailScreenState();
}

class _ViajeDetailScreenState extends ConsumerState<ViajeDetailScreen> {
  bool _cambiandoEstado = false;
  StreamSubscription<Map<String, dynamic>>? _subEstados;

  @override
  void initState() {
    super.initState();
    // Si el monitorista cambia/cancela este viaje desde el panel, el
    // detalle se refresca en vivo (la suscripción a la sala ya existe
    // cuando hay tracking activo).
    _subEstados =
        ref.read(socketServiceProvider).cambiosEstado.listen((data) {
      if (!mounted) return;
      if (data['viajeId'] == widget.viajeId || data['id'] == widget.viajeId) {
        ref.invalidate(viajeDetalleProvider(widget.viajeId));
      }
    });
  }

  @override
  void dispose() {
    _subEstados?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final viajeAsync = ref.watch(viajeDetalleProvider(widget.viajeId));

    return Scaffold(
      appBar: AppBar(
        title: viajeAsync.maybeWhen(
          data: (v) => Text(v.folioTexto),
          orElse: () => const Text('Viaje'),
        ),
      ),
      body: viajeAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(mensajeDeError(e), textAlign: TextAlign.center),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: () =>
                      ref.invalidate(viajeDetalleProvider(widget.viajeId)),
                  child: const Text('Reintentar'),
                ),
              ],
            ),
          ),
        ),
        data: (viaje) => _Contenido(
          viaje: viaje,
          cambiandoEstado: _cambiandoEstado,
          onAvanzarEstado: () => _avanzarEstado(viaje),
          onReportarProblema: () => _reportarProblema(viaje),
          onReanudar: () => _reanudar(viaje),
        ),
      ),
    );
  }

  Future<void> _avanzarEstado(Viaje viaje) async {
    final siguiente = viaje.estado.siguiente;
    final accion = viaje.estado.accionSiguiente;
    if (siguiente == null || accion == null) return;

    final nota = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => _SheetConfirmarCambio(accion: accion, siguiente: siguiente),
    );
    if (nota == null || !mounted) return; // canceló

    await _ejecutarCambio(viaje, siguiente, nota);
  }

  Future<void> _ejecutarCambio(
    Viaje viaje,
    EstadoViaje siguiente,
    String nota,
  ) async {
    // Dependencias leídas ANTES de los awaits: los servicios globales deben
    // ajustarse (GPS on/off) aunque el conductor salga de la pantalla con la
    // petición en vuelo; `ref` ya no es usable tras el dispose.
    final repo = ref.read(viajesRepositoryProvider);
    final tracking = ref.read(trackingControllerProvider.notifier);
    final socket = ref.read(socketServiceProvider);
    final viajeConGps = ref.read(trackingControllerProvider).viajeId;

    setState(() => _cambiandoEstado = true);
    try {
      await repo.cambiarEstado(viaje.id, siguiente, nota: nota);

      // Tracking: arranca al iniciar camino al origen, termina al entregar.
      if (siguiente.requiereTracking) {
        final error = await tracking.iniciar(viaje.id);
        socket.suscribirViaje(viaje.id);
        if (error != null && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(error)),
          );
        }
      } else if (viajeConGps == viaje.id) {
        // Solo apagar el GPS si era de ESTE viaje: aceptar el viaje B no
        // debe matar el tracking del viaje A en tránsito.
        await tracking.detener();
        socket.desuscribirViaje(viaje.id);
      }

      if (!mounted) return;
      ref.invalidate(viajeDetalleProvider(widget.viajeId));
      ref.invalidate(viajesProvider);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Listo: ${siguiente.etiqueta}')),
      );
    } catch (e) {
      if (!mounted) return;
      // Caso típico en carretera: confirmó la entrega sin señal. Ofrecer
      // reintento conservando la nota — que no tenga que reescribir nada.
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(mensajeDeError(e)),
          duration: const Duration(seconds: 10),
          action: SnackBarAction(
            label: 'Reintentar',
            onPressed: () => _ejecutarCambio(viaje, siguiente, nota),
          ),
        ),
      );
    } finally {
      if (mounted) setState(() => _cambiandoEstado = false);
    }
  }

  /// Reporta una incidencia (avería/choque/etc.). Crea la incidencia en el
  /// expediente del viaje y, si el conductor lo marca, deja el viaje en VARADO
  /// (pausa recuperable; apaga el GPS de este viaje). Avisa al panel por WS.
  Future<void> _reportarProblema(Viaje viaje) async {
    final reporte =
        await showModalBottomSheet<({String tipo, String descripcion, bool varado})>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => const _SheetReportarProblema(),
    );
    if (reporte == null || !mounted) return;

    final repo = ref.read(viajesRepositoryProvider);
    final tracking = ref.read(trackingControllerProvider.notifier);
    final socket = ref.read(socketServiceProvider);
    final viajeConGps = ref.read(trackingControllerProvider).viajeId;

    setState(() => _cambiandoEstado = true);
    try {
      final varado = await repo.reportarIncidencia(
        viaje.id,
        tipo: reporte.tipo,
        descripcion: reporte.descripcion,
        marcarVarado: reporte.varado,
      );
      // VARADO no requiere tracking: apaga el GPS de este viaje.
      if (varado && viajeConGps == viaje.id) {
        await tracking.detener();
        socket.desuscribirViaje(viaje.id);
      }
      if (!mounted) return;
      ref.invalidate(viajeDetalleProvider(widget.viajeId));
      ref.invalidate(viajesProvider);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            varado ? 'Reportado · viaje marcado como varado' : 'Incidencia reportada',
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(mensajeDeError(e))),
      );
    } finally {
      if (mounted) setState(() => _cambiandoEstado = false);
    }
  }

  /// Reanuda un viaje VARADO: vuelve al estado previo y, si éste requiere
  /// tracking, reactiva el GPS y la suscripción a la sala.
  Future<void> _reanudar(Viaje viaje) async {
    final repo = ref.read(viajesRepositoryProvider);
    final tracking = ref.read(trackingControllerProvider.notifier);
    final socket = ref.read(socketServiceProvider);

    setState(() => _cambiandoEstado = true);
    try {
      final actualizado = await repo.reanudar(viaje.id);
      if (actualizado.estado.requiereTracking) {
        final error = await tracking.iniciar(viaje.id);
        socket.suscribirViaje(viaje.id);
        if (error != null && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(error)),
          );
        }
      }
      if (!mounted) return;
      ref.invalidate(viajeDetalleProvider(widget.viajeId));
      ref.invalidate(viajesProvider);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Viaje reanudado')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(mensajeDeError(e))),
      );
    } finally {
      if (mounted) setState(() => _cambiandoEstado = false);
    }
  }
}

/// Confirmación de cambio de estado con nota opcional. Es StatefulWidget
/// para que el TextEditingController viva y muera con el sheet (sin tocar
/// un controller disposed durante la animación de salida).
class _SheetConfirmarCambio extends StatefulWidget {
  const _SheetConfirmarCambio({required this.accion, required this.siguiente});

  final String accion;
  final EstadoViaje siguiente;

  @override
  State<_SheetConfirmarCambio> createState() => _SheetConfirmarCambioState();
}

class _SheetConfirmarCambioState extends State<_SheetConfirmarCambio> {
  final _notaCtrl = TextEditingController();

  @override
  void dispose() {
    _notaCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(
          24,
          24,
          24,
          24 + MediaQuery.of(context).viewInsets.bottom,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(widget.siguiente.icono, color: widget.siguiente.color),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    widget.accion,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'El viaje pasará a "${widget.siguiente.etiqueta}".',
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _notaCtrl,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Nota (opcional)',
                hintText: 'Ej. retraso por tráfico…',
              ),
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: () =>
                  Navigator.pop(context, _notaCtrl.text.trim()),
              child: Text(widget.accion),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Hoja para reportar un problema del viaje: tipo + descripción + si lo deja varado.
class _SheetReportarProblema extends StatefulWidget {
  const _SheetReportarProblema();

  @override
  State<_SheetReportarProblema> createState() => _SheetReportarProblemaState();
}

class _SheetReportarProblemaState extends State<_SheetReportarProblema> {
  static const _tipos = <(String, String)>[
    ('AVERIA', 'Avería'),
    ('ACCIDENTE', 'Accidente'),
    ('PONCHADURA', 'Ponchadura'),
    ('OTRO', 'Otro'),
  ];

  String _tipo = 'AVERIA';
  bool _varado = true;
  final _descCtrl = TextEditingController();

  @override
  void dispose() {
    _descCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colores = Theme.of(context).colorScheme;
    return SafeArea(
      child: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(
          24,
          24,
          24,
          24 + MediaQuery.of(context).viewInsets.bottom,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(Icons.warning_amber_outlined, color: colores.error),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text(
                    'Reportar problema',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              'Tipo',
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
                color: colores.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                for (final t in _tipos)
                  ChoiceChip(
                    label: Text(t.$2),
                    selected: _tipo == t.$1,
                    onSelected: (_) => setState(() => _tipo = t.$1),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _descCtrl,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Descripción (opcional)',
                hintText: 'Ej. se fundió el motor, sin frenos…',
              ),
            ),
            const SizedBox(height: 8),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              value: _varado,
              onChanged: (v) => setState(() => _varado = v),
              title: const Text('Marcar el viaje como varado'),
              subtitle: const Text('Pausa el viaje hasta reanudar o reasignar'),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () => Navigator.pop(
                context,
                (tipo: _tipo, descripcion: _descCtrl.text.trim(), varado: _varado),
              ),
              child: const Text('Reportar'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar'),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────── contenido ───────────────────────────

class _Contenido extends StatelessWidget {
  const _Contenido({
    required this.viaje,
    required this.cambiandoEstado,
    required this.onAvanzarEstado,
    required this.onReportarProblema,
    required this.onReanudar,
  });

  final Viaje viaje;
  final bool cambiandoEstado;
  final VoidCallback onAvanzarEstado;
  final VoidCallback onReportarProblema;
  final VoidCallback onReanudar;

  @override
  Widget build(BuildContext context) {
    final accion = viaje.estado.accionSiguiente;
    final esVarado = viaje.estado == EstadoViaje.varado;
    final enRuta = viaje.estado.requiereTracking;

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            children: [
              Row(
                children: [
                  EstadoChip(viaje.estado),
                  const Spacer(),
                  if (viaje.unidadPlacas != null)
                    _Pill(
                      icono: Icons.local_shipping_outlined,
                      texto: viaje.unidadPlacas!,
                    ),
                ],
              ),
              const SizedBox(height: 16),
              _Mapa(viaje: viaje),
              const SizedBox(height: 16),
              _SeccionItinerario(viaje: viaje),
              const SizedBox(height: 16),
              _SeccionCarga(viaje: viaje),
              if (viaje.historial.isNotEmpty) ...[
                const SizedBox(height: 16),
                _SeccionHistorial(historial: viaje.historial),
              ],
              const SizedBox(height: 8),
            ],
          ),
        ),
        if (esVarado || accion != null)
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (esVarado)
                    FilledButton.icon(
                      onPressed: cambiandoEstado ? null : onReanudar,
                      icon: cambiandoEstado
                          ? const _BotonSpinner()
                          : const Icon(Icons.play_circle_outline),
                      label: const Text('Reanudar viaje'),
                    )
                  else ...[
                    FilledButton.icon(
                      onPressed: cambiandoEstado ? null : onAvanzarEstado,
                      icon: cambiandoEstado
                          ? const _BotonSpinner()
                          : Icon(viaje.estado.siguiente!.icono),
                      label: Text(accion!),
                    ),
                    if (enRuta) ...[
                      const SizedBox(height: 8),
                      OutlinedButton.icon(
                        onPressed: cambiandoEstado ? null : onReportarProblema,
                        icon: const Icon(Icons.warning_amber_outlined),
                        label: const Text('Reportar problema'),
                      ),
                    ],
                  ],
                ],
              ),
            ),
          ),
      ],
    );
  }
}

/// Spinner blanco para el botón de acción mientras hay una petición en vuelo.
class _BotonSpinner extends StatelessWidget {
  const _BotonSpinner();

  @override
  Widget build(BuildContext context) {
    return const SizedBox(
      width: 20,
      height: 20,
      child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
    );
  }
}

class _Mapa extends StatelessWidget {
  const _Mapa({required this.viaje});

  final Viaje viaje;

  @override
  Widget build(BuildContext context) {
    final puntos = <LatLng>[
      for (final e in viaje.escalas)
        if (e.lat != null && e.lng != null) LatLng(e.lat!, e.lng!),
    ];
    if (puntos.isEmpty &&
        viaje.origenLat != null &&
        viaje.origenLng != null &&
        viaje.destinoLat != null &&
        viaje.destinoLng != null) {
      puntos
        ..add(LatLng(viaje.origenLat!, viaje.origenLng!))
        ..add(LatLng(viaje.destinoLat!, viaje.destinoLng!));
    }
    if (puntos.isEmpty) return const SizedBox.shrink();

    // Ruta por carretera ya calculada por el API (snapshot de TomTom):
    // se pinta sólida siguiendo las vías, sin llamar a ningún servicio de
    // ruteo desde la app. Sin geometría, se une las paradas en punteado.
    final rutaCarretera = <LatLng>[
      for (final p in viaje.rutaGeometria) LatLng(p[0], p[1]),
    ];
    final usaCarretera = rutaCarretera.length >= 2;
    final trazo = usaCarretera ? rutaCarretera : puntos;

    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: SizedBox(
        height: 200,
        child: FlutterMap(
          options: MapOptions(
            initialCenter: puntos.first,
            initialZoom: 13,
            initialCameraFit: trazo.length > 1
                ? CameraFit.coordinates(
                    coordinates: trazo,
                    padding: const EdgeInsets.all(36),
                  )
                : null,
            // Sin `drag`: un mapa arrastrable dentro del ListView secuestra
            // el scroll de la página (peor con guantes). El zoom con dos
            // dedos no choca con el scroll de un dedo.
            interactionOptions: const InteractionOptions(
              flags: InteractiveFlag.pinchZoom,
            ),
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'mx.flotaos.flotaos_conductor',
            ),
            if (trazo.length > 1)
              PolylineLayer(
                polylines: [
                  Polyline(
                    points: trazo,
                    strokeWidth: 3,
                    color: Theme.of(context)
                        .colorScheme
                        .primary
                        .withValues(alpha: usaCarretera ? 0.85 : 0.7),
                    pattern: usaCarretera
                        ? const StrokePattern.solid()
                        : const StrokePattern.dotted(),
                  ),
                ],
              ),
            MarkerLayer(
              markers: [
                for (var i = 0; i < puntos.length; i++)
                  Marker(
                    point: puntos[i],
                    width: 34,
                    height: 34,
                    child: Icon(
                      i == 0
                          ? Icons.trip_origin
                          : (i == puntos.length - 1
                              ? Icons.location_on
                              : Icons.circle),
                      size: i == 0 || i == puntos.length - 1 ? 28 : 14,
                      color: i == puntos.length - 1
                          ? Theme.of(context).colorScheme.error
                          : Theme.of(context).colorScheme.primary,
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SeccionItinerario extends StatelessWidget {
  const _SeccionItinerario({required this.viaje});

  final Viaje viaje;

  @override
  Widget build(BuildContext context) {
    final colores = Theme.of(context).colorScheme;
    final tieneEscalas = viaje.escalas.isNotEmpty;

    return _Tarjeta(
      titulo: 'Itinerario',
      icono: Icons.alt_route,
      child: Column(
        children: [
          if (tieneEscalas)
            for (var i = 0; i < viaje.escalas.length; i++)
              _FilaEscala(
                escala: viaje.escalas[i],
                esPrimera: i == 0,
                esUltima: i == viaje.escalas.length - 1,
              )
          else ...[
            _FilaParada(
              icono: Icons.trip_origin,
              color: colores.primary,
              titulo: 'Origen',
              direccion: viaje.origenDireccion,
              lat: viaje.origenLat,
              lng: viaje.origenLng,
            ),
            _FilaParada(
              icono: Icons.location_on,
              color: colores.error,
              titulo: 'Destino',
              direccion: viaje.destinoDireccion,
              lat: viaje.destinoLat,
              lng: viaje.destinoLng,
            ),
          ],
        ],
      ),
    );
  }
}

class _FilaEscala extends StatelessWidget {
  const _FilaEscala({
    required this.escala,
    required this.esPrimera,
    required this.esUltima,
  });

  final Escala escala;
  final bool esPrimera;
  final bool esUltima;

  @override
  Widget build(BuildContext context) {
    final colores = Theme.of(context).colorScheme;
    final recoger = escala.cargas.where((c) => c.esRecoger).length;
    final entregar = escala.cargas.length - recoger;

    return _FilaParada(
      icono: esPrimera
          ? Icons.trip_origin
          : (esUltima ? Icons.location_on : Icons.circle),
      color: esUltima ? colores.error : colores.primary,
      titulo: 'Parada ${escala.orden + 1}',
      direccion: escala.direccion,
      lat: escala.lat,
      lng: escala.lng,
      subtitulo: [
        if (recoger > 0) '$recoger carga${recoger == 1 ? '' : 's'} a recoger',
        if (entregar > 0) '$entregar a entregar',
        if (escala.ventanaDesde != null)
          'ventana ${DateFormat('HH:mm').format(escala.ventanaDesde!)}'
              '${escala.ventanaHasta != null ? '–${DateFormat('HH:mm').format(escala.ventanaHasta!)}' : ''}',
        if (escala.notas != null && escala.notas!.isNotEmpty) escala.notas!,
      ].join(' · '),
    );
  }
}

class _FilaParada extends StatelessWidget {
  const _FilaParada({
    required this.icono,
    required this.color,
    required this.titulo,
    required this.direccion,
    this.subtitulo,
    this.lat,
    this.lng,
  });

  final IconData icono;
  final Color color;
  final String titulo;
  final String direccion;
  final String? subtitulo;
  final double? lat;
  final double? lng;

  @override
  Widget build(BuildContext context) {
    final colores = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icono, size: 18, color: color),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  titulo,
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    color: colores.onSurfaceVariant,
                    letterSpacing: 0.3,
                  ),
                ),
                Text(
                  direccion,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (subtitulo != null && subtitulo!.isNotEmpty)
                  Text(
                    subtitulo!,
                    style: TextStyle(
                      fontSize: 12.5,
                      color: colores.onSurfaceVariant,
                    ),
                  ),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Navegar',
            onPressed: () =>
                _abrirNavegacion(lat: lat, lng: lng, direccion: direccion),
            icon: Icon(Icons.navigation_outlined, color: colores.primary),
          ),
        ],
      ),
    );
  }

  /// Abre la app de mapas del sistema (Google Maps / Apple Maps / Waze).
  /// Sin coordenadas usa la dirección como búsqueda — que el conductor
  /// nunca tenga que teclearla a mano.
  static Future<void> _abrirNavegacion({
    double? lat,
    double? lng,
    required String direccion,
  }) async {
    final destino = (lat != null && lng != null)
        ? '$lat,$lng'
        : Uri.encodeComponent(direccion);
    final uri = Uri.parse(
      'https://www.google.com/maps/dir/?api=1&destination=$destino',
    );
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}

class _SeccionCarga extends StatelessWidget {
  const _SeccionCarga({required this.viaje});

  final Viaje viaje;

  @override
  Widget build(BuildContext context) {
    return _Tarjeta(
      titulo: 'Carga',
      icono: Icons.inventory_2_outlined,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _Pill(icono: Icons.category_outlined, texto: viaje.tipoCarga),
              _Pill(
                icono: Icons.scale_outlined,
                texto: '${_formatoPeso(viaje.pesoKg)} kg',
              ),
              if (viaje.distanciaEstimadaKm > 0)
                _Pill(
                  icono: Icons.route_outlined,
                  texto: '${viaje.distanciaEstimadaKm.toStringAsFixed(0)} km',
                ),
            ],
          ),
          if (viaje.descripcionCarga != null &&
              viaje.descripcionCarga!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              viaje.descripcionCarga!,
              style: TextStyle(
                fontSize: 13.5,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ],
      ),
    );
  }

  static String _formatoPeso(double kg) => kg >= 1000
      ? NumberFormat('#,##0.#').format(kg)
      : kg.toStringAsFixed(0);
}

class _SeccionHistorial extends StatelessWidget {
  const _SeccionHistorial({required this.historial});

  final List<HistorialEstado> historial;

  @override
  Widget build(BuildContext context) {
    final colores = Theme.of(context).colorScheme;
    final orden = List<HistorialEstado>.from(historial)
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));

    return _Tarjeta(
      titulo: 'Historial',
      icono: Icons.timeline,
      child: Column(
        children: [
          for (final h in orden)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 5),
              child: Row(
                children: [
                  Icon(h.estadoNuevo.icono,
                      size: 17, color: h.estadoNuevo.color),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          h.estadoNuevo.etiqueta,
                          style: const TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (h.nota != null && h.nota!.isNotEmpty)
                          Text(
                            h.nota!,
                            style: TextStyle(
                              fontSize: 12,
                              color: colores.onSurfaceVariant,
                            ),
                          ),
                      ],
                    ),
                  ),
                  Text(
                    DateFormat('d MMM HH:mm', 'es').format(h.createdAt),
                    style: TextStyle(
                      fontSize: 12,
                      color: colores.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

// ─────────────────────────── helpers ───────────────────────────

class _Tarjeta extends StatelessWidget {
  const _Tarjeta({
    required this.titulo,
    required this.icono,
    required this.child,
  });

  final String titulo;
  final IconData icono;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icono, size: 18,
                    color: Theme.of(context).colorScheme.primary),
                const SizedBox(width: 8),
                Text(
                  titulo,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.icono, required this.texto});

  final IconData icono;
  final String texto;

  @override
  Widget build(BuildContext context) {
    final colores = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: colores.surfaceContainerHighest.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icono, size: 14, color: colores.onSurfaceVariant),
          const SizedBox(width: 5),
          Text(
            texto,
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
              color: colores.onSurface,
            ),
          ),
        ],
      ),
    );
  }
}
