# 03. Architecture Decision Records (ADRs)

An ADR records one decision, why it was made, and what follows. **An accepted ADR outranks code, chat and every other document.** If reality and an ADR disagree, stop and flag it; change the ADR (a new one, or an amendment) before changing the behaviour.

## File naming and lifecycle
- File: `documentation/decisions/ADR-NNNN-short-title.md`, numbers never reused.
- Status values: **Proposed** (written by the assistant, waiting for the owner) → **Accepted** (owner decided, date) → **Superseded by ADR-MMMM** or **Deprecated**. A decision that changes later gets an **Amendment (date)** section at the end, or a new ADR that supersedes it; never silently edit the "Decision" of an accepted ADR.
- Mark each decision's origin: **Decided by the owner** (they answered), **Default taken** (they did not answer; this is the default), or **Proposed by the assistant**. An unanswered question never becomes "Accepted" by silence; it stays a default that the owner may change.
- Each ADR links the document tasks that implement it and the checks that enforce it. An ADR with no check says "review only".

## Template
```markdown
# ADR-NNNN: {{Title: the decision as a noun phrase}}

- **Status:** Proposed | Accepted ({{date}}, {{who}}) | Superseded by ADR-MMMM
- **Plan / module:** {{link}}
- **Builds on:** {{ADR numbers}}
- **Origin:** Decided by the owner | Default taken | Proposed by the assistant

## Context
{{What forces the decision: the problem, constraints, the rules that bind it (link guardrails), what is known and what is unverified. 5 to 12 lines.}}

## Decision
1. {{Numbered, testable statements. Each says who/what/when. Avoid "should".}}

## Alternatives considered
- **{{Option}}:** {{why not}}
- **{{Option}}:** {{why not}}

## Consequences
- {{What becomes easier, what becomes harder, what must now be built or deployed, what the owner must do outside the repo}}
- {{Risks accepted}}

## Enforcement
| Rule | Check |
|---|---|
| {{rule}} | {{eval ID / drift rule / test / "review only"}} |

## Open decisions
| ID | Question | Options | Recommended |
|---|---|---|---|

## Status of the work
{{Built / not built, with the evidence: commands run, tests passed. Update as work lands.}}
```

## Starter ADRs (adapt; renumber; skip those that do not apply)
Draft all of these as *Proposed* at Gate 2 so the owner can accept, change or strike them.

| # | Title | Decide | Typical default |
|---|---|---|---|
| 0001 | Tenancy and data isolation | one database or one per customer; how the tenant id reaches every query; where isolation is enforced and tested | tenant id comes from the verified token, never the request; every query filters by it; isolation tested against a real database |
| 0002 | Identity and authentication | the identity provider; how tokens are verified; how phone-only users sign in; session lifetime | one managed provider; server verifies every token; no passwords in our database |
| 0003 | Authorization model | roles, scopes (own / linked / all), the matrix as code, deny by default, who may grant roles, who approves what | matrix lives in one package, tested; UI hiding is cosmetic only |
| 0004 | Stack and boundaries | languages and frameworks per part; what talks to what; **banned** alternatives listed so agents do not suggest them | fewest moving parts the team knows |
| 0005 | API contract | style, versioning, error envelope, pagination, idempotency keys, rate limits, how clients are generated | one OpenAPI file, committed; a test fails if generated clients are stale |
| 0006 | Data model rules | naming, ids, timestamps and zones, soft delete vs delete, audit, migrations | audit row written in the same transaction as the change |
| 0007 | Money and time | integer minor units; rounding; currency; time zones and "today" | no floating point for money; store UTC |
| 0008 | Offline and sync (if any) | local database, queue, conflict rule per entity, idempotency, what is never queued | server is the source of truth; device saves first |
| 0009 | Languages and direction | default language; explicit choice; right-to-left; where strings live; who reviews translations | no auto-detect; strings in one package; drafts never marked reviewed without a native reviewer |
| 0010 | Design foundation (if UI) | tokens, accessibility floor, components, theme policy | semantic tokens only; contrast and size minimums checked by tests |
| 0011 | Privacy and data protection | classes of data, purposes, consent, retention, erasure, sub-processors, breach response; **legal points unverified until counsel confirms** | minimise; purpose-limit; retention schedule; audit |
| 0012 | Secrets and environments | where secrets live, how local, staging and production differ, who can deploy | never in the repo; `.env.example` names only |
| 0013 | Branching, environments and release | the model in `06`; protected branches; who merges; who deploys | see `06` |
| 0014 | Testing and evidence | the pyramid, what runs where, the definition of done | see `05` |
| 0015 | Observability and operations | logs, request ids, metrics, backups and restore tests, incident runbook | structured logs with request id; tested restore |

Add more as the brief demands: payments, messaging, location, AI features, third-party integrations, analytics. **Each external vendor choice is its own ADR** with the price, limits and region checked against the vendor's own current documentation (and dated).

## Writing rules
- One decision per ADR; split if the title contains "and".
- Decisions are numbered statements a test could check. If you cannot say how it would be checked, say "review only" and why.
- State what you could not verify and what would verify it.
- Keep it to one screen of decision text; put the reasoning in Context and Consequences.
- When the owner answers open decisions in chat, write the answers into the ADR in the same session, with the date. Chat is not a record.
- When a decision conflicts with a standing rule (for example "only the gateway reaches the database"), the ADR must name the rule, say which option keeps it, and let the owner choose; do not quietly bend the rule.
