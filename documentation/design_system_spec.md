# OruSchools Design System — Specification & Index

> **Status (2026-10-15):** rewritten after review of `design-system/` and `brand-assets/`. The visual/interaction rules now live in those folders; this file is the **engineering index**: where the truth is, how it maps onto our codebase, and what is still undecided. Findings: `audit_2026-10-15.md` §Design system review (D1–D12).

## 1. Sources of truth (highest wins)

| Layer | File(s) | Owns |
|---|---|---|
| Tokens | `design-system/tokens.json` (canonical) → `design-system/tokens.css` (generated, verified identical) | Every colour (light built; dark values retained but not built, ADR-0005), type style, spacing, radius, control size, shadow |
| Rules | `design-system/README.md` | Principles, content voice, colour roles, type, density, layout patterns, motion, icons |
| Components | `design-system/components/<Name>/README.md` + `index.d.ts` + `previews/*.png` | Props contract and usage rules for 18 components. **The READMEs are the spec; `bundle.js` is a throwaway prototype** (global `window.React`, `window.Oru` namespace) and must not be shipped |
| Brand | `brand-assets/Brand-guidelines.md` (canonical; `design-system/Brand.md` is a mirror and a drift check enforces they are identical) + logo/icon/co-branding/social assets | Logo, brand colour use, voice, app icons, co-branding, imagery |
| Architecture of UX | `DesignDoc.md` (v0.2 brainstorm, historical), §1/§4/§5 below | Product architecture, per-app mental models, navigation structure |

Where an older document disagrees with `design-system/`, `design-system/` wins. Known old-doc errors are corrected below.

## 2. Product architecture (unchanged)

Five interfaces sharing one language: **Web ERP** (Next.js) and **Staff, Teacher, Parent, Driver** (Flutter). Plus two web surfaces that are not "products" in the design brief but share tokens: `saas-admin` (SaaS owner) and `landing-page` (marketing — the only place Poppins headlines are used). Apps look like a family, not clones: shared colour meaning, type, icons, radii, buttons, forms, status pills, sync language; different navigation, density and home layout.

## 3. Tokens

- **One brand colour: Oru Indigo 600 `#4F46E5` = `primary`.** *(Old spec called 500 `#6366F1` "Primary" — wrong: 500 is the reference hue, 4.47:1 on white, never used for text or buttons.)* Indigo 900 is reserved for marketing/illustration grounds, not headers (old spec said headers).
- **Use semantic tokens only** (`primary`, `text`, `surface`, `success-fg/-bg`…). Never raw `indigo-*` steps and never a hex literal in product code.
- **Every colour token has a dark value in `tokens.json`, but v1 ships light only** (ADR-0005 / DS-1): dark values are not generated and no app has a dark theme. Components still read semantic tokens only, so adding dark later is a token-build change.
- **Contrast is a tested property**, not a promise: all text pairs ≥ 4.5:1, controls/focus/charts ≥ 3:1, in both themes (`evals/design-tokens.test.mjs`).
- **App colours** (`app-erp|teacher|staff|parent|driver`) are for app icons and store art only — never inside product UI.
- **Status tones** are pairs (`-fg` text/icon on `-bg` fill); `*-solid` only for large actions (driver tiles, main submit, destructive confirm).

### Density (control heights)
| Level | Token | Height | Used by |
|---|---|---|---|
| ERP Compact | `control-compact` | 36px | grids, ledgers, student lists |
| ERP Comfortable | `control-comfortable` | 40px | dashboards, settings, forms |
| Mobile Touch | `control-touch` | 48px | Teacher, Staff, Parent (minimum tap target) |
| Driver Safety | `control-driver` | 64px | Driver app in an active route (band 56–72; tiles ≥112px high) |

One density per screen. Minimum text 13px (`caption`); there is deliberately no third grey.

### Type
- **Product:** Noto Sans (+ script companions, see §6). **Logo and marketing headlines only:** Poppins (Bold headlines, Medium sub-heads). No other families. Styles: `display 28/36`, `title 22/30`, `heading 18/26`, `subheading 16/24`, `body-lg 16/24` (mobile default), `body 14/22` (ERP default), `label 14/20`, `caption 13/18`, `stat 28/34`, `stat-sm 20/26`, `action-xl 20/26` (tabular figures for numbers).

### Sync status (shared by all mobile apps)
Six states with **fixed wording**: `synced` "Synced" · `saved` "Saved on device" · `pending` "↑ N changes pending" · `syncing` "Syncing…" · `offline` "You're offline" · `failed` "Sync failed — Retry". Tones: success, warning, warning, info, neutral, danger. The sync engine (ADR-0003) must expose exactly these states.

### Attendance statuses
Seven semantic keys with **fixed colours**: `present`(success) `absent`(danger) `late`(warning) `leave`(info) `medical`(purple) `halfday`(teal) `excused`(neutral). Schools may rename the **label** only, never remap colour or add new semantic colours. (Old spec listed five and said "configurable"; the data model needs a fixed `statusKey` enum + per-school `label`.)

## 4. Per-app UX mental models (unchanged)
Web ERP `Information → Insight → Module` · Teacher `Schedule → Task → Completion` · Staff `Today → Responsibility → Completion` · Parent `Child → Information → Action` · Driver `Route → Student → Safety`. Navigation: Teacher `Today | Classes | Messages | More`; Staff `Home | Attendance | Tasks | More`; Parent `Home | Academics | Messages | Payments | More`; Driver `Today | Routes | More` (bottom nav hidden in Active Route Mode). ERP `SideNav` sections: Overview, Academics, People, HR, Finance, Communication, Transport, Operations, Reports, Administration — **built from the user's permissions; unavailable modules are omitted, never disabled**.

## 5. Component inventory (18)
Icon, Button, ActionTile, TextField, Checkbox, SegmentedControl, StatusPill, Badge, SyncStatus, Banner, Card (+LinkAction), StatCard, ListRow, Avatar, BottomNav, SideNav, EmptyState, Logo. Props contract: `design-system/components/index.d.ts`. Rules worth memorising: **one `primary` Button per screen**, verb labels; whole row is the tap target; icon always paired with a word (icon-only only for back/close/search with `aria-label`); max 1 Banner per screen; no switch component (use Checkbox); no emoji in product UI.

## 6. Implementation mapping (what we must build — tracked in `implementation_plan.md`)

| Concern | Web (Next.js 16 / Tailwind v4) | Flutter |
|---|---|---|
| Token delivery | `packages/shared-design-tokens` builds `tokens.json` → CSS variables + Tailwind `@theme` (semantic names only) | Same build → generated Dart (light-only `OruColors`/`OruText`/… consts + `OruTheme.light()`) in `packages/flutter-core` |
| Components | `packages/shared-ui` implements the 18 component READMEs (React 19, server/client boundaries explicit) | `packages/flutter-core` widgets with the same names, props and wording |
| Fonts | `next/font` **self-hosted**, one Noto family per script, lazy; Poppins only in `landing-page` (generated `fonts.ts`) | **Bundled as assets** (12 families, 4.44 MiB): apps are offline-first and must not fetch fonts at runtime |
| Icons | `lucide-react` (Icon component maps our 38 names → Lucide names) | `lucide_icons_flutter` (maintained). **Not** `lucide_icons` — last published 2023-06, which `design-system/README.md` currently recommends |
| Theming | Light only (ADR-0005). School brand override applied as CSS variables | `OruTheme.light()` (`OruDensity.touch`/`driver`); school override via runtime theme |
| White-label | Mode A: override only `primary`, `primary-hover`, `primary-text`, `primary-soft`, `focus` (derived from one chosen colour, **validated ≥ 4.5:1 with white text**, hover/soft/text/focus derived from it). Never override status/surface/text tokens | Same + Mode B build pipeline (app name, icon, splash, package identity) |
| Brand assets | Favicon/OG from `brand-assets/Logos` & `Social and docs`; strip SVG `<metadata>` (31% of SVG bytes, C2PA provenance) for shipped bundles | Launcher icons from `app-icon-*-1024.png` (RGB, no alpha — store-safe); Android adaptive: foreground = mark, background = `app-*` colour |

## 7. Languages and right-to-left (ADR-0006, resolves DS-2)
English is primary; Urdu, Kashmiri, Sindhi, Pashto, Persian and Arabic (right-to-left) and Hindi, Bengali, Assamese, Marathi, Dogri, Gujarati, Punjabi, Odia, Tamil, Telugu, Kannada and Malayalam are supported (19 languages, `packages/i18n/locales.json`). Hindi and Urdu have complete **draft** catalogs; no translation is reviewed yet. The language is in the URL on the web (`/ur`), explicit in Flutter, and never auto-detected. Consequences for design and code: logical properties only (no `ml-4`, `text-left`, `EdgeInsets.only(left:)`; `check:drift` enforces), directional icons mirror, `lang`/`dir` on `<html>`, per-script minimum line heights (Nastaliq 2.0), `↑ ✓ ↻` never as text, Latin digits for numbers in v1, the brand tagline is not translated. Fonts and sizes: 4.44 MiB per Flutter app (Nastaliq 1.89 MiB; switchable to Naskh). Full detail and verification record: `decisions/ADR-0006-languages.md`.

## 8. Open design decisions
| ID | Decision | Recommendation | Needed by |
|---|---|---|---|
| DS-1 | Ship dark theme in v1? | **Resolved (ADR-0005): NO dark mode in v1.** Dark values stay in `tokens.json` but are not built or shipped; drift check fails on dark styles | done |
| DS-2 | Languages in scope and RTL | **Resolved (ADR-0006):** English primary; 19 languages incl. 6 RTL; Hindi and Urdu complete drafts; translations need native review before release | done |
| DS-3 | Canonical home of tokens | **Resolved (ADR-0005):** `documentation/design-system/tokens.json` is the only source; `packages/shared-design-tokens` builds from it; `tokens:check` guards generated outputs | done |
| DS-4 | Sentence vs Title Case | **Resolved (ADR-0005): sentence case.** Title Case examples in component READMEs are errors there; fix when the design owner next edits | done |
