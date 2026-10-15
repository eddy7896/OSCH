// Role identifiers. MUST match the Data Connect enums `GlobalRole` and `SchoolRole`
// (dataconnect/schema/schema.gql); evals/spec.test.mjs fails if they drift.

/** Platform-level role stored on User. SUPER_ADMIN manages tenants, never tenant data. */
export const GLOBAL_ROLES = ["SUPER_ADMIN", "USER"] as const;
export type GlobalRole = (typeof GLOBAL_ROLES)[number];

/** Per-school role stored on SchoolMember. */
export const ROLES = [
  // Leadership / oversight
  "PRINCIPAL", // "Principal / Director": read-only on data, approves requests
  "MANAGEMENT", // trustees / owners: dashboards and reports only
  // Administrative silos (SSOT RBAC table)
  "BURSAR", // "Finance Admin": full finance + payroll
  "ACADEMIC_ADMIN",
  "SYSTEM_ADMIN", // "IT / System Admin": settings, access, audit
  // Functional administrators (DesignDoc: "HR Manager", "Accountant", ERP Transport / Operations / Admission modules)
  "HR_MANAGER",
  "ACCOUNTANT",
  "ADMISSIONS_OFFICER",
  "TRANSPORT_MANAGER",
  "OPERATIONS_MANAGER",
  // Field roles (mobile apps)
  "TEACHER",
  "STAFF", // generic non-teaching employee: office, lab assistants, support staff
  "DRIVER",
  // External
  "PARENT",
] as const;
export type Role = (typeof ROLES)[number];

export const isRole = (value: unknown): value is Role =>
  typeof value === "string" && (ROLES as readonly string[]).includes(value);
