# OruSchools — Phase-wise Implementation Plan

Companion to `phased_implementation_roadmap.md` (order), `project_plan.md` (gates) and `eval_plan.md` (evidence). This file is the task-level breakdown. Built on the 2026-10-15 audit; assumes ADR-0001/2/3 are accepted (if not, Phase 0 starts there).

**Sizing:** S ≈ ≤2 days, M ≈ 3–7 days, L ≈ 1–3 weeks, for one engineer. Calendar time depends on team size, which isn't recorded anywhere — treat sizes as relative, and re-estimate at each phase start.
**Rule:** within a phase, write the eval first (`eval_plan.md`), implement, then run `npm run eval`. A phase closes only when its gate passes.

## Dependency map
```
P0 Foundation ─► P1 Gateway + SaaS ─► P2 ERP core + Finance ─► P3 Academic engine ─┐
                         │                                                          ├─► P4 Teacher/Staff mobile ─► P5 Parent/Driver ─► P6 Landing + Launch
                         └─ sync API & notifications start here (P3/P4) ◄───────────┘
```
Critical path: **RBAC + tenant guard (P0–P1) → data model for people/classes (P2) → timetable & attendance model (P3) → sync engine (P4)**. The offline sync engine is the highest-risk item; start its spec (`modules/offline-sync.md`) during P3.

---

## Phase 0 — Foundation (hardening what exists)
**Goal:** a safe, reproducible base that agents and humans can't drift away from.

| ID | Task | Size | Notes |
|---|---|---|---|
| P0-1 | Root git repo; remove 3 nested `.git` (owner decision, F10); first commit; branch protection + CI | S | CI file already exists |
| P0-2 | Accept/modify ADR-0001/2/3; fix stale terms in docs (drift check lists them); align roadmap paths to `apps/mobile-*` | S | |
| P0-3 | Install tooling: `firebase-tools`, Java (emulator; not installed on this machine), `flutter doctor` clean; document in README. (Melos already configured via root pub workspace) | S | |
| P0-4 | ~~Resolve version drift (F8)~~ done during scaffolding: clean reinstall, pins now match installed | S | |
| P0-5 | **Schema hardening** (F4–F6, F11): `schoolId` on Invoice/all tenant tables; money → integer minor units; `createdAt` → Timestamp; role set covering Principal, Bursar, Academic Admin, System Admin, Teacher, Driver, Staff, Parent; `AuditLog` table; regenerate SDK; run emulator | M | Flip the 3 `todo` evals to required |
| P0-6 | `packages/rbac`: roles × modules × actions as data + `can()`; resolve "Principal read-only" vs "approves leave" with an explicit `leave:approve` permission | M | Single source for gateway, web, Flutter codegen |
| P0-7 | Shared tooling: base tsconfig/eslint/prettier packages, Vitest everywhere (gateway scaffold already uses Vitest + oxlint), real `test` scripts in packages so `turbo test` means something | S | |
| P0-8 | **Design token pipeline** (tokens already designed: `documentation/design-system/tokens.json`, 60+ tokens; dark values exist but are **not built**, ADR-0005). `packages/shared-design-tokens` *builds from that file* (no second copy; DS-3) → CSS variables + Tailwind v4 `@theme` + generated Dart `ThemeExtension` in `flutter-core`; add `tokens:check` to CI so outputs never drift | M | Resolve `{alias}` refs; semantic names only |
| P0-8a | Fonts: self-host Noto Sans (+ Devanagari + an Arabic-script family for Urdu — verify names) via `next/font`; Poppins only in landing-page; **bundle fonts as Flutter assets** (offline). Replace stock Geist in the 3 Next apps | S | D1, D2 |
| P0-8b | Brand asset pipeline: copy favicon/OG/logos into apps; strip SVG `<metadata>` for shipped bundles; Flutter launcher icons from `app-icon-*-1024.png` (+ Android adaptive fg/bg layers) | S | D10 |
| P0-8c | Decide DS-1 (dark theme), DS-2 (languages/RTL), DS-4 (sentence case) in an ADR before Phase 1 UI | S | spec §8. Done: DS-1/3/4 in ADR-0005, DS-2 in ADR-0006 |
| P0-9 | `.env.example` per app, env validation approach, secrets policy; rotate R2 keys if exposed | S | |

**Gate:** drift 0 errors; 3 todo evals now required & green; RBAC matrix tests green; CI green; emulator starts with schema.

### Phase 0 status (2026-10-15): implemented; 4 owner items open
| ID | Status | Evidence / what remains |
|---|---|---|
| P0-1 | Done | Root repo created by the owner; nested `.git` (3 apps + `brand-assets/Logos`) backed up and untracked; `.gitignore` fixed; noise untracked. **Changes are uncommitted** |
| P0-2 | Done | ADR-0001/2/3 accepted (by instruction to implement Phase 0), ADR-0004/0005 added; stale terms removed from docs (drift: 0 stale tech terms) |
| P0-3 | Done | `firebase-tools` local; Java **not needed** (PGlite emulator verified); Melos via root pub workspace; README. `flutter doctor`: Android toolchain + Xcode **not set up on this machine** |
| P0-4 | Done | clean reinstall, pins match installed |
| P0-5 | Done | Enums, `Int64` `*Minor` money, `Timestamp`, `Invoice.school`, `AuditLog`, `School.currency/locale`, DB-enforced school checks; SDK regenerated; 22 emulator checks |
| P0-6 | Done | `packages/rbac` matrix and tests. The 11 v1 assumed grants were **confirmed by the owner 2026-10-15**; only the grants added with the extended roles (P0-10) await confirmation |
| P0-7 | Done | `tsconfig.base.json`, Vitest everywhere, oxlint, prettier, turbo `typecheck`; real tests so `turbo test` is meaningful |
| P0-8 | Done | Token pipeline: CSS, Tailwind v4 theme, TS, Dart; light only; `tokens:check` |
| P0-8a | Done | Web: `next/font` Noto Sans (+Devanagari), Poppins landing only; Flutter: bundled subset fonts (59 KB/weight Latin). Fonts for all 19 languages now bundled: see P0-11 |
| P0-8b | Done | favicon/apple icon/OG in Next apps (metadata stripped); launcher icons + adaptive layers + display names + `com.oruschools.<role>` for 4 apps. iOS: the Teacher app is verified on the iOS 27 simulator (identity, icon files, theme); Android and the other three iOS apps are not yet built |
| P0-8c | Done | ADR-0005 (no dark mode, one token source, sentence case); DS-2 resolved in ADR-0006 |
| P0-9 | Partly | Env templates, `environment.md`, validation approach, drift rules done. **Owner action: rotate the R2 keys if `.env.local` ever left this machine**; the root `.env.local` is not read by any app (see `environment.md`) |

| P0-10 | Done | 14 roles incl. HR Manager, Accountant, Admissions Officer, Transport Manager, Operations Manager, Management; multi-scope grants, self-service baseline, `memberships` escalation guard (ADR-0007); `packages/rbac` 46 tests (8 rule-breaking mutations all caught); DB enum verified (63 emulator checks) |
| P0-11 | Done | 19 languages (English primary; 6 RTL; Hindi and Urdu complete drafts) in `packages/i18n`: registry, ICU catalogs, generated ARB/Dart/TS/CSS/font loaders; 12 bundled font families (4.28 MiB/app, glyph coverage verified per language); Flutter fallback delegates for Kashmiri/Dogri/Sindhi; web `[locale]` routing with `lang`/`dir`; drift rules (RTL-physical, hard-coded strings); 40 `packages/i18n` tests, 47 `flutter-core` tests, 16 app tests (4 per Flutter app), 13 i18n evals and 6 RTL-detector evals (ADR-0006) |

**Owner decisions still open:** (1) confirm the *new* RBAC assumptions (`packages/rbac/README.md`); (2) arrange native-speaker review of the Hindi and Urdu drafts (release gate P6-9) and decide whether Urdu/Kashmiri use Nastaliq (1.87 MiB) or Naskh; (3) commit/push the Phase 0 work; (4) verify CI on GitHub. Next: Phase 1.

---

## Phase 1 — API Gateway & SaaS Foundation
> **The detailed plan is `phase1_plan.md`** (verified facts, new/changed tasks P1-0a…P1-16, API surface, evals, risks, owner questions). The table below is the original outline; where they differ, `phase1_plan.md` wins.
**Goal:** a school can be provisioned and a user can authenticate into exactly one tenant context — with isolation proven.

**Gateway (`apps/api-gateway`, NestJS)**
| ID | Task | Size |
|---|---|---|
| P1-1 | Scaffold Nest app in the workspace; config module with validated env; health endpoint; structured logging; request IDs | S |
| P1-2 | Firebase Admin module + Data Connect Admin wrapper (typed, injected); verify `NO_ACCESS` ops callable via Admin SDK in emulator | M |
| P1-3 | `AuthGuard` (verify ID token) → `TenantContext` (active school from explicit header/subdomain, validated against `SchoolMember`) → `PermissionGuard` using `packages/rbac`, **deny by default** | L |
| P1-4 | `AuditInterceptor`: every mutation writes `AuditLog` (actor, school, action, entity, before/after ids) | M |
| P1-5 | Validation + error model, rate limiting, CORS, OpenAPI generation, API versioning (`/v1`) | M |
| P1-6 | Modules: `schools` (SUPER_ADMIN CRUD, subscription state, suspended schools blocked at guard), `users`, `memberships`, `invitations` (invite staff by email/phone → role) | L |
| P1-7 | Cross-tenant test harness: fixture with 2 schools × all roles, reusable by every later phase | M |

**Frontends**
| ID | Task | Size |
|---|---|---|
| P1-8 | `packages/api-client`: typed client generated from OpenAPI, token injection, error mapping | M |
| P1-9 | `apps/saas-admin`: login, school list/create/edit, subscription status, owner bootstrap | L |
| P1-10 | `apps/web-admin` shell: auth, school switcher, `SideNav` built from permissions (omit, never disable; 10 sections per DesignDoc §7), page layout (greeting + ≤5 `StatCard`s + two-column cards), `EmptyState`; light theme only (ADR-0005) | L |
| P1-11 | `packages/shared-ui`: implement the **18 components** from `design-system/components/*/README.md` + `index.d.ts` (Icon, Button, ActionTile, TextField, Checkbox, SegmentedControl, StatusPill, Badge, SyncStatus, Banner, Card, StatCard, ListRow, Avatar, BottomNav, SideNav, EmptyState, Logo); density prop; RTL-safe (logical properties, mirrored directional icons; `check:drift` rejects physical left/right); Storybook/preview page compared against `previews/*.png` in light mode only (ADR-0005); a11y: 2px focus ring, 13px minimum, icon+word rule. **Do not ship `bundle.js`** (prototype). Add ERP data table + modal + toast (not in the design set yet — design first) | XL |

**Infra**
| ID | Task | Size |
|---|---|---|
| P1-12 | Dockerfiles, Nginx reverse proxy, staging VPS, env/secret handling, deploy script/CI, subdomain routing (`School.subDomain`) | L |
| P1-13 | R2 presigned-upload endpoint (tenant-prefixed keys, type/size limits) | S |
| P1-14 | **Language picker + persistence**: user preference (profile) and school default language (`School.locale` already stores formatting locale; add `defaultLanguage`), picker in saas-admin/web-admin (links to `/ur/...`), gateway returns the user's language; localized API error codes (messages client-side) | M |
| P1-15 | Translation workflow: export/import catalogs for translators (ARB/JSON), CI check that new English keys have descriptions (already enforced), glossary for domain terms (attendance statuses, fee terms) agreed with reviewers | M |

**Gate:** E-TEN-* on every endpoint (A can't read/write B; body `schoolId` ignored); E-RBAC for SUPER_ADMIN vs members; E-AUD-1; suspended school denied; staging deploy reachable; drift clean.

---

## Phase 2 — School ERP Core & Finance
**Goal:** a school can be configured, populated and billed.

**Schema additions:** Grade/Section, Department, StaffProfile, GuardianContact, Admission(Application), FeeStructure, FeeItem, Concession, Payment, Receipt, SalaryStructure, PayrollRun, LedgerEntry, Document.

| ID | Task | Size |
|---|---|---|
| P2-1 | School configuration: academic years (one active), grades/sections, classrooms, subjects, school profile & **branding (Mode A)**: logo upload, one chosen primary colour validated ≥4.5:1 with white text, derived `primary-hover/-text/-soft/focus` preview before save; school locale (default `en-IN`) | M |
| P2-2 | Students: CRUD, search/filters/pagination, enrolment IDs, class assignment, guardian linking (`ParentGuardian`), photo/docs via R2 | L |
| P2-3 | Admissions workflow: application → review → admit → auto-create student/guardian invites | M |
| P2-4 | Staff: profiles, departments, role assignment via memberships, onboarding invites, documents | L |
| P2-5 | Bulk CSV import (students, staff, guardians) with dry-run validation report | M |
| P2-6 | **Money & format library** (integer minor units, rounding, currency, per-school locale; default ₹ with Indian grouping ₹1,82,40,000; dates `Tue, 24 Jun`, times `8:45 AM`) shared by gateway/web/Flutter | S |
| P2-7 | Finance: fee structures per grade, scheduled invoice generation, concessions, manual payment recording, receipts (PDF), outstanding/aging | XL (L+M) |
| P2-8 | Payroll basics: salary structures, monthly run (draft → approve → paid), payslips; deduction hook reserved for P3 | L |
| P2-9 | Ledger & reports: collections, dues, payroll summary; export CSV/PDF | M |
| P2-10 | Web ERP screens for all above; dashboard "Information → Insight → Module" (e.g. fees collected %) | XL |
| P2-11 | Role-scoped UI: Finance Admin sees no academics/attendance and vice versa; gateway returns 403, UI hides | M |

**Gate:** E-RBAC full matrix (Finance ↔ Academic isolation) automated; E-FIN-* (no floats, rounding, invoice totals, receipts sum to payments, idempotent invoice generation); E-TEN-* extended to new endpoints; import dry-run never writes; seed data for a demo school.

---

## Phase 3 — Academic Engine
**Goal:** the system knows who teaches what, when — and handles absence correctly.

**Schema additions:** Period/TimeSlot, TimetableEntry (replaces/extends `ClassSchedule`), TeacherSubject, Attendance (student & staff), AttendanceStatusConfig, AssessmentPeriod, GradingScale, Assessment, Mark, LeaveType, LeaveBalance, Substitution, Notification, DeviceToken.

| ID | Task | Size |
|---|---|---|
| P3-1 | Timetable model + editor: periods, per-class/teacher views, hard conflict checks (teacher, room, class double-booking) | L |
| P3-2 | Timetable auto-generation (constraint solver, start with greedy + backtracking; manual override always wins) | L |
| P3-3 | Attendance server model + APIs (student: **fixed 7-value `statusKey`** present/absent/late/leave/medical/halfday/excused with school-editable *label only* — colours never remapped; exception-based bulk submit; staff: check-in/out), per-class daily lock, correction audit | L |
| P3-4 | Exams & grading: grading scales, assessment periods, assessments per class/subject, mark entry APIs, report-card generation | L |
| P3-5 | Leave: types, balances, request → **Principal approval** → status; no bypass path | M |
| P3-6 | Substitution matrix: on approved leave, find free qualified teachers per affected slot, rank, assign, notify | L |
| P3-7 | Payroll link: unpaid leave → deduction in payroll run; **both** alerts fire (guardrail §4) | M |
| P3-8 | Notification service: FCM push + in-app inbox, templates, per-user preferences; SMS fallback interface (provider later) | L |
| P3-9 | Sync API foundations (server side): change feed with cursors per entity, idempotent mutation endpoint accepting client UUIDs, tombstones | L |
| P3-10 | Write `modules/offline-sync.md` (conflict rules per entity) and fill other module docs as built | M |
| P3-11 | Web screens: timetable, attendance review, exams, gradebook view, leave approvals, substitution board | XL |

**Gate:** E-ACAD-* (no double-booking; substitute is free and qualified; unpaid leave → payroll deduction + substitution alert; approval can't be skipped); attendance conflict-resolution unit tests; sync API replay-idempotency tests; push delivered to emulator device.

---

## Phase 4 — Teacher & Staff Mobile (offline-first)
**Goal:** staff do their daily work with no connectivity and never lose data.

| ID | Task | Size |
|---|---|---|
| P4-1 | `packages/flutter-core`: theme from generated tokens (light only), density (`touch` 48 / `driver` 64), the 18 component widgets with identical names/props/wording (`SyncStatus`, `StatusPill`, `ListRow`, `BottomNav`, `ActionTile`…), `lucide_icons_flutter` + name map, bundled fonts, `Directionality`/RTL, auth, API client, error handling | XL |
| P4-2 | **Sync engine** in flutter-core: Drift DB, outbox table (UUID idempotency key, deviceId, baseVersion), connectivity watcher, backoff, partial-failure handling, pull via cursors, migrations; exposes exactly the 6 design states (`synced`, `saved`, `pending`, `syncing`, `offline`, `failed`) driving `SyncStatus` with fixed wording | XL |
| P4-3 | Auth on device: Firebase login, secure token storage, school selection, biometric/lock option, session expiry offline-safe | M |
| P4-4 | `apps/mobile-teacher`: **Today** home (next class, to-dos), exception-based attendance ("Mark all present" → toggle exceptions), gradebook fast entry with drafts, classes, leave requests & substitute status | XL |
| P4-5 | `apps/mobile-staff`: Home/Attendance/Tasks/More; geo-fenced check-in/out (permission flows, spoof/mock-location handling policy), leave, announcements | L |
| P4-6 | Push registration & handling; notification inbox offline-cached | M |
| P4-7 | Real-world testing: 2G throttling, airplane mode, low-end Android, app kill mid-sync, clock skew | L |
| P4-8 | Release pipeline: flavors, signing, Fastlane/CI, Crashlytics, TestFlight/internal track; per-app launcher icons & lockups from `brand-assets`; white-label Mode A (school logo on `surface-brand` tile + validated colour override, "Powered by OruSchools" visible on splash/login) | L |

**Gate:** E-SYNC-* (offline attendance syncs once; replay idempotent; two-device conflict deterministic; queue survives kill; failure of one item doesn't block queue); `melos run analyze|test` green; every screen usable with no spinner on core flows; 48px touch targets verified.

---

## Phase 5 — Parent & Transport Ecosystem
**Goal:** parents see their child's day and pay fees; buses are tracked.

**Schema additions:** Vehicle, Route, Stop, StudentRouteAssignment, Trip, TripEvent, LocationPing, Conversation, Message, OfficeHours, Announcement, PaymentIntent, PaymentWebhookEvent.

| ID | Task | Size |
|---|---|---|
| P5-1 | **Decide by ADR:** payment gateway (Razorpay vs Stripe) and messaging backend (resolve F7 — gateway-mediated vs Firestore) | S |
| P5-2 | Payments: create intent → provider checkout → signed webhook → idempotent receipt/ledger update; refunds; reconciliation job | XL |
| P5-3 | Messaging: 1:1 teacher↔parent with **Office Hours enforced server-side**, class broadcasts, moderated groups, attachments, full audit trail visible to System Admin | XL |
| P5-4 | Transport in ERP: vehicles, routes, stops, student assignment, driver assignment, manifests | L |
| P5-5 | Location pipeline: driver pings (adaptive interval, batching, battery-aware), ingest endpoint with tenant check, retention policy, ETA | L |
| P5-6 | `apps/mobile-parent`: Home ("How is my child today?"), academics, attendance, fees & receipts, messages, transport map, calendar, multi-child switching | XL |
| P5-7 | `apps/mobile-driver`: Today/Routes/More, **Active Route Mode** (56–72px targets, few actions), boarding/drop-off, emergency action, offline trip log with later sync | XL |
| P5-8 | Announcements & broadcast push with SMS fallback provider integration | M |
| P5-9 | Parent privacy: only linked children visible; guardian verification flow | M |

**Gate:** E-MSG-* (office hours, audit completeness); webhook replay/forgery tests; parent can't access an unlinked student (E-TEN/E-RBAC); driver UI target-size check; location ingest rate limits; payments tested in provider sandbox.

---

## Phase 6 — Landing, Hardening & Launch
| ID | Task | Size |
|---|---|---|
| P6-1 | `apps/landing-page`: marketing pages, features, pricing tiers, signup → saas-admin onboarding; SEO, analytics | L |
| P6-2 | Security review (`/security-review`), external pen-test, dependency audit, secrets scan, OWASP pass on gateway | L |
| P6-3 | Performance: load test gateway & sync at realistic school sizes; query/index review; caching where measured | L |
| P6-4 | Reliability: backups & restore drill, monitoring/alerting, error tracking, uptime checks, runbooks, staging→prod promotion | L |
| P6-5 | Compliance & privacy: student/minor data policy, retention/deletion, consent, ToS/privacy policy | M |
| P6-6 | White-label Mode B (app name, icon, splash, package identity per school; OruSchools logo removed, plain-text "Powered by OruSchools" on About) feasibility & build pipeline | L |
| P6-7 | App store submissions (iOS/Android ×4 apps), store assets | M |
| P6-9 | **Native-speaker review** of Hindi and Urdu (then flip `reviewed` in `messages/status.json`), visual tuning of per-script line heights with native readers, decide Nastaliq vs Naskh; translate further languages on demand | L |
| P6-8 | Pilot with one school: onboarding checklist, training material, feedback loop, bug triage | L |

**Gate:** no High findings open; restore drill passed; load targets met; pilot school live for a full term cycle without data-loss incidents.

---

## Cross-cutting tracks (every phase)
- **Testing:** unit + integration (Data Connect emulator) + cross-tenant suite; Flutter widget & sync tests; critical-path e2e (Playwright for web).
- **Security:** deny-by-default, least privilege, dependency scanning in CI, quarterly secret rotation.
- **Observability:** request IDs through web → gateway → DB; audit log is a product feature, not just a log.
- **Docs:** update `live_documents.md` and module docs at each task; ADR for every cross-cutting change.
- **Hallucination control:** drift check per PR, weekly cron, monthly golden-set run; refresh "Current reality" in CLAUDE.md at each gate.
- **Accessibility & localisation:** the design system now requires Hindi and Urdu translation headroom (30% longer strings, no text in images) and defines a11y rules (13px minimum, 4.5:1/3:1 contrast, 2px focus ring, icon+word, reduced-motion). Urdu implies RTL + an Arabic-script font — see `design_system_spec.md` §7 and decision DS-2; confirm the language list before Phase 1 UI.

## Open decisions and when they block
| Decision | Needed by | Where |
|---|---|---|
| ADR-0001/2/3 acceptance | Phase 0 | `decisions/` |
| Remove nested `.git`, root repo | Phase 0 | audit F10 |
| ~~Languages & RTL — DS-2~~ | Resolved: ADR-0006 (native review of drafts is gate P6-9) | done |
| ~~Dark theme in v1? — DS-1~~ | Resolved: no (ADR-0005) | done |
| Payment provider (Razorpay vs Stripe) | Start of Phase 5 | new ADR |
| Messaging backend (F7) | Start of Phase 5 | new ADR |
| SMS provider | Phase 3–5 | new ADR |
| Hosting details (VPS size, Redis need — only appears in one diagram) | Phase 1 | new ADR |
| Team size / target dates | Now | re-estimate sizes |

## Top risks
1. **Tenant leakage** from a missed `schoolId` filter → mitigated by guard architecture, cross-tenant harness, drift rules (E-TEN).
2. **Sync correctness** (duplicates, lost writes, conflicts) → spec before code, dedicated E-SYNC suite, early real-device testing.
3. **Scope breadth** (10+ modules, 6 apps) → strict phase gates; ship ERP core before mobile.
4. **Doc/code drift and AI hallucination** → automated checks, ADR-first changes.
5. **Library churn** (Next 16, Data Connect, Flutter packages) → always verify against installed versions and docs, never memory.
