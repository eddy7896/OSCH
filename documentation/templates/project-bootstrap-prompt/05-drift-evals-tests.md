# 05. Drift check, evals, tests and CI

Goal: every rule in the documents has a machine that notices when it is broken, and every change shows evidence.

## 1. Four layers
| Layer | What it answers | Tooling (adapt) | Runs |
|---|---|---|---|
| **Drift check** | Do the documents, configuration, schema and code still agree? | one zero-dependency script (`tools/checks/drift-check.mjs`) plus `drift-config.json` | every PR, weekly, on demand |
| **Spec and invariant evals** | Do the written invariants hold (RBAC matrix, tenancy rules, token contrast, language lists ...)? | the language's built-in test runner (`node --test` in `evals/`), plus package tests | every PR |
| **Agent evals** | Does an AI agent with only the repo's context answer correctly? | the golden set and grader (`04`) | monthly and on doc/model change |
| **Tests** | Does the software behave? Unit, integration against real dependencies (emulators or containers), end-to-end for the main journeys, security and isolation tests | the stack's runners | every PR; heavy suites sharded |

Prefer **real dependencies in tests** (a real database or its emulator, a real identity emulator) over mocks for anything about isolation, permissions and data integrity: mocks cannot prove those.

## 2. The drift check
A single script that exits non-zero on any **error** (and on warnings with `--strict`). It prints each finding as `severity [check-id] message  at path`. Build it incrementally; start with checks 1 to 6 and add the rest as the repo grows. Each check must be proven by a test that feeds it a bad input.

| # | Check id | Rule | Severity |
|---|---|---|---|
| 1 | `doc-path` | Every file path mentioned in the documents and `CLAUDE.md` exists, or is listed in `plannedPaths`. Paths preceded by a name character (a package path such as `vendor/lib/x`) are ignored. | error |
| 2 | `banned-dependency` | No dependency from `bannedDependencies` appears in any manifest or lockfile. | error |
| 3 | `placeholder` | No `{{PLACEHOLDER}}`, `TBD` or `TODO(owner)` remains in delivered documents. | error |
| 4 | `secrets-ignored` | Secret-bearing file patterns are in `.gitignore`; no tracked file matches `.env*` except `*.example`; a simple scan finds no key-like strings. | error |
| 5 | `workflow-valid` | Every CI workflow file parses; every npm/make script, task and file it references exists. (A workflow the host rejects runs no jobs and fails silently.) | error |
| 6 | `claude-md-commands` | Every command listed in `CLAUDE.md` exists as a script/target. | error |
| 7 | `tenant-scope` | (if multi-tenant) every data operation/query takes the tenant id and filters by it, except operations named in `tenantScopeExemptOperations` with a written reason. | error |
| 8 | `access-level` | (if the data layer has access levels) no operation is public; all are server-only. | error |
| 9 | `version-pin` | Versions pinned in documents match the installed versions (lockfile). | warning |
| 10 | `stale-term` | Terms that a decision replaced do not appear outside the allow-listed historical documents (`staleTerms`). | error |
| 11 | `generated-fresh` | Generated code (API client, schema SDK, translations, tokens) equals what its generator produces now. | error |
| 12 | `adr-integrity` | Each ADR has a status; every "Accepted" ADR names its enforcement; ADR numbers are unique and sequential. | error |
| 13 | `glossary-dup` | No term is defined twice with different meaning. | warning |
| 14 | `rule-links` | Every rule ID cited (`E-xxx`, `ADR-nnnn`, `G-nn`) exists. | error |
| 15 | project rules | The project's own mechanical rules (for example "no physical left/right in layout code", "no network fonts", "no `Float` money field", "no hard-coded colour"). One check per rule; each links the guardrail it enforces. | error |

### `drift-config.json` shape
```json
{
  "plannedPaths": ["apps/mobile", "src/analytics"],
  "pathCheckExemptDocs": ["documentation/templates"],
  "bannedDependencies": ["prisma", "mongoose"],
  "tenantScopeExemptOperations": { "GetUser": "users are global; keyed by verified token id" },
  "staleTerms": [{ "term": "OldAuthVendor", "reason": "ADR-0002", "allowIn": ["documentation/decisions/ADR-0002-auth.md"] }],
  "knownDebt": { "F-12": "link to the finding; remove when fixed" }
}
```
`knownDebt` must stay short; every entry links a finding.

## 3. The eval catalogue
Evals have stable IDs so plans, ADRs and PRs can cite them. Naming: `E-<AREA>-<n>`; ranges `E-AREA-1..n` in the catalogue, one test file per area in `evals/` or the owning package.

Starter areas (keep those that apply):
- `E-TEN` tenant isolation: for every route/operation, a caller from tenant A gets forbidden/not-found on B's ids; the tenant in a body is ignored; lists never leak.
- `E-RBAC` the permission matrix: for each (role × resource × action) the answer is exactly the matrix; unknown role/resource/action denies; separation-of-duties rules hold (the preparer cannot approve).
- `E-AUD` every mutating request writes an audit record in the same transaction.
- `E-FIN` money: integers only; rounding vectors shared by all languages; payment idempotency; reversal not edit.
- `E-SYNC` offline: replay once; deterministic conflicts; one failure does not block the queue.
- `E-I18N` / `E-RTL` language lists, generated files current, no physical direction in layout code, glyph coverage.
- `E-DS` design tokens: contrast and size floors, generated files identical to source.
- `E-DOC` document invariants.
- `E-HAL` the golden set (`04`).
- `E-BRANCH` and `E-CI` the branch policy and CI completeness checks (`06`).
- `E-<FEATURE>` per feature, **written before the feature** (see `07`).

Each phase gate lists the evals that must pass, and a gate document records what was run, the results, and what is **not proven**.

## 4. Test pyramid and what runs where
| Level | Scope | Dependencies | When |
|---|---|---|---|
| Unit | one function/class/widget | none | every PR, seconds |
| Integration | a service or route against the **real** database/identity emulator, real guards, generated tenant×role route matrix | emulators | every PR; shard if over ~10 minutes, and add a **completeness job** that fails if any shard did not report, a file ran twice or not at all, a test failed or was skipped |
| Contract | generated API client vs the committed API description | none | every PR; fails when the committed description or generated clients are stale |
| End-to-end | the 3 to 5 main user journeys | full stack locally or in CI | pre-release and nightly |
| Security | cross-tenant, role matrix, input fuzz, secret scan | emulators | every PR |
| Non-functional | load, accessibility, performance budgets | as needed | per phase gate |

Rules:
- **Generate** the tenant×role route matrix from the registered routes so a new route is covered automatically and an uncovered route fails the build.
- **Every new endpoint/operation** ships with a tenant-isolation test and a permission test.
- A flaky test is a bug: fix or quarantine with a ticket and a date; do not retry until green. A test close to its time limit gets room, with a comment saying why.
- Tests that need a device or a third-party account are listed as **not proven** in the gate document until someone runs them.

## 5. CI jobs (adapt names; the example is GitHub Actions)
| Job | Contents | Required for merge |
|---|---|---|
| `branch-policy` | merge flow and file-ownership check (`06`) | yes |
| `build-lint-test` | install from the lockfile, generated-files-current checks, drift check, spec evals, build, lint, typecheck, unit tests | yes |
| `mobile` (if any) | analyze, test, generated code current | yes |
| `integration (shards 1..n)` | integration suites against emulators | via completeness job |
| `integration-complete` | proves every shard ran, nothing missing, no skips | yes |
| `secret-scan` | commit history and diff | yes |
| `weekly` (cron) | drift `--strict`, all evals, upload a drift report artifact | reviewed by the owner |

A pipeline must be **fast enough to be used**: cache dependencies and emulator downloads, shard the slow suite, and keep a developer command (for example `ORU_FILES=... npm run test:integration`) that runs only the files you changed.

## 6. Cadence
| When | What |
|---|---|
| every PR | drift check, spec evals, tests relevant to the change |
| weekly | strict drift report + all evals |
| monthly or on a model/prompt/doc change | golden set against the agent |
| each phase gate | re-audit (documents vs code), refresh "Current reality" in `CLAUDE.md`, write the gate document |
| after any security incident or hallucination | add an eval/golden item/drift rule |

## 7. Build order for the checks (Gate 4)
1. `drift-config.json` and checks 1 to 6, with a test that each fails on a bad fixture.
2. The grader and the golden set; run the grader on ideal answers (must be 100%).
3. One test per non-negotiable rule, **failing first** (prove the check can fail), then passing.
4. The CI workflows running exactly the commands a developer runs locally.
5. Run everything; record the output in the Gate 4 report.

## 8. Definition of "check is real"
A check counts only if (a) it ran in CI, (b) a deliberately wrong input made it fail, and (c) the rule it enforces is cited by ID in a document. Otherwise it is decoration.
