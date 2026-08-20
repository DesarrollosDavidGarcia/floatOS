import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/offline/operacion_pendiente.dart';
import '../../../core/offline/pendientes_provider.dart';
import '../../../core/providers.dart';
import '../data/viajes_repository.dart';
import '../domain/revision_viaje.dart';

final _moneda = NumberFormat.currency(locale: 'es_MX', symbol: r'$');

/// Gastos del viaje capturados por el conductor.
///
/// Se pueden registrar en cualquier momento y no solo al cerrar: una caseta
/// ocurre a media ruta y pedirle que las recuerde todas al final es pedirle que
/// se las invente. El ticket es lo que vuelve real el costo de combustible.
class GastosScreen extends ConsumerStatefulWidget {
  const GastosScreen({super.key, required this.viajeId});

  final String viajeId;

  @override
  ConsumerState<GastosScreen> createState() => _GastosScreenState();
}

class _GastosScreenState extends ConsumerState<GastosScreen> {
  late Future<List<GastoViaje>> _futuro;

  @override
  void initState() {
    super.initState();
    _recargar();
  }

  void _recargar() {
    _futuro = ref.read(viajesRepositoryProvider).gastos(widget.viajeId);
  }

  Future<void> _agregar() async {
    final creado = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => _SheetGasto(viajeId: widget.viajeId),
    );
    if (creado == true && mounted) {
      setState(_recargar);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Gastos del viaje')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _agregar,
        icon: const Icon(Icons.add),
        label: const Text('Agregar'),
      ),
      body: FutureBuilder<List<GastoViaje>>(
        future: _futuro,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text('No se pudieron cargar los gastos: ${snap.error}'),
              ),
            );
          }
          final gastos = snap.data ?? const <GastoViaje>[];
          if (gastos.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'Sin gastos capturados.\nRegistra el diesel, las casetas y los viáticos en cuanto ocurran.',
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }
          final total = gastos.fold<double>(0, (t, g) => t + g.monto);
          return ListView(
            padding: const EdgeInsets.only(bottom: 88),
            children: [
              ...gastos.map(
                (g) => ListTile(
                  leading: Icon(
                    g.fotoTicketUrl != null
                        ? Icons.receipt_long
                        : Icons.receipt_outlined,
                  ),
                  title: Text(etiquetasTipoGasto[g.tipo] ?? g.tipo),
                  subtitle: Text([
                    if (g.litros != null) '${g.litros} L',
                    if (g.descripcion != null) g.descripcion!,
                  ].join(' · ')),
                  trailing: Text(_moneda.format(g.monto)),
                ),
              ),
              const Divider(),
              ListTile(
                title: const Text('Total capturado'),
                trailing: Text(
                  _moneda.format(total),
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// Alta de un gasto. El tipo por defecto es combustible porque es el gasto que
/// más veces se captura y el que más cambia el costo del viaje.
class _SheetGasto extends ConsumerStatefulWidget {
  const _SheetGasto({required this.viajeId});

  final String viajeId;

  @override
  ConsumerState<_SheetGasto> createState() => _SheetGastoState();
}

class _SheetGastoState extends ConsumerState<_SheetGasto> {
  final _monto = TextEditingController();
  final _litros = TextEditingController();
  final _descripcion = TextEditingController();
  String _tipo = 'COMBUSTIBLE';
  String? _ticketPath;
  bool _guardando = false;
  String? _error;

  @override
  void dispose() {
    _monto.dispose();
    _litros.dispose();
    _descripcion.dispose();
    super.dispose();
  }

  Future<void> _tomarTicket() async {
    final x = await ImagePicker().pickImage(
      source: ImageSource.camera,
      imageQuality: 80,
    );
    if (x == null || !mounted) return;
    setState(() => _ticketPath = x.path);
  }

  Future<void> _guardar() async {
    final monto = double.tryParse(_monto.text.trim().replaceAll(',', '.'));
    if (monto == null || monto <= 0) {
      setState(() => _error = 'Captura el monto del gasto');
      return;
    }
    setState(() {
      _error = null;
      _guardando = true;
    });
    try {
      await ref.read(viajesRepositoryProvider).crearGasto(
            widget.viajeId,
            tipo: _tipo,
            monto: monto,
            descripcion: _descripcion.text,
            litros: _tipo == 'COMBUSTIBLE'
                ? double.tryParse(_litros.text.trim().replaceAll(',', '.'))
                : null,
            ticketPath: _ticketPath,
          );
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (!mounted) return;
      if (!e.esSinConexion) {
        setState(() {
          _guardando = false;
          _error = e.mensaje;
        });
        return;
      }
      // Las casetas se pagan justo donde no hay señal: el gasto se guarda y se
      // envía solo, con su ticket.
      await ref.read(pendientesProvider.notifier).encolar(
            tipo: TipoPendiente.gasto,
            viajeId: widget.viajeId,
            datos: {
              'tipo': _tipo,
              'monto': monto,
              if (_descripcion.text.trim().isNotEmpty)
                'descripcion': _descripcion.text.trim(),
              if (_tipo == 'COMBUSTIBLE')
                'litros': double.tryParse(_litros.text.trim().replaceAll(',', '.')),
            },
            fotoPath: _ticketPath,
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sin señal: el gasto se enviará solo.')),
      );
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _guardando = false;
        _error = 'No se pudo guardar: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Nuevo gasto', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            initialValue: _tipo,
            decoration: const InputDecoration(
              labelText: 'Tipo',
              border: OutlineInputBorder(),
            ),
            items: etiquetasTipoGasto.entries
                .map((e) =>
                    DropdownMenuItem(value: e.key, child: Text(e.value)))
                .toList(),
            onChanged: (v) => setState(() => _tipo = v ?? 'OTRO'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _monto,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(
              labelText: 'Monto',
              prefixText: r'$ ',
              errorText: _error,
              border: const OutlineInputBorder(),
            ),
          ),
          if (_tipo == 'COMBUSTIBLE') ...[
            const SizedBox(height: 12),
            TextField(
              controller: _litros,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(
                labelText: 'Litros (opcional)',
                border: OutlineInputBorder(),
              ),
            ),
          ] else ...[
            const SizedBox(height: 12),
            TextField(
              controller: _descripcion,
              decoration: const InputDecoration(
                labelText: 'Descripción (opcional)',
                border: OutlineInputBorder(),
              ),
            ),
          ],
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _tomarTicket,
            icon: const Icon(Icons.photo_camera_outlined),
            label: Text(_ticketPath == null ? 'Foto del ticket' : 'Cambiar foto'),
          ),
          if (_ticketPath != null) ...[
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.file(File(_ticketPath!), height: 120, fit: BoxFit.cover),
            ),
          ],
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _guardando ? null : _guardar,
            child: Text(_guardando ? 'Guardando…' : 'Guardar gasto'),
          ),
        ],
      ),
    );
  }
}
