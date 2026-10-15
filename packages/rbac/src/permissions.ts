// Vocabulary of things that can be protected. Keep coarse (module level) in Phase 0; split
// resources only when a real role needs different access to the parts.

export const ACTIONS = ["read", "create", "update", "delete", "export", "approve"] as const;
export type Action = (typeof ACTIONS)[number];

export const RESOURCES = [
  // Dashboards ("Global Metrics" column of the SSOT matrix)
  "dashboard_school", // full-school metrics (Principal)
  "dashboard_finance",
  "dashboard_academic",
  "dashboard_system", // system health
  // Finance silo
  "finance", // fees, invoices, payments, ledger, expenses
  "payroll",
  "reports_finance",
  // Academic silo
  "students", // student profiles & enrolment
  "academics", // classes, subjects, timetable, exams
  "grades", // marks / gradebook entries
  "attendance", // student attendance
  "substitution", // assigning substitute teachers
  "reports_academic",
  // People / HR
  "staff", // staff profiles & memberships
  "staff_attendance", // a staff member's own check-in/out
  "leave", // leave requests (approve = Principal)
  // Operations
  "transport",
  "announcements",
  "messages", // 1:1 direct messaging (office hours enforced separately)
  // Administration
  "settings", // school settings, roles & permissions, integrations
  "audit_log",
  // Platform (SUPER_ADMIN only)
  "platform_schools",
] as const;
export type Resource = (typeof RESOURCES)[number];

/**
 * How far a grant reaches.
 *  - school: every record in the user's school
 *  - own:    only records belonging to the user (their classes, their leave, their routes)
 *  - linked: only records of students linked to the user as guardian
 */
export const SCOPES = ["school", "own", "linked"] as const;
export type Scope = (typeof SCOPES)[number];

export interface Grant {
  readonly actions: readonly Action[];
  readonly scope: Scope;
}

/** Resource groups used by isolation rules and tests. */
export const FINANCE_RESOURCES: readonly Resource[] = ["dashboard_finance", "finance", "payroll", "reports_finance"];
export const ACADEMIC_RESOURCES: readonly Resource[] = [
  "dashboard_academic",
  "students",
  "academics",
  "grades",
  "attendance",
  "substitution",
  "reports_academic",
];
