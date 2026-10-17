# Live Documents & API Specs

This document acts as an index for living documentation, API specifications, and dynamic project statuses.

## Current Project Status
- **Phase:** 0 — Foundation implemented; Phase 1 (API gateway & SaaS foundation) next (see `project_plan.md`)
- **Milestone:** Governance, hardened schema, RBAC package, design-token pipeline, themed app shells. Open owner items: `implementation_plan.md` §Phase 0 status.
- **Phase 1 progress:** P1-0a/0b, P1-1, P1-2a/b/c, P1-3a/b/c/d, P1-4, P1-5, P1-6a, P1-6b, P1-6c, P1-6d, P1-7 done (CI green on all three jobs; Node 22 floor; gateway skeleton on branch `app/api-gateway`). Next: P1-6e public school lookup, then P1-13/P1-14 and the clients (P1-8..P1-11).
- **Web fonts:** self-hosted WOFF2 (`next/font/local`), see ADR-0006 addendum; replaces `next/font/google`, which made CI builds fail at random.
- **Owner decisions (2026-10-17):** database in Mumbai (`asia-south1`); sign-in by email+password, Google and phone code; first SUPER_ADMIN is the project owner (bootstrap script ready); staging deferred. Details: `phase1_plan.md` §9.

- **Staff/driver accounts (ADR-0011):** System Admin creates the account; email gets a set-password link (never a password), phone-only signs in by one-time code.
- **Latest audit:** `audit_2026-10-15.md`

## Living Documentation Links

### 1. API Specifications
*(To be generated)*
- OpenAPI spec (generated, committed): `apps/api-gateway/openapi.json`
- [Firebase Data Connect Schema (`.gql` files)](#)

### 2. Design System & UI Components
- [Design system rules](design-system/README.md) · [tokens.json](design-system/tokens.json) · [component specs](design-system/components/) · [previews](design-system/previews/)
- [Brand guidelines](brand-assets/Brand-guidelines.md) · [Brand assets](brand-assets/)
- [Engineering index & open design decisions](design_system_spec.md)
- *(To be generated)* Storybook for `packages/shared-ui`; Flutter widget catalog for `packages/flutter-core`

### 3. Database Schema Map
*(To be generated)*
- Visual representation of the Firebase Data Connect PostgreSQL schema relations (Tenants, Users, Schools, Grades, Fees).

## How to Update
This file should be continuously updated as the project evolves. Whenever a new feature module is completed, its corresponding documentation should be linked here.

## Governance & Quality Docs
- [CLAUDE.md](../CLAUDE.md) — agent/developer guide and definition of done
- [**Phase 1 plan**](phase1_plan.md) · [Implementation plan (task-level)](implementation_plan.md) · [Project plan & phase gates](project_plan.md) · [Eval plan](eval_plan.md) · [Audit 2026-10-15](audit_2026-10-15.md)
- Decisions: [ADR-0001 tenancy](decisions/ADR-0001-tenant-isolation.md), [ADR-0002 auth](decisions/ADR-0002-auth-provider.md), [ADR-0003 mobile DB](decisions/ADR-0003-mobile-local-db.md), [ADR-0004 money & time](decisions/ADR-0004-money-and-time.md), [ADR-0005 design foundation](decisions/ADR-0005-design-foundation.md), [ADR-0006 languages & RTL](decisions/ADR-0006-languages.md), [ADR-0007 extended roles](decisions/ADR-0007-roles.md), [ADR-0008 gateway foundations](decisions/ADR-0008-gateway-foundations.md), [ADR-0009 web auth](decisions/ADR-0009-web-auth.md), [ADR-0010 branching & environments](decisions/ADR-0010-branching-and-environments.md)
- [Environment & secrets](environment.md)
