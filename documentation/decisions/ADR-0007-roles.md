# ADR-0007: Extended role model

- **Status:** Accepted (2026-10-15, owner instruction: model HR, Accountant and the other roles the product needs; the v1 RBAC assumptions were confirmed)
- **Extends:** `OruSchools SSOT.md` section 4 (four administrative roles); implemented in `packages/rbac`

## Decision
14 school roles, as a Data Connect enum `SchoolRole` kept equal to `packages/rbac` `ROLES` by an eval:

| Group | Roles |
|---|---|
| Leadership | `PRINCIPAL` (read-only on data, the only role that **approves**), `MANAGEMENT` (dashboards and reports only) |
| Administrative silos (SSOT) | `BURSAR` (Finance Admin), `ACADEMIC_ADMIN`, `SYSTEM_ADMIN` |
| Functional administrators (from the DesignDoc ERP modules and examples) | `HR_MANAGER`, `ACCOUNTANT`, `ADMISSIONS_OFFICER`, `TRANSPORT_MANAGER`, `OPERATIONS_MANAGER` |
| Field roles (mobile apps) | `TEACHER`, `STAFF`, `DRIVER` |
| External | `PARENT` |

Principles that came out of modelling them:
1. **Silos stay silos.** HR has no fees and no academics; Accountant has no payroll, no academics, no HR; Admissions has no finance; Transport and Operations managers see only their module.
2. **Preparing is not paying or deleting.** HR prepares payroll (read/create/update/export) but only the Bursar deletes it; the Accountant corrects books with adjusting entries and cannot delete finance records; the Admissions Officer enrols students but cannot delete them.
3. **Only the Principal approves**, including leave. HR manages leave balances and types but can never approve it (guardrail section 4: the approval flow cannot be bypassed).
4. **Granting roles is its own permission** (`memberships`): only `SYSTEM_ADMIN` can create or change who may log in and with which role, so HR can onboard staff profiles without being able to promote anyone (privilege-escalation guard).
5. **Multi-scope grants.** A role may hold several grants on one resource at different scopes (`school`, `own`, `linked`); the widest scope that allows the action wins.
6. **Self-service baseline.** Every employee role (everyone except `PARENT`) can check in/out and request its **own** leave, defined once (`SELF_SERVICE`). A read-only Principal's only writes are these own-scope self-service actions (tested). Self-service never widens to other people's records and never adds ERP navigation items (nav requires school scope).

## Consequences
- The schema enum grew from 8 to 14 values; verified on the emulator (including against the previously migrated local database) and by the tenancy test for every role value.
- Roles named in the docs but still not modelled: Vice Principal, Librarian, Receptionist/front desk, Lab assistant (covered by generic `STAFF`). Add by extending `ROLES`, the schema enum and the matrix; the evals will force all three to agree.
- New inferred grants are listed in `ASSUMED_GRANTS` and `packages/rbac/README.md` for owner confirmation.
