# 02. The documentation set

Create these at Gate 3 (after the architecture is approved). Every file begins with a one-line purpose and a `Status:` line with a date. Facts that can be checked must be checked (open the file, run the command) before they are written; unchecked facts are marked **unverified**. Paths that do not exist yet go under "Planned" and into the drift config.

## Layout
```
CLAUDE.md                                  # the entry point for every AI session (<= ~150 lines)
documentation/
  project_brief.md                         # confirmed at Gate 1
  system_context.md                        # what the system is, for whom, the two or three big ideas
  system_architecture.md                   # apps, boundaries, diagram, stack, deployment
  SSOT.md                                  # single source of truth for product rules (the "what")
  guardrails.md                            # security, privacy, data, money, communication rules
  hallucination_checks.md                  # ground truths, traps, enforcement
  eval_plan.md                             # layers, eval catalogue, cadence
  agent_contexts.md                        # personas per area, with strict rules
  glossary.md                              # one definition per term
  environment.md                           # versions, how to run locally, ports, secrets handling (names only)
  implementation_plan.md                   # phases and task IDs (see 08)
  phaseN_plan.md / phaseN_gate.md          # per phase: tasks, acceptance, then the gate evidence
  live_documents.md                        # which docs are living, who updates them, when
  system_memory.md                         # decisions-in-brief and lessons learned, newest first
  decisions/ADR-0001-....md                # one decision per file (see 03)
  modules/<module>.md                      # one per feature area: workflows, data, edge cases, status
  templates/                               # PR template copy, ADR template copy, checklists
```
Add a `design-system/` folder only if the project has a user interface with brand rules; then include tokens and component rules and say which files are design-owned and never edited by the agent.

## Per-file specification

### `CLAUDE.md` (write last, keep short)
Sections in this order:
1. **One paragraph**: what this is, the pillars (apps/services), where logic lives.
2. **Read order** (source-of-truth ranking, section 2 rule 4 of the master prompt) with real paths.
3. **Current reality**: a two-column table, *Exists* vs *Planned (do not assume it exists)*. Update after each phase.
4. **Commands**: every command that works, one line each, including `check:drift`, `eval`, `test`, `lint`, `build`, how to regenerate generated code, and the one command that runs the local stack.
5. **Non-negotiable rules**: 8 to 12 numbered rules distilled from the guardrails (tenancy, authorization, no client to database, money, secrets, stack, languages, accessibility ...). Each rule must have a mechanical check named in `eval_plan.md`, or be marked "review only".
6. **Branching**: the model in one block (from `06`).
7. **Anti-hallucination protocol**: copy of `07` section 1, abbreviated.
8. **Definition of done**: copy of `07` section 3.
9. **Cadence**: what runs on every PR, weekly, monthly, and at each gate.

### `system_context.md`
What the product is in plain words; the actors; the 3 to 5 ideas that shape everything (for example "offline-first", "one gateway", "silos by role"); what it deliberately is not.

### `system_architecture.md`
Executive summary; the pillars; every app/service/package with purpose, owner area, who calls it; the boundary rules ("no client talks to the database"); infrastructure and deployment; the diagram (Mermaid) and the main request path; the shared platform (design tokens, i18n, API client). **Planned** parts are drawn dashed and labelled.

### `SSOT.md`
The product behaviour as a list of numbered rules per area (accounts, roles, money, notifications, reporting ...). Each rule is testable. Mark rules `[ASSUMED]` if the owner has not confirmed them, `[DESIGN]` if they are the assistant's proposal, `[GUARD]` if they are a guardrail, `[ADR-nnnn]` if decided.

### `guardrails.md`, `hallucination_checks.md`
Written per `04`.

### `eval_plan.md`
Written per `05`: layers table with status (Live / Phase n), the eval catalogue with IDs, the periodic-check cadence, and rules for evals (never loosen without an ADR; every hallucination seen becomes a golden item and, if mechanical, a drift rule).

### `agent_contexts.md`
One section per area of the repo (for example *Mobile engineer*, *Web engineer*, *Backend engineer*, *DevOps*). For each: the folders it may touch, its primary goal, key concepts, **one strict rule**, and the design/quality rules that apply there.

### `glossary.md`
Alphabetical; one definition per term; synonyms to avoid. Add a term the first time it appears in any document. A check can fail the build if two documents define the same term differently.

### `environment.md`
Versions of runtimes and tools (verified by running `--version`), how to install, how to run the stack, ports, environment variable **names** and which are secrets (never values), known local traps (for example a tool that fails without a certain setting), and where real secrets are kept.

### `implementation_plan.md` and phase files
Per `08`.

### `live_documents.md`
A table of the living documents (status, plan, current-reality table in `CLAUDE.md`, glossary, memory) with who updates each and at which event (task done, PR merged, phase gate, decision changed). If the project keeps a live progress page or dashboard, document how it is updated here.

### `system_memory.md`
Newest first. Each entry: date, what was decided or learned, the ADR or PR that holds the detail. Short.

### `modules/<module>.md`
Status line first (Plan / Built / Verified), then: what the owner asked for, rules that bind it (links to ADRs/guardrails), the workflow, data, routes or screens, tasks with IDs, evals to write first, what is **not** in scope, dependencies, open decisions. A plan module is marked "plan, nothing built" until code exists.

## Quality rules for all documents
- No orphan documents: every file is linked from `CLAUDE.md` or `modules/README.md`.
- No duplicated facts: one home per fact, others link. (Duplicates drift.)
- Dates are absolute (2026-10-31), never "yesterday".
- A statement about the law, a price, a vendor limit or a deadline carries its source link and the date it was checked, or the word **unverified**.
- The drift check (`05`) reads these files; write paths and command names exactly as they exist.
