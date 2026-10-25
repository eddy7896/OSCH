import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@oruschools/api-client";
import { WebAdminApp } from "@/components/WebAdminApp";
import { IN, fakeApi, fakePort, me, renderApp } from "./helpers";

vi.mock("@/i18n/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ replace: vi.fn() }) }));

type Perms = NonNullable<ReturnType<typeof me>["activeSchool"]>["permissions"];
const as = (role: string, perms: Perms) => {
  const m = me();
  m.activeSchool = { ...m.activeSchool!, role, permissions: perms, navigation: [{ title: "Academics", items: [{ key: "timetable", label: "Timetable" }] }] };
  return m;
};
const acad = () => as("ACADEMIC_ADMIN", { academics: { read: "school", create: "school", update: "school", delete: "school" } });
const reader = () => as("PRINCIPAL", { academics: { read: "school" } });
const go = async (api: ReturnType<typeof fakeApi>) => {
  renderApp(<WebAdminApp />, { api, port: fakePort(IN()).port });
  fireEvent.click(await screen.findByRole("button", { name: "Timetable" }));
};

const P1 = { id: "p1", label: "Period 1", startTime: "08:30", endTime: "09:10", isBreak: false, number: 1 };
const BR = { id: "pb", label: "Break", startTime: "09:10", endTime: "09:30", isBreak: true, number: null };
const P2 = { id: "p2", label: "Period 2", startTime: "09:30", endTime: "10:10", isBreak: false, number: 2 };
const SCHEDULE = { workingDays: ["MON", "TUE", "WED"], periods: [P1, BR, P2] };
const CLASSES = { items: [{ id: "c1", name: "5 B", section: "B", capacity: 40, gradeLevel: { id: "l5", name: "5" } }, { id: "c2", name: "6 A", section: "A", capacity: 40, gradeLevel: { id: "l6", name: "6" } }] };
const SUBJECTS = { items: [{ id: "s1", name: "Mathematics", code: "MATH" }, { id: "s2", name: "Science", code: "SCI" }] };
const TEACHERS = { items: [
  { staff: { id: "t1", employeeId: "E1", name: "Asha Rao", hasAccount: true }, subjects: [{ id: "s1", name: "Mathematics", code: "MATH" }], classes: [] },
  { staff: { id: "t2", employeeId: "E2", name: "Bilal Khan", hasAccount: false }, subjects: [{ id: "s2", name: "Science", code: "SCI" }], classes: [] },
] };
const CLASS_TT = { academicYearId: "y1", classId: "c1", entries: [{ id: "e1", day: "MON", periodId: "p1", subject: { id: "s1", name: "Mathematics", code: "MATH" }, staff: { id: "t1", employeeId: "E1", name: "Asha Rao" } }] };
const STAFF_TT = { academicYearId: "y1", staffId: "t1", entries: [{ id: "e1", day: "MON", periodId: "p1", class: { id: "c1", name: "5 B" }, subject: { id: "s1", name: "Mathematics", code: "MATH" } }] };
const LOAD = { academicYearId: "y1", items: [{ staff: { id: "t1", employeeId: "E1", name: "Asha Rao" }, total: 1, byDay: { MON: 1, TUE: 0, WED: 0, THU: 0, FRI: 0, SAT: 0, SUN: 0 } }] };
const base = (over: Record<string, unknown> = {}) => ({ scheduleGet: vi.fn(async () => SCHEDULE), academicsClasses: vi.fn(async () => CLASSES), academicsSubjects: vi.fn(async () => SUBJECTS), teachingTeachers: vi.fn(async () => TEACHERS), timetableForClass: vi.fn(async () => CLASS_TT), timetableForStaff: vi.fn(async () => STAFF_TT), timetableLoad: vi.fn(async () => LOAD), ...over });

describe("timetable by class", () => {
  it("shows the week: a column per working day, a row per period, a break row, lessons and free slots", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => reader()), ...base() }));
    const grid = await screen.findByRole("table", { name: "Timetable" });
    expect(within(grid).getByRole("columnheader", { name: "Mon" })).toBeTruthy();
    expect(within(grid).queryByRole("columnheader", { name: "Sun" })).toBeNull();
    expect(within(grid).getByText("Mathematics")).toBeTruthy();
    expect(within(grid).getByText("Asha Rao")).toBeTruthy();
    expect(within(grid).getAllByText("Free")).toHaveLength(5);
    expect(within(grid).getByText("08:30–09:10")).toBeTruthy();
    expect(within(grid).getAllByText("Break").length).toBeGreaterThan(0);
  });

  it("a role that may only read gets no editor: the cells are not buttons", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => reader()), ...base() }));
    await screen.findByRole("table", { name: "Timetable" });
    expect(screen.queryByRole("button", { name: "Mon, Period 1" })).toBeNull();
  });

  it("puts a lesson in a cell: the teacher list holds only those who teach the subject", async () => {
    const timetableSetSlot = vi.fn(async () => CLASS_TT);
    await go(fakeApi({ meGet: vi.fn(async () => acad()), ...base({ timetableSetSlot }) }));
    fireEvent.click(await screen.findByRole("button", { name: "Tue, Period 2" }));
    expect(await screen.findByRole("heading", { name: "Lesson on Tue, Period 2" })).toBeTruthy();
    const setButton = screen.getByRole("button", { name: "Set lesson" }) as HTMLButtonElement;
    expect(setButton.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "s2" } });
    const teacher = screen.getByLabelText("Teacher") as HTMLSelectElement;
    expect(Array.from(teacher.options).map((o) => o.textContent)).toEqual(["", "Bilal Khan"]);
    fireEvent.change(teacher, { target: { value: "t2" } });
    fireEvent.click(setButton);
    await waitFor(() => expect(timetableSetSlot).toHaveBeenCalledWith({ path: { id: "c1" }, body: { day: "TUE", periodId: "p2", subjectId: "s2", staffId: "t2" } }));
    expect(await screen.findByText("Lesson saved")).toBeTruthy();
  });

  it("says why a lesson was refused, in our words, and keeps the editor open", async () => {
    const timetableSetSlot = vi.fn(async () => { throw new ApiError("CONFLICT", 409, "x", undefined, [{ field: "staffId", rule: "teacherBusy" }]); });
    await go(fakeApi({ meGet: vi.fn(async () => acad()), ...base({ timetableSetSlot }) }));
    fireEvent.click(await screen.findByRole("button", { name: "Mon, Period 2" }));
    fireEvent.change(await screen.findByLabelText("Subject"), { target: { value: "s1" } });
    fireEvent.change(screen.getByLabelText("Teacher"), { target: { value: "t1" } });
    fireEvent.click(screen.getByRole("button", { name: "Set lesson" }));
    expect(await screen.findByText("This teacher is already teaching another class then.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Lesson on Mon, Period 2" })).toBeTruthy();
  });

  it("clears a lesson that is there", async () => {
    const timetableClear = vi.fn(async () => undefined);
    await go(fakeApi({ meGet: vi.fn(async () => acad()), ...base({ timetableClear }) }));
    fireEvent.click(await screen.findByRole("button", { name: "Mon, Period 1" }));
    fireEvent.click(await screen.findByRole("button", { name: "Clear lesson" }));
    await waitFor(() => expect(timetableClear).toHaveBeenCalledWith({ path: { id: "e1" } }));
    expect(await screen.findByText("Lesson cleared")).toBeTruthy();
  });

  it("with no active academic year it says so instead of an empty grid", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => reader()), ...base({ timetableForClass: vi.fn(async () => { throw new ApiError("CONFLICT", 409, "x", undefined, [{ field: "academicYearId", rule: "noActiveYear" }]); }) }) }));
    expect(await screen.findByText("There is no active academic year")).toBeTruthy();
    expect(screen.getByText("Make an academic year active first.")).toBeTruthy();
  });

  it("has no accessibility violations", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => acad()), ...base() }));
    await screen.findByRole("table", { name: "Timetable" });
    const results = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

describe("timetable by teacher", () => {
  it("shows a teacher's week with the classes they are in, and how many lessons everyone has", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => reader()), ...base() }));
    fireEvent.click(await screen.findByRole("radio", { name: "By teacher" }));
    const grid = await screen.findByRole("table", { name: "Timetable" });
    expect(within(grid).getByText("5 B")).toBeTruthy();
    const load = await screen.findByRole("table", { name: "Lessons per week" });
    expect(within(load).getByText("Asha Rao")).toBeTruthy();
    expect(within(load).getByText("1 lesson")).toBeTruthy();
  });
});

describe("bell schedule", () => {
  it("lists the periods with their numbers, and saves the working days", async () => {
    const scheduleSetWorkingDays = vi.fn(async () => SCHEDULE);
    await go(fakeApi({ meGet: vi.fn(async () => acad()), ...base({ scheduleSetWorkingDays }) }));
    fireEvent.click(await screen.findByRole("radio", { name: "Bell schedule" }));
    const table = await screen.findByRole("table", { name: "Bell schedule" });
    expect(within(table).getByText("Period 2")).toBeTruthy();
    expect(within(table).getAllByText("09:30").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByLabelText("Thu"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(scheduleSetWorkingDays).toHaveBeenCalledWith({ body: { days: ["MON", "TUE", "WED", "THU"] } }));
    expect(await screen.findByText("Working days saved")).toBeTruthy();
  });

  it("an empty schedule offers a standard day or a short day", async () => {
    const scheduleTemplate = vi.fn(async () => SCHEDULE);
    await go(fakeApi({ meGet: vi.fn(async () => acad()), ...base({ scheduleGet: vi.fn(async () => ({ workingDays: ["MON"], periods: [] })), scheduleTemplate }) }));
    expect(await screen.findByText("There are no periods yet")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Bell schedule" }));
    fireEvent.click(await screen.findByRole("button", { name: "Start with a short day" }));
    await waitFor(() => expect(scheduleTemplate).toHaveBeenCalledWith({ body: { template: "SHORT_DAY" } }));
    expect(await screen.findByText("Bell schedule created")).toBeTruthy();
  });

  it("adds a period (Add waits for the fields) and says why an overlap is refused", async () => {
    const scheduleCreate = vi.fn(async () => { throw new ApiError("CONFLICT", 409, "x", undefined, [{ field: "startTime", rule: "overlaps" }]); });
    await go(fakeApi({ meGet: vi.fn(async () => acad()), ...base({ scheduleCreate }) }));
    fireEvent.click(await screen.findByRole("radio", { name: "Bell schedule" }));
    const add = (await screen.findByRole("button", { name: "Add a period" })) as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Period 3" } });
    fireEvent.change(screen.getByLabelText("Starts"), { target: { value: "10:00" } });
    fireEvent.change(screen.getByLabelText("Ends"), { target: { value: "10:40" } });
    fireEvent.click(add);
    await waitFor(() => expect(scheduleCreate).toHaveBeenCalledWith({ body: { label: "Period 3", startTime: "10:00", endTime: "10:40", isBreak: false } }));
    expect(await screen.findByText("That time overlaps another period.")).toBeTruthy();
  });

  it("asks before removing a period, and explains a refusal", async () => {
    const scheduleRemove = vi.fn(async () => { throw new ApiError("CONFLICT", 409, "x", undefined, [{ field: "id", rule: "periodInUse" }]); });
    await go(fakeApi({ meGet: vi.fn(async () => acad()), ...base({ scheduleRemove }) }));
    fireEvent.click(await screen.findByRole("radio", { name: "Bell schedule" }));
    fireEvent.click(await screen.findByRole("button", { name: "Remove: Period 1" }));
    expect(await screen.findByRole("alertdialog", { name: "Remove Period 1?" })).toBeTruthy();
    expect(scheduleRemove).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(scheduleRemove).toHaveBeenCalledWith({ path: { id: "p1" } }));
    expect(await screen.findByText("A period that has lessons in it cannot be removed or made a break.")).toBeTruthy();
  });

  it("a role that may only read can look but not change", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => reader()), ...base() }));
    fireEvent.click(await screen.findByRole("radio", { name: "Bell schedule" }));
    await screen.findByRole("table", { name: "Bell schedule" });
    expect(screen.queryByRole("button", { name: "Add a period" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    expect((screen.getByLabelText("Mon") as HTMLInputElement).disabled).toBe(true);
  });
});
