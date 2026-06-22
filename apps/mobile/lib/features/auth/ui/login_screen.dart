import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _usuarioCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _verPassword = false;
  bool _cargando = false;
  String? _error;

  @override
  void dispose() {
    _usuarioCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _entrar() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _cargando = true;
      _error = null;
    });
    try {
      await ref
          .read(authProvider.notifier)
          .login(_usuarioCtrl.text.trim(), _passwordCtrl.text);
      // El router redirige solo al detectar la sesión.
    } catch (e) {
      if (mounted) setState(() => _error = mensajeDeError(e));
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colores = Theme.of(context).colorScheme;
    final auth = ref.watch(authProvider);
    final avisoSesion = auth is AuthSinSesion ? auth.mensaje : null;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // ── Identidad ──
                    const RepaintBoundary(child: _LogoFlota()),
                    const SizedBox(height: 24),
                    Text(
                      'FlotaOS',
                      textAlign: TextAlign.center,
                      style: Theme.of(context)
                          .textTheme
                          .headlineMedium
                          ?.copyWith(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'App del conductor',
                      textAlign: TextAlign.center,
                      style: Theme.of(context)
                          .textTheme
                          .bodyLarge
                          ?.copyWith(color: colores.onSurfaceVariant),
                    ),
                    const SizedBox(height: 28),

                    // ── Desfile de transporte ──
                    const RepaintBoundary(child: _DesfileTransporte()),
                    const SizedBox(height: 36),

                    if (avisoSesion != null) ...[
                      _Aviso(texto: avisoSesion, color: colores.tertiary),
                      const SizedBox(height: 16),
                    ],

                    // ── Credenciales ──
                    TextFormField(
                      controller: _usuarioCtrl,
                      autocorrect: false,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Usuario',
                        prefixIcon: Icon(Icons.person_outline),
                      ),
                      validator: (v) => (v == null || v.trim().isEmpty)
                          ? 'Escribe tu usuario'
                          : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _passwordCtrl,
                      obscureText: !_verPassword,
                      textInputAction: TextInputAction.done,
                      onFieldSubmitted: (_) => _entrar(),
                      decoration: InputDecoration(
                        labelText: 'Contraseña',
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          onPressed: () =>
                              setState(() => _verPassword = !_verPassword),
                          icon: Icon(
                            _verPassword
                                ? Icons.visibility_off_outlined
                                : Icons.visibility_outlined,
                          ),
                        ),
                      ),
                      validator: (v) => (v == null || v.isEmpty)
                          ? 'Escribe tu contraseña'
                          : null,
                    ),
                    const SizedBox(height: 24),

                    if (_error != null) ...[
                      _Aviso(texto: _error!, color: colores.error),
                      const SizedBox(height: 16),
                    ],

                    FilledButton(
                      onPressed: _cargando ? null : _entrar,
                      child: _cargando
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                color: Colors.white,
                              ),
                            )
                          : const Text('Iniciar sesión'),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      '¿Sin acceso? Pídele tus credenciales al administrador '
                      'de tu flotilla.',
                      textAlign: TextAlign.center,
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(color: colores.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Logo de FlotaOS con un leve vaivén tipo "conduciendo".
class _LogoFlota extends StatefulWidget {
  const _LogoFlota();

  @override
  State<_LogoFlota> createState() => _LogoFlotaState();
}

class _LogoFlotaState extends State<_LogoFlota>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colores = Theme.of(context).colorScheme;

    return Container(
      width: 84,
      height: 84,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            colores.primary,
            colores.primary.withValues(alpha: 0.75),
          ],
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: colores.primary.withValues(alpha: 0.35),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          final v = _controller.value * 2 * math.pi;
          // Vaivén horizontal suave + pequeño "bote" vertical de marcha.
          final dx = math.sin(v) * 3;
          final dy = -math.sin(v * 2).abs() * 2;
          return Transform.translate(offset: Offset(dx, dy), child: child);
        },
        child: const Icon(
          Icons.local_shipping_rounded,
          color: Colors.white,
          size: 44,
        ),
      ),
    );
  }
}

/// Banda de íconos de transporte que cruzan la pantalla en bucle continuo,
/// con desvanecido en ambos bordes.
class _DesfileTransporte extends StatefulWidget {
  const _DesfileTransporte();

  @override
  State<_DesfileTransporte> createState() => _DesfileTransporteState();
}

class _DesfileTransporteState extends State<_DesfileTransporte>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  static const _iconos = <IconData>[
    Icons.local_shipping_rounded,
    Icons.directions_bus_rounded,
    Icons.flight_rounded,
    Icons.directions_boat_rounded,
    Icons.train_rounded,
    Icons.airport_shuttle_rounded,
    Icons.two_wheeler_rounded,
    Icons.local_shipping_outlined,
  ];

  static const double _itemAncho = 56;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 14),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colores = Theme.of(context).colorScheme;
    final anchoSecuencia = _iconos.length * _itemAncho;

    // Dos secuencias idénticas seguidas: al desplazar una secuencia completa,
    // el contenido vuelve a coincidir y el bucle es imperceptible.
    final fila = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var copia = 0; copia < 2; copia++)
          for (final icono in _iconos)
            SizedBox(
              width: _itemAncho,
              child: Icon(
                icono,
                size: 26,
                color: colores.primary.withValues(alpha: 0.55),
              ),
            ),
      ],
    );

    return SizedBox(
      height: 44,
      width: double.infinity,
      child: ClipRect(
        child: ShaderMask(
          shaderCallback: (rect) => const LinearGradient(
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
            colors: [
              Colors.transparent,
              Colors.white,
              Colors.white,
              Colors.transparent,
            ],
            stops: [0.0, 0.12, 0.88, 1.0],
          ).createShader(rect),
          blendMode: BlendMode.dstIn,
          // El Row es más ancho que la tarjeta; OverflowBox le da ancho
          // ilimitado para que no reporte desbordamiento de layout.
          child: OverflowBox(
            alignment: Alignment.centerLeft,
            maxWidth: double.infinity,
            child: AnimatedBuilder(
              animation: _controller,
              builder: (context, child) {
                return Transform.translate(
                  offset: Offset(-_controller.value * anchoSecuencia, 0),
                  child: child,
                );
              },
              child: fila,
            ),
          ),
        ),
      ),
    );
  }
}

class _Aviso extends StatelessWidget {
  const _Aviso({required this.texto, required this.color});

  final String texto;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(Icons.info_outline, size: 20, color: color),
          const SizedBox(width: 10),
          Expanded(
            child: Text(texto, style: TextStyle(color: color, fontSize: 13.5)),
          ),
        ],
      ),
    );
  }
}
