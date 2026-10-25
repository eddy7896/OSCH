import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@oruschools/api-client";
import { WebAdminApp } from "@/components/WebAdminApp";
import { IN, fakeApi, fakePort, me, renderApp } from "./helpers";

vi.mock("@/i18n/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ replace: vi.fn() }) }));

type Perms = NonNullable<ReturnType<typeof me>["activeSchool"]>["permissions"];
const as = (role: string, perms: Perms, key: string, label: string) => {
  const m = me();
  m.activeSchool = { ...m.activeSchool!, role, permissions: perms, navigation: [{ title: "Academics", items: [{ key, label }] }] };
  return m;
};
const acad = () => as("ACADEMIC_ADMIN", { academics: { read: "school" }, attendance: { read: "school", create: "school", update: "school", delete: "school" } }, "attendance", "Attendance");
const reader = () => as("PRINCIPAL", { academics: { read: "school" }, attendance: { read: "school" } }, "attendance", "Attendance");
const hr = () => as("HR_MANAGER", { staff_attendance: { read: "school", create: "school", update: "school" } }, "staff-attendance", "Staff attendance");
const go = async (api: ReturnType<typeof fakeApi>, name = "Attendance") => {
  renderApp(<WebAdminApp />, { api, port: fakePort(IN()).port });
  fireEvent.click(await screen.findByRole("button", { name }));
};

const CLASSES = { items: [{ id: "c1", name: "5 B", section: "B", capacity: 40, gradeLevel: { id: "l5", name: "5" } }] };
const STATUSES = { items: ["PRESENT", "ABSENT", "LATE", "LEAVE", "MEDICAL", "HALF_DAY", "EXCUSED"].map((s) => ({ status: s, label: s, isDefault: true })) };
const counts = (o: Record<string, number> = {}) => ({ PRESENT: 3, ABSENT: 0, LATE: 0, LEAVE: 0, MEDICAL: 0, HALF_DAY: 0, EXCUSED: 0, ...o });
const student = (id: string, name: string, status = "PRESENT") => ({ id, enrollmentId: `S${id}`, name, status, note: null });
const DAY = (o: Record<string, unknown> = {}) => ({ classId: "c1", date: "2026-10-26", submitted: false, locked: false, submittedBy: null, submittedAt: null, counts: counts(), students: [student("s1", "Asha Rao"), student("s2", "Bilal Khan"), student("s3", "Chitra Nair")], ...o });
const base = (over: Record<string, unknown> = {}) => ({ academicsClasses: vi.fn(async () => CLASSES), attendanceStatuses: vi.fn(async () => STATUSES), attendanceDay: vi.fn(async () => DAY()), attendanceMissing: vi.fn(async () => ({ date: "2026-10-26", items: [{ id: "c1", name: "5 B" }, { id: "c2", name: "6 A" }] })), ...over });

describe("daily register", () => {
  it("shows the class roster with each student's status, counts and a not-taken notice; a reader gets no controls", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => reader()), ...base({ attendanceDay: vi.fn(async () => DAY({ submitted: true, submittedBy: "Meera Joshi", counts: counts({ PRESENT: 2, ABSENT: 1 }), students: [student("s1", "Asha Rao"), student("s2", "Bilal Khan", "ABSENT"), student("s3", "Chitra Nair")] })) }) }));
    const table = await screen.findByRole("table", { name: "Daily register" });
    expect(within(table).getByText("Bilal Khan")).toBeTruthy();
    expect(within(table).getAllByText("Present").length).toBe(2);
    expect(screen.getByText("Taken by Meera Joshi")).toBeTruthy();
    expect(screen.getByText("Present: 2")).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: /Status/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Save attendance" })).toBeNull();
  });

  it("an untaken day says so; the Academic admin marks exceptions and saves with the device's own id", async () => {
    const attendanceSubmit = vi.fn(async () => DAY({ submitted: true }));
    await go(fakeApi({ meGet: vi.fn(async () => acad()), ...base({ attendanceSubmit }) }));
    expect(await screen.findByText(/Attendance has not been taken for this class on this date/)).toBeTruthy();
    const save = screen.getByRole("button", { name: "Save attendance" }) as HTMLButtonElement;
    fireEvent.change(screen.getByLabelText("Status: Bilal Khan"), { target: { value: "ABSENT" } });
    fireEvent.change(screen.getByLabelText("Status: Chitra Nair"), { target: { value: "LATE" } });
    fireEvent.click(save);
    await waitFor(() => expect(attendanceSubmit).toHaveBeenCalledWith({ path: { id: "c1", date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }, body: { marks: [{ studentId: "s2", status: "ABSENT" }, { studentId: "s3", status: "LATE" }], submissionId: expect.any(String) } }));
    expect(await screen.findByText("Attendance saved")).toBeTruthy();
  });

  it("a taken day can be locked; a locked day offers only a correction, and says so", async () => {
    const attendanceLock = vi.fn(async () => DAY({ submitted: true, locked: true }));
    const taken = DAY({ submitted: true, submittedBy: "Tara Teach" });
    await go(fakeApi({ meGet: vi.fn(async () => acad()), ...base({ attendanceDay: vi.fn(async () => taken), attendanceLock }) }));
    fireEvent.click(await screen.findByRole("button", { name: "Lock the day" }));
    await waitFor(() => expect(attendanceLock).toHaveBeenCalled());
    expect(await screen.findByText("Day locked")).toBeTruthy();
  });

  it("corrects a locked day: Save correction waits for a change and uses the correction route", async () => {
    const attendanceCorrect = vi.fn(async () => DAY());
    await go(fakeApi({ meGet: vi.fn(async () => acad()), ...base({ attendanceDay: vi.fn(async () => DAY({ submitted: true, locked: true, submittedBy: "Tara Teach", counts: counts({ PRESENT: 2, ABSENT: 1 }), students: [student("s1", "Asha Rao"), student("s2", "Bilal Khan", "ABSENT"), student("s3", "Chitra Nair")] })), attendanceCorrect }) }));
    expect(await screen.findByText(/This day is locked\. Only a correction can change it/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save attendance" })).toBeNull();
    const fix = screen.getByRole("button", { name: "Save correction" }) as HTMLButtonElement;
    expect(fix.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Status: Bilal Khan"), { target: { value: "PRESENT" } });
    fireEvent.click(fix);
    await waitFor(() => expect(attendanceCorrect).toHaveBeenCalledWith({ path: { id: "c1", date: expect.any(String) }, body: { marks: [] } }));
    expect(await screen.findByText("Correction saved")).toBeTruthy();
  });

  it("explains a refusal in our words", async () => {
    const attendanceSubmit = vi.fn(async () => { throw new ApiError("CONFLICT", 409, "x", undefined, [{ field: "date", rule: "dayLocked" }]); });
    await go(fakeApi({ meGet: vi.fn(async () => acad()), ...base({ attendanceSubmit }) }));
    await screen.findByRole("table", { name: "Daily register" });
    fireEvent.change(screen.getByLabelText("Status: Asha Rao"), { target: { value: "ABSENT" } });
    fireEvent.click(screen.getByRole("button", { name: "Save attendance" }));
    expect(await screen.findByText("This day is locked. Ask the Academic administrator for a correction.")).toBeTruthy();
  });

  it("has no accessibility violations", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => acad()), ...base() }));
    await screen.findByRole("table", { name: "Daily register" });
    const results = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

describe("classes without attendance, and the status names", () => {
  it("lists the classes that have not taken attendance, or says nothing is waiting", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => reader()), ...base() }));
    fireEvent.click(await screen.findByRole("radio", { name: "Not taken yet" }));
    const table = await screen.findByRole("table", { name: "Not taken yet" });
    expect(within(table).getByText("6 A")).toBeTruthy();
  });
  it("nothing waiting says so", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => reader()), ...base({ attendanceMissing: vi.fn(async () => ({ date: "2026-10-26", items: [] })) }) }));
    fireEvent.click(await screen.findByRole("radio", { name: "Not taken yet" }));
    expect(await screen.findByText("Nothing is waiting for this date.")).toBeTruthy();
  });

  it("renames a status for the school: only the word is sent", async () => {
    const attendanceSetLabel = vi.fn(async () => STATUSES);
    await go(fakeApi({ meGet: vi.fn(async () => acad()), ...base({ attendanceSetLabel }) }));
    fireEvent.click(await screen.findByRole("radio", { name: "Status names" }));
    const field = await screen.findByLabelText("Name for Late");
    fireEvent.change(field, { target: { value: "Tardy" } });
    fireEvent.click(within(field.closest("form")!).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(attendanceSetLabel).toHaveBeenCalledWith({ path: { status: "LATE" }, body: { label: "Tardy" } }));
    expect(await screen.findByText("Name saved")).toBeTruthy();
  });

  it("a reader sees the names but cannot change them", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => reader()), ...base() }));
    fireEvent.click(await screen.findByRole("radio", { name: "Status names" }));
    await screen.findAllByText("Standard name");
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
  });
});

describe("staff attendance", () => {
  const PRESENCE = { date: "2026-10-26", items: [
    { staff: { id: "t1", employeeId: "E0001", name: "Asha Rao" }, checkIn: "2026-10-26T03:45:00.000Z", checkOut: null, state: "IN" },
    { staff: { id: "t2", employeeId: "E0002", name: "Bilal Khan" }, checkIn: "2026-10-26T03:30:00.000Z", checkOut: "2026-10-26T11:00:00.000Z", state: "OUT" },
    { staff: { id: "t3", employeeId: "E0003", name: "Chitra Nair" }, checkIn: null, checkOut: null, state: "NONE" },
  ] };
  it("shows who is at work with times in Indian Standard Time", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => hr()), staffAttendancePresence: vi.fn(async () => PRESENCE) }), "Staff attendance");
    const table = await screen.findByRole("table", { name: "Staff attendance" });
    expect(within(table).getByText("At work")).toBeTruthy();
    expect(within(table).getByText("Left for the day")).toBeTruthy();
    expect(within(table).getByText("Not in yet")).toBeTruthy();
    expect(within(table).getByText("09:15")).toBeTruthy();
    expect(within(table).getByText("16:30")).toBeTruthy();
  });
  it("HR corrects a person's times: 09:15 on the day is sent as the stored moment", async () => {
    const staffAttendanceCorrect = vi.fn(async () => ({ date: "2026-10-26", checkIn: null, checkOut: null }));
    await go(fakeApi({ meGet: vi.fn(async () => hr()), staffAttendancePresence: vi.fn(async () => PRESENCE), staffAttendanceCorrect }), "Staff attendance");
    fireEvent.click(await screen.findByRole("button", { name: "Correct: Chitra Nair" }));
    fireEvent.change(await screen.findByLabelText("In"), { target: { value: "09:20" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(staffAttendanceCorrect).toHaveBeenCalledWith({ path: { staffId: "t3", date: expect.any(String) }, body: { checkIn: expect.stringMatching(/T03:50:00\.000Z$/) } }));
    expect(await screen.findByText("Times saved")).toBeTruthy();
  });
  it("a reader (the Principal) sees the list without the correct buttons", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => as("PRINCIPAL", { staff_attendance: { read: "school" } }, "staff-attendance", "Staff attendance")), staffAttendancePresence: vi.fn(async () => PRESENCE) }), "Staff attendance");
    await screen.findByRole("table", { name: "Staff attendance" });
    expect(screen.queryByRole("button", { name: /^Correct/ })).toBeNull();
  });
});
