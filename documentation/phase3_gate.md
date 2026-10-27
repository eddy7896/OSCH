# Phase 3 gate review

The gate is in `documentation/phase3_plan.md` section 4. This page says, for each criterion, **which automated test proves it** (an evidence
line is a file path, then a double colon, then a test name, in backticks; `evals/phase3-gate.test.mjs` checks that every one still exists) and what was run
on 2026-10-27 on the merged state of tasks P3-1 to P3-12, and **what is not proven**.

## Evidence run

| Command | Result |
|---|---|
| `npm run test:database` (generated Admin SDK, every operation, on the emulator) | 18 files, 145 passed, 0 failed |
| `npm run test:dataconnect` (database-level tenant isolation) | **NOT RUN on this state**: the emulator ports were held by a running demo stack. Rerun before the gate is closed. |
| `npm run test:gateway` (the real gateway on the real Auth and Data Connect emulators) | **NOT RUN on this state**: same reason. Rerun before the gate is closed. |
| `npm test`, `npm run lint`, `npm run typecheck` | all pass |
| `npm run eval` | 130 passed, 0 failed |
| `npm run check:drift` | 0 errors, 1 old warning |

## The criteria

| ID | Criterion (from the plan) | Proven by |
|---|---|---|
| E-ACAD-1 | No teacher and no class is double-booked, by database key, under parallel requests | static: `evals/phase3-academic.test.mjs :: E-ACAD-1 the timetable's clash rules are unique keys in the database, not only checks in code`; runtime: `apps/api-gateway/test/harness/timetable.integration.ts :: E-ACAD-1: two requests at the same instant for one slot cannot both succeed` and `apps/api-gateway/test/harness/timetable.integration.ts :: refuses a clash with the rule named: a class twice in a slot, a teacher in two classes in a slot`. |
| E-ACAD-2 | A suggested or assigned substitute is free in the slot and qualified for the subject (property test) | `apps/api-gateway/src/substitution/substitution-rules.spec.ts :: E-ACAD-2 property test` (200 random timetables); `apps/api-gateway/test/harness/substitution.integration.ts :: E-ACAD-2: suggestions are only people who are free and qualified, fewest substitutions this month first`; `apps/api-gateway/test/harness/substitution.integration.ts :: E-ACAD-2: two requests at the same instant cannot put one substitute in two places in one period`; `evals/phase3-academic.test.mjs :: E-ACAD-2 a substitution is unique per lesson and date and per substitute, date and period; the write operation re-checks every rule`. |
| E-ACAD-3 | Unpaid leave raises the payroll proposal and the substitution need together; paid leave only the substitution | `apps/api-gateway/test/harness/leave-payroll.integration.ts :: before approval there is no proposal and no need; approval raises BOTH for unpaid leave, and only the substitution for paid leave (E-ACAD-3)`; `evals/phase3-academic.test.mjs :: E-ACAD-3 the unpaid-leave deduction is bigint paise rounded down, a proposal HR must apply, and only unpaid leave raises it`; the proposal is never applied silently: `apps/api-gateway/test/harness/leave-payroll.integration.ts :: HR applies the proposal as a deduction line, at the proposed amount or an edited one; once; only on a DRAFT run; nobody else can`. |
| E-ACAD-4 | Leave approval cannot be bypassed: only an active Principal, enforced in the database | `apps/api-gateway/test/harness/leave.integration.ts :: E-ACAD-4: only the Principal approves; HR, Bursar, Academic admin, Management and the requester are refused and nothing changes`; `evals/phase3-academic.test.mjs :: E-ACAD-4 every operation that can set a leave request to APPROVED or REJECTED checks for an active Principal, and the route needs the approve grant` (lists every operation that can write the status). |
| E-ATT-1 | The seven statuses are fixed (label only editable), the daily lock and audited corrections work, replay is idempotent | `apps/api-gateway/test/harness/attendance.integration.ts :: the seven statuses are fixed: a school may reword one, never add, remove or redefine`; `apps/api-gateway/test/harness/attendance.integration.ts :: E-ATT-1: a locked day refuses the teacher; the Academic admin corrects it, audited with the old value`; `apps/api-gateway/test/harness/sync.integration.ts :: replaying any submission any number of times leaves one result`; `evals/phase3-academic.test.mjs :: E-ATT-1 the seven statuses are a database enum and the label table can hold nothing else`. |
| E-EXAM-1 | No floating point in marks, percentages or grades; shared vectors; bands without overlap or gap | `evals/phase3-academic.test.mjs :: E-EXAM-1 marks, percentages and grades use no floating point`; `evals/phase3-academic.test.mjs :: E-EXAM-1 the database holds marks as whole tenths (Int), never a float or a decimal`; `evals/phase3-academic.test.mjs :: E-EXAM-1 the vectors for marks, percentages, bands and the report card exist and cover the awkward cases`; `apps/api-gateway/test/harness/grades.integration.ts :: E-EXAM-1: marks with one decimal, a mark above the maximum refused, absent counted as zero, percentage and grade by integer arithmetic`; `apps/api-gateway/test/harness/grades.integration.ts :: grade bands: none at first with a starting set offered; only a set from 0 to 100 with no gap or overlap is accepted`. |
| E-RBAC-FULL and E-TEN-3 | The generated matrix covers every new route; own and linked scopes are tested for Teacher and Parent | `apps/api-gateway/test/harness/matrix-suite.ts :: cross-tenant and RBAC route matrix (P1-7)` generates a case for EVERY registered route, for every role; `apps/api-gateway/test/harness/matrix-suite.ts :: no part file is missing`; own scope: `apps/api-gateway/test/harness/timetable.integration.ts :: OWN scope: a teacher sees the classes in their own timetable, their own week, and nobody` and `apps/api-gateway/test/harness/attendance.integration.ts :: a teacher can mark only a class they are class teacher of`; linked scope: `apps/api-gateway/test/harness/timetable.integration.ts :: LINKED scope: a parent sees the timetable of the class their child is in, and no other`, `apps/api-gateway/test/harness/attendance.integration.ts :: a student` and `apps/api-gateway/test/harness/grades.integration.ts :: who sees a report card: the school, the class teacher of the class, and a parent only for a linked child`. Web side: `apps/web-admin/test/role-scoped.test.tsx :: opening any screen it can reach never asks the gateway for something the role is not granted` (all 14 roles). |
| E-AUD-1 | Every new write route is audited in its own transaction | static: `apps/api-gateway/test/audit-binding.e2e-spec.ts :: every audited route is bound to an operation that records its action`; runtime: `apps/api-gateway/test/harness/audit.integration.ts :: E-AUD-1 runtime: every audited write adds its audit row` (a sample request per `@Audit` route, exactly one audit row each). |

Other gate items: the **demo school** (P3-12) is `tools/seed-demo-school.mjs` (`npm run demo`; `documentation/demo-school.md`;
`evals/demo-school.test.mjs :: E-DEMO-8`); **notifications** are written in the cause's own transaction
(`apps/api-gateway/test/harness/notifications.integration.ts :: approving unpaid leave tells the requester, the Academic admin (substitutes) and HR (payroll); a refused approval tells nobody`);
**docs** are `CLAUDE.md` "Current reality", `documentation/phase3_plan.md`, `documentation/modules/offline-sync.md` and this page.

## Not proven

These are real gaps. None is hidden by a passing test above.

1. **No browser run.** Every web screen is tested with a fake API (and the per-role proof with a recording one). The demo seed was run against the real emulators and gateway and its results read back through the API, but nobody has clicked through the screens in a browser. Owner action: `npm run demo`, then the walk in `documentation/demo-school.md`.
2. **The production database is not migrated.** The Phase 2 and Phase 3 tables (timetable, attendance, grades, leave, substitution, notifications, tombstones), the new enums and the drop of the stub `ClassSchedule`, `LeaveRequest` and `Exam` tables exist only in the schema files. `npx firebase dataconnect:sql:diff --project oruschools`, read the output, then deploy. Owner action; follow the enum warning in `documentation/environment.md`.
3. **Receipt numbers under real concurrency** (Phase 2 item, still open): `node tools/prove-receipt-numbers.mjs --project oruschools --apply`. The Phase 3 clash and substitute keys were likewise proved only on the emulator, which runs one statement at a time; the unique keys are the protection on Cloud SQL, but no parallel run has been made there.
4. **Hindi and Urdu are drafts.** Every label and notification word added in Phase 3 is a draft that the glossary evals check, not a native-speaker review. Nothing is marked `reviewed`.
5. **The timetable has no automatic solver** (deferred by ADR-0013); a real school's timetable has not been tried, only made-up data.
6. **Push and SMS** do not exist: notifications are in-app only. FCM needs a Firebase project (Phase 4).
7. **The sync engine does not exist**: only the written rules (`documentation/modules/offline-sync.md`) and the server pieces (client ids, tombstones). Phase 4 builds and proves the engine.
8. **Branch protection** is still off on GitHub (owner action; ADR-0010).
9. **Next.js 16.4.0** reports a known security advisory on every build, and a build sometimes aborts and passes on a retry.

## Verdict

**Not yet closed.** The gateway and tenant-isolation suites (the runtime proof of E-ACAD-1 to E-ACAD-4, E-ATT-1 and the route matrix) must be rerun on this merged state first; they passed task by task on the emulators while the phase was built. When they pass, this page is updated and the phase is functionally complete, not production-ready: items 1 to 3 above stand between it and a pilot school.
