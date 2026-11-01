# Project bootstrap prompt kit

A multi-document prompt that turns an idea into a documented, guarded, tested and branch-disciplined repository, the way the OruSchools platform was built. It is **generic**: nothing in these files assumes schools, Flutter, NestJS or any other stack. The agent learns what you are building by asking you, then proposes an architecture, you approve it, and only then does it write documents, guardrails, checks and code.

## What you get at the end
A repository where:
- the **decisions** are written down as ADRs and win any argument with the code or the chat;
- **guardrails** (security, privacy, money, offline, roles ...) exist as prose *and* as automated checks;
- **hallucination checks** give an AI agent ground truths, a golden question set and "trap" questions, and a grader;
- a **drift check** fails the build when the docs, config, schema and code disagree;
- **evals** and **tests** prove each rule and each phase gate;
- **git** follows a written branching and pull-request system that CI enforces;
- every change ends with a summary of **what was run and what was not verified**.

## The files (read and paste in this order)
| File | What it is | Who reads it |
|---|---|---|
| `00-master-system-prompt.md` | The prompt itself: role, rules, the phases and their gates. **This is the one you paste first.** | the agent |
| `01-discovery-interview.md` | The questions the agent asks first (simple, grouped, with defaults) and how answers become a Project Brief | the agent, you |
| `02-documentation-set.md` | Every document the agent must write, with required sections | the agent |
| `03-adr-templates.md` | ADR template, lifecycle, and the starter ADRs every project needs | the agent |
| `04-guardrails-and-hallucination-checks.md` | How to derive guardrails from the brief; the hallucination truths, golden set and trap formats | the agent |
| `05-drift-evals-tests.md` | The drift check, the eval catalogue, the test pyramid, CI jobs, cadence | the agent |
| `06-git-branching-and-pr.md` | The branching model, branch-policy check, PR template, protection settings, release flow | the agent |
| `07-agent-operating-protocol.md` | The standing rules for every later session: verify before asserting, scope, definition of done, summaries | every agent session |
| `08-phase-plan-and-gates.md` | How to plan phases, task IDs, gates and the live progress record | the agent |

## How to use it
1. Create an empty repository (or a branch of an existing one) and open Claude Code in it.
2. Paste `00-master-system-prompt.md` as the first message. Attach or paste the other seven files (or tell the agent where they are: `documentation/templates/project-bootstrap-prompt/`). The master prompt tells the agent which file to read at which phase, so nothing is lost if you add them as files in the repo.
3. **Answer the interview.** It starts by asking what you are building, why, for whom, and what apps and services you think you need. It will not write anything until you confirm the Project Brief.
4. **Approve the architecture** (Gate 2). This is the cheapest moment to change your mind.
5. Let it generate documents, guardrails, checks, evals and the git setup, one gate at a time. Each gate ends with a short report; you say "proceed" or ask for changes.
6. From then on, start every session with the repo's `CLAUDE.md` (the agent writes it at Gate 3). The `07` protocol is copied into it, so new sessions inherit the same discipline.

## Placeholders
Files use `{{LIKE_THIS}}` for values the agent fills in from your answers. A placeholder left in a delivered document is a bug; the drift check searches for them.

## Adapting it to your company
Edit these first: the **starter ADR list** (`03`), the **guardrail categories** (`04`) for your regulators (data protection, payments, health, children), the **branch names** and protected-branch settings (`06`), and the **CI provider** wording (`05`; the examples use GitHub Actions). Keep the *gates*: they are what stops an agent from writing code before the decisions exist.

## Honest limits
The kit makes errors cheaper to catch; it does not make an agent infallible. Anything about the law, a vendor's current API, a price or a deadline must be checked by a person against the source. The kit tells the agent to say "unverified" instead of guessing, and the golden set includes trap questions to test that.
