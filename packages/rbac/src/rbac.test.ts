import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ACADEMIC_RESOURCES,
  ACTIONS,
  ASSUMED_GRANTS,
  FINANCE_RESOURCES,
  GLOBAL_MATRIX,
  HR_RESOURCES,
  INBOX_RESOURCES,
  SELF_SERVICE_RESOURCES,
  grantsOf,
  GLOBAL_ROLES,
  MATRIX,
  NAV,
  RESOURCES,
  ROLES,
  authorize,
  can,
  navigationFor,
  permissionsOf,
  type Action,
  type Resource,
  type Role,
} from "./index.js";

const as = (schoolRole: string | null | undefined, globalRole: string = "USER") => ({ schoolRole, globalRole });
const WRITE: readonly Action[] = ["create", "update", "delete"];
const anyAction = (role: Role, resources: readonly Resource[], actions: readonly Action[] = ACTIONS) =>
  resources.some((r) => actions.some((a) => can(as(role), r, a)));

describe("E-RBAC: SSOT §4 matrix cells (locked)", () => {
  it("Principal: finance, attendance, academics, settings are READ-ONLY", () => {
    for (const r of ["finance", "payroll", "attendance", "academics", "students", "grades", "settings"] as const) {
      expect(can(as("PRINCIPAL"), r, "read"), `${r}:read`).toBe(true);
      for (const a of WRITE) expect(can(as("PRINCIPAL"), r, a), `${r}:${a}`).toBe(false);
    }
    expect(can(as("PRINCIPAL"), "dashboard_school", "read")).toBe(true);
  });

  it("Principal can approve leave and payroll runs (explicit exceptions); its only writes are self-service on its OWN records", () => {
    expect(can(as("PRINCIPAL"), "leave", "approve")).toBe(true);
    expect(can(as("PRINCIPAL"), "payroll", "approve")).toBe(true);
    const writes = permissionsOf(as("PRINCIPAL")).filter((p) => WRITE.includes(p.action));
    expect(writes.length).toBeGreaterThan(0); // check-in and own leave request
    // The one other write is writing announcements, which the owner gave the Principal and the Academic admin (ADR-0014 decision 11).
    for (const w of writes.filter((x) => x.resource !== "announcements")) {
      expect([...SELF_SERVICE_RESOURCES, ...INBOX_RESOURCES] as readonly string[], `${w.resource}:${w.action}`).toContain(w.resource);
      expect(w.scope, `${w.resource}:${w.action}`).toBe("own");
    }
    expect(writes.filter((x) => x.resource === "announcements").map((x) => x.action).sort()).toEqual(["create", "update"]);
    const approvals = permissionsOf(as("PRINCIPAL")).filter((p) => p.action === "approve");
    expect(approvals.map((p) => p.resource).sort()).toEqual(["leave", "payroll"]); // leave requests and the monthly payroll run (ADR-0012)
  });

  it("Finance Admin: full CRUD on finance + payroll; NO attendance, academics, settings", () => {
    for (const a of ["read", "create", "update", "delete"] as const) {
      expect(can(as("BURSAR"), "finance", a)).toBe(true);
      expect(can(as("BURSAR"), "payroll", a)).toBe(true);
    }
    for (const r of ["attendance", "academics", "students", "grades", "settings", "dashboard_academic", "dashboard_system"] as const)
      for (const a of ACTIONS) expect(can(as("BURSAR"), r, a), `${r}:${a}`).toBe(false);
    expect(can(as("BURSAR"), "dashboard_finance", "read")).toBe(true);
  });

  it("Academic Admin: full CRUD on attendance + academics; NO finance, settings", () => {
    for (const a of ["read", "create", "update", "delete"] as const) {
      expect(can(as("ACADEMIC_ADMIN"), "attendance", a)).toBe(true);
      expect(can(as("ACADEMIC_ADMIN"), "academics", a)).toBe(true);
    }
    for (const r of ["finance", "payroll", "reports_finance", "settings", "dashboard_finance", "dashboard_system"] as const)
      for (const a of ACTIONS) expect(can(as("ACADEMIC_ADMIN"), r, a), `${r}:${a}`).toBe(false);
    expect(can(as("ACADEMIC_ADMIN"), "dashboard_academic", "read")).toBe(true);
  });

  it("System Admin: full CRUD on settings; NO finance, attendance, academics", () => {
    for (const a of ["read", "create", "update", "delete"] as const) expect(can(as("SYSTEM_ADMIN"), "settings", a)).toBe(true);
    for (const r of [...FINANCE_RESOURCES, ...ACADEMIC_RESOURCES])
      for (const a of ACTIONS) expect(can(as("SYSTEM_ADMIN"), r, a), `${r}:${a}`).toBe(false);
    expect(can(as("SYSTEM_ADMIN"), "dashboard_system", "read")).toBe(true);
    expect(can(as("SYSTEM_ADMIN"), "audit_log", "read")).toBe(true); // guardrails §3
  });
});

describe("E-RBAC: silos and isolation", () => {
  it("Finance and Academic silos never overlap for the siloed admin roles", () => {
    expect(anyAction("BURSAR", ACADEMIC_RESOURCES)).toBe(false);
    expect(anyAction("ACADEMIC_ADMIN", FINANCE_RESOURCES)).toBe(false);
  });

  it("only audit_log is readable by System Admin among non-admin data; audit log is read-only for everyone", () => {
    for (const role of ROLES) for (const a of [...WRITE, "export", "approve"] as const) expect(can(as(role), "audit_log", a)).toBe(false);
    expect(ROLES.filter((r) => can(as(r), "audit_log", "read"))).toEqual(["SYSTEM_ADMIN"]);
  });

  it("nobody else can approve payroll: not HR who prepares it, not the Bursar who pays it", () => {
    for (const role of ROLES.filter((r) => r !== "PRINCIPAL")) expect(can(as(role), "payroll", "approve"), role).toBe(false);
  });

  it("only the Principal can approve anything", () => {
    expect(ROLES.filter((r) => anyAction(r, RESOURCES, ["approve"]))).toEqual(["PRINCIPAL"]);
  });

  it("scope: teachers/staff/drivers are 'own', parents are 'linked', admins are 'school'", () => {
    expect(authorize(as("TEACHER"), "attendance", "create")).toEqual({ allowed: true, scope: "own" });
    expect(authorize(as("DRIVER"), "transport", "update")).toEqual({ allowed: true, scope: "own" });
    expect(authorize(as("PARENT"), "students", "read")).toEqual({ allowed: true, scope: "linked" });
    expect(authorize(as("PARENT"), "attendance", "read")).toEqual({ allowed: true, scope: "linked" });
    expect(authorize(as("BURSAR"), "finance", "update")).toEqual({ allowed: true, scope: "school" });
  });

  it("parents are read-only on children's data and cannot touch other tenants' people data", () => {
    for (const r of ["students", "attendance", "grades", "academics", "transport"] as const)
      for (const a of WRITE) expect(can(as("PARENT"), r, a), `${r}:${a}`).toBe(false);
    for (const r of ["staff", "payroll", "settings", "audit_log", "leave", "substitution"] as const)
      for (const a of ACTIONS) expect(can(as("PARENT"), r, a), `${r}:${a}`).toBe(false);
  });

  it("teachers cannot reach finance, payroll, settings, audit or other people's staff data", () => {
    for (const r of [...FINANCE_RESOURCES, "settings", "audit_log", "staff"] as const)
      for (const a of ACTIONS) expect(can(as("TEACHER"), r, a), `${r}:${a}`).toBe(false);
  });

  it("delete is held only by the owning role: settings=System Admin, staff=System Admin+HR, finance and payroll=Bursar, attendance and students=Academic Admin", () => {
    const deleters = (r: Resource) => ROLES.filter((role) => can(as(role), r, "delete"));
    expect(deleters("settings")).toEqual(["SYSTEM_ADMIN"]);
    expect(deleters("staff").sort()).toEqual(["HR_MANAGER", "SYSTEM_ADMIN"]);
    expect(deleters("finance")).toEqual(["BURSAR"]); // Accountant corrects with adjusting entries, never deletes
    expect(deleters("payroll")).toEqual(["BURSAR"]); // HR prepares payroll, only the finance silo deletes
    expect(deleters("attendance")).toEqual(["ACADEMIC_ADMIN"]);
    expect(deleters("students")).toEqual(["ACADEMIC_ADMIN"]); // Admissions Officer enrols, cannot delete
  });
});

describe("E-RBAC: deny by default", () => {
  it("unknown / missing / malformed roles are denied everything", () => {
    for (const bad of [undefined, null, "", "ADMIN", "principal", "SUPER_ADMIN", "__proto__", "constructor"])
      for (const r of RESOURCES) for (const a of ACTIONS) expect(can(as(bad as string), r, a), `${String(bad)} ${r}:${a}`).toBe(false);
  });

  it("unknown resources and actions are denied, never throw", () => {
    expect(can(as("BURSAR"), "nonexistent", "read")).toBe(false);
    expect(can(as("BURSAR"), "finance", "teleport")).toBe(false);
    expect(can(as("BURSAR"), "__proto__", "read")).toBe(false);
    expect(can(as("BURSAR"), "finance", "constructor")).toBe(false);
    expect(can({}, "finance", "read")).toBe(false);
  });

  it("a missing or non-object subject is denied, never throws (unauthenticated request)", () => {
    for (const bad of [null, undefined, 0, "", "BURSAR", [], true] as unknown[]) {
      expect(() => authorize(bad as never, "finance", "read"), String(bad)).not.toThrow();
      expect(can(bad as never, "finance", "read"), String(bad)).toBe(false);
      expect(navigationFor(bad as never), String(bad)).toEqual([]);
      expect(permissionsOf(bad as never), String(bad)).toEqual([]);
    }
  });

  it("a school role cannot be smuggled in via globalRole and vice versa", () => {
    expect(can({ globalRole: "BURSAR", schoolRole: null }, "finance", "read")).toBe(false);
    expect(can({ globalRole: "USER", schoolRole: "SUPER_ADMIN" }, "platform_schools", "read")).toBe(false);
  });
});

describe("E-RBAC: platform (SUPER_ADMIN)", () => {
  it("manages tenants but has NO access to any tenant data, even with a school role absent", () => {
    const sa = { globalRole: "SUPER_ADMIN", schoolRole: null };
    for (const a of ["read", "create", "update", "delete"] as const) expect(can(sa, "platform_schools", a)).toBe(true);
    for (const r of RESOURCES.filter((r) => r !== "platform_schools")) for (const a of ACTIONS) expect(can(sa, r, a), `${r}:${a}`).toBe(false);
  });

  it("no school role can manage platform_schools", () => {
    for (const role of ROLES) for (const a of ACTIONS) expect(can(as(role), "platform_schools", a)).toBe(false);
  });
});

describe("E-RBAC: matrix integrity", () => {
  it("every role has an entry, and every grant references a known resource and action", () => {
    expect(Object.keys(MATRIX).sort()).toEqual([...ROLES].sort());
    expect(Object.keys(GLOBAL_MATRIX).sort()).toEqual([...GLOBAL_ROLES].sort());
    for (const grants of [...Object.values(MATRIX), ...Object.values(GLOBAL_MATRIX)])
      for (const [resource, set] of Object.entries(grants)) {
        expect(RESOURCES as readonly string[]).toContain(resource);
        for (const grant of grantsOf(set)) {
          expect(grant.actions.length).toBeGreaterThan(0);
          for (const a of grant.actions) expect(ACTIONS as readonly string[]).toContain(a);
        }
      }
  });

  it("no dead resources: every resource is granted to at least one role", () => {
    const granted = new Set<string>([...Object.values(MATRIX), ...Object.values(GLOBAL_MATRIX)].flatMap((g) => Object.keys(g)));
    expect(RESOURCES.filter((r) => !granted.has(r))).toEqual([]);
  });

  it("write grants always include read (no write-only access)", () => {
    for (const [role, grants] of Object.entries(MATRIX))
      for (const [resource, set] of Object.entries(grants))
        for (const grant of grantsOf(set)) {
          const writes = grant.actions.some((a) => WRITE.includes(a));
          if (writes) expect(grant.actions, `${role}/${resource}`).toContain("read");
        }
  });

  it("assumed grants point at real grants (list cannot rot silently)", () => {
    for (const [role, resource] of ASSUMED_GRANTS) expect(MATRIX[role][resource], `${role}/${resource}`).toBeDefined();
  });

  it("ASSUMED_GRANTS is exactly the set of cells tagged [ASSUMED] in matrix.ts (the owner confirms what is listed, so the list must be complete)", () => {
    const src = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "matrix.ts"), "utf8");
    const start = src.indexOf("const EXPLICIT");
    const end = src.indexOf("/** Roles that are NOT employees");
    let role: string | null = null;
    const tagged = new Set<string>();
    for (const line of src.slice(start, end).split("\n")) {
      const r = line.match(/^  ([A-Z_]+): \{$/);
      if (r) role = r[1] ?? null;
      const c = line.match(/^    (\w+): .*\[ASSUMED/);
      if (role && c) tagged.add(`${role}/${c[1]}`);
    }
    const listed = new Set(ASSUMED_GRANTS.map(([r, res]) => `${r}/${res}`));
    expect([...tagged].filter((x) => !listed.has(x)), "tagged [ASSUMED] but missing from ASSUMED_GRANTS").toEqual([]);
    expect([...listed].filter((x) => !tagged.has(x)), "listed in ASSUMED_GRANTS but not tagged [ASSUMED] in the matrix").toEqual([]);
    expect(tagged.size).toBeGreaterThan(25);
  });
});

describe("E-RBAC: navigation omits what you cannot read (design rule: never disabled)", () => {
  const keys = (role: Role) => navigationFor(as(role)).flatMap((s) => s.items.map((i) => i.key));

  it("Finance Admin sees finance/payroll/finance reports, and no academics/attendance/settings", () => {
    const k = keys("BURSAR");
    expect(k).toEqual(expect.arrayContaining(["dashboard-finance", "finance", "payroll", "reports-finance"]));
    for (const hidden of ["students", "attendance", "gradebook", "settings", "classes", "audit"]) expect(k).not.toContain(hidden);
  });

  it("System Admin sees settings, staff and audit, no finance or academics", () => {
    const k = keys("SYSTEM_ADMIN");
    expect(k).toEqual(expect.arrayContaining(["settings", "staff", "audit", "dashboard-system"]));
    for (const hidden of ["finance", "payroll", "students", "attendance"]) expect(k).not.toContain(hidden);
  });

  it("no empty sections are returned, and every nav item maps to a real resource", () => {
    for (const role of ROLES) for (const section of navigationFor(as(role))) expect(section.items.length).toBeGreaterThan(0);
    for (const section of NAV) for (const item of section.items) expect(RESOURCES as readonly string[]).toContain(item.requires);
  });

  it("an unknown role gets an empty navigation", () => {
    expect(navigationFor(as("NOPE"))).toEqual([]);
    expect(navigationFor({})).toEqual([]);
  });
});

describe("E-RBAC: extended roles (HR, Accountant, Admissions, Transport, Operations, Management)", () => {
  const gets = (role: Role, resource: Resource, actions: readonly Action[]) => actions.every((a) => can(as(role), resource, a));
  const none = (role: Role, resources: readonly Resource[]) => resources.filter((r) => ACTIONS.some((a) => can(as(role), r, a)));

  it("HR Manager: owns staff, staff attendance, recruitment, HR reports; prepares payroll but cannot delete it", () => {
    expect(gets("HR_MANAGER", "staff", ["read", "create", "update", "delete", "export"])).toBe(true);
    expect(gets("HR_MANAGER", "recruitment", ["read", "create", "update", "delete"])).toBe(true);
    expect(gets("HR_MANAGER", "payroll", ["read", "create", "update", "export"])).toBe(true);
    expect(can(as("HR_MANAGER"), "payroll", "delete")).toBe(false);
    expect(authorize(as("HR_MANAGER"), "staff_attendance", "update")).toEqual({ allowed: true, scope: "school" });
    expect(can(as("HR_MANAGER"), "dashboard_hr", "read")).toBe(true);
  });

  it("HR Manager manages leave but can NEVER approve it (guardrail section 4: Principal approval cannot be bypassed)", () => {
    expect(gets("HR_MANAGER", "leave", ["read", "create", "update"])).toBe(true);
    expect(can(as("HR_MANAGER"), "leave", "approve")).toBe(false);
  });

  it("HR Manager has no fee/finance, student, academic or settings access and cannot grant roles", () => {
    expect(none("HR_MANAGER", [...ACADEMIC_RESOURCES, "finance", "reports_finance", "dashboard_finance", "settings", "memberships", "audit_log"])).toEqual([]);
  });

  it("Accountant: fees/payments/expenses/ledger read-write-export, no delete, no payroll, no academics", () => {
    expect(gets("ACCOUNTANT", "finance", ["read", "create", "update", "export"])).toBe(true);
    expect(can(as("ACCOUNTANT"), "finance", "delete")).toBe(false);
    expect(can(as("ACCOUNTANT"), "payroll", "read")).toBe(false);
    expect(none("ACCOUNTANT", [...ACADEMIC_RESOURCES, ...HR_RESOURCES, "settings", "memberships", "audit_log"])).toEqual([]);
    expect(gets("ACCOUNTANT", "reports_finance", ["read", "export"])).toBe(true);
  });

  it("Admissions Officer: admissions CRUD and enrols students (no delete); reads classes; nothing financial", () => {
    expect(gets("ADMISSIONS_OFFICER", "admissions", ["read", "create", "update", "delete"])).toBe(true);
    expect(gets("ADMISSIONS_OFFICER", "students", ["read", "create", "update"])).toBe(true);
    expect(can(as("ADMISSIONS_OFFICER"), "students", "delete")).toBe(false);
    expect(can(as("ADMISSIONS_OFFICER"), "academics", "update")).toBe(false);
    expect(none("ADMISSIONS_OFFICER", [...FINANCE_RESOURCES, "attendance", "grades", "staff", "settings", "memberships"])).toEqual([]);
  });

  it("Transport and Operations managers are confined to their own modules", () => {
    expect(gets("TRANSPORT_MANAGER", "transport", ["read", "create", "update", "delete"])).toBe(true);
    expect(gets("OPERATIONS_MANAGER", "operations", ["read", "create", "update", "delete"])).toBe(true);
    expect(none("TRANSPORT_MANAGER", [...FINANCE_RESOURCES, ...ACADEMIC_RESOURCES, "staff", "operations", "settings"])).toEqual([]);
    expect(none("OPERATIONS_MANAGER", [...FINANCE_RESOURCES, ...ACADEMIC_RESOURCES, "staff", "transport", "settings"])).toEqual([]);
  });

  it("Management sees dashboards and reports only: no raw finance, payroll, student or staff records, no writes", () => {
    expect(can(as("MANAGEMENT"), "dashboard_school", "read")).toBe(true);
    expect(none("MANAGEMENT", ["finance", "payroll", "students", "grades", "attendance", "staff", "leave", "settings", "memberships", "audit_log", "recruitment", "admissions"].filter((r) => !SELF_SERVICE_RESOURCES.includes(r as Resource)) as Resource[])).toEqual([]);
    const writes = permissionsOf(as("MANAGEMENT")).filter((p) => WRITE.includes(p.action));
    for (const w of writes) expect([...SELF_SERVICE_RESOURCES, ...INBOX_RESOURCES] as readonly string[]).toContain(w.resource);
  });

  it("only System Admin can grant or change school roles (privilege-escalation guard)", () => {
    for (const a of ["create", "update", "delete"] as const)
      expect(ROLES.filter((r) => can(as(r), "memberships", a)), a).toEqual(["SYSTEM_ADMIN"]);
    expect(ROLES.filter((r) => can(as(r), "memberships", "read"))).toEqual(["SYSTEM_ADMIN"]);
  });

  it("only the Principal may approve, still (HR/Accountant/Management never approve anything)", () => {
    expect(ROLES.filter((r) => anyAction(r, RESOURCES, ["approve"]))).toEqual(["PRINCIPAL"]);
  });

  it("Principal can see staff attendance school-wide (dashboard: 'Are teachers present?')", () => {
    expect(authorize(as("PRINCIPAL"), "staff_attendance", "read")).toEqual({ allowed: true, scope: "school" });
    expect(can(as("PRINCIPAL"), "staff_attendance", "update")).toBe(false);
  });
});

describe("E-RBAC: self-service baseline (every employee role, no parents)", () => {
  const employees = ROLES.filter((r) => r !== "PARENT");

  it("every employee role can check in and request its own leave, at own scope only", () => {
    for (const role of employees) {
      expect(authorize(as(role), "staff_attendance", "create"), role).toMatchObject({ allowed: true });
      expect(authorize(as(role), "leave", "create"), role).toMatchObject({ allowed: true });
    }
  });

  it("self-service never widens beyond own unless the role has an explicit wider grant", () => {
    for (const role of ["ACCOUNTANT", "BURSAR", "TEACHER", "STAFF", "DRIVER", "TRANSPORT_MANAGER", "OPERATIONS_MANAGER", "ADMISSIONS_OFFICER"] as Role[]) {
      expect(authorize(as(role), "staff_attendance", "create"), role).toEqual({ allowed: true, scope: "own" });
      expect(authorize(as(role), "leave", "create"), role).toEqual({ allowed: true, scope: "own" });
    }
    expect(authorize(as("HR_MANAGER"), "staff_attendance", "create")).toEqual({ allowed: true, scope: "school" });
    expect(authorize(as("HR_MANAGER"), "leave", "create")).toEqual({ allowed: true, scope: "school" });
  });

  it("the widest scope wins when a role holds grants at several scopes", () => {
    expect(authorize(as("PRINCIPAL"), "leave", "read")).toEqual({ allowed: true, scope: "school" });
    expect(authorize(as("PRINCIPAL"), "leave", "create")).toEqual({ allowed: true, scope: "own" });
    expect(authorize(as("BURSAR"), "leave", "read")).toEqual({ allowed: true, scope: "school" });
    expect(authorize(as("BURSAR"), "leave", "create")).toEqual({ allowed: true, scope: "own" });
  });

  it("parents are not employees: no check-in, no leave", () => {
    for (const r of SELF_SERVICE_RESOURCES) for (const a of ACTIONS) expect(can(as("PARENT"), r, a), `${r}:${a}`).toBe(false);
  });

  it("self-service does not let a role read OTHER people's leave or attendance", () => {
    for (const role of ["ACCOUNTANT", "TEACHER", "STAFF", "DRIVER", "TRANSPORT_MANAGER", "OPERATIONS_MANAGER", "ADMISSIONS_OFFICER", "SYSTEM_ADMIN"] as Role[]) {
      expect(authorize(as(role), "staff_attendance", "read"), role).toEqual({ allowed: true, scope: "own" });
      expect(authorize(as(role), "leave", "read"), role).toEqual({ allowed: true, scope: "own" });
    }
  });

  it("ERP navigation ignores own-scope grants: an accountant's sidebar has no HR items", () => {
    const keys = navigationFor(as("ACCOUNTANT")).flatMap((s) => s.items.map((i) => i.key));
    expect(keys).toEqual(expect.arrayContaining(["dashboard-finance", "finance", "reports-finance"]));
    for (const hidden of ["leave", "staff-attendance", "payroll", "staff", "students", "memberships"]) expect(keys).not.toContain(hidden);
    // Field roles and parents use the mobile apps: their only school-wide read is announcements.
    for (const role of ["TEACHER", "STAFF", "DRIVER", "PARENT"] as Role[])
      expect(navigationFor(as(role)).flatMap((s) => s.items.map((i) => i.key)), role).toEqual(["announcements"]);
  });
});

describe("E-RBAC: navigation for the extended roles", () => {
  const keys = (role: Role) => navigationFor(as(role)).flatMap((s) => s.items.map((i) => i.key));

  it("HR Manager sees the DesignDoc HR menu: dashboard, staff, attendance, leave, payroll, recruitment, reports", () => {
    expect(keys("HR_MANAGER")).toEqual(expect.arrayContaining(["dashboard-hr", "staff", "staff-attendance", "leave", "payroll", "recruitment", "reports-hr"]));
    for (const hidden of ["finance", "students", "attendance", "settings", "memberships"]) expect(keys("HR_MANAGER")).not.toContain(hidden);
  });

  it("each functional role sees its own module and nothing from another silo", () => {
    expect(keys("ADMISSIONS_OFFICER")).toEqual(expect.arrayContaining(["admissions", "students", "classes"]));
    expect(keys("TRANSPORT_MANAGER")).toEqual(expect.arrayContaining(["dashboard-operations", "transport"]));
    expect(keys("OPERATIONS_MANAGER")).toEqual(expect.arrayContaining(["dashboard-operations", "operations"]));
    expect(keys("SYSTEM_ADMIN")).toEqual(expect.arrayContaining(["memberships", "audit", "settings"]));
    for (const role of ["ADMISSIONS_OFFICER", "TRANSPORT_MANAGER", "OPERATIONS_MANAGER"] as Role[]) {
      expect(keys(role)).not.toContain("finance");
      expect(keys(role)).not.toContain("payroll");
    }
  });

  it("Management sees the school dashboard and reports", () => {
    expect(keys("MANAGEMENT")).toEqual(expect.arrayContaining(["dashboard", "reports-finance", "reports-academic", "reports-hr"]));
    expect(keys("MANAGEMENT")).not.toContain("finance");
  });
});
