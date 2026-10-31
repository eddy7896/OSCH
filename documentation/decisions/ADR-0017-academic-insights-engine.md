# ADR-0017: The Academic Insights Engine (a separate service for student progression and growth)

- **Status:** **Proposed (2026-10-31), waiting for the owner.** Nothing here is built. It becomes work only after the owner answers section "Decisions needed" (D1 first).
- **Plan:** `documentation/modules/academic-insights-engine.md`. Tasks P7-1 to P7-14 in `documentation/project_plan.md` (Phase 7) and the Project Hub.
- **Builds on:** ADR-0001 (tenant isolation), ADR-0004 (money and time), ADR-0005 (no dark mode), ADR-0006 (languages), ADR-0007 (roles), ADR-0008 (gateway), ADR-0013 (Phase 3: timetable, attendance, exams), ADR-0014 (offline sync), ADR-0016 (parent resources).
- **Name:** the owner called it "the academic engine". ADR-0013 already uses "Phase 3 academic engine" for timetable, attendance, exams and substitution, so this document calls the new service the **Academic Insights Engine** (AIE) to keep the two apart.

## Context
The owner asked for a separate microservice that tracks each student's progression and growth through the year, follows the school's academic calendar (including the Jammu and Kashmir summer and winter zones), applies NEP 2020 and the state and board rules the school follows, and feeds 13 named visualisations to the Parent, Teacher and School Admin apps. Teachers must also create and publish workbooks and worksheets that students answer in the Parent app, and the engine analyses the answers.

This **conflicts in form** with two standing rules, so it needs this ADR before any code:
- `CLAUDE.md` / `system_architecture.md`: *"The NestJS API gateway is the absolute central hub for all business logic"* and *Data Connect is reached only by the gateway via the Admin SDK*.
- Non-negotiable rule 3 (no client reaches the database) and rule 6 (the stack is fixed: NestJS, Data Connect, Next.js, Flutter).

## Proposal (recommended, D1 option A)
1. **A second NestJS service in the monorepo**, `apps/academic-engine`, same stack and tooling (Turborepo, Vitest, OpenAPI). It introduces no new language, framework or database.
2. **The gateway stays the only door.** No app talks to the engine. The gateway verifies the token, the school, the role and the scope (own, linked, school), then calls the engine over a private network address with a **service credential** and the verified `schoolId`; the engine never sees a user token and never trusts a `schoolId` that did not come from the gateway.
3. **The gateway stays the only path to the database.** The engine is a **compute service**. It reads the facts it needs (marks, attendance, answers, calendar) from internal, read-only gateway feeds (`/internal/insights/...`, not in the public OpenAPI, service credential only) and returns results; the gateway writes the results to Data Connect tables (`InsightSnapshot` and friends) in the usual audited, tenant-scoped way. Apps read snapshots through public gateway routes (`/v1/insights/...`) with the usual `@Permission` decorators and the generated tenant and RBAC matrix.
4. **Why separate at all:** heavy, repeatable computation (mastery, benchmarks, risk flags, recomputation after a late mark correction) runs on its own schedule and scales and fails independently of the request path; the policy rules (calendar profiles, NEP and board packs) are versioned data and code with their own release cycle.
5. **What stays in the gateway:** all authorisation, all writes of teacher and parent input (workbooks, answers, rubric scores), all audit.

### Alternatives considered
- **B. Engine with its own database, fed by events.** Cleaner isolation, but a second datastore to secure, back up and keep tenant-safe, and an event pipeline. Rejected for version 1 (adds infrastructure the owner has not budgeted).
- **C. Engine reads Data Connect directly with the Admin SDK.** Fewest moving parts, but changes rule 3's wording ("only the gateway") and doubles the surface that must be proven tenant-safe. Only if the owner prefers it; then this ADR must amend `CLAUDE.md` and `system_architecture.md`.
- **D. A module inside the gateway.** Honours every rule today, but not what the owner asked for (a separate service). Offered as the fallback if A's operational cost is too high; the module boundaries in the plan are the same, so it can be split later.

## Decisions taken in this proposal (from the owner's brief)
1. The engine is **per school (tenant)** and every result carries `schoolId`; there is no cross-school analysis in version 1.
2. It follows the school's **calendar profile**: J&K Kashmir division and winter-zone (winter vacation, session counted by the board's notice), J&K Jammu summer-zone (summer vacation), the standard April to March year, or a custom one. The profile **proposes** the academic year, terms, vacation and exam windows; **a human with the grant (System Admin or Principal) confirms**; nothing changes silently. The dates are data the school confirms each year from the board's notice, because the board has moved them (see the plan, section 2).
3. Rules from **NEP 2020, the state and the board the school follows** are **versioned policy packs** (data plus validators), each with its source, its effective date and a reviewer. Nothing is hard-coded as "the law": a pack the owner has not reviewed is shown as a draft.
4. The 13 visualisations are **served as data** (series, thresholds, drill-down targets) by the gateway; the apps draw them with shared chart widgets that obey the design system (tokens only, text labels and icons as well as colour, 13 px and 48 px minimums, right to left).
5. Teachers **author and publish workbooks and worksheets** (interactive, answered in the Parent app, offline-first); this is separate from ADR-0016's file resources (PDF and Office files), which stay as they are.
6. **Privacy by design:** a parent never sees another child's name, rank or score; section and grade comparisons use only aggregates over a minimum cohort size (D10, proposed 8); the at-risk flag is shown to parents in supportive words, never as a label on the child (D6).

## Decisions needed from the owner
| ID | Question | Recommended |
|---|---|---|
| D1 | Architecture: A (compute service, gateway the only DB path), B (own database), C (engine reads Data Connect), or D (module in the gateway)? | A |
| D2 | Which boards and states first? The brief names JKBOSE, NEP 2020 and PARAKH. CBSE and others later? | JKBOSE and CBSE packs, NEP 2020 base |
| D3 | Who confirms a calendar change: System Admin, Principal, or both? | Principal confirms, System Admin can prepare |
| D4 | Peer and self rubric scores in the holistic wheel (chart 7): who enters them, and from which app? Students have no login today. | Teacher enters all three on the student's behalf in v1; a student-facing entry is a later task |
| D5 | Question bank: teachers write every question, or a licensed or school-provided bank? Content licensing is not in scope. | Teachers write; import later |
| D6 | Risk bands and wording: Thriving, On-Track, Watchlist, Critical. Thresholds proposed from the brief (60 and 75 per cent lines); what do parents see? | Staff see the bands; parents see a plain supportive sentence and the next step |
| D7 | Effort score: attendance plus workbook completion; the weights. | 50 per cent attendance, 50 per cent workbooks, shown with the numbers |
| D8 | Chart library for Flutter and React (new dependency; the stack rule is about frameworks, not libraries). | Custom painting on the existing widgets for the radar, heatmap and rose; one small library for line and bar charts, chosen by a spike (P7-9) |
| D9 | Do students answer workbooks on a parent's phone (shared device)? How is a child identified (child switcher), and can a parent help? | Child switcher; the answer is recorded as the child's, with a "helped by parent" flag |
| D10 | Minimum cohort size before any class or grade comparison is shown. | 8 |
| D11 | Data protection review for children's data (India's DPDP Act 2023, consent of a parent). **Unverified here**: needs legal advice; also P6-5. | Before pilot |
| D12 | Hosting: the engine runs on the same VPS behind the reverse proxy, on a private port. | Yes |

## Consequences
- A second deployable: its own Dockerfile, health check, CI job, secrets (service credential), and a documented failure mode: **if the engine is down, apps still show the last snapshot** (stale-while-unavailable, with the time it was computed), and nothing else breaks.
- New Data Connect tables (snapshots, curriculum, question bank, workbooks, answers, rubric scores, calendar profile); all need the owner's production deploy.
- New internal route family; the route matrix must prove that a service credential works only on `/internal/insights/*` and a user token never does.
- The Parent app grows beyond P5-6b: a Workbooks tab and the charts.
- `CLAUDE.md` "Current reality" and `system_architecture.md` get a Planned entry now and an Exists entry only when built.

## Status of the work
- **Planned only.** Documentation updated 2026-10-31 (this ADR, the module plan, `system_architecture.md`, `project_plan.md`, `modules/README.md`, `CLAUDE.md`, the Project Hub). No code, no schema.
