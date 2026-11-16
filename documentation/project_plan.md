# Project Plan (execution view of the phased roadmap)

`phased_implementation_roadmap.md` says *what* and in which order. This file says *how we know each phase is done*. A phase is closed only when every gate passes (`npm run eval` + `npm run check:drift`) — not when code is written.

Task-level breakdown with sizes and dependencies: `implementation_plan.md`.

Mobile apps live in `apps/mobile-{teacher,staff,parent,driver}` (matches the Melos workspace in the root `pubspec.yaml`).

## Build order (changed 2026-11-16)
The owner moved **the launch to the end**: the school-facing product is finished first. The order is now **finish Phase 5 → Phase 8 (the student LMS) → Phase 7 (the Academic Insights Engine) → Phase 6 (Launch)**. The LMS comes before the engine because the engine reads the per-question answers the LMS records. The numbers keep their meaning (task ids such as P6-5c and P7-2 are unchanged everywhere); only the order of work changes. Nothing is released to a school before Phase 6 closes. **Long-lead owner actions can still start early** because they take weeks and do not depend on code: the lawyer for the children's-data review (P6-5a, which now also covers student accounts and live video), the translation reviewers (P6-8), and the developer-store accounts (P6-7). **Work that keeps the code releasable** (a staging release rehearsal now and then, so `main` does not drift further from `staging`) is not launch work and is not blocked.

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

## Phase 6 — Launch (landing page, release, hardening, pilot): built last, after Phases 8 and 7
**Gate:** Lighthouse/SEO thresholds; no secrets/API calls from public bundle. Task P6-5 (compliance and privacy) is broken down in `documentation/modules/children-data-protection.md` (P6-5a to P6-5h: lawyer review, tracking-SDK drift rule, consent, push text, retention and rights, breach runbook, sub-processors, school checklist).

## Phase 7 — Academic Insights Engine (proposed 2026-10-31, waiting for ADR-0017): built after the LMS, before launch
A separate service for student progression and growth, the school's calendar profile (J&K winter and summer zones), NEP 2020 and board policy packs, teacher-authored workbooks answered in the Parent app, and 13 visualisations for parents, teachers and school admins. Plan: `documentation/modules/academic-insights-engine.md`; decision: `documentation/decisions/ADR-0017-academic-insights-engine.md`. Tasks P7-1 to P7-14. It depends on Phase 5's Parent app foundation (P5-6a, built) and on the per-question data that does not exist yet: since 2026-11-16 that data comes from the LMS (Phase 8, ADR-0019), and the workbook authoring and student answering of this phase move there.

## Phase 8 — The learning system for students (LMS) (proposed 2026-11-16, ADR-0019 proposed)
Students on the web and the phone: workbooks, tests, **virtual (at-home) examinations** with optional **live remote invigilation**, results, feedback and **analytics about themselves**, with a school setting for where students may use it; teachers author in a per-school question bank and mark; parents see progress read only. A new `STUDENT` role, `apps/web-student`, `apps/mobile-student` and a student mode in the Parent app for younger students. **The owner chose (2026-11-16) to build it, and then the Insights Engine, before any launch**: it is the first thing built after Phase 5, and Phase 6 (launch) comes last; the security review, load tests and privacy work of Phase 6 then cover the finished system. It shares data with, and feeds, the Academic Insights Engine (Phase 7). Plan: `documentation/modules/lms.md`; decision: `documentation/decisions/ADR-0019-lms-students-and-virtual-exams.md`. Tasks P8-1 to P8-16. **Gate:** E-LMS-1 to E-LMS-10, E-PRIV-1 to E-PRIV-7 on the new routes and apps, a load test of a 2,000-student exam window, the security and privacy reviews, and the lawyer's review of student accounts and live video of children.

## Working agreement per task
1. Pick the next unchecked item in the current phase. 2. Write/extend the eval first. 3. Implement. 4. Run drift + evals. 5. Update `live_documents.md`. 6. Summarize with evidence (CLAUDE.md DoD).
