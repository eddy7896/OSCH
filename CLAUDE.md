# OruSchools — Agent & Developer Guide

Multi-tenant school ERP (SaaS). **Two pillars**: Next.js web ERP (system of record) + Flutter mobile apps (offline-first, system of engagement). All business logic lives in a NestJS API gateway; Firebase Data Connect (PostgreSQL) is reached **only** by the gateway via Admin SDK.

## Read order (source of truth, highest wins)
1. `documentation/decisions/ADR-*.md` — accepted decisions override everything below
2. `documentation/guardrails.md`, `documentation/hallucination_checks.md`
3. `documentation/system_architecture.md`, `documentation/OruSchools SSOT.md`
4. UI work: `documentation/design-system/` (`README.md` rules, `tokens.json`, `components/*/README.md`) and `documentation/brand-assets/Brand-guidelines.md`; engineering index in `documentation/design_system_spec.md`
5. `documentation/project_plan.md` (what to build next), `documentation/eval_plan.md` (how "done" is proven)
6. Code. If code and docs disagree, **stop and flag it** — do not silently pick one.

## Current reality (verify with `npm run check:drift`; update when it changes)
| Exists | Planned (do not assume it exists) |
|---|---|
| **Built in Phase 0:** `packages/rbac` (14 roles, tested matrix), `packages/i18n` (19 languages incl. 6 RTL; Hindi/Urdu draft catalogs; generates ARB/Dart/TS/CSS/font loaders), `packages/shared-design-tokens` (tokens → CSS/Tailwind/TS/Dart, light only), `packages/flutter-core` (tokens, `OruTheme.light`, bundled fonts), hardened `dataconnect/` schema + `erp-connector` (tenancy and role-enum checks on the emulator: `npm run test:dataconnect`), 3 Next apps and 4 Flutter apps as **themed shells with no features**, `apps/api-gateway` (Nest 12: validated config, helmet, CORS, request-id logging, throttling, `/health`, `AuthGuard` (deny by default, `@Public()`), `TenantGuard` (`X-School-Id` + membership; `@UserScoped()`, `@Platform()`), `PermissionGuard` + `@Permission` (the app refuses to boot if any route lacks an access decision), audit trail (`@Audit`/`@NoAudit` required on every write route, security events stored), strict validation (every `@Body`/`@Query` is a DTO; unknown fields are a 400), per-IP and per-user rate limits, committed `openapi.json`, error envelope, `GET /v1/me`, platform schools (`/v1/platform/schools`), memberships (`/v1/memberships`), invitations (`/v1/invitations`), staff/driver accounts (`/v1/memberships/accounts`, ADR-0011), the public school lookup (`/v1/public/schools/by-subdomain/:sub`), logo upload addresses for R2 (`/v1/uploads/school-logo`), school profile and branding (`/v1/school`), class levels, classes, subjects and academic years (`/v1/academics`), students with enrolment ids, class placement, guardian contacts, photo and documents in a private bucket (`/v1/students`), staff records (`/v1/staff`), admission applications and admitting (`/v1/admissions`), CSV import with a dry run (`/v1/imports`), fee structures, instalments, concessions, invoices, payments, numbered receipts with PDF, and ageing (`/v1/fees`), payroll with Principal approval and payslips (`/v1/payroll`), finance and payroll reports with CSV and PDF export (`/v1/reports`); the web apps are next), env templates, CI. `packages/database` (generated Admin SDK + `DatabaseModule` + error mapping; the gateway's only data path). `packages/api-client` (generated typed client + transport, `createApi`). `packages/shared-ui` (React, all 18 design-system components in batches B1-B4; `@oruschools/shared-ui/styles.css`, used by both web apps). `packages/format` (money, date and time: bigint minor units, Indian grouping, rounding, splitting; Dart twin `OruFormat` in `flutter-core`, both tested against `packages/format/vectors.json`). `packages/web-auth` (Firebase sign-in for the Next apps: port, session provider, sign-in screen, error mapping). `apps/saas-admin`: owner sign-in (email, Google, phone code), school list/create/edit/suspend, add a school's first System Admin, language choice (device cookie, account, school default). `apps/web-admin`: the school shell (school from the address, sign-in, navigation from `/me`), the dashboard key numbers, the financial reports, students, classes, admissions, staff and payroll screens. | Flutter widgets, every web-admin screen beyond the shell, dashboard, financial reports, students, classes, admissions, staff and payroll, the sync engine, school feature modules beyond students and staff (reports, attendance, ...), staging deploy |

## Commands
- `npm run check:drift` — docs/config/schema vs repo (the periodic hallucination check; must have 0 errors)
- `npm run eval` — spec & invariant evals (`evals/`), plus drift check
- `npm run eval:agent -- answers.json` — grade an AI agent's answers to the golden hallucination set
- `npm run i18n:build | i18n:check` — languages: edit `packages/i18n/locales.json` / `messages/*.json`, never the generated ARB/Dart/TS/CSS/`fonts.ts`/pubspec font block
- `npm run tokens:build | tokens:check` — design tokens (never hand-edit `*/generated/*` or `tokens.g.dart`)
- `npm run test:dataconnect` — database-level tenant-isolation tests on the emulator (needs network once to download the emulator)
- `npm run test:gateway` — the gateway against the REAL Auth and Data Connect emulators: real tokens, and the cross-tenant / RBAC route matrix generated from every registered route (a new route is covered automatically); `ORU_SHARD=2/4 npm run test:gateway` runs one shard (CI runs four in parallel and `node tools/tests/gateway-shards.mjs verify <dir> 4` proves every file ran once)
- `node tools/bootstrap-super-admin.mjs --email <e> --project <id> [--apply|--revoke]` — the only way to create/remove the platform owner (SUPER_ADMIN); dry run by default; see documentation/environment.md
- `npm run generate -w @oruschools/api-client` — regenerate the typed client after `openapi.json` changes (`npm test` fails if it is stale); web code calls the gateway only through `createApi`
- `node tools/prove-receipt-numbers.mjs --project <id> --apply` — proves on a REAL database that concurrent payments get unique, gap-free receipt numbers (dry run by default; `--emulator` for the local logic check)
- `npm run test:database` — `packages/database` (generated Admin SDK, error mapping) against the emulator
- `npm run openapi:generate -w api-gateway` — regenerate `apps/api-gateway/openapi.json` after changing a route or DTO (`npm test` fails if it is stale)
- `npm run build | lint | typecheck | test` — Turborepo (JS/TS). Dart: `melos run analyze|test` (Melos 8 reads its config from the root `pubspec.yaml` pub workspace; run `flutter pub get` once; put `~/.pub-cache/bin` on PATH or use `dart run melos`)
- Next.js here is v16 with breaking changes: read `node_modules/next/dist/docs/` before writing Next code (see `apps/*/AGENTS.md`).

## Non-negotiable rules
1. **Tenant isolation**: `schoolId` comes from the verified JWT/membership, never the request body. Every Data Connect operation takes `$schoolId` and filters by it. Operations use `@auth(level: NO_ACCESS)`; never `PUBLIC`.
2. **RBAC**: enforced in the gateway on every route (deny by default). UI hiding is cosmetic only. Matrix lives in `packages/rbac` (single source) once created.
3. **No client → DB**. Web and mobile talk to the gateway only.
4. **Mobile is offline-first**: local DB is the UI's source of truth, writes go through a sync queue, no blocking spinners (except auth/payments).
5. **Money is never `Float`**: integer minor units in `Int64` `*Minor` fields (ADR-0004). **No dark mode in v1** (ADR-0005): never add dark-theme code or styles.
6. **Stack is fixed**: Next.js/React/TS, Flutter/Dart, NestJS, Data Connect (Postgres), Turborepo + Melos. Do not introduce Prisma, TypeORM, Mongo, React Native, Vue, Angular, FastAPI, Auth0.
7. **UI/design**: semantic design tokens only (never hex, never raw `indigo-*`); one `primary` button per screen; icon always with a word; nothing under 13px text or 48px tap target (64px Driver); no emoji in product UI; Noto Sans for product, Poppins only for logo/marketing headlines; app colours (`app-*`) only on icons/store art; light theme only (no dark mode, ADR-0005); Flutter fonts bundled, never fetched, and web fonts are committed WOFF2 files loaded with `next/font/local` (never `next/font/google`: the drift rule `web-fonts-local` fails); never render `↑ ✓ ↻` as text (not in Noto Sans), use icons. Don't edit `design-system/` files — propose changes to the design owner.
8. **Languages (ADR-0006)**: English is primary; language is an explicit choice, never auto-detected. Every user-visible string comes from `packages/i18n/messages` (no `Text('literal')`, no hard-coded copy); logical directions only (`ms-`/`me-`/`text-start`, `EdgeInsetsDirectional`, ...); never mark a translation `reviewed` without a native-speaker review; never translate the brand tagline; `↑ ✓ ↻` are icons, not text.
9. **Roles (ADR-0007)**: 14 roles in `packages/rbac`; only the Principal approves; only System Admin grants roles; silos hold. Add a role in `ROLES`, the Data Connect `SchoolRole` enum and the matrix together (evals enforce).
10. **Secrets**: never commit `.env*` (only `.env.example`), never paste credentials into docs, logs, or prompts.

## Branching (ADR-0010)
Work on `feat|fix|chore/<app>/<topic>` → PR into `app/<app>` → `staging` → `main` (production). Touch only your app's files on an app branch; shared code (`packages/`, `dataconnect/`, `tools/`, `evals/`, `documentation/`, `.github/`) goes through `app/shared`. Never push to `main` or `staging` directly.

## Anti-hallucination protocol (applies to every agent session)
- **Verify before asserting**: before citing a file, function, package version, API, CLI flag or Data Connect directive, open/grep/run it. If you can't verify, say "unverified" — don't fill the gap.
- **Don't invent paths**: only reference paths that exist or are listed as planned in `tools/checks/drift-config.json`.
- **Library APIs**: check installed version in `node_modules` / `pubspec.lock` and its docs (Next 16, NestJS, Data Connect directives change). Training-data memory is not evidence.
- **Cite evidence in PRs/summaries**: command run + result. "Should work" is not a result.
- **Flag, don't smooth over, doc conflicts**; propose an ADR.
- **Scope**: touch only the module in scope (see `documentation/agent_contexts.md`). Cross-cutting changes need an ADR.

## Definition of done (every change)
1. `npm run check:drift` → 0 errors, no new warnings.
2. Relevant evals from `documentation/eval_plan.md` added/updated and passing.
3. Tenant-isolation and RBAC tests exist for any new endpoint/operation.
4. Docs updated: `documentation/live_documents.md` status, ADR if a decision changed.
5. Summary states what was *run* and what was *not* verified.

## Cadence
- Every PR + weekly (CI cron): `check:drift` and `eval`.
- Monthly: re-run golden hallucination set against the current agent setup; review `warn` findings; prune stale docs.
- After each phase gate in `project_plan.md`: update "Current reality" above.
