import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../domain/viaje.dart';

/// Segmentos de la lista de viajes del conductor.
enum SegmentoViajes { activos, historial }

/// Lista de viajes filtrada por segmento. El API ya restringe al
/// conductor autenticado; aquí solo separamos activos de terminados.
final viajesProvider =
    FutureProvider.family.autoDispose<List<Viaje>, SegmentoViajes>(
  (ref, segmento) async {
    final repo = ref.watch(viajesRepositoryProvider);
    final viajes = await repo.listar();
    final activos = viajes.where((v) => v.estado.esActivo).toList()
      ..sort(_porFechaProgramada);
    final historial = viajes.where((v) => !v.estado.esActivo).toList()
      ..sort((a, b) => b.updatedAtAprox.compareTo(a.updatedAtAprox));
    return segmento == SegmentoViajes.activos ? activos : historial;
  },
);

int _porFechaProgramada(Viaje a, Viaje b) {
  final fa = a.fechaProgramada;
  final fb = b.fechaProgramada;
  if (fa == null && fb == null) return b.folio.compareTo(a.folio);
  if (fa == null) return 1;
  if (fb == null) return -1;
  return fa.compareTo(fb);
}

/// Detalle completo (escalas + historial).
final viajeDetalleProvider = FutureProvider.family.autoDispose<Viaje, String>(
  (ref, id) => ref.watch(viajesRepositoryProvider).detalle(id),
);

extension on Viaje {
  /// Mejor aproximación de "recencia" para ordenar el historial.
  DateTime get updatedAtAprox =>
      fechaEntrega ?? fechaInicio ?? fechaProgramada ?? DateTime(2000);
}
