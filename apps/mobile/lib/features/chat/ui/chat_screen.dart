import 'dart:async';
import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/providers.dart';
import '../domain/mensaje_chat.dart';

const _maxBytes = 10 * 1024 * 1024; // 10 MB

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key, required this.viajeId, this.folioTexto});

  final String viajeId;
  final String? folioTexto;

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _mensajes = <MensajeChat>[];
  final _textoCtrl = TextEditingController();
  final _scroll = ScrollController();
  StreamSubscription<Map<String, dynamic>>? _subChat;

  bool _cargando = true;
  bool _enviando = false;
  String? _error;
  String? _archivoPath;
  String? _archivoNombre;

  @override
  void initState() {
    super.initState();
    _cargar();
    // Tiempo real: el conductor ya está suscrito a la sala de su viaje activo
    // (tracking); aquí solo consumimos los mensajes entrantes.
    _subChat = ref.read(socketServiceProvider).chatMensajes.listen((data) {
      if (data['viajeId'] != widget.viajeId) return;
      _agregar(MensajeChat.fromJson(data));
      // El chat está abierto: marca leído lo que llega del panel.
      ref.read(chatRepositoryProvider).marcarLeido(widget.viajeId);
    });
  }

  @override
  void dispose() {
    _subChat?.cancel();
    _textoCtrl.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _cargar() async {
    try {
      final lista =
          await ref.read(chatRepositoryProvider).historial(widget.viajeId);
      if (!mounted) return;
      setState(() {
        _mensajes
          ..clear()
          ..addAll(lista);
        _cargando = false;
      });
      _irAlFinal();
      await ref.read(chatRepositoryProvider).marcarLeido(widget.viajeId);
      ref.invalidate(chatNoLeidosProvider(widget.viajeId));
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = mensajeDeError(e);
          _cargando = false;
        });
      }
    }
  }

  void _agregar(MensajeChat m) {
    if (!mounted || _mensajes.any((x) => x.id == m.id)) return;
    setState(() => _mensajes.add(m));
    _irAlFinal();
  }

  void _irAlFinal() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _elegirAdjunto() async {
    final opcion = await showModalBottomSheet<String>(
      context: context,
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('Tomar foto'),
              onTap: () => Navigator.pop(context, 'camara'),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Galería'),
              onTap: () => Navigator.pop(context, 'galeria'),
            ),
            ListTile(
              leading: const Icon(Icons.picture_as_pdf_outlined),
              title: const Text('Documento PDF'),
              onTap: () => Navigator.pop(context, 'pdf'),
            ),
          ],
        ),
      ),
    );
    if (opcion == null) return;

    try {
      String? path;
      String? nombre;
      if (opcion == 'pdf') {
        final res = await FilePicker.platform.pickFiles(
          type: FileType.custom,
          allowedExtensions: ['pdf'],
        );
        path = res?.files.single.path;
        nombre = res?.files.single.name;
      } else {
        final x = await ImagePicker().pickImage(
          source: opcion == 'camara' ? ImageSource.camera : ImageSource.gallery,
          imageQuality: 80,
        );
        path = x?.path;
        nombre = x?.name;
      }
      if (path == null) return;

      final tam = await File(path).length();
      if (tam > _maxBytes) {
        _aviso('El archivo supera el máximo de 10 MB.');
        return;
      }
      setState(() {
        _archivoPath = path;
        _archivoNombre = nombre;
      });
    } catch (_) {
      _aviso('No se pudo seleccionar el archivo.');
    }
  }

  Future<void> _enviar() async {
    final texto = _textoCtrl.text.trim();
    if (texto.isEmpty && _archivoPath == null) return;
    setState(() => _enviando = true);
    try {
      final m = await ref.read(chatRepositoryProvider).enviar(
            widget.viajeId,
            texto: texto.isEmpty ? null : texto,
            archivoPath: _archivoPath,
            archivoNombre: _archivoNombre,
          );
      _agregar(m);
      _textoCtrl.clear();
      setState(() {
        _archivoPath = null;
        _archivoNombre = null;
      });
    } catch (e) {
      _aviso(mensajeDeError(e));
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  void _aviso(String texto) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(texto)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.folioTexto != null ? 'Chat · ${widget.folioTexto}' : 'Chat',
        ),
      ),
      body: Column(
        children: [
          Expanded(child: _cuerpo()),
          _barraEnvio(),
        ],
      ),
    );
  }

  Widget _cuerpo() {
    if (_cargando) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              TextButton(onPressed: _cargar, child: const Text('Reintentar')),
            ],
          ),
        ),
      );
    }
    if (_mensajes.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'Aún no hay mensajes. Escribe para comunicarte con el monitorista.',
            textAlign: TextAlign.center,
          ),
        ),
      );
    }
    return ListView.builder(
      controller: _scroll,
      padding: const EdgeInsets.all(12),
      itemCount: _mensajes.length,
      itemBuilder: (_, i) => _Burbuja(mensaje: _mensajes[i]),
    );
  }

  Widget _barraEnvio() {
    final colores = Theme.of(context).colorScheme;
    return SafeArea(
      top: false,
      child: Container(
        decoration: BoxDecoration(
          border: Border(top: BorderSide(color: colores.outlineVariant)),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_archivoNombre != null)
              Padding(
                padding: const EdgeInsets.only(left: 12, bottom: 4),
                child: Row(
                  children: [
                    const Icon(Icons.attach_file, size: 16),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        _archivoNombre!,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 16),
                      onPressed: () => setState(() {
                        _archivoPath = null;
                        _archivoNombre = null;
                      }),
                    ),
                  ],
                ),
              ),
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.attach_file),
                  onPressed: _enviando ? null : _elegirAdjunto,
                ),
                Expanded(
                  child: TextField(
                    controller: _textoCtrl,
                    minLines: 1,
                    maxLines: 4,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _enviar(),
                    decoration: const InputDecoration(
                      hintText: 'Escribe un mensaje…',
                      border: OutlineInputBorder(),
                      isDense: true,
                      contentPadding:
                          EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                  ),
                ),
                const SizedBox(width: 4),
                IconButton.filled(
                  icon: _enviando
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.send),
                  onPressed: _enviando ? null : _enviar,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Burbuja extends StatelessWidget {
  const _Burbuja({required this.mensaje});

  final MensajeChat mensaje;

  @override
  Widget build(BuildContext context) {
    final colores = Theme.of(context).colorScheme;
    final mio = mensaje.esMio;
    final fondo = mio ? colores.primary : colores.surfaceContainerHighest;
    final texto = mio ? colores.onPrimary : colores.onSurface;

    return Align(
      alignment: mio ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 3),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.78,
        ),
        decoration: BoxDecoration(
          color: fondo,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          crossAxisAlignment:
              mio ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            if (!mio)
              Padding(
                padding: const EdgeInsets.only(bottom: 2),
                child: Text(
                  mensaje.autorNombre,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: texto.withValues(alpha: 0.8),
                  ),
                ),
              ),
            if (mensaje.archivoUrl != null) _adjunto(context, texto),
            if (mensaje.texto != null && mensaje.texto!.isNotEmpty)
              Text(mensaje.texto!, style: TextStyle(color: texto)),
            const SizedBox(height: 2),
            Text(
              DateFormat('d MMM, HH:mm', 'es').format(mensaje.createdAt),
              style: TextStyle(fontSize: 10, color: texto.withValues(alpha: 0.7)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _adjunto(BuildContext context, Color texto) {
    final url = mensaje.archivoUrl!;
    if (mensaje.esImagen) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: GestureDetector(
          onTap: () => _abrir(url),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.network(
              url,
              width: 200,
              height: 160,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => const SizedBox(
                width: 200,
                height: 160,
                child: Icon(Icons.broken_image_outlined),
              ),
            ),
          ),
        ),
      );
    }
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: InkWell(
        onTap: () => _abrir(url),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.description_outlined, size: 18, color: texto),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                mensaje.archivoNombre ?? 'Archivo',
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: texto,
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _abrir(String url) async {
    final uri = Uri.tryParse(url);
    if (uri != null) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}
