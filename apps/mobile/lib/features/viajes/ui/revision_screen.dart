import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/offline/operacion_pendiente.dart';
import '../../../core/offline/pendientes_provider.dart';
import '../../../core/providers.dart';
import '../data/viajes_repository.dart';
import '../domain/revision_viaje.dart';

/// Punto del check list tal como lo sirve el catálogo del backend.
class _Punto {
  const _Punto(this.clave, this.nombre);
  final String clave;
  final String nombre;
}

/// Pantalla de captura obligatoria del estado del vehículo.
///
/// Es la puerta por la que entra el odómetro real: sin esta captura el backend
/// no deja avanzar el viaje. Por eso ocupa la pantalla completa y no un sheet —
/// no es un trámite opcional que se cierre deslizando por accidente.
class RevisionScreen extends ConsumerStatefulWidget {
  const RevisionScreen({
    super.key,
    required this.viajeId,
    required this.tipo,
    this.odometroSalida,
  });

  final String viajeId;
  final TipoRevision tipo;

  /// Odómetro con el que salió, para validar la llegada en el propio teléfono
  /// y no hacerle esperar un 409 del servidor.
  final int? odometroSalida;

  @override
  ConsumerState<RevisionScreen> createState() => _RevisionScreenState();
}

class _RevisionScreenState extends ConsumerState<RevisionScreen> {
  final _odometro = TextEditingController();
  final _novedades = TextEditingController();
  double _combustible = 50;
  final Map<String, EstadoItem> _estados = {};
  String? _fotoPath;
  bool _guardando = false;
  String? _error;
  List<_Punto> _puntos = const [];

  @override
  void initState() {
    super.initState();
    _cargarPuntos();
  }

  @override
  void dispose() {
    _odometro.dispose();
    _novedades.dispose();
    super.dispose();
  }

  /// El check list vive en el catálogo del backend para que cada flota pueda
  /// tener el suyo. Si no se puede leer, la revisión sigue siendo capturable:
  /// el odómetro es lo imprescindible y no se puede bloquear por un catálogo.
  Future<void> _cargarPuntos() async {
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.dio
          .get<List<dynamic>>('/catalogos-app/CHECKLIST_UNIDAD');
      if (!mounted) return;
      setState(() {
        _puntos = (res.data ?? [])
            .map((e) => _Punto(
                  (e as Map<String, dynamic>)['codigo'] as String,
                  e['nombre'] as String,
                ))
            .toList();
      });
    } catch (_) {
      // Sin catálogo se captura solo odómetro, combustible y novedades.
    }
  }

  Future<void> _tomarFoto() async {
    final x = await ImagePicker().pickImage(
      source: ImageSource.camera,
      imageQuality: 80,
    );
    if (x == null || !mounted) return;
    setState(() => _fotoPath = x.path);
  }

  Future<void> _guardar() async {
    final odometro = int.tryParse(_odometro.text.trim());
    if (odometro == null || odometro < 0) {
      setState(() => _error = 'Captura la lectura del odómetro');
      return;
    }
    final minimo = widget.odometroSalida;
    if (widget.tipo == TipoRevision.llegada && minimo != null && odometro < minimo) {
      setState(() => _error =
          'La lectura no puede ser menor a la de salida ($minimo km)');
      return;
    }

    setState(() {
      _error = null;
      _guardando = true;
    });
    try {
      final repo = ref.read(viajesRepositoryProvider);
      await repo.capturarRevision(
        widget.viajeId,
        widget.tipo,
        odometro: odometro,
        nivelCombustiblePct: _combustible.round(),
        novedades: _novedades.text,
        checklist: _estados.entries
            .map((e) => ItemChecklist(clave: e.key, estado: e.value))
            .toList(),
        fotoPath: _fotoPath,
      );
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (!mounted) return;
      if (!e.esSinConexion) {
        // El servidor la recibió y la rechazó: reintentar no arreglaría nada.
        setState(() {
          _guardando = false;
          _error = e.mensaje;
        });
        return;
      }
      // Sin señal la revisión se guarda en el teléfono y el viaje continúa: si
      // no, el conductor se quedaría atorado en un patio sin cobertura, que es
      // justo donde se hacen estas revisiones.
      await ref.read(pendientesProvider.notifier).encolar(
            tipo: TipoPendiente.revision,
            viajeId: widget.viajeId,
            datos: {
              'tipo': widget.tipo.api,
              'odometro': odometro,
              'nivelCombustiblePct': _combustible.round(),
              if (_novedades.text.trim().isNotEmpty)
                'novedades': _novedades.text.trim(),
              'checklist': _estados.entries
                  .map((e) => ItemChecklist(clave: e.key, estado: e.value).toJson())
                  .toList(),
            },
            fotoPath: _fotoPath,
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Sin señal: la revisión se guardó y se enviará sola.'),
        ),
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
    final tema = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(widget.tipo.titulo)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(widget.tipo.explicacion, style: tema.textTheme.bodyMedium),
          const SizedBox(height: 16),

          TextField(
            controller: _odometro,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            autofocus: true,
            decoration: InputDecoration(
              labelText: 'Odómetro (km)',
              helperText: widget.odometroSalida != null
                  ? 'Salió con ${widget.odometroSalida} km'
                  : 'La lectura que marca el tablero',
              errorText: _error,
              border: const OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 20),

          Text('Combustible: ${_combustible.round()}%',
              style: tema.textTheme.labelLarge),
          Slider(
            value: _combustible,
            max: 100,
            divisions: 20,
            label: '${_combustible.round()}%',
            onChanged: (v) => setState(() => _combustible = v),
          ),
          const SizedBox(height: 8),

          if (_puntos.isNotEmpty) ...[
            Text('Check list', style: tema.textTheme.titleSmall),
            const SizedBox(height: 8),
            ..._puntos.map(
              (p) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    Expanded(child: Text(p.nombre)),
                    SegmentedButton<EstadoItem>(
                      showSelectedIcon: false,
                      style: const ButtonStyle(
                        visualDensity: VisualDensity.compact,
                      ),
                      segments: EstadoItem.values
                          .map((e) => ButtonSegment(
                                value: e,
                                label: Text(e.api),
                              ))
                          .toList(),
                      // Vacío = sin revisar todavía; no se asume que esté bien.
                      selected: _estados[p.clave] == null
                          ? <EstadoItem>{}
                          : {_estados[p.clave]!},
                      emptySelectionAllowed: true,
                      onSelectionChanged: (s) => setState(() {
                        if (s.isEmpty) {
                          _estados.remove(p.clave);
                        } else {
                          _estados[p.clave] = s.first;
                        }
                      }),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
          ],

          TextField(
            controller: _novedades,
            maxLines: 2,
            decoration: const InputDecoration(
              labelText: 'Novedades',
              hintText: 'Golpes, fallas o cualquier detalle de la unidad',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),

          OutlinedButton.icon(
            onPressed: _tomarFoto,
            icon: const Icon(Icons.photo_camera_outlined),
            label: Text(_fotoPath == null
                ? 'Foto del tablero'
                : 'Cambiar foto del tablero'),
          ),
          if (_fotoPath != null) ...[
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.file(File(_fotoPath!), height: 160, fit: BoxFit.cover),
            ),
          ],
          const SizedBox(height: 24),

          FilledButton(
            onPressed: _guardando ? null : _guardar,
            child: Text(_guardando ? 'Guardando…' : 'Guardar y continuar'),
          ),
        ],
      ),
    );
  }
}
