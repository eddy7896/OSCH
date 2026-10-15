# @oruschools/shared-design-tokens

Builds `documentation/design-system/tokens.json` (design-owned; do not edit here) into code. **Light theme only** (ADR-0005).

| Output | Use |
|---|---|
| `generated/tokens.css` | CSS variables on `:root` (`--primary`, `--surface`, `--space-4`, `--radius-lg`, `--control-touch`, …) |
| `generated/theme.css` | Tailwind v4 `@theme inline`: resets the default **colour, radius, shadow and text-size** scales so only design tokens exist for those; adds tabular figures to `text-stat`/`text-stat-sm`. **Spacing is not restricted** (Tailwind's 4 px step equals the design scale but other steps remain available) |
| `generated/tokens.js` / `.d.ts` | Resolved values for code that cannot read CSS (charts, tests) |
| `../flutter-core/lib/src/tokens.g.dart` | `OruColors`, `OruSpacing`, `OruRadius`, `OruSize`, `OruShadows`, `OruText` |

## Use in a Next.js app
```css
/* globals.css */
@import "tailwindcss";
@import "@oruschools/shared-design-tokens/tokens.css";
@import "@oruschools/shared-design-tokens/theme.css";
```
```html
<section class="rounded-lg border border-border bg-surface p-4 shadow-card">
  <h1 class="text-title">Grade 10 A</h1>
  <p class="text-body text-text-muted">…</p>   <!-- colour `text-muted` => utility `text-text-muted` -->
</section>
```
Spacing uses Tailwind's 4 px step, identical to the design scale (`p-4` = `space-4`); stick to the design steps 1, 2, 3, 4, 5, 6, 8, 12. Control heights are variables: `h-(--control-touch)`.
Not exposed on purpose: raw `indigo-*`, `app-*` colours, dark values.

## Commands
- `npm run tokens:build` regenerate (writes generated files incl. the Dart file)
- `npm run tokens:check` fail if generated files are stale (also run by `check:drift` and CI)
- `npm test -w @oruschools/shared-design-tokens`
