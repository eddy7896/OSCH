# Security & Architectural Guardrails

## 1. Multi-Tenant Isolation
The primary risk in a SaaS platform is data leakage between tenants.
- **Guardrail:** The database MUST use separate schemas per tenant or enforce strict Row-Level Security (RLS) on a single schema via Firebase Data Connect.
- **Verification:** All backend service methods must require a `tenantId` (extracted from the JWT token, not the request body) before interacting with the database.

## 2. Role-Based Access Control (RBAC)
Administrative staff are siloed based on the principle of least privilege.
- **Guardrail:** The API Gateway MUST utilize strict guards/middleware on every route to verify the user's role against the required permissions.
- **Matrix:**
  - **Principal:** Read-only access to most systems.
  - **Finance Admin:** Full access to Finance; NO access to Academics/Attendance.
  - **Academic Admin:** Full access to Academics/Attendance; NO access to Finance.
- **Verification:** UI components should also hide restricted actions to prevent 403 errors.

## 3. Communication Boundaries
- **Guardrail:** Teachers and Parents cannot initiate unrestricted, un-auditable messaging.
- **Rule:** Direct Messaging operates strictly within "Office Hours". All messages must be logged to a central audit trail accessible by the System Admin.

## 4. Substitution & Payroll Integrity
- **Guardrail:** When a teacher takes unpaid leave, the system must definitively trigger a payroll deduction alert and an academic substitution alert.
- **Rule:** Leave requests must go through the Principal Approval flow. Do not allow teachers to bypass this workflow.

## 5. Offline Data Reconciliation
- **Guardrail:** The backend is the ultimate source of truth, but mobile clients act optimistically.
- **Rule:** The API must handle conflict resolution gracefully (e.g., if two teachers mark attendance offline and sync later, the system must resolve it based on timestamps or specific business logic, without crashing the sync queue).
