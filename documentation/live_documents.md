# Live Documents & API Specs

This document acts as an index for living documentation, API specifications, and dynamic project statuses.

## Current Project Status
- **Phase:** 0 — Foundation (see `project_plan.md`)
- **Milestone:** Governance in place (CLAUDE.md, ADRs 0001-0003 *proposed*, drift check, evals). Next: ADR sign-off, root git repo, `packages/rbac`, then `apps/api-gateway`.
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
- Decisions: [ADR-0001 tenancy](decisions/ADR-0001-tenant-isolation.md), [ADR-0002 auth](decisions/ADR-0002-auth-provider.md), [ADR-0003 mobile DB](decisions/ADR-0003-mobile-local-db.md)
