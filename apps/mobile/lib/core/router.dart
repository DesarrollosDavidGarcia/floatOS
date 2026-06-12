import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/providers/auth_provider.dart';
import '../features/auth/ui/login_screen.dart';
import '../features/viajes/ui/viaje_detail_screen.dart';
import '../features/viajes/ui/viajes_list_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  // Notifier puente: GoRouter re-evalúa redirect cuando cambia la sesión.
  final refrescador = ValueNotifier(0);
  ref.listen(authProvider, (_, _) => refrescador.value++);

  final router = GoRouter(
    initialLocation: '/splash',
    refreshListenable: refrescador,
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final enLogin = state.matchedLocation == '/login';
      final enSplash = state.matchedLocation == '/splash';

      return switch (auth) {
        AuthCargando() => enSplash ? null : '/splash',
        AuthSinSesion() => enLogin ? null : '/login',
        AuthConSesion() => (enLogin || enSplash) ? '/viajes' : null,
      };
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (_, _) => const _SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (_, _) => const LoginScreen(),
      ),
      GoRoute(
        path: '/viajes',
        builder: (_, _) => const ViajesListScreen(),
        routes: [
          GoRoute(
            path: ':id',
            builder: (_, state) =>
                ViajeDetailScreen(viajeId: state.pathParameters['id']!),
          ),
        ],
      ),
    ],
  );

  // El router se dispone antes que el ValueNotifier que escucha.
  ref
    ..onDispose(router.dispose)
    ..onDispose(refrescador.dispose);
  return router;
});

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    final colores = Theme.of(context).colorScheme;
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.local_shipping_rounded, size: 64, color: colores.primary),
            const SizedBox(height: 16),
            const CircularProgressIndicator(),
          ],
        ),
      ),
    );
  }
}
