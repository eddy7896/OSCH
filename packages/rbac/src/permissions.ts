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
  "dashboard_hr",
  "dashboard_operations", // transport + operations health
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
  "admissions", // applications, enquiries, admission decisions
  // People / HR
  "staff", // staff profiles and HR records
  "staff_attendance", // staff check-in/out (own scope = self-service; school scope = HR/oversight)
  "leave", // leave requests (approve = Principal only, guardrail section 4)
  "notifications", // the in-app inbox: everyone reads and marks read their own (P3-9)
  "recruitment",
  "reports_hr",
  // Operations
  "operations", // inventory, assets, procurement, visitors
  "transport",
  "announcements",
  "messages", // 1:1 direct messaging (office hours enforced separately)
  // Administration
  "settings", // school settings, integrations
  "memberships", // who may log in to this school and WITH WHICH ROLE (granting roles is privilege escalation)
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

/** A role may hold several grants on one resource at different scopes (e.g. read school-wide, create only for itself). */
export type GrantSet = Grant | readonly Grant[];
export const grantsOf = (g: GrantSet | undefined): readonly Grant[] => (g === undefined ? [] : Array.isArray(g) ? g : [g as Grant]);

/** Wider scope wins when several grants allow the same action. `linked` and `own` never coexist on one resource. */
export const SCOPE_RANK: Readonly<Record<Scope, number>> = { own: 0, linked: 1, school: 2 };

/** Resource groups used by isolation rules and tests. */
export const FINANCE_RESOURCES: readonly Resource[] = ["dashboard_finance", "finance", "payroll", "reports_finance"];
export const HR_RESOURCES: readonly Resource[] = ["dashboard_hr", "staff", "recruitment", "reports_hr", "payroll"];
export const ACADEMIC_RESOURCES: readonly Resource[] = [
  "dashboard_academic",
  "students",
  "academics",
  "grades",
  "attendance",
  "substitution",
  "admissions",
  "reports_academic",
];

/**
 * Self-service resources every EMPLOYEE role gets at `own` scope: check in/out and request leave. Defined once
 * (see SELF_SERVICE in matrix.ts) so no role is forgotten. Principal data stays read-only: these are the only
 * writes a read-only role may hold, and only on the user's own records.
 */
export const SELF_SERVICE_RESOURCES: readonly Resource[] = ["staff_attendance", "leave"];

/** Resources every role holds at `own` scope regardless of being an employee: today only the in-app inbox (ADR-0013 decision 9). Reading and marking read are the only writes a read-only role may have besides self-service. */
export const INBOX_RESOURCES: readonly Resource[] = ["notifications"];
