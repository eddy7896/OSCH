import { SCOPE_RANK, type Resource, type Scope } from "./permissions.js";
import { authorize, type Subject } from "./authorize.js";

/**
 * ERP SideNav structure (DesignDoc §7). Each item names the resource whose `read` unlocks it.
 * Rule from the design system: unavailable modules are OMITTED, never shown disabled.
 * Items without a modelled resource yet (inventory, procurement, recruitment…) are intentionally absent:
 * add them with their resource when their phase starts.
 */
export interface NavItemDef {
  readonly key: string;
  readonly label: string;
  readonly requires: Resource;
  /**
   * Narrowest scope that earns this item (default "school"). The ERP sidebar is for school-wide modules; `own`/`linked`
   * access (a teacher's classes, an accountant's own leave) is served by the mobile apps, so it must not add ERP items.
   */
  readonly minScope?: Scope;
}
export interface NavSectionDef {
  readonly title: string;
  readonly items: readonly NavItemDef[];
}

export const NAV: readonly NavSectionDef[] = [
  { title: "Overview", items: [
    { key: "dashboard", label: "Dashboard", requires: "dashboard_school" },
    { key: "dashboard-finance", label: "Dashboard", requires: "dashboard_finance" },
    { key: "dashboard-academic", label: "Dashboard", requires: "dashboard_academic" },
    { key: "dashboard-system", label: "Dashboard", requires: "dashboard_system" },
    { key: "dashboard-hr", label: "Dashboard", requires: "dashboard_hr" },
    { key: "dashboard-operations", label: "Dashboard", requires: "dashboard_operations" },
  ] },
  { title: "Academics", items: [
    { key: "students", label: "Students", requires: "students" },
    { key: "classes", label: "Classes and subjects", requires: "academics" },
    { key: "attendance", label: "Attendance", requires: "attendance" },
    { key: "gradebook", label: "Gradebook", requires: "grades" },
    { key: "substitution", label: "Substitutions", requires: "substitution" },
  ] },
  { title: "People", items: [
    { key: "admissions", label: "Admissions", requires: "admissions" },
    { key: "staff", label: "Staff", requires: "staff" },
  ] },
  { title: "HR", items: [
    { key: "staff-attendance", label: "Staff attendance", requires: "staff_attendance" },
    { key: "leave", label: "Leave", requires: "leave" },
    { key: "payroll", label: "Payroll", requires: "payroll" },
    { key: "recruitment", label: "Recruitment", requires: "recruitment" },
  ] },
  { title: "Finance", items: [{ key: "finance", label: "Fees and payments", requires: "finance" }] },
  { title: "Communication", items: [{ key: "announcements", label: "Announcements", requires: "announcements" }] },
  { title: "Transport", items: [{ key: "transport", label: "Transport", requires: "transport" }] },
  { title: "Operations", items: [{ key: "operations", label: "Operations", requires: "operations" }] },
  { title: "Reports", items: [
    { key: "reports-academic", label: "Academic reports", requires: "reports_academic" },
    { key: "reports-finance", label: "Financial reports", requires: "reports_finance" },
    { key: "reports-hr", label: "HR reports", requires: "reports_hr" },
  ] },
  { title: "Administration", items: [
    { key: "settings", label: "School settings", requires: "settings" },
    { key: "memberships", label: "Users and roles", requires: "memberships" },
    { key: "audit", label: "Audit log", requires: "audit_log" },
  ] },
];

/** Navigation for a subject: only items they can read; sections left empty are dropped. */
export function navigationFor(subject: Subject | null | undefined): NavSectionDef[] {
  return NAV.map((section) => ({
    title: section.title,
    items: section.items.filter((item) => {
      const d = authorize(subject, item.requires, "read");
      return d.allowed && SCOPE_RANK[d.scope] >= SCOPE_RANK[item.minScope ?? "school"];
    }),
  })).filter((section) => section.items.length > 0);
}
