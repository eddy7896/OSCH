# Live Documents & API Specs

This document acts as an index for living documentation, API specifications, and dynamic project statuses.

## Current Project Status
- **Phase:** 0 — Foundation implemented; Phase 1 (API gateway & SaaS foundation) next (see `project_plan.md`)
- **Milestone:** Governance, hardened schema, RBAC package, design-token pipeline, themed app shells. Open owner items: `implementation_plan.md` §Phase 0 status.
- **Latest audit:** `audit_2026-10-15.md`

## Living Documentation Links

### 1. API Specifications
*(To be generated)*
- [NestJS Swagger UI / OpenAPI Spec](#)
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
- [Implementation plan (task-level)](implementation_plan.md) · [Project plan & phase gates](project_plan.md) · [Eval plan](eval_plan.md) · [Audit 2026-10-15](audit_2026-10-15.md)
- Decisions: [ADR-0001 tenancy](decisions/ADR-0001-tenant-isolation.md), [ADR-0002 auth](decisions/ADR-0002-auth-provider.md), [ADR-0003 mobile DB](decisions/ADR-0003-mobile-local-db.md), [ADR-0004 money & time](decisions/ADR-0004-money-and-time.md), [ADR-0005 design foundation](decisions/ADR-0005-design-foundation.md), [ADR-0006 languages & RTL](decisions/ADR-0006-languages.md), [ADR-0007 extended roles](decisions/ADR-0007-roles.md)
- [Environment & secrets](environment.md)
