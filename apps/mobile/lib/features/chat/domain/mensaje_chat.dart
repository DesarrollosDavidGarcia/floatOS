/// Mensaje del chat de un viaje (espejo de MensajeChatPayload en shared-types).
class MensajeChat {
  const MensajeChat({
    required this.id,
    required this.viajeId,
    required this.autorTipo,
    required this.autorNombre,
    required this.createdAt,
    this.texto,
    this.archivoUrl,
    this.archivoNombre,
    this.archivoTipo,
    this.archivoBytes,
    this.entregado = false,
    this.leido = false,
  });

  final String id;
  final String viajeId;
  final String autorTipo; // 'MONITORISTA' | 'CONDUCTOR'
  final String autorNombre;
  final String? texto;
  final String? archivoUrl;
  final String? archivoNombre;
  final String? archivoTipo;
  final int? archivoBytes;
  final DateTime createdAt;

  /// Estado de entrega/lectura (palomitas) visto desde el emisor: el destinatario
  /// recibió (`entregado`) o abrió el chat (`leido`, implica entregado).
  final bool entregado;
  final bool leido;

  /// El conductor es el "yo" en la app: sus mensajes van a la derecha.
  bool get esMio => autorTipo == 'CONDUCTOR';
  bool get esImagen => archivoTipo?.startsWith('image/') ?? false;

  factory MensajeChat.fromJson(Map<String, dynamic> j) {
    return MensajeChat(
      id: j['id'] as String,
      viajeId: j['viajeId'] as String,
      autorTipo: j['autorTipo'] as String,
      autorNombre: (j['autorNombre'] as String?) ?? '',
      texto: j['texto'] as String?,
      archivoUrl: j['archivoUrl'] as String?,
      archivoNombre: j['archivoNombre'] as String?,
      archivoTipo: j['archivoTipo'] as String?,
      archivoBytes: (j['archivoBytes'] as num?)?.toInt(),
      createdAt:
          DateTime.tryParse(j['createdAt'] as String? ?? '')?.toLocal() ??
              DateTime.now(),
      entregado: j['entregado'] as bool? ?? false,
      leido: j['leido'] as bool? ?? false,
    );
  }

  MensajeChat copyWith({bool? entregado, bool? leido}) => MensajeChat(
        id: id,
        viajeId: viajeId,
        autorTipo: autorTipo,
        autorNombre: autorNombre,
        createdAt: createdAt,
        texto: texto,
        archivoUrl: archivoUrl,
        archivoNombre: archivoNombre,
        archivoTipo: archivoTipo,
        archivoBytes: archivoBytes,
        entregado: entregado ?? this.entregado,
        leido: leido ?? this.leido,
      );
}
