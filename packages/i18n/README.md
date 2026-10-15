# @oruschools/i18n

Languages for the whole platform (ADR-0006). **English is primary**; 18 more are supported, six of them right-to-left. Single source of truth: `locales.json` (languages, scripts, fonts, direction, line-height minimums) and `messages/*.json` (ICU catalogs). Everything else is generated.

| Tier | Languages |
|---|---|
| primary | English |
| ready (complete **draft** catalog, fonts and direction verified; **not reviewed**) | Hindi, Urdu |
| supported (fonts and direction; UI shows English per missing key) | RTL: Kashmiri, Sindhi, Pashto, Persian, Arabic. LTR: Bengali, Assamese, Marathi, Dogri, Gujarati, Punjabi, Odia, Tamil, Telugu, Kannada, Malayalam |

## Workflow
1. Add or change a string in `messages/en.json` and give it a translator description in `messages/_descriptions.json`. Plural branches use `{count}`, not `#`.
2. Add translations in `messages/<code>.json` (same keys, same placeholders; the validator checks). Never mark a language `reviewed` in `messages/status.json` without a native-speaker review.
3. `npm run i18n:build` regenerates: `src/*.generated.ts`, `generated/i18n.css`, `packages/flutter-core` ARB files + `locales.g.dart` + pubspec font block (then runs `flutter gen-l10n`), and `apps/*/src/app/fonts.ts`. `npm run i18n:check` (also in `check:drift` and CI) fails if anything is stale.
4. New language: add its entry to `locales.json` (sample text included; the font build verifies glyph coverage), run `python3 tools/assets/make-flutter-fonts.py` if it needs a new script, then step 3.

## API (TypeScript)
```ts
import { negotiateLocale, getMessages, directionOf, isRtl, LOCALES } from "@oruschools/i18n";
negotiateLocale({ cookie: "ur", schoolDefault: "hi" }); // explicit choice > school default > "en"; Accept-Language is NOT consulted
getMessages("ks");     // English overlaid with Kashmiri (currently identical: per-key fallback)
directionOf("ks");     // "rtl"
```

## Rules
Logical directions only (no `ml-4`, `text-left`, `EdgeInsets.only(left:)`); no hard-coded UI strings; the brand tagline is not translated; `↑ ✓ ↻` are icons, not text; Latin digits for numbers in v1.
