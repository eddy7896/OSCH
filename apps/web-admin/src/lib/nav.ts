import type { IconName } from "@oruschools/shared-ui";

/** Message key for a navigation group title, by the title the gateway sends (the structure lives in packages/rbac). */
export const SECTION_KEY: Record<string, string> = {
  Overview: "sectionOverview",
  Academics: "sectionAcademics",
  People: "sectionPeople",
  HR: "sectionHr",
  Finance: "sectionFinance",
  Communication: "sectionCommunication",
  Transport: "sectionTransport",
  Operations: "sectionOperations",
  Reports: "sectionReports",
  Administration: "sectionAdministration",
};

/** Message key and icon for a navigation item, by the key the gateway sends. The six dashboards share one word. */
export const ITEM: Record<string, { label: string; icon: IconName }> = {
  dashboard: { label: "navDashboard", icon: "home" },
  "dashboard-finance": { label: "navDashboard", icon: "home" },
  "dashboard-academic": { label: "navDashboard", icon: "home" },
  "dashboard-system": { label: "navDashboard", icon: "home" },
  "dashboard-hr": { label: "navDashboard", icon: "home" },
  "dashboard-operations": { label: "navDashboard", icon: "home" },
  students: { label: "navStudents", icon: "users" },
  classes: { label: "navClasses", icon: "book" },
  attendance: { label: "navAttendance", icon: "calendar" },
  gradebook: { label: "navGradebook", icon: "chart" },
  substitution: { label: "navSubstitution", icon: "user-minus" },
  admissions: { label: "navAdmissions", icon: "user-plus" },
  staff: { label: "navStaff", icon: "users" },
  "staff-attendance": { label: "navStaffAttendance", icon: "clock" },
  leave: { label: "navLeave", icon: "leave" },
  payroll: { label: "navPayroll", icon: "payments" },
  recruitment: { label: "navRecruitment", icon: "user-plus" },
  finance: { label: "navFees", icon: "payments" },
  announcements: { label: "navAnnouncements", icon: "bell" },
  transport: { label: "navTransport", icon: "bus" },
  operations: { label: "navOperations", icon: "grid" },
  "reports-academic": { label: "navReportsAcademic", icon: "chart" },
  "reports-finance": { label: "navReportsFinance", icon: "chart" },
  "reports-hr": { label: "navReportsHr", icon: "chart" },
  settings: { label: "navSettings", icon: "grid" },
  memberships: { label: "navMemberships", icon: "users" },
  audit: { label: "navAudit", icon: "tasks" },
};

/** `SYSTEM_ADMIN` -> `roleSystemAdmin`. */
export const roleKey = (role: string) => `role${role.toLowerCase().replace(/(^|_)([a-z])/g, (_m, _u, c: string) => c.toUpperCase())}`;

export const isDashboard = (key: string) => key.startsWith("dashboard");
