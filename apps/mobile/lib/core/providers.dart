import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/auth/data/auth_repository.dart';
import '../features/auth/providers/auth_provider.dart';
import '../features/chat/data/chat_repository.dart';
import '../features/tracking/data/tracking_repository.dart';
import '../features/tracking/service/tracking_controller.dart';
import '../features/viajes/data/viajes_repository.dart';
import 'api/api_client.dart';
import 'notifications/notification_service.dart';
import 'notifications/push_messaging_service.dart';
import 'realtime/socket_service.dart';
import 'storage/token_storage.dart';

/// Wiring central de dependencias (composition root).

final tokenStorageProvider = Provider<TokenStorage>((ref) => TokenStorage());

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(
    ref.watch(tokenStorageProvider),
    // Lectura perezosa para evitar el ciclo apiClient ↔ auth: el callback
    // corre mucho después de construir ambos providers.
    onSesionExpirada: () => ref.read(authProvider.notifier).sesionExpirada(),
  );
});

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(
    ref.watch(apiClientProvider),
    ref.watch(tokenStorageProvider),
  ),
);

final viajesRepositoryProvider = Provider<ViajesRepository>(
  (ref) => ViajesRepository(ref.watch(apiClientProvider)),
);

final chatRepositoryProvider = Provider<ChatRepository>(
  (ref) => ChatRepository(ref.watch(apiClientProvider)),
);

/// Nº de mensajes del panel sin leer para un viaje (badge en el detalle).
/// Se invalida desde el detalle al recibir un mensaje nuevo por socket.
final chatNoLeidosProvider = FutureProvider.family<int, String>(
  (ref, viajeId) => ref.watch(chatRepositoryProvider).noLeidos(viajeId),
);

final trackingRepositoryProvider = Provider<TrackingRepository>(
  (ref) => TrackingRepository(ref.watch(apiClientProvider)),
);

final trackingControllerProvider =
    NotifierProvider<TrackingController, TrackingEstado>(
  TrackingController.new,
);

final socketServiceProvider = Provider<SocketService>((ref) {
  final servicio = SocketService(ref.watch(tokenStorageProvider));
  ref.onDispose(servicio.dispose);
  return servicio;
});

/// Servicio de notificaciones locales (singleton de la app).
final notificationServiceProvider =
    Provider<NotificationService>((ref) => NotificationService());

/// Servicio de push (FCM): registro de token y taps de notificación remota.
final pushMessagingServiceProvider = Provider<PushMessagingService>(
  (ref) => PushMessagingService(ref.watch(apiClientProvider)),
);

/// viajeId del chat abierto en primer plano (null si ninguno). Lo fija el
/// ChatScreen para que el coordinador NO notifique mensajes del chat que el
/// conductor ya está viendo.
class ChatAbiertoNotifier extends Notifier<String?> {
  @override
  String? build() => null;

  void abrir(String viajeId) => state = viajeId;

  /// Cierra solo si seguimos siendo el chat activo (otro chat pudo tomar el
  /// relevo antes de que este se destruya).
  void cerrar(String viajeId) {
    if (state == viajeId) state = null;
  }
}

final chatAbiertoProvider =
    NotifierProvider<ChatAbiertoNotifier, String?>(ChatAbiertoNotifier.new);
