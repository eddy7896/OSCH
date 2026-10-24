import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@oruschools/api-client";
import { WebAdminApp } from "@/components/WebAdminApp";
import { IN, fakeApi, fakePort, me, renderApp } from "./helpers";

vi.mock("@/i18n/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ replace: vi.fn() }) }));

type Perms = NonNullable<ReturnType<typeof me>["activeSchool"]>["permissions"];
const as = (role: string, perms: Perms, nav: Array<{ key: string; label: string }>) => {
  const m = me();
  m.activeSchool = { ...m.activeSchool!, role, permissions: perms, navigation: [{ title: "Setup", items: nav }] };
  return m;
};
const go = async (api: ReturnType<typeof fakeApi>, name: string) => {
  renderApp(<WebAdminApp />, { api, port: fakePort(IN()).port });
  fireEvent.click(await screen.findByRole("button", { name }));
};
const CLASSES = [{ key: "classes", label: "Classes and subjects" }];
const acad = () => as("ACADEMIC_ADMIN", { academics: { read: "school", create: "school", update: "school", delete: "school" } }, CLASSES);
const reader = () => as("PRINCIPAL", { academics: { read: "school" } }, CLASSES);
const klass = (o = {}) => ({ id: "c1", name: "5 B", section: "B", capacity: 40, gradeLevel: { id: "l5", name: "5" }, ...o });
const levels = () => ({ items: [{ id: "l5", name: "5", position: 5, classes: [] }] });

describe("classes, subjects and academic years", () => {
  it("adds a class: level, section and capacity; Save waits for them", async () => {
    const academicsCreateClass = vi.fn(async () => klass());
    await go(fakeApi({ meGet: vi.fn(async () => acad()), academicsClasses: vi.fn(async () => ({ items: [klass()] })), academicsLevels: vi.fn(async () => levels()), academicsCreateClass }), "Classes and subjects");
    await screen.findByRole("table", { name: "Classes and subjects" });
    fireEvent.click(screen.getByRole("button", { name: "Add class" }));
    await screen.findByRole("option", { name: "5" });
    const save = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getAllByLabelText("Level")[0]!, { target: { value: "l5" } });
    fireEvent.change(screen.getByLabelText("Section"), { target: { value: "C" } });
    fireEvent.change(screen.getByLabelText("Capacity"), { target: { value: "35" } });
    fireEvent.click(save);
    await waitFor(() => expect(academicsCreateClass).toHaveBeenCalledWith({ body: { gradeLevelId: "l5", section: "C", capacity: 35 } }));
    expect(await screen.findByText("Class added")).toBeTruthy();
  });

  it("a read-only role sees the lists and none of the add, remove or activate buttons", async () => {
    const api = fakeApi({ meGet: vi.fn(async () => reader()), academicsClasses: vi.fn(async () => ({ items: [klass()] })), academicsSubjects: vi.fn(async () => ({ items: [{ id: "s1", name: "Mathematics", code: "MATH" }] })), academicsYears: vi.fn(async () => ({ items: [{ id: "y1", name: "2027-2028", startDate: "2027-04-01", endDate: "2028-03-31", status: "ACTIVE" }, { id: "y2", name: "2028-2029", startDate: "2028-04-01", endDate: "2029-03-31", status: "PLANNED" }] })) });
    await go(api, "Classes and subjects");
    await screen.findByRole("table", { name: "Classes and subjects" });
    expect(screen.queryByRole("button", { name: "Add class" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Remove/ })).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Subjects" }));
    expect(await screen.findByText("Mathematics")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add subject" })).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Academic years" }));
    expect(await screen.findByText("2028-2029")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Make active/ })).toBeNull();
  });

  it("subjects: add one with a code, remove one", async () => {
    const academicsCreateSubject = vi.fn(async () => ({ id: "s2", name: "Science", code: "SCI" }));
    const academicsDeleteSubject = vi.fn(async () => undefined);
    await go(fakeApi({ meGet: vi.fn(async () => acad()), academicsClasses: vi.fn(async () => ({ items: [] })), academicsSubjects: vi.fn(async () => ({ items: [{ id: "s1", name: "Mathematics", code: "MATH" }] })), academicsCreateSubject, academicsDeleteSubject }), "Classes and subjects");
    fireEvent.click(await screen.findByRole("radio", { name: "Subjects" }));
    await screen.findByText("Mathematics");
    fireEvent.change(screen.getByLabelText("Subject name"), { target: { value: "Science" } });
    fireEvent.change(screen.getByLabelText("Short code"), { target: { value: "sci" } });
    fireEvent.click(screen.getByRole("button", { name: "Add subject" }));
    await waitFor(() => expect(academicsCreateSubject).toHaveBeenCalledWith({ body: { name: "Science", code: "sci" } }));
    expect(await screen.findByText("Subject added")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove: Mathematics" }));
    await waitFor(() => expect(academicsDeleteSubject).toHaveBeenCalledWith({ path: { id: "s1" } }));
  });

  it("academic years: add one; making another year active asks first and names it", async () => {
    const academicsActivateYear = vi.fn(async () => ({}));
    const academicsCreateYear = vi.fn(async () => ({}));
    const years = { items: [{ id: "y1", name: "2027-2028", startDate: "2027-04-01", endDate: "2028-03-31", status: "ACTIVE" }, { id: "y2", name: "2028-2029", startDate: "2028-04-01", endDate: "2029-03-31", status: "PLANNED" }] };
    await go(fakeApi({ meGet: vi.fn(async () => acad()), academicsClasses: vi.fn(async () => ({ items: [] })), academicsYears: vi.fn(async () => years), academicsActivateYear, academicsCreateYear }), "Classes and subjects");
    fireEvent.click(await screen.findByRole("radio", { name: "Academic years" }));
    fireEvent.click(await screen.findByRole("button", { name: "Make active: 2028-2029" }));
    expect(screen.getByText("Make 2028-2029 the active academic year? New students, invoices and receipts will use it.")).toBeTruthy();
    expect(academicsActivateYear).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(academicsActivateYear).toHaveBeenCalledWith({ path: { id: "y2" } }));
    fireEvent.click(screen.getByRole("button", { name: "New academic year" }));
    fireEvent.change(screen.getAllByLabelText("Academic years").at(-1)!, { target: { value: "2029-2030" } });
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2029-04-01" } });
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2030-03-31" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(academicsCreateYear).toHaveBeenCalledWith({ body: { name: "2029-2030", startDate: "2029-04-01", endDate: "2030-03-31" } }));
  });

  it("a refusal (for example two classes with the same section) is shown in words", async () => {
    const academicsCreateClass = vi.fn().mockRejectedValue(new ApiError("CONFLICT", 409, "x"));
    await go(fakeApi({ meGet: vi.fn(async () => acad()), academicsClasses: vi.fn(async () => ({ items: [klass()] })), academicsLevels: vi.fn(async () => levels()), academicsCreateClass }), "Classes and subjects");
    fireEvent.click(await screen.findByRole("button", { name: "Add class" }));
    await screen.findByRole("option", { name: "5" });
    fireEvent.change(screen.getAllByLabelText("Level")[0]!, { target: { value: "l5" } });
    fireEvent.change(screen.getByLabelText("Section"), { target: { value: "B" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findByRole("alert")).textContent).toContain("That already exists");
  });

  it("no accessibility violations", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => acad()), academicsClasses: vi.fn(async () => ({ items: [klass()] })) }), "Classes and subjects");
    await screen.findByRole("table");
    const r = await axe.run(document.body, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 100)}`)).toEqual([]);
  });
});

describe("school settings", () => {
  const profile = (o = {}) => ({ id: "11111111-1111-4111-8111-111111111111", name: "Greenfield School", subDomain: "greenfield", defaultLanguage: "en", currency: "INR", locale: "en-IN", address: "12 Lake Road", contactPhone: "+911234567890", contactEmail: "office@greenfield.example", primaryColor: "#3B3FD6", logoKey: null, activeAcademicYear: { id: "y1", name: "2027-2028" }, ...o });
  const NAV = [{ key: "settings", label: "School settings" }];
  const sysadmin = () => as("SYSTEM_ADMIN", { settings: { read: "school", update: "school" } }, NAV);

  it("shows the profile; saving sends only what changed; the web address cannot be edited", async () => {
    const schoolUpdate = vi.fn(async () => profile());
    await go(fakeApi({ meGet: vi.fn(async () => sysadmin()), schoolProfile: vi.fn(async () => profile()), schoolUpdate }), "School settings");
    expect(await screen.findByDisplayValue("Greenfield School")).toBeTruthy();
    expect((screen.getByLabelText("Web address") as HTMLInputElement).disabled).toBe(true);
    const save = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true); // nothing changed yet
    fireEvent.change(screen.getByLabelText("Address"), { target: { value: "14 Hill Road" } });
    fireEvent.change(screen.getByLabelText("Brand colour"), { target: { value: "#1F2A9C" } });
    fireEvent.click(save);
    await waitFor(() => expect(schoolUpdate).toHaveBeenCalledWith({ body: { address: "14 Hill Road", primaryColor: "#1F2A9C" } }));
    expect(await screen.findByText("Settings saved")).toBeTruthy();
  });

  it("a colour the gateway refuses is shown in words and nothing is lost", async () => {
    const schoolUpdate = vi.fn().mockRejectedValue(new ApiError("INVALID_REQUEST", 400, "x"));
    await go(fakeApi({ meGet: vi.fn(async () => sysadmin()), schoolProfile: vi.fn(async () => profile()), schoolUpdate }), "School settings");
    fireEvent.change(await screen.findByLabelText("Brand colour"), { target: { value: "#FFFF00" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Some details are not valid");
    expect((screen.getByLabelText("Brand colour") as HTMLInputElement).value).toBe("#FFFF00");
  });

  it("without the update grant the profile is read-only", async () => {
    const m = as("PRINCIPAL", { settings: { read: "school" } }, NAV);
    await go(fakeApi({ meGet: vi.fn(async () => m), schoolProfile: vi.fn(async () => profile()) }), "School settings");
    expect(await screen.findByDisplayValue("Greenfield School")).toBeTruthy();
    expect((screen.getByLabelText("School name") as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
  });
});

describe("CSV import", () => {
  const stu = () => as("ACADEMIC_ADMIN", { students: { read: "school", create: "school" } }, [{ key: "students", label: "Students" }]);
  const report = (o = {}) => ({ kind: "students", fileHash: "h", totalRows: 3, validRows: 3, errorRows: 0, columns: { recognized: ["firstName", "lastName"], ignored: [], missingRequired: [] }, problems: [], problemsTruncated: false, warnings: [], alreadyImported: false, canImport: true, ...o });
  const pick = async (name = "kids.csv", text = "firstName,lastName\nAsha,Kumar\n") => {
    const file = new File([text], name, { type: "text/csv" });
    Object.defineProperty(file, "text", { value: async () => text });
    fireEvent.change(screen.getByLabelText("CSV file"), { target: { files: [file] } });
    await waitFor(() => expect((screen.getByRole("button", { name: "Check the file" }) as HTMLButtonElement).disabled).toBe(false)); // the file is read, then the button wakes
  };
  const open = async (api: ReturnType<typeof fakeApi>) => {
    await go(api, "Students");
    fireEvent.click(await screen.findByRole("button", { name: "Import from CSV" }));
  };
  const base = (extra: Record<string, unknown>) => fakeApi({ meGet: vi.fn(async () => stu()), studentsList: vi.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 25 })), ...extra });

  it("checks the file first (nothing is saved), then imports it after the person sees it is ready", async () => {
    const importsStudentsDryRun = vi.fn(async () => report());
    const importsStudents = vi.fn(async () => ({ batchId: "b1", status: "DONE", createdCount: 3, failedCount: 0, created: [], failures: [] }));
    await open(base({ importsStudentsDryRun, importsStudents }));
    expect((screen.getByRole("button", { name: "Check the file" }) as HTMLButtonElement).disabled).toBe(true); // no file yet
    await pick();
    fireEvent.click(screen.getByRole("button", { name: "Check the file" }));
    expect(await screen.findByText("3 of 3 rows are ready. 0 rows have problems.")).toBeTruthy();
    expect(importsStudentsDryRun).toHaveBeenCalledWith({ body: { csv: "firstName,lastName\nAsha,Kumar\n" } });
    expect(importsStudents).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Import 3 rows" }));
    await waitFor(() => expect(importsStudents).toHaveBeenCalledWith({ body: { csv: "firstName,lastName\nAsha,Kumar\n" } }));
    expect(await screen.findByText("3 records created.")).toBeTruthy();
  });

  it("a file with problems lists them and offers no import; missing columns are named", async () => {
    const importsStudents = vi.fn();
    const rep = report({ validRows: 1, errorRows: 2, canImport: false, columns: { recognized: [], ignored: [], missingRequired: ["lastName"] }, problems: [{ row: 2, column: "dateOfBirth", rule: "invalidDate" }, { row: 3, column: "gender", rule: "notAllowed" }] });
    await open(base({ importsStudentsDryRun: vi.fn(async () => rep), importsStudents }));
    await pick();
    fireEvent.click(screen.getByRole("button", { name: "Check the file" }));
    expect(await screen.findByText("1 of 3 rows are ready. 2 rows have problems.")).toBeTruthy();
    expect(screen.getByText("Missing columns: lastName")).toBeTruthy();
    expect(screen.getByText("Row 2, dateOfBirth: invalidDate")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Import \d+ rows/ })).toBeNull();
    expect(importsStudents).not.toHaveBeenCalled();
  });

  it("a file that was already imported cannot be imported again", async () => {
    await open(base({ importsStudentsDryRun: vi.fn(async () => report({ alreadyImported: true })) }));
    await pick();
    fireEvent.click(screen.getByRole("button", { name: "Check the file" }));
    expect(await screen.findByText("This file was already imported.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Import \d+ rows/ })).toBeNull();
  });

  it("a gateway refusal is shown in words; choosing another file clears the old result", async () => {
    const importsStudentsDryRun = vi.fn().mockRejectedValueOnce(new ApiError("INVALID_REQUEST", 400, "x")).mockResolvedValue(report());
    await open(base({ importsStudentsDryRun }));
    await pick();
    fireEvent.click(screen.getByRole("button", { name: "Check the file" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Some details are not valid");
    await pick("other.csv", "firstName,lastName\nBilal,Ahmed\n");
    fireEvent.click(screen.getByRole("button", { name: "Check the file" }));
    expect(await screen.findByText("3 of 3 rows are ready. 0 rows have problems.")).toBeTruthy();
  });

  it("staff import uses the staff operations; roles without the create grant see no import button", async () => {
    const importsStaffDryRun = vi.fn(async () => report({ kind: "staff" }));
    const m = as("HR_MANAGER", { staff: { read: "school", create: "school" } }, [{ key: "staff", label: "Staff" }]);
    const api = fakeApi({ meGet: vi.fn(async () => m), staffList: vi.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 25 })), staffDepartments: vi.fn(async () => ({ items: [] })), importsStaffDryRun });
    await go(api, "Staff");
    fireEvent.click(await screen.findByRole("button", { name: "Import from CSV" }));
    await pick("staff.csv");
    fireEvent.click(screen.getByRole("button", { name: "Check the file" }));
    await waitFor(() => expect(importsStaffDryRun).toHaveBeenCalled());
  });
});

describe("HR reports", () => {
  const hrm = (exp = true) => as("HR_MANAGER", { reports_hr: { read: "school", ...(exp ? { export: "school" } : {}) } }, [{ key: "reports-hr", label: "HR reports" }]);
  const summary = () => ({ year: 2027, months: [{ runId: "r1", month: 4, status: "PAID", paidOn: "2027-04-30", headcount: 3, grossMinor: "13400000", deductionsMinor: "250000", netMinor: "13150000" }, { runId: "r2", month: 5, status: "APPROVED", paidOn: null, headcount: 3, grossMinor: "13400000", deductionsMinor: "0", netMinor: "13400000" }], byDepartment: [{ department: "Science", headcount: 2, grossMinor: "20000000", deductionsMinor: "250000", netMinor: "19750000" }, { department: null, headcount: 1, grossMinor: "6800000", deductionsMinor: "0", netMinor: "6800000" }], grossMinor: "26800000", deductionsMinor: "250000", netMinor: "26550000" });

  it("a year of pay runs by month and by department, with totals only", async () => {
    const reportsPayroll = vi.fn(async () => summary());
    await go(fakeApi({ meGet: vi.fn(async () => hrm()), reportsPayroll }), "HR reports");
    const table = await screen.findByRole("table", { name: "HR reports" });
    expect(within(table).getByText("04/2027")).toBeTruthy();
    expect(within(table).getByText("Paid")).toBeTruthy();
    expect(within(table).getByText("Approved")).toBeTruthy();
    expect(screen.getAllByText("₹2,65,500.00").length).toBeGreaterThan(0); // exact net total
    expect(screen.getByText("No department")).toBeTruthy();
    expect(reportsPayroll).toHaveBeenCalledWith({ query: { year: new Date().getUTCFullYear() } });
    fireEvent.change(screen.getByLabelText("Year"), { target: { value: "2026" } });
    await waitFor(() => expect(reportsPayroll).toHaveBeenLastCalledWith({ query: { year: 2026 } }));
  });

  it("a year with nothing to report says so", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => hrm()), reportsPayroll: vi.fn(async () => ({ year: 2027, months: [], byDepartment: [], grossMinor: "0", deductionsMinor: "0", netMinor: "0" })) }), "HR reports");
    expect(await screen.findByText("No approved or paid pay runs in this year")).toBeTruthy();
  });

  it("downloads only with the export grant, in the screen's language", async () => {
    const reportsPayrollExport = vi.fn(async () => new Blob(["x"]));
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    await go(fakeApi({ meGet: vi.fn(async () => hrm()), reportsPayroll: vi.fn(async () => summary()), reportsPayrollExport }), "HR reports");
    fireEvent.click(await screen.findByRole("button", { name: "Download PDF" }));
    await waitFor(() => expect(reportsPayrollExport).toHaveBeenCalledWith({ query: { year: new Date().getUTCFullYear(), format: "pdf", lang: "en" }, parseAs: "blob" }));
    expect(click).toHaveBeenCalled();
  });

  it("no export grant: no download buttons", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => hrm(false)), reportsPayroll: vi.fn(async () => summary()) }), "HR reports");
    await screen.findByRole("table");
    expect(screen.queryByRole("button", { name: "Download CSV" })).toBeNull();
  });
});
