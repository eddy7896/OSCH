# Hallucination Checks & Strict Constraints

This document outlines strict constraints and "ground truths" about the OruSchools platform. It acts as a reference for AI agents to prevent hallucinations or the introduction of incorrect architectural patterns.

## 1. Architectural Truths
- **Is the project a standard monolithic web app?**
  **NO.** It is a Two-Pillar architecture. The Web ERP (Next.js) is distinct from the Mobile Ecosystem (Flutter apps).
- **Does the mobile app make direct synchronous API calls that block the UI?**
  **NO.** Mobile apps MUST follow an offline-first architecture with optimistic UI updates and a background sync queue.
- **Are Teachers and Parents using the exact same app?**
  **NO.** They use completely separate Flutter apps (Teacher Hub vs Parent Portal) optimized for their specific tasks and security scopes.

## 2. Technology Stack Constraints
- **Frontend (Web):** Next.js / React (TypeScript). Do not suggest Vue, Angular, or standard CRA.
- **Frontend (Mobile):** Flutter (Dart). Do not suggest React Native or Swift/Kotlin native.
- **Backend (API):** NestJS (Node.js). Do not suggest Python FastAPI, Django, or raw Express without a framework, despite any earlier outdated references.
- **Database:** PostgreSQL via **Firebase Data Connect**. Do not suggest MongoDB, Prisma, TypeORM, or direct SQL connections without using the Firebase Data Connect generated SDKs.
- **Monorepo:** Turborepo for JS/TS, Melos for Dart.

## 3. Fact-Checking Guidelines for Agents
Before implementing a feature, agents MUST verify:
- **Offline Compatibility:** Does this mobile feature work if the device is in Airplane mode?
- **Data Model:** Is this schema compatible with Firebase Data Connect (defined in `.gql` files, utilizing strong typing)?
- **RBAC Boundaries:** Does this API route restrict access based on the strict Role-Based Access Control matrix (e.g., Academic Admins cannot touch Finance)?

## 4. Design System Truths
- **Primary colour?** Oru Indigo **600** `#4F46E5` via the `primary` token. Not 500 (`#6366F1`, fails text contrast), not 900 (marketing grounds only).
- **Fonts?** Noto Sans for product; Poppins only for the logo and marketing headlines. Never Inter/Roboto/Geist (the stock Next scaffold uses Geist — replace it).
- **Raw colours in code?** Never. Semantic tokens only. App colours (`app-*`) are for icons/store art, never UI.
- **Flutter icon package?** `lucide_icons_flutter`. `lucide_icons` is stale (2023) even though `design-system/README.md` still names it.
- **How many primary buttons per screen?** Exactly one. Minimum tap target 48px (Driver 64px); minimum text 13px; no emoji in product UI.
- **Is `components/bundle.js` production code?** No — a prototype using `window.React`/`window.Oru`. Implement from the component READMEs.
- **Can a school recolour attendance statuses or surfaces?** No. Mode A may override only `primary`, `primary-hover`, `primary-text`, `primary-soft`, `focus` (≥4.5:1 with white text). Schools may rename status *labels* only.
- **Is there a dark mode?** Not in v1 (ADR-0005). `tokens.json` retains dark values for the future, but nothing builds or ships them; never add `prefers-color-scheme: dark`, `data-theme="dark"`, `darkTheme` or `ThemeMode`.
- **How is money stored?** Integer minor units in `Int64` fields named `*Minor` (ADR-0004). Never `Float`.
- **Where do permissions live?** `packages/rbac` (deny by default; Principal read-only except `approve`; SUPER_ADMIN has no tenant-data access).
- **How do I change a colour/size/type token?** Edit `documentation/design-system/tokens.json` (design-owned), run `npm run tokens:build`; never hand-edit generated files.
- **Glyphs `↑ ✓ ↻`?** Not in Noto Sans: use the Icon component, not text characters.

## 5. Languages and Roles Truths
- **Primary language?** English. Others are an explicit choice (URL on web, explicit locale in Flutter); never `Accept-Language` or device language.
- **Right-to-left languages supported?** Urdu, Kashmiri, Sindhi, Pashto, Persian, Arabic. Regional LTR: Hindi, Bengali, Assamese, Marathi, Dogri, Gujarati, Punjabi, Odia, Tamil, Telugu, Kannada, Malayalam.
- **Which translations are complete and reviewed?** Hindi and Urdu are complete **drafts**; **none are reviewed** yet. Everything else shows English per missing key.
- **How do I add or change a string?** Edit `packages/i18n/messages/en.json` (and `_descriptions.json`), run `npm run i18n:build`. Never edit ARB files or other generated outputs. Plural branches use `{count}`, not `#`.
- **Physical left/right in layout code?** Never: `ms-`/`me-`/`text-start`, `EdgeInsetsDirectional`, `AlignmentDirectional`, `TextAlign.start`.
- **Does Flutter support Kashmiri/Dogri/Sindhi?** No Material/Widgets/Cupertino localizations; `oruLocalizationsDelegates` supplies fallbacks and `OruLocales.textDirectionOf` is the authority for direction.
- **May I translate the brand tagline "Schools. People. Progress."?** No, not without brand approval.
- **How many school roles and who grants them?** 14 roles (incl. HR_MANAGER, ACCOUNTANT, ADMISSIONS_OFFICER, TRANSPORT_MANAGER, OPERATIONS_MANAGER, MANAGEMENT). Only SYSTEM_ADMIN can grant or change roles; only PRINCIPAL approves anything (HR cannot approve leave).

## 6. Phase 1 Gateway Truths (verified 2026-10-15; see `phase1_plan.md` §3)
- **How does the gateway call Data Connect?** Through `firebase-admin` (13.x): `getDataConnect({location, serviceId, connector})` then `executeQuery(name, vars)` / `executeMutation(name, vars)`, ideally via the CLI-generated **Admin** Node SDK (`generate.adminNodeSdk`), not the browser-flavoured client SDK. Without impersonation these run as admin and ignore auth directives, so `NO_ACCESS` operations stay gateway-only.
- **Emulator env vars for the Admin SDK?** `DATA_CONNECT_EMULATOR_HOST` (host:port, no scheme) and `FIREBASE_AUTH_EMULATOR_HOST`. (The CLI's own variable is `FIREBASE_DATA_CONNECT_EMULATOR_HOST`; `emulators:exec` sets it with a scheme the CLI double-prefixes.)
- **Does the Auth emulator need Java?** No (only emulators whose binary is `java`, such as Firestore, do). Data Connect uses its own binary.
- **Node version?** 22 (the Nest CLI's schematics dependency declares `^22.22.3`; several Phase 1 libraries need 22). Node 20 is not supported for Phase 1 work.
- **Which libraries are NOT usable with Nest 12 / TypeScript 6?** `nestjs-zod` (peers Nest 10/11) and `openapi-typescript` (peer TypeScript 5). Validation = class-validator; client = `@hey-api/openapi-ts`.
- **Where does web auth live?** Browser Firebase SDK plus a Bearer token to the gateway (ADR-0009, proposed); never a cookie read in a root layout (`cacheComponents`).
- **Does the gateway trust a `schoolId` in the request body?** Never. The school comes from `X-School-Id`, validated against an ACTIVE membership of a non-suspended school.
- **A workflow file that GitHub rejects runs no jobs.** `check:drift` parses every workflow; a broken one fails the build (the first two Phase 0 pushes failed this way).

## 7. Automated Enforcement
These truths are not just prose; they are checked by machines (see `eval_plan.md`):
- `npm run i18n:check` / `npm run i18n:build`: language sources validated and generated files (ARB, Dart, TS, CSS, font loaders, pubspec fonts block) verified.
- `npm run check:drift` also validates the GitHub Actions workflows (parse; referenced npm scripts, turbo tasks and files exist), and — paths cited in docs exist (or are declared planned), banned deps absent, Data Connect ops are `NO_ACCESS` and tenant-scoped, secrets are ignored, stale/contradictory terms flagged, pinned vs installed versions compared, `tokens.css` identical to `tokens.json`, brand guideline mirror identical, raw hex colours in app/package source flagged, generated i18n files current, physical left/right in web and Flutter source rejected, hard-coded UI strings in app shells rejected.
- `npm run eval` — drift check + invariant evals in `evals/` (incl. WCAG contrast of every token pair in both themes: `evals/design-tokens.test.mjs`).
- `npm run eval:agent -- answers.json` — grades an agent against `evals/hallucination-golden.json` (includes "trap" questions about things that don't exist yet).
- Cadence: every PR, weekly CI cron, monthly golden-set run.

When an agent is caught hallucinating, add a golden item and, if mechanical, a drift rule.
