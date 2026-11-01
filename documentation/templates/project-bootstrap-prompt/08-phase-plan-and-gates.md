# 08. Phase plan, task IDs, gates and the live record

## 1. Principles
- **Smallest useful first release.** Phase 1 delivers something a real user can try, not a foundation nobody sees. Foundations are built as part of the first feature that needs them, unless they are risky to retrofit (tenancy, identity, audit, the permission matrix, the money representation, the CI), in which case Phase 0 builds them with tests.
- **Phases have goals and gates**, not dates. A gate is a list of evals and evidence; a phase is done when its gate document says so.
- **Decisions that need the owner come first** in each phase (an "ADR task"), because unanswered decisions are the main cause of rework.
- **Risk first.** Put the least certain, most expensive-to-change work (an integration, a legal question, a hard offline case) early and as a spike with a written outcome.

## 2. Phase 0 is always the foundation
| Task | Content |
|---|---|
| P0-1 | Repository, workspace tooling, formatter/linter, scripts named in `CLAUDE.md` |
| P0-2 | Documents (Gate 3), ADRs |
| P0-3 | Drift check, evals, golden set (Gate 4) |
| P0-4 | Branching, CI, PR template (Gate 5) |
| P0-5 | The skeleton of each app/service that builds, tests and runs locally, and the local stack command |
| P0-6 | The cross-cutting packages the brief needs (permissions matrix, API client generator, i18n, design tokens ...) with their own tests |

## 3. Task IDs and sizes
- ID = `P<phase>-<n>` with sub-tasks `P<phase>-<n><letter>`; never reused. An umbrella task has a percent that is derived from its children.
- Size: S (<= 1 day), M (<= 3 days), L (<= 1 week). Anything larger is split.
- Each task row: ID, task, size, acceptance (the E-IDs and the observable behaviour), dependencies, status (todo / doing / done / blocked), PR link.

```markdown
| ID | Task | Size | Acceptance | Depends on | Status |
|---|---|---|---|---|---|
| P1-3a | {{server: table, routes, audit}} | M | E-FEAT-1..4 pass; tenant + permission tests | ADR-0003 | todo |
| P1-3b | {{web screen}} | M | screen test + keyboard + right-to-left check | P1-3a | todo |
```
Typical ordering inside a feature: **ADR → server (data, rules, audit, tests) → client/API contract → screens → docs and demo data → gate evidence.**

## 4. Phase plan document (`phaseN_plan.md`)
1. **Goal** in one sentence and **status** with a date.
2. **Starting point**: facts verified at the start, with the evidence column (command or file).
3. **Order of work** and why.
4. **Tasks** table.
5. **Owner decisions needed** (ID, question, options, recommended, who decides).
6. **Risks** with mitigations.
7. **Gate**: the evals and evidence required.

## 5. Gate document (`phaseN_gate.md`)
- A table **What was run**: command → result (numbers), date, commit.
- A table of **criteria**: ID, criterion, proven by (test name or command).
- **What the apps/system do now**, one line per surface.
- **Not proven** (be generous: things needing a device, a real account, a production deploy, a legal review, a human reviewer).
- **Owner actions** outstanding.
- A statement: *closed* or *cannot close yet because ...*.

## 6. The live record
The owner needs to read progress without opening the repository. Maintain:
- the plan table (status and percent) as the source;
- `CLAUDE.md` "Current reality" updated at each gate;
- optionally a live progress page or dashboard fed from the plan data (document in `live_documents.md` how and when it is updated: after each task done, each PR opened or merged, each branch or rule change). Anything on it that was not verified against the repository is marked unverified.
Update these as part of finishing a task, not when asked.

## 7. When the plan changes
- A new request mid-phase: add rows, state dependencies and what moves, ask whether to proceed, update the percent.
- A decision reversed: new ADR (supersedes), update affected tasks, add a golden item or drift rule if the old belief could resurface.
- A task found too big: split, keep the old ID as the umbrella.
- A gate cannot close: write why, list the cheapest path to close, keep going on what is unblocked.

## 8. Retrospective at every gate
Three lines in `system_memory.md`: what slowed us, what the checks caught, what we will change in the kit (this prompt) next time. Send improvements to the kit's owner so the next project starts better.
