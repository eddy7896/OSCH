import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@oruschools/api-client";
import { navigationFor, permissionsOf, ROLES, type Role } from "@oruschools/rbac";
import { WebAdminApp } from "@/components/WebAdminApp";
import { IN, fakePort, me, renderApp, SCHOOL } from "./helpers";

vi.mock("@/i18n/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ replace: vi.fn() }) }));

/**
 * P2-11: the web UI only omits what the gateway would refuse. For every school role, built from the REAL role matrix (packages/rbac):
 *  1. the sidebar holds exactly the items the matrix gives that role;
 *  2. opening any screen never calls an API operation the role is not granted (the gateway would answer 403);
 *  3. each action button (add, import, approve, reverse...) is on screen exactly when the role holds the grant for it.
 */

/** Which grant an API method needs: [resource, action]. Methods the screens call; a method missing here fails the test, so nothing slips in unchecked. */
const NEEDS: Record<string, [string, string]> = {
  reportsCollections: ["reports_finance", "read"], reportsDues: ["reports_finance", "read"], reportsCollectionsExport: ["reports_finance", "export"], reportsDuesExport: ["reports_finance", "export"],
  reportsPayroll: ["reports_hr", "read"], reportsPayrollExport: ["reports_hr", "export"],
  studentsList: ["students", "read"], studentsGet: ["students", "read"], studentsCreate: ["students", "create"], importsStudentsDryRun: ["students", "create"], importsStudents: ["students", "create"],
  staffList: ["staff", "read"], staffGet: ["staff", "read"], staffDepartments: ["staff", "read"], staffCreate: ["staff", "create"], importsStaffDryRun: ["staff", "create"], importsStaff: ["staff", "create"],
  academicsClasses: ["academics", "read"], academicsLevels: ["academics", "read"], academicsYears: ["academics", "read"], academicsSubjects: ["academics", "read"],
  academicsCreateClass: ["academics", "create"], academicsCreateSubject: ["academics", "create"], academicsCreateYear: ["academics", "create"],
  academicsDeleteClass: ["academics", "delete"], academicsDeleteSubject: ["academics", "delete"], academicsActivateYear: ["academics", "update"],
  scheduleGet: ["academics", "read"], teachingTeachers: ["academics", "read"], timetableForClass: ["academics", "read"], timetableForStaff: ["academics", "read"], timetableLoad: ["academics", "read"],
  scheduleCreate: ["academics", "create"], scheduleTemplate: ["academics", "create"], scheduleUpdate: ["academics", "update"], scheduleSetWorkingDays: ["academics", "update"], timetableSetSlot: ["academics", "update"],
  scheduleRemove: ["academics", "delete"], timetableClear: ["academics", "delete"],
  attendanceDay: ["attendance", "read"], attendanceStatuses: ["attendance", "read"], attendanceMissing: ["attendance", "read"], attendanceSubmit: ["attendance", "create"], attendanceLock: ["attendance", "update"], attendanceCorrect: ["attendance", "update"], attendanceSetLabel: ["attendance", "update"],
  staffAttendancePresence: ["staff_attendance", "read"], staffAttendanceCorrect: ["staff_attendance", "update"],
  gradesTerms: ["academics", "read"], gradesExams: ["academics", "read"], gradesBands: ["academics", "read"], gradesGrid: ["grades", "read"], gradesReportCard: ["grades", "read"], gradesReportCardPdf: ["grades", "read"],
  gradesSaveMarks: ["grades", "create"], gradesCreateTerm: ["academics", "create"], gradesCreateExam: ["academics", "create"], gradesSetBands: ["academics", "update"], gradesUpdateExam: ["academics", "update"], gradesUpdateTerm: ["academics", "update"],
  gradesDeleteTerm: ["academics", "delete"], gradesDeleteExam: ["academics", "delete"],
  leaveRequests: ["leave", "read"], leaveTypes: ["leave", "read"], leaveBalances: ["leave", "read"], leaveApprove: ["leave", "approve"], leaveReject: ["leave", "approve"], leaveCreateType: ["leave", "create"], leaveDeleteType: ["leave", "update"], leaveSetBalance: ["leave", "update"], leaveUpdateType: ["leave", "update"],
  substitutionNeeds: ["academics", "read"], substitutionSuggestions: ["academics", "read"], substitutionAssign: ["academics", "update"], substitutionClear: ["academics", "update"],
  leaveDeductionProposals: ["payroll", "read"], leaveDeductionApply: ["payroll", "update"],
  notificationsList: ["notifications", "read"], notificationsPreferences: ["notifications", "read"], notificationsRead: ["notifications", "update"], notificationsReadAll: ["notifications", "update"], notificationsSetPreference: ["notifications", "update"],
  admissionsList: ["admissions", "read"], admissionsGet: ["admissions", "read"], admissionsCreate: ["admissions", "create"], admissionsDecide: ["admissions", "update"], admissionsAdmit: ["admissions", "update"],
  payrollRuns: ["payroll", "read"], payrollRun: ["payroll", "read"], payrollSalary: ["payroll", "read"], payrollPayslipPdf: ["payroll", "read"],
  payrollCreateRun: ["payroll", "create"], payrollAddLine: ["payroll", "create"], payrollApprove: ["payroll", "approve"], payrollPay: ["payroll", "delete"], payrollDeleteRun: ["payroll", "delete"], payrollRemoveLine: ["payroll", "delete"],
  invoicesList: ["finance", "read"], invoicesGet: ["finance", "read"], receiptsList: ["finance", "read"], receiptsPdf: ["finance", "read"], feesStructures: ["finance", "read"],
  invoicesCreate: ["finance", "create"], invoicesPay: ["finance", "create"], invoicesPreview: ["finance", "create"], invoicesGenerate: ["finance", "create"], feesCreateStructure: ["finance", "create"], feesCreateItem: ["finance", "create"],
  invoicesReverse: ["finance", "delete"],
  schoolProfile: ["settings", "read"], schoolUpdate: ["settings", "update"],
  membershipsList: ["memberships", "read"], membershipsUpdate: ["memberships", "update"], membershipsRemove: ["memberships", "delete"], accountsCreate: ["memberships", "create"],
  invitationsList: ["memberships", "read"], invitationsCreate: ["memberships", "create"], invitationsRevoke: ["memberships", "update"],
};
/** Buttons that start an action, and the grant that must be held for the button to exist. */
const BUTTONS: Array<{ name: string; screen: string; needs: [string, string]; tab?: string }> = [
  { name: "Add student", screen: "students", needs: ["students", "create"] },
  { name: "Add staff member", screen: "staff", needs: ["staff", "create"] },
  { name: "New application", screen: "admissions", needs: ["admissions", "create"] },
  { name: "New pay run", screen: "payroll", needs: ["payroll", "create"] },
  { name: "New invoice", screen: "finance", needs: ["finance", "create"] },
  { name: "Bill fees", screen: "finance", needs: ["finance", "create"] },
  { name: "Add class", screen: "classes", needs: ["academics", "create"] },
  { name: "Add a period", screen: "timetable", needs: ["academics", "create"], tab: "Bell schedule" },
  { name: "Add a leave type", screen: "leave", needs: ["leave", "create"], tab: "Types and allowances" },
  { name: "Create an account", screen: "memberships", needs: ["memberships", "create"] },
];

/** One answer that fits every list and total the screens read; empty, so no row buttons appear. */
const EMPTY = {
  items: [], total: 0, count: 0, page: 1, pageSize: 25, limit: 100, detail: true, totals: { count: 0, amountMinor: "0", paidMinor: "0", outstandingMinor: "0" }, totalAmountMinor: "0", collectedMinor: "0", reversedMinor: "0",
  outstandingMinor: "0", amountMinor: "0", paidMinor: "0", byMethod: [], byDay: [], bands: [], months: [], byDepartment: [], grossMinor: "0", deductionsMinor: "0", netMinor: "0", year: 2027,
  students: [], counts: { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0, MEDICAL: 0, HALF_DAY: 0, EXCUSED: 0 }, submitted: false, locked: false, submittedBy: null,
  periods: [], workingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
  id: SCHOOL.id, name: "Greenfield School", subDomain: "greenfield", defaultLanguage: "en", address: null, contactPhone: null, contactEmail: null, primaryColor: null,
};
function recordingApi() {
  const calls: string[] = [];
  const api = new Proxy({} as Record<string, unknown>, {
    get: (_t, name: string) => {
      if (name === "then") return undefined;
      if (name === "publicSchoolsBySubdomain") return async () => SCHOOL;
      if (name === "meGet") return async () => current;
      return async () => { calls.push(name); return EMPTY; };
    },
  });
  return { api: api as never, calls };
}

let current: ReturnType<typeof me>;
const asRole = (role: Role) => {
  const subject = { schoolRole: role };
  const m = me();
  m.activeSchool = {
    schoolId: SCHOOL.id, role,
    permissions: Object.fromEntries([...new Set(permissionsOf(subject).map((p) => p.resource))].map((r) => [r, Object.fromEntries(permissionsOf(subject).filter((p) => p.resource === r).map((p) => [p.action, p.scope]))])) as never,
    navigation: navigationFor(subject).map((s) => ({ title: s.title, items: s.items.map((i) => ({ key: i.key, label: i.label })) })),
  };
  return m;
};
/** The school-wide grant, except for what everyone has only for themselves (the inbox): any scope will do there. */
const granted = (role: Role, [resource, action]: [string, string]) => permissionsOf({ schoolRole: role }).some((p) => p.resource === resource && p.action === action && (p.scope === "school" || resource === "notifications"));
const SCREENS: Record<string, string> = { students: "Students", classes: "Classes and subjects", timetable: "Timetable", attendance: "Attendance", gradebook: "Gradebook", leave: "Leave", substitution: "Substitutions", "staff-attendance": "Staff attendance", admissions: "Admissions", staff: "Staff", payroll: "Payroll", finance: "Fees and payments", "reports-finance": "Financial reports", "reports-hr": "HR reports", settings: "School settings", memberships: "Users and roles" };
const settle = () => new Promise((r) => setTimeout(r, 100));

afterEach(() => vi.restoreAllMocks());

describe.each(ROLES)("role %s", { timeout: 30_000 }, (role) => {
  const navItems = () => navigationFor({ schoolRole: role }).flatMap((s) => s.items.map((i) => i.key));

  it("the sidebar holds exactly what the role matrix gives it, in our words", async () => {
    current = asRole(role);
    const { api } = recordingApi();
    renderApp(<WebAdminApp />, { api, port: fakePort(IN()).port });
    if (!navItems().some((k) => k.startsWith("dashboard") || SCREENS[k])) {
      // a role whose work is in the mobile apps: told where to go, not "not ready"
      expect(await screen.findByRole("heading", { level: 1, name: "Your role works in the mobile app" })).toBeTruthy();
      expect(screen.getByText("This web area is for administrators. Open the OruSchools app on your phone.")).toBeTruthy();
      expect(screen.queryByText("This module is not ready yet")).toBeNull();
      return;
    }
    const nav = await screen.findByRole("navigation", { name: "School sections" });
    const shown = Array.from(nav.querySelectorAll("button")).length;
    expect(shown).toBe(navItems().length);
  });

  it("opening any screen it can reach never asks the gateway for something the role is not granted", async () => {
    current = asRole(role);
    for (const key of navItems().filter((k) => SCREENS[k])) {
      const { api, calls } = recordingApi();
      const { unmount } = renderApp(<WebAdminApp />, { api, port: fakePort(IN()).port });
      fireEvent.click(await screen.findByRole("button", { name: SCREENS[key]! }));
      await settle();
      for (const call of new Set(calls)) {
        const need = NEEDS[call];
        expect(need, `API method ${call} is not in the NEEDS table (add it with the grant it requires)`).toBeTruthy();
        expect(granted(role, need!), `${role} opened ${key} and the screen called ${call}, which needs ${need!.join(":")}`).toBe(true);
      }
      unmount();
    }
  });

  it("the dashboard asks only for the numbers the role may read", async () => {
    current = asRole(role);
    const { api, calls } = recordingApi();
    renderApp(<WebAdminApp />, { api, port: fakePort(IN()).port });
    await screen.findByRole("heading", { level: 1 });
    await settle();
    for (const call of new Set(calls)) expect(granted(role, NEEDS[call]!), `${role} dashboard called ${call}`).toBe(true);
  });

  it("each action button is on screen exactly when the role holds its grant", async () => {
    current = asRole(role);
    for (const key of navItems().filter((k) => BUTTONS.some((b) => b.screen === k))) {
      const { api } = recordingApi();
      const { unmount } = renderApp(<WebAdminApp />, { api, port: fakePort(IN()).port });
      fireEvent.click(await screen.findByRole("button", { name: SCREENS[key]! }));
      await settle();
      for (const b of BUTTONS.filter((x) => x.screen === key)) {
        if (b.tab) { fireEvent.click(await screen.findByRole("radio", { name: b.tab })); await settle(); }
        const present = screen.queryByRole("button", { name: b.name }) !== null;
        expect(present, `${role} on ${key}: "${b.name}" should be ${granted(role, b.needs) ? "present" : "absent"}`).toBe(granted(role, b.needs));
      }
      unmount();
    }
  });
});

describe("what each silo cannot see", () => {
  const keys = (role: Role) => navigationFor({ schoolRole: role }).flatMap((s) => s.items.map((i) => i.key));
  it("the Bursar sees no academics or HR screens; the Academic Admin sees no finance or payroll", () => {
    expect(keys("BURSAR").filter((k) => ["students", "classes", "admissions", "staff", "settings"].includes(k))).toEqual([]);
    expect(keys("ACADEMIC_ADMIN").filter((k) => ["finance", "payroll", "reports-finance", "reports-hr", "settings"].includes(k))).toEqual([]);
    expect(keys("HR_MANAGER").filter((k) => ["finance", "reports-finance", "students", "classes"].includes(k))).toEqual([]);
  });
  it("only the Principal can approve payroll, only the Bursar can pay it; Management sees reports only", () => {
    for (const r of ROLES) expect(granted(r, ["payroll", "approve"]), r).toBe(r === "PRINCIPAL");
    for (const r of ROLES) expect(granted(r, ["payroll", "delete"]), r).toBe(r === "BURSAR");
    expect(keys("MANAGEMENT").every((k) => k.startsWith("dashboard") || k.startsWith("reports") || k === "announcements")).toBe(true);
  });
});

describe("a refusal the screen could not prevent", () => {
  it("a 403 from the gateway is said plainly, with no Retry that cannot help", async () => {
    current = asRole("BURSAR");
    const api = new Proxy({} as Record<string, unknown>, {
      get: (_t, name: string) => (name === "then" ? undefined : name === "publicSchoolsBySubdomain" ? async () => SCHOOL : name === "meGet" ? async () => current : async () => { throw new ApiError("FORBIDDEN", 403, "x"); }),
    });
    renderApp(<WebAdminApp />, { api: api as never, port: fakePort(IN()).port });
    fireEvent.click(await screen.findByRole("button", { name: "Fees and payments" }));
    await waitFor(() => expect(screen.getAllByText("You do not have permission to do this.").length).toBeGreaterThan(0));
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });
});

describe("dashboard numbers by role", () => {
  const withApi = (extra: Record<string, unknown>) =>
    new Proxy({} as Record<string, unknown>, { get: (_t, name: string) => (name === "then" ? undefined : name === "publicSchoolsBySubdomain" ? async () => SCHOOL : name === "meGet" ? async () => current : extra[name] ?? (async () => EMPTY)) });
  it("the Principal sees how many pay runs wait for approval (drafts only)", async () => {
    current = asRole("PRINCIPAL");
    const run = (status: string) => ({ id: status, year: 2027, month: 4, status, preparedBy: { id: "u", name: "x" }, approvedBy: null, approvedAt: null, paidBy: null, paidOn: null, paymentReference: null });
    renderApp(<WebAdminApp />, { api: withApi({ payrollRuns: async () => ({ items: [run("DRAFT"), run("DRAFT"), run("APPROVED"), run("PAID")] }) }) as never, port: fakePort(IN()).port });
    const label = await screen.findByText("Pay runs waiting for approval");
    expect(label.parentElement?.textContent).toContain("2");
  });
  it("the Academic administrator sees applications waiting for review, asked for as submitted ones", async () => {
    current = asRole("ACADEMIC_ADMIN");
    const admissionsList = vi.fn(async () => ({ items: [], total: 7, page: 1, pageSize: 1 }));
    renderApp(<WebAdminApp />, { api: withApi({ admissionsList }) as never, port: fakePort(IN()).port });
    const label = await screen.findByText("Applications waiting for review");
    expect(label.parentElement?.textContent).toContain("7");
    expect(admissionsList).toHaveBeenCalledWith({ query: { page: 1, pageSize: 1, status: "SUBMITTED" } });
  });
  it("the HR manager sees the active staff count", async () => {
    current = asRole("HR_MANAGER");
    const staffList = vi.fn(async () => ({ items: [], total: 31, page: 1, pageSize: 1 }));
    renderApp(<WebAdminApp />, { api: withApi({ staffList }) as never, port: fakePort(IN()).port });
    await waitFor(() => expect(screen.getAllByText("31").length).toBeGreaterThan(0));
    expect(staffList).toHaveBeenCalledWith({ query: { page: 1, pageSize: 1, status: "ACTIVE" } });
  });
});
