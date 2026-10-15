# flutter_core

Shared Flutter foundation for the four OruSchools apps. **Phase 0**: tokens, theme, fonts. The 18 design-system widgets arrive in Phase 4.

| Piece | Where |
|---|---|
| Design tokens `OruColors`, `OruSpacing`, `OruRadius`, `OruSize`, `OruShadows`, `OruText` | `lib/src/tokens.g.dart` (**generated** from `documentation/design-system/tokens.json`; run `npm run tokens:build`, never edit by hand) |
| `OruTheme.light({OruDensity density})`: Material 3 theme from tokens; `touch` = 48px controls, `driver` = 64px | `lib/src/theme.dart` |
| Fonts: one Noto family per script (12), bundled, **never fetched** | `assets/fonts/` (built by `tools/assets/make-flutter-fonts.py` from `packages/i18n/locales.json`; SIL OFL licences and glyph-coverage report `provenance.json` included) |
| Languages: `OruLocales` (registry, direction, fallbacks), `OruStrings` (messages), `oruLocalizationsDelegates`, `oruAppBuilder`, `OruLocaleTypography.localize` | `lib/src/locales.g.dart` (generated), `lib/src/localization.dart`, `lib/src/l10n/` (gen-l10n output), `lib/l10n/*.arb` (generated) |

Light theme only (ADR-0005). Languages (ADR-0006): English primary plus 18 more, six of them right-to-left. The language registry, ARB catalogs and `OruLocales` are **generated** from `packages/i18n` (`npm run i18n:build`); fonts for every script are bundled (12 families, 4.44 MiB). The glyphs `↑ ✓ ↻` are not in Noto Sans: use icons, not text characters.

```dart
MaterialApp(
  locale: const Locale('ur'),                      // explicit choice; English is the default
  localizationsDelegates: oruLocalizationsDelegates,
  supportedLocales: oruSupportedLocales,
  theme: OruTheme.light(),                         // Driver: OruTheme.light(density: OruDensity.driver)
  builder: oruAppBuilder(),                        // RTL direction + per-script fonts and line heights
  home: ...,
);
Text('Good morning, Ayesha', style: OruText.display);
```
Tests: `melos run test` (tokens, WCAG contrast, theme/density, font assets present and valid).
