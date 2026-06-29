import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'core/notifications/notification_coordinator.dart';
import 'core/router.dart';
import 'core/theme/app_theme.dart';

/// Handler de push en background/terminado. Los mensajes con `notification`
/// los muestra el sistema; aquí no hace falta nada (debe ser top-level y con
/// la anotación vm:entry-point para que el compilador no lo elimine).
@pragma('vm:entry-point')
Future<void> _fcmEnBackground(RemoteMessage message) async {}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('es');
  // Firebase (FCM). En Android toma la config de google-services.json.
  await Firebase.initializeApp();
  FirebaseMessaging.onBackgroundMessage(_fcmEnBackground);
  runApp(const ProviderScope(child: FlotaOSConductorApp()));
}

class FlotaOSConductorApp extends ConsumerWidget {
  const FlotaOSConductorApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return NotificationCoordinator(
      child: MaterialApp.router(
        title: 'FlotaOS Conductor',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        routerConfig: router,
        locale: const Locale('es', 'MX'),
        supportedLocales: const [Locale('es', 'MX'), Locale('es')],
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
      ),
    );
  }
}
