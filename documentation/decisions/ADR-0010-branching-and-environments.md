# ADR-0010: Branching, staging and production

- **Status:** Accepted (2026-10-15) — requested by the owner
- **Builds on:** ADR-0008 (gateway), `documentation/phase1_plan.md` P1-12 (staging)

## Context
Eight apps and shared packages live in one repository. The owner wants each app developed on its own branch, then promoted through a staging system, and only then merged to `main`, which is production.

## Decision
```
feat|fix|chore/<app>/<topic>  ->  app/<app>  ->  staging  ->  main (production)
hotfix/<name>  ->  main, then main -> staging (back-merge)
```
- **`main` = production.** Accepts only `staging` or `hotfix/*`. Each merge is a release.
- **`staging` = pre-production.** Accepts `app/<app>` branches, `hotfix/*` and a back-merge of `main`. Every merge here deploys to the staging environment (deploy jobs arrive with P1-12; the GitHub environments `staging` and `production` are named for them).
- **`app/<app>`** is the long-lived branch of one app: `api-gateway`, `web-admin`, `saas-admin`, `landing-page`, `mobile-teacher`, `mobile-staff`, `mobile-parent`, `mobile-driver`, plus **`app/shared`** for everything outside `apps/` (`packages/`, `dataconnect/`, `tools/`, `evals/`, `documentation/`, `.github/`, root files).
- **Ownership is enforced:** a PR from `app/<x>` into `staging` fails if it changes files owned by another app (lockfiles excepted). A change that spans apps is split: shared first (`app/shared` -> `staging`), then each app.
- Topic branches are `feat|fix|chore/<app>/<topic>` and merge only into their own `app/<app>`.
- Enforcement: `tools/checks/branch-policy.mjs` (evals E-BRANCH-1..5) run by `.github/workflows/branch-policy.yml` on every PR; the main `ci` workflow runs on `main`, `staging` and `app/**`.

## Required GitHub settings (cannot be set from the repo; owner action)
Settings → Branches → protection rules for `main` and `staging`: require a pull request, require status checks `JS/TS`, `Flutter`, `Data Connect` and `Branch policy`, block force pushes and deletion, require the branch to be up to date. For `main` also require one approval. Settings → Environments: create `staging` and `production` (production with required reviewers).

## Consequences
- Long-lived `app/*` branches drift from `staging`; each must merge `staging` back in before its PR (the up-to-date rule enforces it).
- Shared-package changes reach apps only after landing on `staging`; this is deliberate, apps never silently depend on unreleased shared code.
- Staging is promoted to production as a whole: a broken app on staging blocks the release of the others until fixed or reverted. Accepted for a small team; revisit if release cadence per app diverges.
