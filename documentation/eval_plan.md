# Eval Plan

Two kinds of evals: **system evals** (does the software obey the spec?) and **agent evals** (does the AI assistant stay grounded?). Both are cheap, deterministic where possible, and run in CI.

## Layers
| Layer | Tooling | Runs | Status |
|---|---|---|---|
| Drift check (`tools/checks/drift-check.mjs`) | Node, zero deps | every PR + weekly + on demand | **Live** |
| Spec/invariant evals (`evals/*.test.mjs`) | `node --test` | every PR | **Live** (schema/docs level) |
| Golden hallucination set (`evals/hallucination-golden.json`) + grader | Node | monthly + after changing CLAUDE.md/docs/model | **Live** (manual answer generation) |
| RBAC matrix (`packages/rbac`, 14 roles) | Vitest | every PR | **Live** |
| Token generator, `packages/i18n` (API + generator), Flutter foundation/theme/fonts/languages, 4 app tests | Vitest / `flutter test` | every PR | **Live** |
| Database tenant isolation on the Data Connect emulator (`npm run test:dataconnect`: tenancy, cross-tenant references, role enum) | bash + Firebase CLI | every PR (CI job) | **Live** |
| Gateway unit/integration (Vitest + Data Connect emulator) | Vitest | every PR | Phase 1 |
| Mobile sync (Flutter test, fake network) | `flutter test` | every PR | Phase 4 |

## Eval catalogue (IDs referenced by phase gates)
- **E-TEN-1..n** Tenant isolation: for every endpoint, user of school A gets 403/404 on school B ids; `schoolId` in body is ignored; list endpoints never leak B rows.
- **E-RBAC-1..n** For each (role × module × action) in `packages/rbac`, assert allow/deny exactly as the matrix; unknown role/route denies; matrix has no role absent from schema.
- **E-AUD-1** Every mutating request writes an audit record (actor, school, action, entity, time).
- **E-FIN-1..n** No `Float` for money; invoice totals/rounding; payroll deduction only for unpaid leave.
- **E-ACAD-1..n** Timetable conflicts; substitution picks only free teachers; unpaid leave → both alerts.
- **E-SYNC-1..n** Offline write → queue → replay once (idempotency key); conflict resolution deterministic; partial failure doesn't block queue.
- **E-MSG-1..n** Office-hours enforcement; audit trail completeness.
- **E-DS-1..n** (live) Design tokens: every text pair ≥4.5:1 and every control/focus/chart pair ≥3:1 (checked on both the light and the retained dark values in `tokens.json`; only light ships, ADR-0005); `tokens.css` ≡ `tokens.json`; app-icon contrast claims true. (Phase 1+) shared-ui/flutter-core components render the 18 specs in the light theme (visual diff vs `previews/`), no hard-coded colours, tap targets ≥48/64px, RTL smoke test.
- **E-I18N-1..13** (live) Languages (`evals/i18n.test.mjs`): sources valid; English primary; RTL set exact; Hindi/Urdu complete and nothing marked reviewed; tagline untranslated; glyph coverage per language from the shipped fonts; font bundle files, licences and 5 MB budget; ARB per language; `[locale]` layouts set `lang` and `dir`, no Accept-Language detection; font loaders identical across apps; Flutter shells use the localization stack and the Driver app keeps 64 px; Kashmiri/Dogri/Sindhi fallbacks; line heights only raised.
- **E-RTL-1..6** (live, `evals/rtl-patterns.test.mjs`) The physical-direction detector flags `ml-4`, `-left-2`, `border-left-width`, `right: auto`, nested `Positioned(child: Foo(), left: 4)`, `Border(left:)` and leaves logical forms and comments alone.
- **E-ROLE-n** (live, `packages/rbac`) Extended roles: silos, no-delete rules, only Principal approves, only System Admin grants roles, self-service baseline, multi-scope widest-wins, navigation for each role.
- **E-DOC-n** (live) Schema/docs invariants in `evals/spec.test.mjs`. Tests marked `todo` are *known-failing* findings from the audit; fixing the finding flips them to required.
- **E-HAL-n** (live) Golden set: questions whose correct answer is fixed by `hallucination_checks.md`/ADRs plus "trap" questions about things that don't exist (e.g. which `firebase-admin` version the gateway uses before Phase 1 adds it, or which native speaker signed off the Urdu translation).

## Periodic hallucination checks
| Cadence | Check | Pass criteria |
|---|---|---|
| Every PR / push | `npm run check:drift` | 0 errors; warnings don't grow |
| Weekly (CI cron, Mon 03:00 UTC) | drift `--strict` report + `npm run eval` | artifact uploaded; owner reviews warnings |
| Monthly or on model/prompt/doc change | Golden set: have the agent (with CLAUDE.md loaded) answer `evals/hallucination-golden.json`; `npm run eval:agent -- answers.json` | ≥ 95% overall and 100% on `critical` items; traps answered with "doesn't exist / unverified" |
| Each phase gate | Re-audit like `audit_2026-10-15.md`; refresh "Current reality" in CLAUDE.md | Findings logged, none High open |

## Rules for evals
- A failing eval is never "fixed" by loosening it without an ADR or audit note.
- New hallucination seen in the wild → add a golden item + (if mechanical) a drift rule. That is how the net tightens.
- Keep `knownDebt`/`todo` lists short and each entry linked to a finding ID.
