# OruSchools

Multi-tenant school ERP: a Next.js web ERP, four offline-first Flutter apps (Teacher, Staff, Parent, Driver) and a NestJS API gateway in front of Firebase Data Connect (PostgreSQL). Start with `CLAUDE.md` (rules), `documentation/implementation_plan.md` (what to build) and `documentation/decisions/` (what was decided).

## Layout
| Path | What |
|---|---|
| `apps/api-gateway` | NestJS 12 API (port 3000). The only thing that talks to the database |
| `apps/web-admin` · `saas-admin` · `landing-page` | Next.js 16 (ports 3002 · 3001 · 3003) |
| `apps/mobile-{teacher,staff,parent,driver}` | Flutter apps (`com.oruschools.<role>`) |
| `packages/rbac` | 14 roles and the tested permission matrix |
| `packages/i18n` | 19 languages (English primary, 6 RTL): registry, ICU catalogs, generates ARB/Dart/TS/CSS/font loaders |
| `packages/shared-design-tokens` | Builds design tokens → CSS / Tailwind / TS / Dart |
| `packages/flutter-core` | Dart tokens, light theme, bundled fonts (components: Phase 4) |
| `packages/{shared-ui,api-client,database}` | Placeholders for Phases 1-2 |
| `dataconnect/` | Schema + `erp-connector` operations (all `NO_ACCESS`, school-scoped) |
| `documentation/` | Architecture, ADRs, design system, brand assets, plans |
| `evals/` · `tools/` | Spec evals, drift check, asset scripts, emulator tests |

## Prerequisites
Node 22 recommended (≥ 20.9 works; Nest CLI 12 declares ≥ 22.22) · npm 10 · Flutter 3.47+ (Dart 3.13+) · Dart pub global tools: `dart pub global activate melos` and `flutter_launcher_icons` (add `~/.pub-cache/bin` to `PATH`). Firebase CLI is a local dev dependency (`npx firebase`). **Java is not required**: the Data Connect emulator uses PGlite.

## Everyday commands
```bash
npm install && flutter pub get         # JS workspaces + Dart pub workspace
npm run build | lint | typecheck | test  # Turborepo (all JS/TS packages and apps)
melos run analyze && melos run test      # all Flutter projects
npm run check:drift                      # docs/config/schema vs repo (periodic hallucination check)
npm run eval                             # drift check + spec evals
npm run tokens:build | tokens:check      # design tokens
npm run i18n:build | i18n:check          # languages: edit packages/i18n, regenerate (also runs flutter gen-l10n)
npm run test:dataconnect                 # database-level tenant-isolation tests (starts the emulator)
npx firebase dataconnect:compile         # compile schema + regenerate the gateway SDK
```
Environment variables: `documentation/environment.md` (secrets only in the gateway; never in mobile builds).
