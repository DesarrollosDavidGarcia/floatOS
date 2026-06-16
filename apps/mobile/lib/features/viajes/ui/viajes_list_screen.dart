import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/providers.dart';
import '../../auth/providers/auth_provider.dart';
import '../domain/viaje.dart';
import '../providers/viajes_providers.dart';
import 'widgets/viaje_card.dart';

class ViajesListScreen extends ConsumerStatefulWidget {
  const ViajesListScreen({super.key});

  @override
  ConsumerState<ViajesListScreen> createState() => _ViajesListScreenState();
}

class _ViajesListScreenState extends ConsumerState<ViajesListScreen>
    with WidgetsBindingObserver {
  SegmentoViajes _segmento = SegmentoViajes.activos;
  StreamSubscription<Map<String, dynamic>>? _subAlertas;
  StreamSubscription<Map<String, dynamic>>? _subEstados;
  StreamSubscription<Map<String, dynamic>>? _subReasignaciones;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Socket.io: alertas y cambios de estado en tiempo real.
    Future.microtask(() async {
      final socket = ref.read(socketServiceProvider);
      await socket.conectar();
      if (!mounted) return;
      _subAlertas = socket.alertas.listen((alerta) {
        if (!mounted) return;
        ref.invalidate(viajesProvider);
        final mensaje = alerta['mensaje'] ?? alerta['tipo'] ?? 'Nueva alerta';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('⚠ $mensaje')),
        );
      });
      _subEstados = socket.cambiosEstado.listen((_) {
        if (!mounted) return;
        // El monitorista cambió/canceló un viaje: refrescar la lista (y la
        // sincronización de tracking del listen de abajo hace el resto).
        ref.invalidate(viajesProvider);
      });
      _subReasignaciones = socket.reasignaciones.listen((p) {
        if (!mounted) return;
        // El monitorista te reasignó (entrante o saliente): refrescar la lista
        // y avisar (al saliente le desaparece el viaje; al entrante le aparece).
        ref.invalidate(viajesProvider);
        final auth = ref.read(authProvider);
        final yo = auth is AuthConSesion ? auth.conductor.id : null;
        final folio = p['folio'];
        final cual = folio != null ? 'el viaje #$folio' : 'un viaje';
        final String mensaje;
        if (yo != null && p['conductorNuevoId'] == yo) {
          mensaje = 'Te asignaron $cual';
        } else if (yo != null && p['conductorAnteriorId'] == yo) {
          mensaje = 'Ya no tienes $cual (reasignado)';
        } else {
          mensaje = 'Cambió la asignación de $cual';
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(mensaje)),
        );
      });
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _subAlertas?.cancel();
    _subEstados?.cancel();
    _subReasignaciones?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState estado) {
    // Al volver del background la lista puede estar vieja.
    if (estado == AppLifecycleState.resumed) {
      ref.invalidate(viajesProvider);
    }
  }

  /// Mantiene el GPS alineado con la realidad del servidor:
  /// - reanuda si hay un viaje en fase operativa sin tracking activo
  ///   (p. ej. la app se reabrió a mitad de viaje);
  /// - lo detiene si el viaje trackeado ya no está activo
  ///   (p. ej. el monitorista lo canceló).
  void _sincronizarTracking(List<Viaje> activos) {
    final tracking = ref.read(trackingControllerProvider);
    final notifier = ref.read(trackingControllerProvider.notifier);
    final socket = ref.read(socketServiceProvider);

    if (tracking.activo) {
      Viaje? trackeado;
      for (final v in activos) {
        if (v.id == tracking.viajeId) {
          trackeado = v;
          break;
        }
      }
      if (trackeado == null || !trackeado.estado.requiereTracking) {
        socket.desuscribirViaje(tracking.viajeId!);
        notifier.detener();
      }
      return;
    }

    if (tracking.permisoDenegado) return; // no re-mostrar el diálogo
    for (final v in activos) {
      if (v.estado.requiereTracking) {
        notifier.iniciar(v.id);
        socket.suscribirViaje(v.id);
        break;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(viajesProvider(SegmentoViajes.activos), (_, next) {
      next.whenData(_sincronizarTracking);
    });
    final auth = ref.watch(authProvider);
    final conductor = auth is AuthConSesion ? auth.conductor : null;
    final viajesAsync = ref.watch(viajesProvider(_segmento));
    // select: cada punto GPS muta el estado del tracking — sin esto la
    // pantalla completa se re-renderizaría cada ~10 s durante horas.
    final tracking = ref.watch(
      trackingControllerProvider
          .select((t) => (activo: t.activo, pendientes: t.pendientes)),
    );
    final colores = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Hola, ${conductor?.nombre ?? 'conductor'} 👋',
              style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800),
            ),
            Text(
              'Tus viajes',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: colores.onSurfaceVariant,
              ),
            ),
          ],
        ),
        toolbarHeight: 68,
        actions: [
          IconButton(
            tooltip: 'Cerrar sesión',
            onPressed: () => _confirmarLogout(context),
            icon: CircleAvatar(
              radius: 17,
              backgroundColor: colores.primary.withValues(alpha: 0.12),
              child: Text(
                conductor?.iniciales ?? '?',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: colores.primary,
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          if (tracking.activo)
            _BannerTracking(pendientes: tracking.pendientes),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: SegmentedButton<SegmentoViajes>(
              segments: const [
                ButtonSegment(
                  value: SegmentoViajes.activos,
                  label: Text('Activos'),
                  icon: Icon(Icons.local_shipping_outlined),
                ),
                ButtonSegment(
                  value: SegmentoViajes.historial,
                  label: Text('Historial'),
                  icon: Icon(Icons.history),
                ),
              ],
              selected: {_segmento},
              onSelectionChanged: (s) => setState(() => _segmento = s.first),
              style: ButtonStyle(
                visualDensity: VisualDensity.comfortable,
                shape: WidgetStatePropertyAll(
                  RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                final recarga = ref.refresh(viajesProvider(_segmento).future);
                try {
                  await recarga;
                } catch (_) {
                  // El error ya se muestra en la UI vía when(error:).
                }
              },
              child: viajesAsync.when(
                loading: () =>
                    const Center(child: CircularProgressIndicator()),
                error: (e, _) => _MensajeCentrado(
                  icono: Icons.cloud_off,
                  titulo: 'No se pudieron cargar tus viajes',
                  detalle: mensajeDeError(e),
                  accion: TextButton(
                    onPressed: () =>
                        ref.invalidate(viajesProvider(_segmento)),
                    child: const Text('Reintentar'),
                  ),
                ),
                data: (viajes) {
                  if (viajes.isEmpty) {
                    return _MensajeCentrado(
                      icono: _segmento == SegmentoViajes.activos
                          ? Icons.beach_access_outlined
                          : Icons.history,
                      titulo: _segmento == SegmentoViajes.activos
                          ? 'Sin viajes activos'
                          : 'Sin viajes terminados',
                      detalle: _segmento == SegmentoViajes.activos
                          ? 'Cuando el monitorista te asigne un viaje '
                              'aparecerá aquí.'
                          : 'Aquí verás tus viajes terminados '
                              '(entregados, facturados o cancelados).',
                    );
                  }
                  return ListView.separated(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                    itemCount: viajes.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (context, i) => ViajeCard(
                      viaje: viajes[i],
                      onTap: () => context.push('/viajes/${viajes[i].id}'),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmarLogout(BuildContext context) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cerrar sesión'),
        content: const Text('¿Seguro que quieres salir de FlotaOS?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Salir'),
          ),
        ],
      ),
    );
    if (confirmar == true && mounted) {
      // logout() ya detiene el GPS y desconecta el socket.
      await ref.read(authProvider.notifier).logout();
    }
  }
}

class _BannerTracking extends StatelessWidget {
  const _BannerTracking({required this.pendientes});

  final int pendientes;

  @override
  Widget build(BuildContext context) {
    final colores = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      color: colores.primary.withValues(alpha: 0.08),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Icon(Icons.gps_fixed, size: 16, color: colores.primary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              pendientes > 0
                  ? 'Sin señal — tu ubicación se guardará y se enviará '
                      'al recuperar conexión'
                  : 'GPS activo · compartiendo ubicación',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: colores.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MensajeCentrado extends StatelessWidget {
  const _MensajeCentrado({
    required this.icono,
    required this.titulo,
    this.detalle,
    this.accion,
  });

  final IconData icono;
  final String titulo;
  final String? detalle;
  final Widget? accion;

  @override
  Widget build(BuildContext context) {
    final colores = Theme.of(context).colorScheme;
    // ListView para que el pull-to-refresh funcione también en vacío.
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        const SizedBox(height: 90),
        Icon(icono, size: 56, color: colores.outlineVariant),
        const SizedBox(height: 16),
        Text(
          titulo,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        ),
        if (detalle != null) ...[
          const SizedBox(height: 6),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 40),
            child: Text(
              detalle!,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13.5, color: colores.onSurfaceVariant),
            ),
          ),
        ],
        if (accion != null) ...[
          const SizedBox(height: 8),
          Center(child: accion),
        ],
      ],
    );
  }
}
