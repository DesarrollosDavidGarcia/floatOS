import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'core/notifications/notification_coordinator.dart';
import 'core/offline/pendientes_provider.dart';
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
  // La cola de capturas sin señal vive en disco, así que se abre antes de
  // montar la app: la pantalla de un viaje puede necesitarla de inmediato.
  final prefs = await SharedPreferences.getInstance();
  runApp(
    ProviderScope(
      overrides: [prefsProvider.overrideWithValue(prefs)],
      child: const FlotaOSConductorApp(),
    ),
  );
}

class FlotaOSConductorApp extends ConsumerStatefulWidget {
  const FlotaOSConductorApp({super.key});

  @override
  ConsumerState<FlotaOSConductorApp> createState() => _FlotaOSConductorAppState();
}

class _FlotaOSConductorAppState extends ConsumerState<FlotaOSConductorApp>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Al abrir la app se intenta vaciar lo que quedó del turno anterior.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(pendientesProvider.notifier).sincronizar();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState estado) {
    // Volver a la app suele coincidir con recuperar cobertura (salir de una
    // bodega, bajar del camión), así que es un buen momento para reintentar.
    if (estado == AppLifecycleState.resumed) {
      ref.read(pendientesProvider.notifier).sincronizar();
    }
  }

  @override
  Widget build(BuildContext context) {
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
