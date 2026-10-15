# ADR-0001: Tenant isolation model

- **Status:** Proposed (2026-10-15) — needs owner sign-off
- **Supersedes:** "separate schema per school" wording in `guardrails.md`, `system_memory.md`, `OruSchools SSOT.md` §2

## Context
Docs say each school gets its own PostgreSQL schema. The implemented `dataconnect/schema/schema.gql` is a single schema where tenant tables carry a `school` reference. Firebase Data Connect has one schema per service and generates one typed SDK from it; I found nothing in the repo that provisions per-tenant schemas, and per-tenant schemas would break generated SDKs and migrations (N schemas to migrate). This should be confirmed against current Data Connect docs before relying on it.

## Decision
Shared schema, **row-level tenancy by `schoolId`**, enforced in layers:
1. Gateway resolves `schoolId` from the verified Firebase ID token + `SchoolMember` lookup (never from body/query).
2. Every Data Connect operation requires `$schoolId` and filters on it; `@auth(level: NO_ACCESS)`, called only via Admin SDK.
3. Every tenant table has a **direct** `school` column (Invoice currently doesn't — fix before Phase 2 finance work).
4. Automated: `check:drift` (dc-tenant-scope, dc-public-auth) + cross-tenant eval suite (E-TEN-*).

## Consequences
- Isolation depends on code discipline → the evals and drift checks are mandatory, not optional.
- Cheap migrations, one generated SDK.
- Revisit (schema-per-tenant or DB-per-tenant) only if a customer requires physical isolation.
