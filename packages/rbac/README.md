# @oruschools/rbac

Single source of truth for **who may do what**. Used by the API gateway (enforcement), the web apps (navigation) and, via codegen later, Flutter.

```ts
import { authorize, can, navigationFor } from "@oruschools/rbac";

const subject = { globalRole: "USER", schoolRole: "ACCOUNTANT" }; // schoolRole resolved by the gateway from SchoolMember, never from the client
can(subject, "finance", "update");        // true
can(subject, "finance", "delete");        // false: books are corrected by adjusting entries
authorize(subject, "payroll", "read");    // { allowed: false }   deny by default
authorize({ schoolRole: "TEACHER" }, "attendance", "create"); // { allowed: true, scope: "own" }
authorize(null, "finance", "read");       // { allowed: false }   a missing subject is a deny, never an exception
navigationFor(subject);                   // only the ERP sidebar items this subject can read school-wide (omit, never disable)
```

## Roles (14, ADR-0007)
| Group | Role | In one line |
|---|---|---|
| Leadership | `PRINCIPAL` | read-only on data (its only writes are own-scope self-service: check-in and its own leave request); the **only** role that approves (leave); reads school-wide staff attendance |
| | `MANAGEMENT` | dashboards and reports only; no raw records |
| Silos (SSOT) | `BURSAR` | Finance Admin: full finance and payroll |
| | `ACADEMIC_ADMIN` | full academics, attendance, students, admissions; assigns substitutes |
| | `SYSTEM_ADMIN` | settings, staff, **memberships (the only role that grants roles)**, audit log |
| Functional | `HR_MANAGER` | staff, staff attendance, leave balances (never approves), payroll prep (no delete), recruitment, HR reports |
| | `ACCOUNTANT` | fees, payments, expenses, ledger, finance reports: read/create/update/export, **no delete, no payroll** |
| | `ADMISSIONS_OFFICER` | admissions CRUD, enrols students (no delete), reads classes |
| | `TRANSPORT_MANAGER` | transport module only |
| | `OPERATIONS_MANAGER` | inventory, assets, procurement, visitors only |
| Field | `TEACHER`, `STAFF`, `DRIVER` | own-scope work in the mobile apps |
| External | `PARENT` | read-only, linked children only; can start a payment |

## Model
- **Resources** x **actions** (`read create update delete export approve`) x **scope** (`school` | `own` | `linked`).
- **Deny by default**: unknown role, resource, action, or a missing subject returns `{ allowed: false }`, never an exception.
- **Multi-scope grants**: a role may hold several grants on a resource at different scopes; the widest scope that allows the action wins.
- **Self-service baseline**: every employee role (all but `PARENT`) can check in/out and request its **own** leave (`SELF_SERVICE`). Defined once; never widens beyond `own`; adds no ERP navigation.
- **Two namespaces**: `GLOBAL_MATRIX` (platform: SUPER_ADMIN manages tenants only, **no** tenant-data access) and `MATRIX` (per-school roles).
- Roles must equal the Data Connect enums `SchoolRole`/`GlobalRole` (`evals/spec.test.mjs` E-RBAC-S1).

## Documented vs assumed
Cells from the SSOT RBAC table, the guardrails and the DesignDoc module lists are tagged `[SSOT]`, `[GUARD]`, `[DESIGN]` in `src/matrix.ts` and **locked by tests**. The Principal is read-only on data; its only write-like power is `approve` on `leave`. The v1 assumptions were confirmed by the owner on 2026-10-15. Grants added with the extended roles are inferred and **need the same confirmation** (`ASSUMED_GRANTS`, "NEW" section):

| Role | Resource | Grant | Why it was assumed |
|---|---|---|---|
| PRINCIPAL | admissions, recruitment, reports_hr, operations | read (+export for reports) | oversight of the new modules |
| ACADEMIC_ADMIN | admissions | CRUD + export | admissions sit with Academic Admin as well as the Admissions Officer |
| SYSTEM_ADMIN | memberships | CRUD | only role that may grant or change roles (privilege-escalation guard) |
| MANAGEMENT | reports_finance, reports_academic, reports_hr | read, export | aggregates only; no raw records |
| ACCOUNTANT | finance | read, create, update, export | no delete: adjusting entries instead (Bursar deletes) |
| HR_MANAGER | payroll | read, create, update, export | prepares payroll; Bursar keeps delete (DesignDoc lists Payroll for HR) |
| HR_MANAGER | staff_attendance | school-wide read/create/update/export | corrections are updates, never deletes |
| ADMISSIONS_OFFICER | students, academics | students read/create/update/export; academics read | enrols on admit; sees classes and capacity |
| MANAGEMENT, HR_MANAGER, ACCOUNTANT, ADMISSIONS_OFFICER, TRANSPORT_MANAGER, OPERATIONS_MANAGER | announcements | read | every staff role should see school announcements; read-only |

`ASSUMED_GRANTS` is checked by a test against the `[ASSUMED]` tags in `src/matrix.ts` in both directions, so this list cannot silently fall behind the code.

Not modelled yet: Vice Principal, Librarian, Receptionist (see ADR-0007).

## Commands
`npm run build|typecheck|lint|test -w @oruschools/rbac` (46 tests; mutation-checked: widening a scope, giving HR `approve`, giving an Accountant payroll, letting HR grant roles, or giving parents self-service each make tests fail).
