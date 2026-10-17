# ADR-0001: Tenant isolation model

- **Status:** Accepted (2026-10-15, on the instruction to implement Phase 0; reverse by superseding this ADR)
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

## Addendum (2026-10-17): database region
Owner decision: the production database is in **Mumbai (`asia-south1`)**, for latency to Indian schools and to keep student records of minors in India. `dataconnect/dataconnect.yaml` and the generated SDK carry the location; the emulator ignores it. Not covered by this decision and to check before promising "data stays in India": Firebase Authentication (user emails and phone numbers) and Cloudflare R2 object storage have their own locations, and a legal review of the India DPDP Act obligations for minors' data is still needed.

