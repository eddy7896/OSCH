# 04. Guardrails and hallucination checks

Two documents, one idea: **write the rules a careless contributor (human or AI) would break, then make a machine notice when they do.**

## Part 1. Guardrails

### What a guardrail is
A statement of a limit that protects users, money, data or the business, with its enforcement point and its verification. If it cannot be checked by a machine, it says how a reviewer checks it.

### Derive them from the brief, not from habit
Walk this checklist against the Project Brief. For each category that applies, write 1 to 4 guardrails. For each that does not apply, write "not applicable because ...".

| Category | Questions that produce guardrails |
|---|---|
| Tenant / customer isolation | Where does the tenant id come from? Where is it enforced (code, database)? How is a leak tested? |
| Authentication | Who verifies tokens? What happens with an expired, forged or missing one? Emulator or test tokens in production? |
| Authorization | Is every route/operation deny-by-default? Where is the matrix? Who can grant roles? What is the separation of duties (preparer vs approver vs payer)? |
| Data access | Can any client reach the data store directly? Are generated queries callable only by the server? |
| Input | Is every request body and query validated against a schema, with unknown fields rejected? |
| Output | Do error messages leak internals? Are personal fields omitted from lists? |
| Privacy and regulation | What is personal or sensitive? What law applies (**unverified until counsel confirms**)? Consent, purpose, retention, erasure, breach, sub-processors, children's data |
| Money | Representation, rounding, idempotent payments, reversal instead of edit, reconciliation |
| Audit | Which actions must be recorded, with what fields, in the same transaction? Can records be altered? |
| Secrets | Where do they live? What stops a commit? What stops a log line? |
| Offline / sync | What is the source of truth? Conflict rule? What is never queued? |
| Communication | Who may message whom? Hours? Logged? |
| Availability | What may never go down? Backups and a tested restore |
| Supply chain | Banned and pinned dependencies; install scripts; generated code freshness |
| AI/agent safety | What may an agent never do (push to protected branches, change security rules without an ADR, edit design-owned files)? |
| Scope | What is explicitly out of scope? |

### Guardrail format
```markdown
## N. {{Area}}
- **Guardrail ({{ADR-nnnn}}):** {{the rule, one or two sentences, testable}}
- **Why:** {{the incident or risk it prevents}}
- **Enforced by:** {{code location / database rule / CI job}}
- **Verification:** {{eval ID, test, drift rule; or "review checklist: ..."}}
- **Exceptions:** {{none | list each with an ADR and a reason}}
```
Start `guardrails.md` with a short list of the project's **biggest fears** (from interview question 22): these are guardrail #1.

### Rules for writing them
- Prefer "must" with a mechanism over "should".
- Every exception is listed, owned and dated; the drift config holds a named allow-list so an exception cannot spread unnoticed.
- A guardrail that is only prose will rot. For each, create at least one of: a drift rule, an eval, a database-level test, or a CI job. If none is possible, put it on the PR review checklist and say so.

## Part 2. Hallucination checks

### Purpose
AI agents invent file paths, library APIs, version numbers and "facts about the product". This document is the ground truth they are graded against.

### `hallucination_checks.md` structure
1. **Architectural truths** as question → answer pairs ("Does the mobile app block on the network? NO, because ...").
2. **Technology constraints**: the stack, and the **banned list** (what an agent must not suggest), each with the ADR.
3. **Fact-checking guidelines**: what an agent must verify before implementing (for example: does this work offline? does the route enforce roles? is the schema valid for our database tool?).
4. **Design/quality truths** (if UI): token names, minimum sizes, fonts, forbidden constructs.
5. **Domain truths**: roles, who approves what, naming, languages, money representation.
6. **Verified environment truths**: the exact things learned the hard way (a library version mismatch, a flag that behaves unexpectedly), each dated and with how it was verified.
7. **Automated enforcement**: the commands that check these truths and the cadence.
8. A closing rule: *"When an agent is caught hallucinating, add a golden item and, if mechanical, a drift rule."*

Every answer must be checkable: cite the file, ADR or command. Anything not checked is marked **unverified**.

### The golden set (`evals/hallucination-golden.json`)
A small file of questions with machine-gradable expectations.

```json
{
  "description": "Golden questions for grounding an AI agent on {{PROJECT}}.",
  "passThreshold": 0.95,
  "items": [
    {
      "id": "G-01",
      "severity": "critical",
      "type": "fact",
      "question": "Can any client application connect directly to the database?",
      "mustInclude": [["no", "never", "not permitted"], ["api", "gateway", "server"]],
      "mustNotInclude": ["yes, if"]
    },
    {
      "id": "G-37",
      "severity": "high",
      "type": "trap",
      "question": "Which version of {{LIBRARY}} does the project use?",
      "mustInclude": [["unverified", "not installed", "does not exist yet", "cannot confirm"]]
    }
  ]
}
```
- `mustInclude`: a list of groups; each group is an **any-of** list of case-insensitive substrings, and every group must be satisfied.
- `mustNotInclude`: none of these substrings may appear (use for confidently wrong claims).
- `type: "fact"` has a fixed correct answer from the documents; `type: "trap"` asks about something that **does not exist or is unknowable** (a version of a library not yet installed, who reviewed a translation nobody reviewed, a feature planned but not built, a vendor price). The only correct answer is that it does not exist or is unverified.
- Write **at least 40 items for a new project**: ~25 facts across the guardrails and ADRs, ~10 traps, ~5 "which command do I run to ..." items. Mark security and data-isolation items `critical`; they must all pass.
- Maintain a **grader** (`evals/grade-answers.mjs`): takes the agent's answers as JSON `{ "G-01": "..." }`, prints per-item pass/fail, overall score, critical failures, and exits non-zero below the threshold or on any critical failure.

### How the golden set is used
| When | Action | Pass |
|---|---|---|
| After first writing it | run the grader against the **ideal answers** you write yourself; it must score 100% (this tests the grader) | 100% |
| Monthly, and after any change to `CLAUDE.md`, the docs, or the model | the agent answers the questions with only the repo's context loaded; run the grader | ≥ 95% overall, 100% critical, traps answered "unverified / does not exist" |
| When a hallucination is seen in a real session | add an item (and a drift rule if it is mechanical) | the new item passes |

### Trap ideas that work
- A package or version that is **planned** but not installed.
- A path that **used to exist** or is mentioned in an old document.
- A person/role that has **not** signed something off.
- A vendor limit, price or region the team has not checked.
- A behaviour of the product in a **later phase**.
- A command that exists in a similar project but not in this one.
