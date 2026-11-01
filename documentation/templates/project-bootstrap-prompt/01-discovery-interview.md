# 01. Discovery interview and the Project Brief

Purpose: collect enough to propose an architecture without guessing. Ask in the order below, **at most four questions at a time**, in plain words. Each question has a *recommended default* (shown as "Default") and says what the answer changes. If the user says "you decide", pick the default, write it into the brief as **Decided by the assistant** with the reason, and move on.

Do not ask everything if the answer is already obvious from earlier answers. Do not ask about tools before you understand the problem.

## A. The idea and context
1. What are you building, for whom, and what problem does it solve? *(already asked as the opening question)*
2. What exists today? (a spreadsheet, an old system, nothing) Who does the work now, and what hurts?
3. What does success look like in 6 and in 18 months? Is there a date that matters (a launch, a pilot customer, a regulation)?
4. Who is the owner who decides when the team disagrees? Who else must approve (legal, security, finance)?

## B. People and apps
5. Who are the **kinds of users**? (customers, staff, admins, partners, a platform operator). For each: how do they sign in, on what device, how often, and can they work without internet?
6. Which **surfaces** do you imagine? Offer this menu and let them tick:
   - Public website or landing page
   - Web app for staff or admins
   - Platform-operator console (you, running many customers)
   - Phone app(s) (one per kind of user, or one shared)
   - Public API for partners
   - Background jobs or a worker (reports, notifications, imports)
   - A separate analytics or AI service
   Default: one web app per staff audience, one phone app per mobile audience, one API in the middle that all of them use, nothing talks to the database except the API.
7. Does one account see more than one organisation or customer? (multi-tenant) Do customers want their own address or branding?
8. Which languages and scripts are needed, and which read right to left? Is the default language fixed, or detected?

## C. Data, rules and risk
9. What are the **main things** the system stores and the key rules about them? (for example: "an invoice is never edited, only reversed", "only a manager approves").
10. Who must **never** see what? Name the walls (between customers, between staff roles, between a parent and someone else's child).
11. What is sensitive? (personal data, children's data, health, money, credentials, location). In which countries are the people? Which law or regulator applies? **Mark every legal statement "unverified, needs counsel"** unless the user gives you the source.
12. Is money involved? Which currency, rounding rules, payment provider, refunds, tax? Default: integers in the smallest unit, never floating point.
13. What must be **audited**? Default: every write, with who, when, what, and on whose behalf.

## D. Reliability and offline
14. Must any part work with no connection or a bad one? Which actions, and what happens when two people change the same thing offline? Default: server is the source of truth; the device saves first and sends later; conflicts follow a written rule.
15. How many users and how much data in year 1? What must never go down? Default: a small deployment, one region, daily backups with a tested restore.

## E. Integrations, hosting and team
16. What must it connect to (identity provider, payments, SMS or email, maps, government systems)? For each: do you already have an account, or is choosing one a decision to make?
17. Where will it run (a cloud, your own servers, a managed backend) and who operates it? Any company standards (languages, clouds, security reviews) that **must** be followed?
18. Who builds it? How many people, which skills, which tools do they already use? Default: choose the fewest moving parts the team already knows.
19. Where is the code hosted, and how do you want changes reviewed and released? Default: the branching model in `06`.

## F. Quality bar and constraints
20. Accessibility, performance, browser or device targets, design system or brand rules?
21. What is **out of scope** for now? (Write it down; it prevents later scope creep.)
22. What are you most afraid of going wrong? *(This becomes the first guardrail.)*

## Reading the answers back: the Project Brief
Produce this document, show it, and ask "Is this right? What did I get wrong or miss?" Save it as `documentation/project_brief.md` only after the user confirms.

```markdown
# Project Brief: {{PROJECT_NAME}}
Status: confirmed by {{OWNER}} on {{DATE}}

## One-paragraph summary
{{what, for whom, why}}

## Users and surfaces
| Kind of user | Signs in with | Device | Offline? | Surface (app) |
|---|---|---|---|---|

## Apps, services and packages (proposed list, to be tested at Gate 2)
| Name | Kind | One-line purpose | Used by |
|---|---|---|---|

## Data and rules
- Main entities:
- Key business rules:
- Walls (who must never see what):
- Audit requirement:

## Sensitive data, jurisdictions, regulators (all legal points marked unverified)
-

## Money
-

## Offline and reliability
-

## Integrations (chosen / to choose)
-

## Hosting, team and standards
-

## Quality bar
-

## Out of scope for now
-

## Biggest fears (first guardrails)
-

## Decided by the assistant (owner may change)
| Decision | Why |
|---|---|

## Open questions for the owner
| # | Question | Options | Needed by |
|---|---|---|---|
```

## What each answer feeds
| Answer | Becomes |
|---|---|
| B (surfaces, tenancy, languages) | architecture apps list, i18n rules, tenancy ADR |
| C (walls, sensitivity, audit) | guardrails, role matrix, data-protection ADR, hallucination truths |
| C12 (money) | money ADR, "no floating point" drift rule |
| D (offline, scale) | sync ADR, test pyramid, deployment sketch |
| E (integrations, hosting, team) | stack ADRs, environment document, CI |
| F (quality, out of scope) | design-system/spec document, plan, scope guardrail |
| A, C22 | the first lines of `CLAUDE.md` and the first guardrail |
