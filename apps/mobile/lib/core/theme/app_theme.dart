import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Tema de FlotaOS Conductor — Material 3, limpio y de alto contraste
/// (pensado para usarse al sol, dentro de la cabina).
abstract final class AppTheme {
  static const Color _semilla = Color(0xFF1B4DD8); // azul FlotaOS

  static ThemeData get light {
    final esquema = ColorScheme.fromSeed(seedColor: _semilla);
    final base = ThemeData(colorScheme: esquema, useMaterial3: true);

    return base.copyWith(
      textTheme: GoogleFonts.manropeTextTheme(base.textTheme),
      scaffoldBackgroundColor: const Color(0xFFF6F7FB),
      appBarTheme: AppBarTheme(
        backgroundColor: const Color(0xFFF6F7FB),
        foregroundColor: esquema.onSurface,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.manrope(
          fontSize: 20,
          fontWeight: FontWeight.w800,
          color: esquema.onSurface,
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: Colors.black.withValues(alpha: 0.06)),
        ),
        margin: EdgeInsets.zero,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: GoogleFonts.manrope(
            fontSize: 16,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.black.withValues(alpha: 0.1)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.black.withValues(alpha: 0.1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: esquema.primary, width: 2),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }
}
