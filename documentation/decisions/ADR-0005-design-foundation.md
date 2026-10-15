# ADR-0005: Design foundation (v1)

- **Status:** Accepted (2026-10-15, on the instruction to implement Phase 0; resolves DS-1, DS-3, DS-4 in `design_system_spec.md`)

## Decisions
1. **Light theme only (DS-1).** There is **no dark mode in v1**. The dark values remain in `documentation/design-system/tokens.json` (design-owned, untouched) but are **not built** into any output, and no app ships a dark theme, `darkTheme`, `ThemeMode`, `data-theme="dark"` or `prefers-color-scheme: dark` rules. `check:drift` fails on dark-mode styles. Revisit by superseding this ADR.
2. **One token source (DS-3).** `documentation/design-system/tokens.json` is the only source. `packages/shared-design-tokens` *builds from it* (CSS variables, Tailwind v4 `@theme inline`, a TS module, and `packages/flutter-core/lib/src/tokens.g.dart`). Generated files are committed and verified by `npm run tokens:check` (also part of `check:drift`). Never edit generated files.
3. **Semantic tokens only in product code.** The Tailwind theme resets the default palette/radius/shadow/text scales, so `bg-red-500`, `rounded-3xl` or `text-sm` do not exist (spacing is not restricted: stay on the design steps 1-6, 8, 12); raw `indigo-*` steps and `app-*` icon colours are not exposed. Utility names follow the token names (`bg-surface`, `text-text-muted`, `text-title`, `rounded-lg`, `shadow-card`).
4. **Fonts are bundled/self-hosted.** Web: `next/font` (Noto Sans + Noto Sans Devanagari; Poppins only in `landing-page`). Flutter: Noto Sans and Noto Sans Devanagari at weights 400/600/700, instanced and subset from upstream variable fonts by `tools/assets/make-flutter-fonts.py` (Latin 59 KB/weight, from 2 MB) and shipped in `packages/flutter-core/assets/fonts` with their OFL licences. Fonts are never fetched at runtime.
5. **Sentence case (DS-4).** UI copy is sentence case, as the design system README states. Title Case examples in a few component READMEs are treated as errors in those examples.
6. **Languages (DS-2) were decided separately in ADR-0006:** English primary, 19 languages including Urdu, Kashmiri and other RTL languages, with fonts for every script (this ADR's font paragraph above was written when only Latin and Devanagari were bundled).

## Consequences
- Components in `packages/shared-ui` and `flutter-core` (Phases 1 and 4) implement the 18 component READMEs in light mode only, halving visual QA for v1.
- `↑`, `✓` and `↻` are **not in Noto Sans** (checked against the bundled subset); never render them as text glyphs. Use the `Icon` component (e.g. Lucide `arrow-up`, `check`, `refresh-cw`) beside the words.
- Launcher icons are generated from `documentation/brand-assets` by `tools/assets/make-launcher-assets.mjs` plus the globally installed `flutter_launcher_icons` (it conflicts with Melos's `cli_util` constraint inside the pub workspace, so it is not a workspace dependency).
