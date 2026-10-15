// Role identifiers. MUST match the Data Connect enums `GlobalRole` and `SchoolRole`
// (dataconnect/schema/schema.gql); evals/spec.test.mjs fails if they drift.

/** Platform-level role stored on User. SUPER_ADMIN manages tenants, never tenant data. */
export const GLOBAL_ROLES = ["SUPER_ADMIN", "USER"] as const;
export type GlobalRole = (typeof GLOBAL_ROLES)[number];

/** Per-school role stored on SchoolMember. */
export const ROLES = [
  "PRINCIPAL",
  "BURSAR", // "Finance Admin" in the docs
  "ACADEMIC_ADMIN",
  "SYSTEM_ADMIN", // "IT / System Admin" in the docs
  "TEACHER",
  "STAFF",
  "DRIVER",
  "PARENT",
] as const;
export type Role = (typeof ROLES)[number];

export const isRole = (value: unknown): value is Role =>
  typeof value === "string" && (ROLES as readonly string[]).includes(value);
