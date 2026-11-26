import 'package:flutter/cupertino.dart' show CupertinoPageTransitionsBuilder;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// CampusSave design tokens — "Fresh Tech 2026": warm off-white canvas,
/// deep ink text, emerald brand, lime / coral / violet accents, big radii.
class AppColors {
  // Brand
  static const primary   = Color(0xFF0B8A5F); // emerald
  static const primaryDk = Color(0xFF06402D); // deep forest
  static const lime      = Color(0xFFC8F169); // highlight
  static const coral     = Color(0xFFFF6B4A);
  static const violet    = Color(0xFF7B61FF);
  static const sky       = Color(0xFF2EA8FF);
  static const amber     = Color(0xFFFFB020);

  // Neutrals
  static const ink       = Color(0xFF0E1A14);
  static const bg        = Color(0xFFF5F6F1);
  static const surface   = Color(0xFFFFFFFF);
  static const surface2  = Color(0xFFEEF1EA);
  static const line      = Color(0xFFE3E7DE);
  static const text      = ink;
  static const textSub   = Color(0xFF66706A);

  // Semantic
  static const secondary = coral;
  static const accent    = sky;
  static const eco       = Color(0xFF16A34A);
  static const error     = Color(0xFFE5484D);

  // Soft tints for tiles
  static const card1 = Color(0xFFFFF4D6); // amber tint
  static const card2 = Color(0xFFE2F6EC); // emerald tint
  static const card3 = Color(0xFFFFE6DF); // coral tint
  static const card4 = Color(0xFFE1F0FF); // sky tint
  static const card5 = Color(0xFFEDE8FF); // violet tint

  // Legacy aliases kept so older widgets still compile
  static const black      = ink;
  static const green      = eco;
  static const orange     = coral;
  static const teal       = Color(0xFF0FA3A3);
  static const purple     = violet;
  static const blue       = sky;
  static const red        = error;
  static const yellow     = amber;
  static const cardYellow = card1;
  static const cardGreen  = card2;
  static const cardOrange = card3;
  static const cardBlue   = card4;
  static const cream      = bg;

  static const brandGradient = LinearGradient(
    begin: Alignment.topLeft, end: Alignment.bottomRight,
    colors: [Color(0xFF0B8A5F), Color(0xFF06402D)],
  );
}

class AppRadius {
  static const sm = 12.0;
  static const md = 18.0;
  static const lg = 26.0;
  static const xl = 34.0;
}

class AppTheme {
  static ThemeData get light {
    final scheme = ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      brightness: Brightness.light,
    ).copyWith(
      primary: AppColors.primary,
      onPrimary: Colors.white,
      secondary: AppColors.coral,
      surface: AppColors.surface,
      error: AppColors.error,
    );

    final base = GoogleFonts.plusJakartaSansTextTheme();
    final text = base.copyWith(
      displaySmall:   base.displaySmall?.copyWith(fontSize: 34, fontWeight: FontWeight.w800, color: AppColors.ink, letterSpacing: -1.2, height: 1.05),
      headlineLarge:  base.headlineLarge?.copyWith(fontSize: 28, fontWeight: FontWeight.w800, color: AppColors.ink, letterSpacing: -0.8),
      headlineMedium: base.headlineMedium?.copyWith(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.ink, letterSpacing: -0.5),
      headlineSmall:  base.headlineSmall?.copyWith(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.ink, letterSpacing: -0.3),
      titleLarge:     base.titleLarge?.copyWith(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.ink),
      titleMedium:    base.titleMedium?.copyWith(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.ink),
      titleSmall:     base.titleSmall?.copyWith(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.ink),
      bodyLarge:      base.bodyLarge?.copyWith(fontSize: 15, color: AppColors.ink, height: 1.5),
      bodyMedium:     base.bodyMedium?.copyWith(fontSize: 13.5, color: AppColors.ink, height: 1.45),
      bodySmall:      base.bodySmall?.copyWith(fontSize: 12, color: AppColors.textSub),
      labelLarge:     base.labelLarge?.copyWith(fontSize: 14, fontWeight: FontWeight.w700),
    );

    // NOTE: minimumSize must keep a finite width — Size.fromHeight() means
    // "infinite width" and crashes any button placed inside a Row.
    const btnMin = Size(48, 54);
    final btnShape = RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md));

    OutlineInputBorder border(Color c, [double w = 1.2]) => OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        borderSide: BorderSide(color: c, width: w));

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: AppColors.bg,
      textTheme: text,
      splashFactory: InkSparkle.splashFactory,
      appBarTheme: AppBarTheme(
        elevation: 0, scrolledUnderElevation: 0, centerTitle: false,
        backgroundColor: AppColors.bg,
        foregroundColor: AppColors.ink,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: text.headlineSmall,
        iconTheme: const IconThemeData(color: AppColors.ink),
      ),
      cardTheme: CardThemeData(
        elevation: 0, color: AppColors.surface, margin: EdgeInsets.zero,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg)),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: btnMin, elevation: 0,
          backgroundColor: AppColors.ink, foregroundColor: Colors.white,
          textStyle: text.labelLarge, shape: btnShape,
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: btnMin, backgroundColor: AppColors.primary,
          textStyle: text.labelLarge, shape: btnShape,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: btnMin,
          side: const BorderSide(color: AppColors.line, width: 1.4),
          foregroundColor: AppColors.ink,
          textStyle: text.labelLarge, shape: btnShape,
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: AppColors.primary, textStyle: text.labelLarge),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true, fillColor: AppColors.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 17),
        border: border(AppColors.line),
        enabledBorder: border(AppColors.line),
        focusedBorder: border(AppColors.primary, 2),
        errorBorder: border(AppColors.error, 1.5),
        focusedErrorBorder: border(AppColors.error, 2),
        labelStyle: const TextStyle(color: AppColors.textSub),
        hintStyle: const TextStyle(color: AppColors.textSub),
        prefixIconColor: AppColors.textSub,
      ),
      chipTheme: ChipThemeData(
        shape: const StadiumBorder(side: BorderSide(color: AppColors.line)),
        backgroundColor: AppColors.surface,
        selectedColor: AppColors.ink,
        labelStyle: text.labelMedium?.copyWith(fontWeight: FontWeight.w700),
        secondaryLabelStyle: text.labelMedium?.copyWith(fontWeight: FontWeight.w700, color: Colors.white),
        checkmarkColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      ),
      sliderTheme: const SliderThemeData(
        activeTrackColor: AppColors.primary, thumbColor: AppColors.primary,
        inactiveTrackColor: AppColors.line, trackHeight: 4,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: AppColors.surface, surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg)),
        titleTextStyle: text.headlineSmall,
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AppColors.surface, surfaceTintColor: Colors.transparent,
        showDragHandle: true,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xl))),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: AppColors.ink,
        contentTextStyle: text.bodyMedium?.copyWith(color: Colors.white, fontWeight: FontWeight.w600),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
        insetPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      ),
      dividerTheme: const DividerThemeData(color: AppColors.line, thickness: 1, space: 1),
      progressIndicatorTheme: const ProgressIndicatorThemeData(color: AppColors.primary),
      pageTransitionsTheme: const PageTransitionsTheme(builders: {
        TargetPlatform.android: FadeForwardsPageTransitionsBuilder(),
        TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
      }),
    );
  }
}
