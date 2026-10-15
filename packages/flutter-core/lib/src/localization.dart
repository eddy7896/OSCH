import 'dart:math' as math;

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'locales.g.dart';
import 'l10n/oru_strings.dart';
import 'theme.dart';
import 'tokens.g.dart';

export 'l10n/oru_strings.dart';

/// Makes Flutter's own Material/Widgets/Cupertino strings available for every OruSchools language.
///
/// Flutter has no localizations for Kashmiri, Dogri or Sindhi, and a MaterialApp configured with such a locale and only
/// the stock delegates fails to load. Each of those languages names a [OruLocale.flutterFallback] (Kashmiri and Sindhi
/// borrow Urdu, Dogri borrows Hindi); if even that is unavailable in a given library (Cupertino covers fewer languages)
/// we use English. The OruSchools strings themselves (OruStrings) are separate and fall back to English per key.
class _FlutterStringsDelegate<T> extends LocalizationsDelegate<T> {
  const _FlutterStringsDelegate(this._inner);

  final LocalizationsDelegate<T> _inner;

  @override
  bool isSupported(Locale locale) => OruLocales.isSupported(locale);

  @override
  Future<T> load(Locale locale) {
    final fallback = Locale(OruLocales.of(locale).flutterFallback);
    return _inner.load(_inner.isSupported(fallback) ? fallback : const Locale('en'));
  }

  @override
  bool shouldReload(covariant _FlutterStringsDelegate<T> old) => false;
}

/// Pass to `MaterialApp.localizationsDelegates`.
const List<LocalizationsDelegate<dynamic>> oruLocalizationsDelegates = <LocalizationsDelegate<dynamic>>[
  OruStrings.delegate,
  _FlutterStringsDelegate<MaterialLocalizations>(GlobalMaterialLocalizations.delegate),
  _FlutterStringsDelegate<WidgetsLocalizations>(GlobalWidgetsLocalizations.delegate),
  _FlutterStringsDelegate<CupertinoLocalizations>(GlobalCupertinoLocalizations.delegate),
];

/// Pass to `MaterialApp.supportedLocales`. English first (primary language).
List<Locale> get oruSupportedLocales => OruLocales.supportedLocales;

/// English is the primary language and changing language is an explicit choice (ADR-0006): the device language is NOT
/// adopted automatically. An explicitly requested, supported locale is honoured; anything else resolves to English.
Locale oruLocaleResolution(Locale? requested, Iterable<Locale> supported) {
  if (requested != null && OruLocales.isSupported(requested)) return Locale(requested.languageCode);
  return const Locale(OruLocales.defaultCode);
}

/// Pass to `MaterialApp.builder`: applies the language's authoritative text direction (Flutter's own list lacks
/// Kashmiri) and rebuilds the theme with the language's font and line-height needs.
TransitionBuilder oruAppBuilder({OruDensity density = OruDensity.touch}) {
  return (BuildContext context, Widget? child) {
    final locale = Localizations.localeOf(context);
    return Directionality(
      textDirection: OruLocales.textDirectionOf(locale),
      child: Theme(
        data: OruTheme.light(density: density, locale: locale),
        child: child ?? const SizedBox.shrink(),
      ),
    );
  };
}

extension OruLocaleTypography on OruLocale {
  /// The design-system text style adapted to this language: primary font family for the script (the rest of the bundled
  /// families stay as glyph fallbacks), at least [minLineHeight] so tall scripts (Nastaliq, Telugu, ...) are not clipped,
  /// and no letter-spacing.
  TextStyle localize(TextStyle style) {
    if (minLineHeight == 0 && fontFamily == OruFonts.sans) return style;
    final chain = <String>[fontFamily, ...OruFontFamilies.all.where((f) => f != fontFamily)];
    // `package` must be passed again: Flutter prefixes it onto fontFamily AND every fontFamilyFallback entry, but only
    // for the values given in THIS call. Without it the fallback fonts would not resolve to the bundled package fonts.
    return style.copyWith(
      fontFamily: chain.first,
      fontFamilyFallback: chain.sublist(1),
      package: OruFonts.package,
      height: math.max(style.height ?? 1.0, minLineHeight),
      // The design's negative tracking on `display` is for Latin. On joined or conjunct scripts (Arabic-script, Nastaliq,
      // Indic) any tracking breaks letter joining/ligatures and clips glyphs, so it is reset to zero.
      letterSpacing: 0,
    );
  }
}
