# 06. Git repository, branching and pull requests

The model below is parameterised. Fill the parameters from the Project Brief, write the result as an ADR (`ADR-0013` in the starter list), implement the branch-policy check, and tell the user which host settings they must switch on (an agent cannot set them from the repository).

## 1. Parameters
| Parameter | Meaning | Example |
|---|---|---|
| `{{APPS}}` | the independently owned parts that get a long-lived branch | `api`, `web-admin`, `mobile-customer`, `worker` |
| `{{SHARED}}` | everything outside the apps | packages, schema, tools, evals, documentation, CI |
| `{{PROD}}` | production branch | `main` |
| `{{PRE}}` | pre-production branch | `staging` |

## 2. The model
```
feat|fix|chore/<app>/<topic>  ->  app/<app>  ->  {{PRE}}  ->  {{PROD}}
cross/<topic>                          ->  {{PRE}}                (rare; human review)
hotfix/<name>  ->  {{PROD}}, then {{PROD}} -> {{PRE}} (back-merge)
```
- **{{PROD}}** accepts only `{{PRE}}` or `hotfix/*`. Each merge is a release.
- **{{PRE}}** accepts `app/<app>`, `cross/*`, `hotfix/*` and a back-merge of `{{PROD}}`. Every merge deploys to the pre-production environment.
- **`app/<app>`** is the long-lived branch of one app; **`app/shared`** holds everything outside `apps/`.
- **Topic branches** (`feat|fix|chore/<app>/<topic>`) merge only into their own `app/<app>`.
- **Ownership is enforced:** a PR from `app/<x>` into `{{PRE}}` fails if it changes files owned by another app. Lockfiles are exempt. A change that spans apps is split: shared first, then each app.
- **`cross/<topic>`** is the exception for a change that must land in several places at once (for example removing a dependency in the API while adding the replacement package). Ownership is not enforced, so it always needs a human review; keep them rare and small. Name them for the topic, not a type prefix.
- Never push to `{{PROD}}` or `{{PRE}}` directly. Never force-push a shared branch.
- Long-lived `app/*` branches drift: each merges `{{PRE}}` back in before its PR (the "up to date" rule enforces it).
- If the team is small, a simpler model (topic branches into `{{PRE}}`, `{{PRE}}` into `{{PROD}}`) is allowed; keep the same checks, ownership by path labels, and the same PR template.

## 3. The branch-policy check (`tools/checks/branch-policy.mjs` + a CI job)
Pure function `evaluate({ head, base, changedFiles })` → `{ ok, errors[] }`, with a thin CLI used by CI. Rules:
1. `head → base` must be an allowed edge of the graph above.
2. Topic branch names match `^(feat|fix|chore)/<known-app>/<kebab-topic>$`; `cross/` names match `^cross/<kebab-topic>$`.
3. For `app/<x> → {{PRE}}`: every changed file is owned by `<x>` (path map in a config file) or is a lockfile.
4. `app/shared → {{PRE}}`: no file under any app's folder.
5. `{{PRE}} → {{PROD}}` and `hotfix/*` have no file restrictions but require the full CI.
6. The base branch name and the head branch name are read from CI variables, never from the PR title.
Evals `E-BRANCH-1..n` feed it good and bad pairs (every allowed edge, every forbidden edge, a file owned by another app, a malformed name, a lockfile exemption).

## 4. Pull requests
- One concern per PR; small enough to review in one sitting. Link the task ID and the ADR it implements.
- **PR title:** `<TASK-ID>: <what changed, as a result>` (for example `P2-3: Invoices can be reversed, not edited`).
- **PR body template** (store it as `.github/pull_request_template.md` or the host's equivalent):

```markdown
## What
- {{3 to 6 bullets of behaviour that changed, not files}}

## Why / links
Task {{ID}} · ADR-{{nnnn}} · module doc {{path}}

## Run (evidence)
| Command | Result |
|---|---|
| {{command}} | {{result with numbers}} |

## Not verified
- {{what could not be run here and why (needs a device, a real account, a production deploy ...)}}

## Rules touched
- [ ] Tenant isolation test added/updated (new route or operation)
- [ ] Permission test added/updated
- [ ] Audit written for every new write
- [ ] Documents updated (status, ADR, module, `CLAUDE.md` Current reality)
- [ ] No secrets, no `.env`, no generated file edited by hand
- [ ] Drift check: 0 errors, no new warnings

## Owner actions needed
- {{deploys, settings, accounts, decisions}}
```
- Commit messages: imperative subject line (<= 72 chars), a blank line, why not what; end with any required attribution lines for AI-assisted work as your company's policy dictates.
- **Merging and deploying are the owner's** unless the owner has said otherwise for that exact action. An agent opens the PR and reports; it does not merge to `{{PRE}}` or `{{PROD}}`.
- Conflicts: merge the base into your branch and resolve, keeping **both** sides' intent in shared documents (for example the "Current reality" table). Re-run the generated-files checks afterwards, because generated files conflict and must be regenerated, not hand-merged.

## 5. Ownership and review
- `CODEOWNERS` maps each app folder to its owner team and `shared/` paths to the platform owners. A change to a security rule (`guardrails`, the permission matrix, the tenant checks, CI) always requests the security owner.
- Two reviewers for `{{PROD}}` merges, one for `{{PRE}}`, an author never approves their own PR.

## 6. Settings the user must switch on (the agent cannot)
List these in the Gate 5 report as **owner action**:
- Protect `{{PROD}}` and `{{PRE}}`: require a pull request, require the status checks `branch-policy`, `build-lint-test`, `mobile` (if any), `integration-complete`, `secret-scan`; require the branch to be up to date; block force pushes and deletion; require approvals as in section 5.
- Environments `staging` and `production`; production with required reviewers and its own secrets.
- Secret scanning and push protection; Dependabot or equivalent.
- A default PR template; a CODEOWNERS file enforced.
(Until protection is on, say so in the documents: "enforced by CI and habit, not by the host".)

## 7. Release flow
1. Work lands on `app/<x>` via topic PRs; `app/<x>` → `{{PRE}}` when the task group is done and green.
2. `{{PRE}}` deploys automatically to pre-production; run the gate evals there.
3. `{{PRE}}` → `{{PROD}}` is a release PR listing the tasks included, the migrations/deploys required, the rollback plan and the owner actions. Tag the release.
4. A hotfix branches from `{{PROD}}`, merges back to `{{PROD}}`, then back-merges into `{{PRE}}` the same day.
5. Database/schema/infrastructure changes that need a manual deploy are listed in the release PR under **Owner actions**; the application must tolerate the old schema until the deploy is done.

## 8. What the agent does at each task (git steps)
1. `git fetch`; branch from the right base with the right name; confirm the working tree is clean and say if it is not.
2. Make small commits that each build.
3. Run the checks listed in `CLAUDE.md`; fix; run again.
4. Push, open the PR with the template filled with real command output, and report the link.
5. After the owner merges, delete nothing and push nothing else until told; start the next task from the updated base.
