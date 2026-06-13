/// Configuración de entorno de la app.
///
/// Los valores se inyectan en build/run con `--dart-define`:
///   flutter run --dart-define=API_URL=http://192.168.1.10:3000/api \
///               --dart-define=SOCKET_URL=http://192.168.1.10:3000
///
/// Por defecto apunta al host del emulador Android (10.0.2.2 = localhost
/// de la máquina de desarrollo). Para iOS simulator usar localhost.
abstract final class AppConfig {
  static const String apiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://10.0.2.2:3000/api',
  );

  /// URL base del servidor Socket.io (sin el prefijo /api).
  static const String socketUrl = String.fromEnvironment(
    'SOCKET_URL',
    defaultValue: 'http://10.0.2.2:3000',
  );

  /// Namespace del gateway de tracking en el API.
  static const String trackingNamespace = '/tracking';
}
