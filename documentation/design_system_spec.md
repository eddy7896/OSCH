# OruSchools Design System — Specification & Index

> **Status (2026-10-15):** rewritten after review of `design-system/` and `brand-assets/`. The visual/interaction rules now live in those folders; this file is the **engineering index**: where the truth is, how it maps onto our codebase, and what is still undecided. Findings: `audit_2026-10-15.md` §Design system review (D1–D12).

## 1. Sources of truth (highest wins)

| Layer | File(s) | Owns |
|---|---|---|
| Tokens | `design-system/tokens.json` (canonical) → `design-system/tokens.css` (generated, verified identical) | Every colour (light + dark), type style, spacing, radius, control size, shadow |
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
- **Every colour token has a dark value.** Dark theme is part of the system, not an extra: components must work in both without knowing which is active. (Old spec had no dark theme.) See decision DS-1.
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
| Token delivery | `packages/shared-design-tokens` builds `tokens.json` → CSS variables + Tailwind `@theme` (semantic names only) | Same build → generated Dart (`ThemeExtension` with light/dark, spacing/radius/size consts) in `packages/flutter-core` |
| Components | `packages/shared-ui` implements the 18 component READMEs (React 19, server/client boundaries explicit) | `packages/flutter-core` widgets with the same names, props and wording |
| Fonts | `next/font` **self-hosted** Noto Sans (+ Devanagari, + Arabic-script font for Urdu); Poppins only in `landing-page` | **Bundled as assets** — apps are offline-first and must not fetch fonts at runtime |
| Icons | `lucide-react` (Icon component maps our 38 names → Lucide names) | `lucide_icons_flutter` (maintained). **Not** `lucide_icons` — last published 2023-06, which `design-system/README.md` currently recommends |
| Theming | `data-theme` light/dark; school brand override applied as CSS variables | `ThemeData` + extension; school override via runtime theme |
| White-label | Mode A: override only `primary`, `primary-hover`, `primary-text`, `primary-soft`, `focus` (derived from one chosen colour, **validated ≥ 4.5:1 with white text**, dark variants derived too). Never override status/surface/text tokens | Same + Mode B build pipeline (app name, icon, splash, package identity) |
| Brand assets | Favicon/OG from `brand-assets/Logos` & `Social and docs`; strip SVG `<metadata>` (31% of SVG bytes, C2PA provenance) for shipped bundles | Launcher icons from `app-icon-*-1024.png` (RGB, no alpha — store-safe); Android adaptive: foreground = mark, background = `app-*` colour |

## 7. Internationalisation (newly implied — decision DS-2)
`design-system/README.md` requires text to "survive translation into Hindi and Urdu" with 30% growth room. Consequences not yet reflected elsewhere: Urdu is right-to-left (logical CSS properties, Flutter `Directionality`, mirrored chevrons/arrows incl. "↑ N changes pending"); Noto Sans alone does not contain Devanagari or Arabic-script glyphs (separate script families — verify exact family names on fonts.google.com before bundling); Nastaliq-style Urdu needs more line height than the 18–36px `lineHeight` values above. Currency/number format: content rules hard-code ₹ and Indian grouping — make this the **default locale (`en-IN`)** of a per-school locale setting, not a constant.

## 8. Open design decisions
| ID | Decision | Recommendation | Needed by |
|---|---|---|---|
| DS-1 | Ship dark theme in v1? | Build tokens/themes with both from day one (cheap); gate QA on light first, dark before launch | Phase 0 (token build) |
| DS-2 | Languages in scope (Hindi, Urdu implied; Kashmiri/others?) and RTL | Confirm list; plan RTL from Phase 1 shared-ui, not retrofit | Before Phase 1 UI |
| DS-3 | Canonical home of tokens: `documentation/design-system/tokens.json` vs `packages/shared-design-tokens` | Keep design-owned file as source; package *builds from it* (no second copy); drift check guards generated outputs | Phase 0 |
| DS-4 | Sentence vs Title Case | README rule says sentence case; several component READMEs show Title Case ("Take Attendance"). Adopt sentence case, fix examples when design owner next edits | Phase 1 |
