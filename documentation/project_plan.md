# Project Plan (execution view of the phased roadmap)

`phased_implementation_roadmap.md` says *what* and in which order. This file says *how we know each phase is done*. A phase is closed only when every gate passes (`npm run eval` + `npm run check:drift`) — not when code is written.

Task-level breakdown with sizes and dependencies: `implementation_plan.md`.

Mobile apps live in `apps/mobile-{teacher,staff,parent,driver}` (matches the Melos workspace in the root `pubspec.yaml`).

## Phase 0 — Foundation (implemented 2026-10-15; see `implementation_plan.md` for status and open owner items)
Work: root git repo (decision F10), CLAUDE.md, ADR sign-off, drift check + CI, `.env.example`, install firebase/melos CLIs, fix version pins (F8), resolve F4–F6 in schema, `packages/rbac`.
**Gate:** drift check 0 errors & warnings triaged; ADR-0001..3 accepted; RBAC matrix is data in `packages/rbac` with tests; CI green.

## Phase 1 — SaaS foundation & identity
Detailed, evidence-backed task plan: `phase1_plan.md` (milestones M0-M6, API surface, evals, risks, owner questions). Accepted decisions: ADR-0008, ADR-0009.
Build: `apps/api-gateway` (NestJS; Firebase token guard → `TenantContext` → `RolesGuard` deny-by-default → audit interceptor), Data Connect Admin SDK wrapper, tenant provisioning, `apps/saas-admin` (school CRUD, subscriptions).
**Gate:** E-TEN-* (cross-tenant read/write denied on every endpoint), E-RBAC-* for SUPER_ADMIN vs USER, E-AUD-1 (every write audited), emulator-backed integration tests pass.

## Phase 2 — School ERP core & finance
Build: academic years/grades/classrooms, people (staff, students, guardians), invoices/fees/payroll basics in `apps/web-admin`.
**Gate:** E-RBAC matrix fully enforced (Finance ↔ Academic isolation), money evals (E-FIN-*: no float, rounding, invoice totals), schema has direct `schoolId` on all tenant tables.

## Phase 3 — Academic engine
Timetable, exams, leave substitution matrix.
**Gate:** E-ACAD-* (no teacher double-booked; substitute is free in slot; unpaid leave raises *both* payroll and substitution alerts — guardrail §4), Principal approval cannot be bypassed.

## Phase 4 — Teacher & staff mobile
Flutter `mobile-teacher`, `mobile-staff`, `packages/flutter-core`; Drift + outbox sync (ADR-0003); write `modules/offline-sync.md` first.
**Gate:** E-SYNC-* (airplane-mode attendance, duplicate replay idempotent, two-device conflict resolves deterministically, queue survives app kill), `melos run analyze|test` green.

## Phase 5 — Parent & transport
`mobile-parent`, `mobile-driver`, payments (Razorpay vs Stripe — decide by ADR), messaging (ADR on Firestore vs gateway, F7), live tracking. The messaging and school notice board plan (class broadcast to parents, one-on-one student conversations, parent-facing notice board) is `documentation/modules/messaging-and-notice-board.md`.
**Gate:** E-MSG-* (office-hours enforced, all messages in audit trail), payment webhook idempotency, driver UI targets ≥56px.

## Phase 6 — Landing page
**Gate:** Lighthouse/SEO thresholds; no secrets/API calls from public bundle.

## Phase 7 — Academic Insights Engine (proposed 2026-10-31, waiting for ADR-0017)
A separate service for student progression and growth, the school's calendar profile (J&K winter and summer zones), NEP 2020 and board policy packs, teacher-authored workbooks answered in the Parent app, and 13 visualisations for parents, teachers and school admins. Plan: `documentation/modules/academic-insights-engine.md`; decision: `documentation/decisions/ADR-0017-academic-insights-engine.md`. Tasks P7-1 to P7-14. It depends on Phase 5's Parent app foundation (P5-6a, built) and on the per-question data that does not exist yet.

## Working agreement per task
1. Pick the next unchecked item in the current phase. 2. Write/extend the eval first. 3. Implement. 4. Run drift + evals. 5. Update `live_documents.md`. 6. Summarize with evidence (CLAUDE.md DoD).
