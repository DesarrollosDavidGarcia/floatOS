import 'dart:async';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/providers.dart';
import '../../chat/ui/chat_screen.dart';
import '../domain/estado_viaje.dart';
import '../domain/viaje.dart';
import 'mapa_pantalla_completa.dart';
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
  StreamSubscription<Map<String, dynamic>>? _subChat;

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
    // Un mensaje nuevo del panel actualiza el badge del botón de chat.
    _subChat = ref.read(socketServiceProvider).chatMensajes.listen((data) {
      if (!mounted) return;
      if (data['viajeId'] == widget.viajeId) {
        ref.invalidate(chatNoLeidosProvider(widget.viajeId));
      }
    });
  }

  @override
  void dispose() {
    _subEstados?.cancel();
    _subChat?.cancel();
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
        actions: [
          _ChatBoton(
            viajeId: widget.viajeId,
            folioTexto: viajeAsync.maybeWhen(
              data: (v) => v.folioTexto,
              orElse: () => null,
            ),
          ),
        ],
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
          onPanico: () => _panico(viaje),
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

  /// Botón de pánico: ante una emergencia real, dispara una incidencia
  /// CRÍTICA que llega al panel en vivo por WS (tipo PANICO). A diferencia de
  /// "reportar problema", aquí NO se apaga el GPS aunque el viaje quede varado:
  /// en una emergencia la central necesita ver la ubicación en tiempo real.
  Future<void> _panico(Viaje viaje) async {
    final confirmado = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => const _SheetPanico(),
    );
    if (confirmado != true || !mounted) return;

    final repo = ref.read(viajesRepositoryProvider);

    setState(() => _cambiandoEstado = true);
    try {
      await repo.reportarIncidencia(
        viaje.id,
        tipo: 'PANICO',
        gravedad: 'CRITICA',
        descripcion: 'Botón de pánico activado por el conductor',
        marcarVarado: true,
        // OJO: a propósito NO detenemos el tracking — el GPS sigue enviando
        // ubicación para que la central pueda localizar al conductor.
      );
      if (!mounted) return;
      ref.invalidate(viajeDetalleProvider(widget.viajeId));
      ref.invalidate(viajesProvider);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Pánico enviado a central'),
          backgroundColor: Theme.of(context).colorScheme.error,
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
}

/// Confirmación de cambio de estado con nota opcional. Es StatefulWidget
/// para que el TextEditingController viva y muera con el sheet (sin tocar
/// un controller disposed durante la animación de salida).
/// Botón de chat con badge de mensajes sin leer (mensajes del panel).
class _ChatBoton extends ConsumerWidget {
  const _ChatBoton({required this.viajeId, this.folioTexto});

  final String viajeId;
  final String? folioTexto;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final noLeidos =
        ref.watch(chatNoLeidosProvider(viajeId)).asData?.value ?? 0;
    return Stack(
      alignment: Alignment.center,
      children: [
        IconButton(
          icon: const Icon(Icons.chat_bubble_outline),
          tooltip: 'Chat',
          onPressed: () => Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) =>
                  ChatScreen(viajeId: viajeId, folioTexto: folioTexto),
            ),
          ),
        ),
        if (noLeidos > 0)
          Positioned(
            right: 6,
            top: 8,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: const BoxDecoration(
                color: Colors.red,
                shape: BoxShape.circle,
              ),
              constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
              child: Text(
                noLeidos > 9 ? '9+' : '$noLeidos',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 9,
                  fontWeight: FontWeight.bold,
                  height: 1,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

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

/// Confirmación del botón de pánico. Devuelve `true` si el conductor activa
/// la alerta. Incluye la opción de llamar a emergencia (número aún por
/// configurar — de momento solo se muestra como opción visible).
class _SheetPanico extends StatelessWidget {
  const _SheetPanico();

  // TODO: número de emergencia configurable (central de la flota / 911).
  // Vacío = aún sin configurar → la opción se muestra pero avisa "próximamente".
  static const String _numeroEmergencia = '';

  Future<void> _llamar(BuildContext context) async {
    if (_numeroEmergencia.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Llamada de emergencia: próximamente')),
      );
      return;
    }
    await launchUrl(Uri.parse('tel:$_numeroEmergencia'));
  }

  @override
  Widget build(BuildContext context) {
    final colores = Theme.of(context).colorScheme;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(Icons.sos_outlined, color: colores.error, size: 26),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Botón de pánico',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: colores.error,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              'Se enviará una alerta CRÍTICA a la central con tu ubicación en '
              'vivo. Úsalo solo en una emergencia real.',
              style: TextStyle(color: colores.onSurfaceVariant),
            ),
            const SizedBox(height: 20),
            OutlinedButton.icon(
              onPressed: () => _llamar(context),
              icon: const Icon(Icons.call),
              label: const Text('Llamar a emergencia'),
            ),
            const SizedBox(height: 8),
            FilledButton.icon(
              onPressed: () => Navigator.pop(context, true),
              style: FilledButton.styleFrom(
                backgroundColor: colores.error,
                foregroundColor: colores.onError,
              ),
              icon: const Icon(Icons.sos),
              label: const Text('Activar pánico'),
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

class _Contenido extends StatefulWidget {
  const _Contenido({
    required this.viaje,
    required this.cambiandoEstado,
    required this.onAvanzarEstado,
    required this.onReportarProblema,
    required this.onReanudar,
    required this.onPanico,
  });

  final Viaje viaje;
  final bool cambiandoEstado;
  final VoidCallback onAvanzarEstado;
  final VoidCallback onReportarProblema;
  final VoidCallback onReanudar;
  final VoidCallback onPanico;

  @override
  State<_Contenido> createState() => _ContenidoState();
}

class _ContenidoState extends State<_Contenido> {
  // Llave del mapa para coordinar "tocar escala → centrar mapa".
  final GlobalKey<_MapaState> _mapaKey = GlobalKey<_MapaState>();

  /// Trae el mapa a la vista y centra la cámara en la escala tocada.
  void _enfocarEnMapa(double? lat, double? lng) {
    if (lat == null || lng == null) return;
    final ctx = _mapaKey.currentContext;
    if (ctx != null) {
      // Sube el scroll hasta el mapa para que se vea el movimiento.
      Scrollable.ensureVisible(
        ctx,
        duration: const Duration(milliseconds: 400),
        alignment: 0.05,
        curve: Curves.easeInOut,
      );
    }
    _mapaKey.currentState?.enfocar(lat, lng);
  }

  @override
  Widget build(BuildContext context) {
    final viaje = widget.viaje;
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
                  Wrap(
                    spacing: 6,
                    children: [
                      if (viaje.unidadPlacas != null)
                        _Pill(
                          icono: Icons.local_shipping_outlined,
                          texto: viaje.unidadPlacas!,
                        ),
                      if (viaje.cajaPlacas != null)
                        _Pill(
                          icono: Icons.inventory_2_outlined,
                          texto: viaje.cajaPlacas!,
                        ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _Mapa(key: _mapaKey, viaje: viaje),
              const SizedBox(height: 16),
              _SeccionItinerario(viaje: viaje, onEscalaTap: _enfocarEnMapa),
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
        _MenuInferior(
          viaje: viaje,
          cambiandoEstado: widget.cambiandoEstado,
          onAvanzarEstado: widget.onAvanzarEstado,
          onReanudar: widget.onReanudar,
          onReportarProblema: widget.onReportarProblema,
          onPanico: widget.onPanico,
        ),
      ],
    );
  }
}

/// Menú fijo inferior del detalle: Confirmar · Reportar · Pánico · Inicio.
/// Siempre visible mientras se ve un viaje; cada acción se deshabilita sola
/// cuando no aplica (p. ej. "Confirmar" cuando no hay siguiente estado).
class _MenuInferior extends StatelessWidget {
  const _MenuInferior({
    required this.viaje,
    required this.cambiandoEstado,
    required this.onAvanzarEstado,
    required this.onReanudar,
    required this.onReportarProblema,
    required this.onPanico,
  });

  final Viaje viaje;
  final bool cambiandoEstado;
  final VoidCallback onAvanzarEstado;
  final VoidCallback onReanudar;
  final VoidCallback onReportarProblema;
  final VoidCallback onPanico;

  @override
  Widget build(BuildContext context) {
    final colores = Theme.of(context).colorScheme;
    final esVarado = viaje.estado == EstadoViaje.varado;
    final hayAccion = viaje.estado.accionSiguiente != null;
    // "Confirmar" avanza el viaje; si está varado, confirma reanudarlo.
    final puedeConfirmar = !cambiandoEstado && (esVarado || hayAccion);

    return Material(
      elevation: 8,
      color: colores.surface,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
          child: Row(
            children: [
              _ItemMenu(
                icono: esVarado ? Icons.play_circle_outline : Icons.check_circle_outline,
                etiqueta: esVarado ? 'Reanudar' : 'Confirmar',
                color: colores.primary,
                cargando: cambiandoEstado,
                onTap: puedeConfirmar
                    ? (esVarado ? onReanudar : onAvanzarEstado)
                    : null,
              ),
              _ItemMenu(
                icono: Icons.warning_amber_outlined,
                etiqueta: 'Reportar',
                color: colores.tertiary,
                onTap: cambiandoEstado ? null : onReportarProblema,
              ),
              _ItemMenu(
                icono: Icons.sos_outlined,
                etiqueta: 'Pánico',
                color: colores.error,
                onTap: cambiandoEstado ? null : onPanico,
              ),
              _ItemMenu(
                icono: Icons.home_outlined,
                etiqueta: 'Inicio',
                color: colores.onSurfaceVariant,
                onTap: () => context.go('/viajes'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Un ítem del menú inferior: icono + etiqueta apilados, ancho repartido.
class _ItemMenu extends StatelessWidget {
  const _ItemMenu({
    required this.icono,
    required this.etiqueta,
    required this.color,
    required this.onTap,
    this.cargando = false,
  });

  final IconData icono;
  final String etiqueta;
  final Color color;
  final VoidCallback? onTap;
  final bool cargando;

  @override
  Widget build(BuildContext context) {
    final habilitado = onTap != null;
    final colorEfectivo = habilitado
        ? color
        : Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.35);

    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                height: 26,
                width: 26,
                child: cargando
                    ? CircularProgressIndicator(strokeWidth: 2.5, color: colorEfectivo)
                    : Icon(icono, size: 26, color: colorEfectivo),
              ),
              const SizedBox(height: 4),
              Text(
                etiqueta,
                style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                  color: colorEfectivo,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// Colores de los badges (mismos que el mapa web).
const _cOrigen = Color(0xFF2563EB);
const _cDestino = Color(0xFF16A34A);
const _cIntermedia = Color(0xFFD97706);

enum _BadgeTipo { punto, palomita, numero }

/// Dibuja un badge circular plano (relleno de color + borde blanco + sombra,
/// con un punto, una palomita o un número dentro) y lo devuelve como icono de
/// marcador. Se renderiza a 3x para que se vea nítido en pantallas hi-dpi.
Future<BitmapDescriptor> _badgeBitmap({
  required Color color,
  required _BadgeTipo tipo,
  String numero = '',
}) async {
  const escala = 3.0;
  const base = 40.0;
  final lado = base * escala;
  final recorder = ui.PictureRecorder();
  final canvas = ui.Canvas(recorder);
  final centro = Offset(lado / 2, lado / 2);
  final r = 13 * escala;

  // Sombra suave.
  canvas.drawCircle(
    centro.translate(0, 1.2 * escala),
    r + 1.5 * escala,
    Paint()
      ..color = Colors.black.withValues(alpha: 0.35)
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, 2 * escala),
  );
  // Borde blanco + relleno de color.
  canvas.drawCircle(centro, r + 1.5 * escala, Paint()..color = Colors.white);
  canvas.drawCircle(centro, r, Paint()..color = color);

  switch (tipo) {
    case _BadgeTipo.punto:
      canvas.drawCircle(centro, 4.5 * escala, Paint()..color = Colors.white);
    case _BadgeTipo.palomita:
      final p = Path()
        ..moveTo(centro.dx - 5 * escala, centro.dy + 0.4 * escala)
        ..lineTo(centro.dx - 1.5 * escala, centro.dy + 3.8 * escala)
        ..lineTo(centro.dx + 5.5 * escala, centro.dy - 3.6 * escala);
      canvas.drawPath(
        p,
        Paint()
          ..color = Colors.white
          ..style = PaintingStyle.stroke
          ..strokeWidth = 3 * escala
          ..strokeCap = StrokeCap.round
          ..strokeJoin = StrokeJoin.round,
      );
    case _BadgeTipo.numero:
      final tp = TextPainter(
        text: TextSpan(
          text: numero,
          style: TextStyle(
            color: Colors.white,
            fontSize: 15 * escala,
            fontWeight: FontWeight.w700,
          ),
        ),
        textDirection: ui.TextDirection.ltr,
      )..layout();
      tp.paint(canvas, centro - Offset(tp.width / 2, tp.height / 2));
  }

  final img = await recorder.endRecording().toImage(lado.round(), lado.round());
  final data = await img.toByteData(format: ui.ImageByteFormat.png);
  return BitmapDescriptor.bytes(
    data!.buffer.asUint8List(),
    imagePixelRatio: escala,
  );
}

class _Mapa extends StatefulWidget {
  const _Mapa({super.key, required this.viaje});

  final Viaje viaje;

  @override
  State<_Mapa> createState() => _MapaState();
}

class _MapaState extends State<_Mapa> {
  Set<Marker> _marcadores = {};
  GoogleMapController? _controller;
  // Marcador por punto ('lat,lng') para mostrar su info window al enfocar.
  final Map<String, MarkerId> _idPorPunto = {};

  String _clavePunto(double lat, double lng) => '$lat,$lng';

  /// Centra la cámara en un punto y abre su info window (llamado desde el
  /// itinerario al tocar una escala).
  void enfocar(double lat, double lng) {
    final c = _controller;
    if (c == null) return;
    c.animateCamera(CameraUpdate.newLatLngZoom(LatLng(lat, lng), 15));
    final id = _idPorPunto[_clavePunto(lat, lng)];
    if (id != null) c.showMarkerInfoWindow(id);
  }

  @override
  void initState() {
    super.initState();
    _construirMarcadores();
  }

  @override
  void didUpdateWidget(covariant _Mapa old) {
    super.didUpdateWidget(old);
    if (old.viaje.id != widget.viaje.id) _construirMarcadores();
  }

  /// Escalas con coordenadas (ya vienen ordenadas por `orden`).
  List<Escala> get _escalasCoord => [
        for (final e in widget.viaje.escalas)
          if (e.lat != null && e.lng != null) e,
      ];

  /// Genera los badges (async) y publica los marcadores cuando están listos.
  Future<void> _construirMarcadores() async {
    final viaje = widget.viaje;
    final escalas = _escalasCoord;
    final marks = <Marker>{};

    if (escalas.isNotEmpty) {
      for (var i = 0; i < escalas.length; i++) {
        final e = escalas[i];
        final esOrigen = i == 0;
        final esDestino = i == escalas.length - 1;
        final color =
            esOrigen ? _cOrigen : (esDestino ? _cDestino : _cIntermedia);
        final tipo = esOrigen
            ? _BadgeTipo.punto
            : (esDestino ? _BadgeTipo.palomita : _BadgeTipo.numero);
        final icon =
            await _badgeBitmap(color: color, tipo: tipo, numero: '${e.orden + 1}');
        marks.add(Marker(
          markerId: MarkerId('escala_${e.id}'),
          position: LatLng(e.lat!, e.lng!),
          icon: icon,
          infoWindow:
              InfoWindow(title: '${e.orden + 1}. ${e.accion}', snippet: e.direccion),
        ));
      }
    } else if (viaje.origenLat != null &&
        viaje.origenLng != null &&
        viaje.destinoLat != null &&
        viaje.destinoLng != null) {
      final origen = await _badgeBitmap(color: _cOrigen, tipo: _BadgeTipo.punto);
      final destino =
          await _badgeBitmap(color: _cDestino, tipo: _BadgeTipo.palomita);
      marks
        ..add(Marker(
          markerId: const MarkerId('origen'),
          position: LatLng(viaje.origenLat!, viaje.origenLng!),
          icon: origen,
          infoWindow: InfoWindow(title: 'Origen', snippet: viaje.origenDireccion),
        ))
        ..add(Marker(
          markerId: const MarkerId('destino'),
          position: LatLng(viaje.destinoLat!, viaje.destinoLng!),
          icon: destino,
          infoWindow:
              InfoWindow(title: 'Destino', snippet: viaje.destinoDireccion),
        ));
    }

    _idPorPunto
      ..clear()
      ..addEntries(marks.map((m) => MapEntry(
            _clavePunto(m.position.latitude, m.position.longitude),
            m.markerId,
          )));

    if (!mounted) return;
    setState(() => _marcadores = marks);
  }

  /// Bounding box que encierra todos los puntos (para encuadrar la cámara).
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

  /// Calcula los puntos (paradas), el trazo a pintar y si es ruta por carretera.
  ({List<LatLng> puntos, List<LatLng> trazo, bool usaCarretera}) _calcularRuta() {
    final viaje = widget.viaje;
    final puntos = <LatLng>[for (final e in _escalasCoord) LatLng(e.lat!, e.lng!)];
    // Sin escalas geolocalizadas: cae a origen → destino del viaje.
    if (puntos.isEmpty &&
        viaje.origenLat != null &&
        viaje.origenLng != null &&
        viaje.destinoLat != null &&
        viaje.destinoLng != null) {
      puntos
        ..add(LatLng(viaje.origenLat!, viaje.origenLng!))
        ..add(LatLng(viaje.destinoLat!, viaje.destinoLng!));
    }
    // Ruta por carretera ya calculada por el API (snapshot del proveedor de
    // ruteo). Sin geometría, se unen las paradas en punteado.
    final rutaCarretera = <LatLng>[
      for (final p in viaje.rutaGeometria) LatLng(p[0], p[1]),
    ];
    final usaCarretera = rutaCarretera.length >= 2;
    return (
      puntos: puntos,
      trazo: usaCarretera ? rutaCarretera : puntos,
      usaCarretera: usaCarretera,
    );
  }

  /// Abre el mapa a pantalla completa (modo navegación que sigue al vehículo).
  void _abrirPantallaCompleta() {
    final r = _calcularRuta();
    if (r.puntos.isEmpty) return;
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => MapaPantallaCompleta(
        folio: widget.viaje.folio,
        marcadores: _marcadores,
        trazo: r.trazo,
        usaCarretera: r.usaCarretera,
      ),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final r = _calcularRuta();
    final puntos = r.puntos;
    if (puntos.isEmpty) return const SizedBox.shrink();
    final usaCarretera = r.usaCarretera;
    final trazo = r.trazo;

    final colorRuta = Theme.of(context).colorScheme.primary;
    final polilineas = <Polyline>{};
    if (trazo.length > 1) {
      if (usaCarretera) {
        // Casing blanco (debajo) + trazo de color (encima) — estilo "pro".
        polilineas
          ..add(Polyline(
            polylineId: const PolylineId('ruta_casing'),
            points: trazo,
            width: 9,
            color: Colors.white,
            zIndex: 1,
          ))
          ..add(Polyline(
            polylineId: const PolylineId('ruta'),
            points: trazo,
            width: 5,
            color: colorRuta,
            zIndex: 2,
          ));
      } else {
        polilineas.add(Polyline(
          polylineId: const PolylineId('ruta'),
          points: trazo,
          width: 5,
          color: colorRuta.withValues(alpha: 0.7),
          patterns: [PatternItem.dash(14), PatternItem.gap(10)],
        ));
      }
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: SizedBox(
        height: 200,
        child: Stack(
          children: [
            Positioned.fill(
              child: GoogleMap(
                initialCameraPosition:
                    CameraPosition(target: puntos.first, zoom: 13),
                markers: _marcadores,
                polylines: polilineas,
                // Sin arrastre (no secuestra el scroll del ListView); el zoom con
                // dos dedos sí. UI mínima.
                scrollGesturesEnabled: false,
                rotateGesturesEnabled: false,
                tiltGesturesEnabled: false,
                zoomControlsEnabled: false,
                mapToolbarEnabled: false,
                myLocationButtonEnabled: false,
                onMapCreated: (controller) {
                  _controller = controller;
                  if (trazo.length > 1) {
                    // Pequeño retraso: la cámara necesita que el mapa ya esté
                    // medido para que `newLatLngBounds` no falle en el 1er frame.
                    Future.delayed(const Duration(milliseconds: 250), () {
                      controller.moveCamera(
                        CameraUpdate.newLatLngBounds(_bounds(trazo), 36),
                      );
                    });
                  }
                },
              ),
            ),
            // Botón para abrir el mapa a pantalla completa (modo navegación).
            Positioned(
              top: 8,
              right: 8,
              child: Material(
                color: Theme.of(context).colorScheme.surface,
                elevation: 3,
                shape: const CircleBorder(),
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: _abrirPantallaCompleta,
                  child: const Padding(
                    padding: EdgeInsets.all(8),
                    child: Icon(Icons.fullscreen, size: 22),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SeccionItinerario extends StatelessWidget {
  const _SeccionItinerario({required this.viaje, required this.onEscalaTap});

  final Viaje viaje;
  /// Toca una parada → centra el mapa en sus coordenadas.
  final void Function(double? lat, double? lng) onEscalaTap;

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
            for (final e in viaje.escalas)
              _FilaEscala(
                escala: e,
                esPrimera: e.orden == viaje.escalas.first.orden,
                esUltima: e.orden == viaje.escalas.last.orden,
                onTap: () => onEscalaTap(e.lat, e.lng),
              )
          else ...[
            _FilaParada(
              icono: Icons.trip_origin,
              color: colores.primary,
              titulo: 'Origen',
              direccion: viaje.origenDireccion,
              lat: viaje.origenLat,
              lng: viaje.origenLng,
              onTap: () => onEscalaTap(viaje.origenLat, viaje.origenLng),
            ),
            _FilaParada(
              icono: Icons.location_on,
              color: colores.error,
              titulo: 'Destino',
              direccion: viaje.destinoDireccion,
              lat: viaje.destinoLat,
              lng: viaje.destinoLng,
              onTap: () => onEscalaTap(viaje.destinoLat, viaje.destinoLng),
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
    this.onTap,
  });

  final Escala escala;
  final bool esPrimera;
  final bool esUltima;
  final VoidCallback? onTap;

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
      onTap: onTap,
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
    this.onTap,
  });

  final IconData icono;
  final Color color;
  final String titulo;
  final String direccion;
  final String? subtitulo;
  final double? lat;
  final double? lng;
  /// Al tocar la fila: centra esta parada en el mapa (si tiene coordenadas).
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colores = Theme.of(context).colorScheme;
    final tocable = onTap != null && lat != null && lng != null;
    final contenido = Padding(
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
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

    if (!tocable) return contenido;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: contenido,
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
