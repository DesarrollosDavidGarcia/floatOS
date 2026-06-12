/// Perfil público del conductor autenticado (subset de PrincipalPublico).
class Conductor {
  Conductor({
    required this.id,
    required this.nombre,
    required this.usuario,
    this.apellidos,
    this.email,
    this.telefono,
    this.numeroEmpleado,
    this.categoriaLicencia,
  });

  final String id;
  final String nombre;
  final String? apellidos;
  final String usuario;
  final String? email;
  final String? telefono;
  final String? numeroEmpleado;
  final String? categoriaLicencia;

  String get nombreCompleto =>
      apellidos == null ? nombre : '$nombre $apellidos';

  String get iniciales {
    final partes = nombreCompleto.trim().split(RegExp(r'\s+'));
    if (partes.length == 1) return partes.first[0].toUpperCase();
    return (partes.first[0] + partes.last[0]).toUpperCase();
  }

  factory Conductor.fromJson(Map<String, dynamic> json) => Conductor(
        id: json['id'] as String,
        nombre: json['nombre'] as String,
        apellidos: json['apellidos'] as String?,
        usuario: json['usuario'] as String,
        email: json['email'] as String?,
        telefono: json['telefono'] as String?,
        numeroEmpleado: json['numeroEmpleado'] as String?,
        categoriaLicencia: json['categoriaLicencia'] as String?,
      );
}
