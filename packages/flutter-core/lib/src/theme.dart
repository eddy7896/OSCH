import 'package:flutter/material.dart';

import 'localization.dart';
import 'locales.g.dart';
import 'tokens.g.dart';

/// Control density per app (design system "Screen density"): Teacher, Staff and Parent use [touch];
/// the Driver app uses [driver] during an active route.
enum OruDensity {
  touch(OruSize.controlTouch),
  driver(OruSize.controlDriver);

  const OruDensity(this.controlHeight);
  final double controlHeight;
}

/// The OruSchools theme. Light only (decision DS-1: no dark mode in v1) and built exclusively from generated tokens.
abstract final class OruTheme {
  /// [locale] adapts fonts and line heights to the language's script (see [OruLocaleTypography.localize]); omit for English.
  static ThemeData light({OruDensity density = OruDensity.touch, Locale? locale}) {
    final oru = locale == null ? null : OruLocales.of(locale);
    TextStyle l(TextStyle s) => oru?.localize(s) ?? s;

    const scheme = ColorScheme(
      brightness: Brightness.light,
      primary: OruColors.primary,
      onPrimary: OruColors.onPrimary,
      secondary: OruColors.primarySoft,
      onSecondary: OruColors.primaryText,
      error: OruColors.dangerSolid,
      onError: OruColors.onPrimary,
      surface: OruColors.surface,
      onSurface: OruColors.text,
      onSurfaceVariant: OruColors.textMuted,
      outline: OruColors.borderStrong,
      outlineVariant: OruColors.border,
      surfaceContainerLowest: OruColors.bg,
      surfaceContainerHighest: OruColors.surfaceMuted,
    );

    final textTheme = TextTheme(
      headlineMedium: l(OruText.display),
      titleLarge: l(OruText.title),
      titleMedium: l(OruText.heading),
      titleSmall: l(OruText.subheading),
      bodyLarge: l(OruText.bodyLg),
      bodyMedium: l(OruText.body),
      bodySmall: l(OruText.caption),
      labelLarge: l(OruText.label),
      labelMedium: l(OruText.label),
      labelSmall: l(OruText.caption),
    ).apply(bodyColor: OruColors.text, displayColor: OruColors.text);

    final minSize = Size(0, density.controlHeight);
    final rounded = RoundedRectangleBorder(borderRadius: BorderRadius.circular(OruRadius.md));

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: OruColors.bg,
      textTheme: textTheme,
      fontFamily: oru?.fontFamily ?? OruFonts.sans,
      package: OruFonts.package,
      dividerColor: OruColors.border,
      focusColor: OruColors.focus,
      splashFactory: InkRipple.splashFactory,
      appBarTheme: AppBarTheme(
        backgroundColor: OruColors.surface,
        foregroundColor: OruColors.text,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleTextStyle: l(OruText.title).copyWith(color: OruColors.text),
      ),
      cardTheme: CardThemeData(
        color: OruColors.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(OruRadius.lg),
          side: const BorderSide(color: OruColors.border),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: minSize,
          shape: rounded,
          textStyle: l(OruText.label),
          backgroundColor: OruColors.primary,
          foregroundColor: OruColors.onPrimary,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: minSize,
          shape: rounded,
          textStyle: l(OruText.label),
          foregroundColor: OruColors.primaryText,
          side: const BorderSide(color: OruColors.borderStrong),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          minimumSize: minSize,
          shape: rounded,
          textStyle: l(OruText.label),
          foregroundColor: OruColors.primaryText,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: OruColors.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: OruSpacing.space4, vertical: OruSpacing.space3),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(OruRadius.md),
          borderSide: const BorderSide(color: OruColors.borderStrong),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(OruRadius.md),
          borderSide: const BorderSide(color: OruColors.focus, width: 2),
        ),
        labelStyle: l(OruText.label).copyWith(color: OruColors.text),
        hintStyle: l(OruText.bodyLg).copyWith(color: OruColors.textMuted),
      ),
      materialTapTargetSize: MaterialTapTargetSize.padded,
    );
  }
}
