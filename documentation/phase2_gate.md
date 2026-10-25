# Phase 2 gate review

The gate is in `documentation/phase2_plan.md` section 4. This page says, for each criterion, **which automated test proves it** (an evidence
line is a file path, then a double colon, then a test name, in backticks; `evals/phase2-gate.test.mjs` checks that every one still exists) and what was run on
2026-10-26 against `staging` after PR #94, and **what is not proven**.

## Evidence run (staging after #94)

| Command | Result |
|---|---|
| `npm run test:dataconnect` (database-level tenant isolation on the emulator) | 62 passed, 0 failed |
| `npm run test:database` (generated Admin SDK, every Phase 2 operation) | 10 files, 100 passed |
| `npm run test:gateway` (the real gateway on the real Auth and Data Connect emulators) | 26 files, 3810 passed |
| `node tools/prove-receipt-numbers.mjs --emulator --apply` (40 payments, 10 workers, 117 refused collisions retried) | PASS: numbers 1..40, no duplicate, no gap, paid total exact, 40 audit rows |
| `npm test`, `npm run lint`, `npm run typecheck`, `npm run eval`, `npm run check:drift` | all pass (drift: 0 errors, 1 old warning) |
| `npm run demo` seed (the real gateway, emulators) | 30 students, 93 invoices, 66 payments, a paid pay run, in about 15 seconds |

## The criteria

| ID | Criterion (from the plan) | Proven by |
|---|---|---|
| E-RBAC-FULL | The Finance and Academic isolation matrix is automated over every new route | `apps/api-gateway/test/harness/matrix-suite.ts :: cross-tenant and RBAC route matrix (P1-7)` generates a case for EVERY registered route (a new route is covered with no edit), for every role; `apps/api-gateway/test/harness/matrix-suite.ts :: no part file is missing` proves the four CI parts together cover all of them. Web side: `apps/web-admin/test/role-scoped.test.tsx :: never asks the gateway for something the role is not granted` (all 14 roles). |
| E-FIN-1 | No floats anywhere; rounding and totals follow the shared vectors in TypeScript and Dart | `evals/spec.test.mjs :: E-FIN-S1 money fields are integer minor units, never Float` (no `Float` in the schema); `packages/format/test/vectors.test.ts :: vectors.json` and `packages/flutter-core/test/format_test.dart :: vectors.json` run the SAME vectors on both sides; amounts cross the API as strings and are summed as `bigint` (`apps/api-gateway/src/reports/report-rules.spec.ts :: stays exact beyond what a floating-point number can hold`). |
| E-FIN-2 | Invoice generation is idempotent; receipts sum to their payments; receipt numbers are unique and gap-free per school and year under concurrent payments | `apps/api-gateway/test/harness/invoices.integration.ts :: the real run bills exactly once; running again changes nothing`; `apps/api-gateway/test/harness/invoices.integration.ts :: two cashiers paying the same invoice at once can never overpay it` (six at once, numbers consecutive); `apps/api-gateway/test/harness/invoices.integration.ts :: a refused payment leaves no gap`; `packages/database/test/invoices.integration.ts :: a stale counter is refused and nothing is written`; the receipt total equals the payments in `apps/api-gateway/test/harness/invoices.integration.ts :: totalAmountMinor`; the 40-payment run above. **Real concurrency: see Not proven.** |
| E-TEN-2 | Every new endpoint refuses another school (the matrix generates the cases) | the same generated matrix, `apps/api-gateway/test/harness/matrix-suite.ts :: refusals never reveal why`, plus each module's own other-school test, for example `apps/api-gateway/test/harness/invoices.integration.ts :: another school's cashier cannot see, pay or reverse A's invoices and payments`. |
| E-IMP-1 | An import dry run writes nothing (proved by counting rows before and after) | `apps/api-gateway/test/harness/imports.integration.ts :: a dry run of a good file reports it importable and writes NOTHING`. |
| E-AUD-1 | Every new write route has an audit row in its own transaction | static: `apps/api-gateway/test/audit-binding.e2e-spec.ts :: every audited route is bound to an operation that records its action`; runtime: `apps/api-gateway/test/harness/audit.integration.ts :: E-AUD-1 runtime: every audited write adds its audit row` (a sample request per `@Audit` route, exactly one audit row each); the audit row is written by the same Data Connect transaction as the change. |

Other gate items: the **seed script** is `tools/seed-demo-school.mjs` (`npm run demo`; `documentation/demo-school.md`;
`evals/demo-school.test.mjs :: E-DEMO-1`); **docs** are `CLAUDE.md` "Current reality", `documentation/phase2_plan.md` and this page.

## Not proven

These are real gaps. None is hidden by a passing test above.

1. **Receipt numbers under real concurrency.** The emulator runs one statement at a time, so the run above proves the counter logic and the retry, not Cloud SQL's real concurrent transactions. Run `node tools/prove-receipt-numbers.mjs --project oruschools --apply` once against the real database (it makes one throwaway school and suspends it). Owner action.
2. **The production database is not migrated.** Staff, admissions, imports, fees, invoices, receipts and payroll tables and the removal of the Phase 0 `Payroll` table exist only in the schema files. `npx firebase dataconnect:sql:diff --project oruschools`, read the output, then `npx firebase deploy --only dataconnect --project oruschools`. Owner action; follow the enum warning in `documentation/environment.md`.
3. **No browser run.** Every web screen is tested with a fake API (and the per-role proof with a recording one). The demo (`npm run demo`) starts the real stack, but nobody has yet clicked through it in a browser; the last step of that command (the two web apps in demo mode) was never started.
4. **PDFs on the real server.** Receipts, payslips and report PDFs use fonts from `packages/flutter-core/assets/fonts`; a deployment must ship that folder (or set `RECEIPT_FONT_DIR`). Not run on a real host.
5. **Hindi and Urdu are drafts.** Every label added in Phase 2 is a draft that the glossary evals check for wording, not a native-speaker review. Nothing is marked `reviewed`.
6. **Screens not built:** concessions and per-student statements, editing screens (student, staff, application, fee, class), photo and documents, linking a staff login account, manual payslip lines, the Audit log, and a live brand-colour preview. Gateway endpoints exist for most of them.
7. **Branch protection** is still off on GitHub, so the required checks are not enforced by GitHub (owner action; ADR-0010).
8. **Next.js 16.4.0** reports a known security advisory on every build; an upgrade is a separate piece of work.

## Verdict

Every automated gate criterion is met and proven on the emulators. The phase can be called **functionally complete, not production-ready**: items 1 to 4 and 7 above are what stand between this and a pilot school.
