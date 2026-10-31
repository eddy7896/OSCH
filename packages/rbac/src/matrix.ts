// The permission matrix. Deny by default: anything not listed here is forbidden.
//
// Provenance of each grant (so reviewers know what is documented vs inferred):
//   [SSOT]   the RBAC table in "OruSchools SSOT.md" §4 (Principal / Finance Admin / Academic Admin / IT-System Admin)
//   [GUARD]  documentation/guardrails.md
//   [DESIGN] documentation/DesignDoc.md / design_system_spec.md (app purposes, ERP module list, permission examples)
//   [ASSUMED] inferred to make the system usable; NOT stated anywhere. Owner confirmed the v1 assumptions
//            (2026-10-15); new assumptions added with the extended roles are listed in ASSUMED_GRANTS.
//
// Tests lock every [SSOT] and [GUARD] cell; [ASSUMED] cells are listed in ASSUMED_GRANTS and tested for presence only.

import { SELF_SERVICE_RESOURCES, grantsOf, type Grant, type GrantSet, type Resource } from "./permissions.js";
import type { GlobalRole, Role } from "./roles.js";

const school = (...actions: Grant["actions"]): Grant => ({ actions, scope: "school" });
const own = (...actions: Grant["actions"]): Grant => ({ actions, scope: "own" });
const linked = (...actions: Grant["actions"]): Grant => ({ actions, scope: "linked" });

const CRUD = ["read", "create", "update", "delete"] as const;
const CRUD_EXPORT = [...CRUD, "export"] as const;
/** Create/update with history: for records that are corrected, never destroyed (no delete). */
const RW_EXPORT = ["read", "create", "update", "export"] as const;

export type RoleGrants = Partial<Record<Resource, GrantSet>>;

/** Check in/out and request leave for yourself. Every employee role gets this (see withSelfService). */
export const SELF_SERVICE: RoleGrants = {
  staff_attendance: own("read", "create"), // [DESIGN] Staff / Teacher / Driver apps: personal attendance
  leave: own("read", "create"), // [DESIGN] Staff / Teacher apps: leave requests (approval is Principal only [GUARD §4])
};

/** The in-app inbox (ADR-0013 decision 9): EVERY role, parents included, reads and marks read their own notifications. It is not part of the employee baseline above. */
export const INBOX: RoleGrants = {
  notifications: own("read", "update"),
};

const EXPLICIT: Readonly<Record<Role, RoleGrants>> = {
  // [SSOT] Principal: global metrics full; financial, attendance, academics, settings READ-ONLY.
  // Read-only is absolute for data; the ONLY write-like power is approving requests ("approve"), [GUARD §4] / [SSOT §7].
  PRINCIPAL: {
    dashboard_school: school("read"),
    finance: school("read"),
    payroll: school("read", "approve"), // [SSOT] payroll is part of financial data; [ADR-0012] a monthly payroll run is approved by the Principal and nobody else
    reports_finance: school("read", "export"), // [ASSUMED] export of reports
    attendance: school("read"),
    student_leave: school("read"), // [ADR-0016]
    learning_resources: school("read"), // [ADR-0016]
    students: school("read"),
    academics: school("read"),
    grades: school("read"),
    admissions: school("read"), // [ASSUMED] oversight of the new roles' modules
    reports_academic: school("read", "export"), // [ASSUMED]
    staff: school("read"), // [ASSUMED]
    staff_attendance: school("read"), // [DESIGN §9] the principal dashboard answers "Are teachers present?"
    recruitment: school("read"), // [ASSUMED]
    reports_hr: school("read", "export"), // [ASSUMED]
    operations: school("read"), // [ASSUMED]
    leave: school("read", "approve"), // [GUARD §4] leave goes through Principal approval
    transport: school("read"), // [DESIGN] principal dashboard shows transport
    announcements: school("read", "create", "update"), // [ADR-0014 decision 11] the Principal and the Academic admin write announcements
    settings: school("read"),
  },

  // [DESIGN] "Management" is listed among ERP users (monitoring, analytics). Oversight without raw records.
  MANAGEMENT: {
    dashboard_school: school("read"), // [DESIGN]
    reports_finance: school("read", "export"), // [ASSUMED] aggregates only: no raw finance, payroll or student records
    reports_academic: school("read", "export"), // [ASSUMED]
    reports_hr: school("read", "export"), // [ASSUMED]
    announcements: school("read"), // [ASSUMED]
  },

  // [SSOT] Finance Admin: finance full CRUD (+ payroll per system_context); NO attendance, academics, settings.
  BURSAR: {
    dashboard_finance: school("read"),
    finance: school(...CRUD_EXPORT),
    payroll: school(...CRUD_EXPORT),
    reports_finance: school("read", "export"),
    leave: school("read"), // [ASSUMED] needs approved unpaid leave to compute payroll deductions [GUARD §4]
    announcements: school("read"), // [ADR-0014 decision 11] every staff role reads announcements
  },

  // [SSOT] Academic Admin: attendance + academics full CRUD; NO finance, settings.
  ACADEMIC_ADMIN: {
    dashboard_academic: school("read"),
    students: school(...CRUD_EXPORT), // [ASSUMED] admissions/enrolment sit with Academic Admin
    admissions: school(...CRUD_EXPORT), // [ASSUMED] same reason; shared with ADMISSIONS_OFFICER
    academics: school(...CRUD_EXPORT),
    grades: school(...CRUD_EXPORT),
    attendance: school(...CRUD_EXPORT),
    substitution: school("read", "create", "update"), // [SSOT §7] "Academic Admin: Assign Substitute"
    learning_resources: school("read", "create", "delete"), // [ADR-0016] may share for any class and remove any
    student_leave: school("read", "update"), // [ADR-0016] decides a parent's request for a child's leave (the class teacher may too)
    reports_academic: school("read", "export"),
    leave: school("read"), // [ASSUMED] must see leave to plan substitutes
    staff: school("read"), // [ASSUMED] must see teachers to assign substitutes
    announcements: school("read", "create", "update"), // [ADR-0014 decision 11]
  },

  // [SSOT] IT / System Admin: system settings full CRUD; NO finance, attendance, academics.
  SYSTEM_ADMIN: {
    dashboard_system: school("read"),
    settings: school(...CRUD),
    staff: school(...CRUD), // [ASSUMED] user/membership/role management is a system function
    memberships: school(...CRUD), // [ASSUMED] ONLY role that may grant or change school roles (privilege-escalation guard)
    audit_log: school("read"), // [GUARD §3] message audit trail accessible by the System Admin
    announcements: school("read"), // [ADR-0014 decision 11] every staff role reads announcements
  },

  // [DESIGN] "HR Manager might see: Dashboard, Staff, Attendance, Leave, Payroll, Recruitment".
  HR_MANAGER: {
    dashboard_hr: school("read"), // [DESIGN]
    staff: school(...CRUD_EXPORT), // [DESIGN] HR owns staff profiles/records. Cannot grant roles (see memberships)
    staff_attendance: school(...RW_EXPORT), // [DESIGN] "Attendance" under HR; corrections are updates, never deletes [ASSUMED]
    leave: school("read", "create", "update"), // [DESIGN] manages balances/types; NOT approve: Principal only [GUARD §4]
    payroll: school(...RW_EXPORT), // [DESIGN] prepares payroll; [ASSUMED] Bursar (finance silo) keeps delete
    recruitment: school(...CRUD_EXPORT), // [DESIGN] "Recruitment" module
    reports_hr: school("read", "export"), // [DESIGN] "HR Reports"
    announcements: school("read"), // [ASSUMED]
  },

  // [DESIGN] "Accountant might see: Dashboard, Fees, Payments, Expenses, Ledger, Reports". No payroll, no academics.
  ACCOUNTANT: {
    dashboard_finance: school("read"), // [DESIGN]
    finance: school(...RW_EXPORT), // [DESIGN]; [ASSUMED] no delete: books are corrected by adjusting entries (Bursar may delete)
    reports_finance: school("read", "export"), // [DESIGN]
    announcements: school("read"), // [ASSUMED]
  },

  // [SSOT] "Admission Setup" ERP module; roadmap Phase 2 "People Management (HR/Admissions): admitting Students".
  ADMISSIONS_OFFICER: {
    admissions: school(...CRUD_EXPORT), // [SSOT]
    students: school(...RW_EXPORT), // [ASSUMED] enrols on admit; no delete (Academic Admin only)
    academics: school("read"), // [ASSUMED] sees classes/sections and capacity to place students
    announcements: school("read"), // [ASSUMED]
  },

  // [DESIGN] ERP "Transport: Vehicles, Routes, Drivers, Students"; "Is transportation running normally?"
  TRANSPORT_MANAGER: {
    dashboard_operations: school("read"), // [DESIGN]
    transport: school(...CRUD_EXPORT), // [DESIGN] student manifests are reached through transport, not the students module
    announcements: school("read"), // [ASSUMED]
  },

  // [DESIGN] ERP "Operations: Inventory, Assets, Procurement, Visitors".
  OPERATIONS_MANAGER: {
    dashboard_operations: school("read"), // [DESIGN]
    operations: school(...CRUD_EXPORT), // [DESIGN]
    announcements: school("read"), // [ASSUMED]
  },

  // [DESIGN] Teacher app: attendance, gradebook, own classes, parent communication (leave/check-in via SELF_SERVICE).
  TEACHER: {
    attendance: own("read", "create", "update"),
    students: own("read"),
    academics: own("read"),
    grades: own("read", "create", "update"),
    student_leave: own("read", "update"), // [ADR-0016] the class teacher of the child's class reads and decides; the gateway narrows `own` to that class
    learning_resources: own("read", "create", "delete"), // [ADR-0016] the gateway narrows `own` to the classes and subjects she teaches, and removal to her own uploads
    announcements: school("read"),
    messages: own("read", "create"), // office-hours rule is business logic outside RBAC [GUARD §3]
  },

  // [DESIGN] Staff app: personal attendance, leave, tasks, announcements (SELF_SERVICE covers the first two).
  STAFF: {
    announcements: school("read"),
  },

  // [DESIGN] Driver app: route, boarding records (SELF_SERVICE covers attendance and leave).
  DRIVER: {
    transport: own("read", "update"),
    announcements: school("read"),
  },

  // [DESIGN] Parent app: read-only view of own children + fees + transport + messages. NOT an employee: no self-service.
  PARENT: {
    students: linked("read"),
    attendance: linked("read"),
    grades: linked("read"),
    academics: linked("read"), // timetable
    finance: linked("read", "create"), // view invoices; "create" = initiate a payment [ASSUMED action mapping]
    transport: linked("read"),
    student_leave: linked("read", "create", "update"), // [ADR-0016] ask leave for their own child; update is only cancelling a waiting request
    learning_resources: linked("read"), // [ADR-0016] the resources of the classes their linked children are in
    announcements: school("read"),
    messages: own("read", "create"),
  },
};

/** Roles that are NOT employees and therefore get no self-service grants. */
export const NON_EMPLOYEE_ROLES: readonly Role[] = ["PARENT"];

/** Append the self-service grants to every employee role (a role keeps any wider explicit grant). */
function withSelfService(role: Role, grants: RoleGrants): RoleGrants {
  if (NON_EMPLOYEE_ROLES.includes(role)) return grants;
  const out: Record<string, GrantSet> = { ...grants };
  for (const resource of SELF_SERVICE_RESOURCES) {
    const base = SELF_SERVICE[resource];
    if (base) out[resource] = [...grantsOf(grants[resource]), ...grantsOf(base)];
  }
  return out;
}

export const MATRIX: Readonly<Record<Role, RoleGrants>> = Object.fromEntries(
  (Object.keys(EXPLICIT) as Role[]).map((role) => [role, { ...withSelfService(role, EXPLICIT[role]), ...INBOX }]),
) as Record<Role, RoleGrants>;

/** SUPER_ADMIN manages tenants only. It deliberately has NO access to any tenant's data. */
export const GLOBAL_MATRIX: Readonly<Record<GlobalRole, RoleGrants>> = {
  SUPER_ADMIN: {
    platform_schools: { actions: [...CRUD, "export"], scope: "school" },
  },
  USER: {},
};

/**
 * Grants inferred rather than documented. Kept as data so a reviewer (and the README) can list exactly what needs
 * the owner's confirmation. The v1 set was confirmed 2026-10-15; entries below marked NEW came with the extended roles.
 */
export const ASSUMED_GRANTS: ReadonlyArray<readonly [Role, Resource]> = [
  ["PRINCIPAL", "reports_finance"],
  ["PRINCIPAL", "reports_academic"],
  ["PRINCIPAL", "staff"],
  ["BURSAR", "leave"],
  ["ACADEMIC_ADMIN", "students"],
  ["ACADEMIC_ADMIN", "leave"],
  ["ACADEMIC_ADMIN", "staff"],
  ["SYSTEM_ADMIN", "staff"],
  ["PARENT", "finance"],
  // NEW with the extended roles
  ["PRINCIPAL", "admissions"],
  ["PRINCIPAL", "recruitment"],
  ["PRINCIPAL", "reports_hr"],
  ["PRINCIPAL", "operations"],
  ["ACADEMIC_ADMIN", "admissions"],
  ["SYSTEM_ADMIN", "memberships"],
  ["MANAGEMENT", "reports_finance"],
  ["MANAGEMENT", "reports_academic"],
  ["MANAGEMENT", "reports_hr"],
  ["ACCOUNTANT", "finance"],
  ["HR_MANAGER", "payroll"],
  ["HR_MANAGER", "staff_attendance"],
  ["ADMISSIONS_OFFICER", "students"],
  ["ADMISSIONS_OFFICER", "academics"],
  ["MANAGEMENT", "announcements"],
  ["HR_MANAGER", "announcements"],
  ["ACCOUNTANT", "announcements"],
  ["ADMISSIONS_OFFICER", "announcements"],
  ["TRANSPORT_MANAGER", "announcements"],
  ["OPERATIONS_MANAGER", "announcements"],
];
