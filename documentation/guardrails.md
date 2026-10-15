# Security & Architectural Guardrails

## 1. Multi-Tenant Isolation
The primary risk in a SaaS platform is data leakage between tenants.
- **Guardrail (ADR-0001):** One shared schema with row-level tenancy. Every tenant table carries a direct `school` reference; every Data Connect operation takes `$schoolId` and filters by it; operations are `@auth(level: NO_ACCESS)` and callable only by the gateway (Admin SDK). Cross-tenant writes are aborted inside the database (`@check` / scoped `where`), verified by `npm run test:dataconnect`.
- **Verification:** All backend service methods must require a `tenantId` (extracted from the JWT token, not the request body) before interacting with the database.

## 2. Role-Based Access Control (RBAC)
Administrative staff are siloed based on the principle of least privilege.
- **Guardrail:** The API Gateway MUST utilize strict guards/middleware on every route to verify the user's role against the required permissions.
- **Matrix:**
  - **Principal:** Read-only access to data. The only write-like power is *approving* requests (e.g. leave), modelled as an explicit `approve` action.
  - **Finance Admin:** Full access to Finance; NO access to Academics/Attendance.
  - **Academic Admin:** Full access to Academics/Attendance; NO access to Finance.
- **Source of truth:** the matrix is code, in `packages/rbac` (tested; see its README for assumptions awaiting owner confirmation).
- **Verification:** UI components should also hide restricted actions to prevent 403 errors (`navigationFor()` omits unavailable modules).

## 3. Communication Boundaries
- **Guardrail:** Teachers and Parents cannot initiate unrestricted, un-auditable messaging.
- **Rule:** Direct Messaging operates strictly within "Office Hours". All messages must be logged to a central audit trail accessible by the System Admin.

## 4. Substitution & Payroll Integrity
- **Guardrail:** When a teacher takes unpaid leave, the system must definitively trigger a payroll deduction alert and an academic substitution alert.
- **Rule:** Leave requests must go through the Principal Approval flow. Do not allow teachers to bypass this workflow.

## 5. Offline Data Reconciliation
- **Guardrail:** The backend is the ultimate source of truth, but mobile clients act optimistically.
- **Rule:** The API must handle conflict resolution gracefully (e.g., if two teachers mark attendance offline and sync later, the system must resolve it based on timestamps or specific business logic, without crashing the sync queue).

## 6. Extended roles (ADR-0007)
Beyond the four SSOT silos the platform models `MANAGEMENT`, `HR_MANAGER`, `ACCOUNTANT`, `ADMISSIONS_OFFICER`, `TRANSPORT_MANAGER`, `OPERATIONS_MANAGER` and the field roles. Hard rules enforced by `packages/rbac` tests:
- **Only the Principal approves.** HR manages leave balances and types but can never approve leave.
- **Only the System Admin can grant or change school roles** (`memberships`), so HR can onboard staff without being able to promote anyone.
- **Preparing is not paying or deleting:** HR prepares payroll (no delete), the Accountant cannot delete finance records, the Admissions Officer cannot delete students.
- **Silos hold:** Accountant has no payroll/academics/HR; HR has no fees/academics; Transport and Operations managers see only their own module; Management sees dashboards and reports only.
- **Every employee** can check in and request their own leave, at own scope only. Parents are not employees.
