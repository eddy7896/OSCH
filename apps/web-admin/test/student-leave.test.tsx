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
  m.activeSchool = { ...m.activeSchool!, role, permissions: perms, navigation: [{ title: "Academics", items: [{ key: "student-leave", label: "Student leave" }] }] };
  return m;
};
const academic = () => as("ACADEMIC_ADMIN", { student_leave: { read: "school", update: "school" } });
const principal = () => as("PRINCIPAL", { student_leave: { read: "school" } });
const go = async (api: ReturnType<typeof fakeApi>) => {
  renderApp(<WebAdminApp />, { api, port: fakePort(IN()).port });
  fireEvent.click(await screen.findByRole("button", { name: "Student leave" }));
};
const REQ = (id: string, name: string, o: Record<string, unknown> = {}) => ({
  id, student: { id: `s-${id}`, name, enrollmentId: `E${id}`, className: "Grade 5 A" }, startDate: "2026-11-03", endDate: "2026-11-04", half: null, reason: "Fever", status: "PENDING",
  requestedBy: { id: "p1", name: "Meera Rao" }, decision: null, createdAt: "2026-10-30T08:00:00Z", updatedAt: "2026-10-30T08:00:00Z", ...o,
});
const LIST = { items: [REQ("1", "Aarav Rao"), REQ("2", "Isha Das", { half: "MORNING", startDate: "2026-11-05", endDate: "2026-11-05" })] };

describe("student leave", () => {
  it("lists what is waiting with student, class, dates, parent and reason; the Principal reads without buttons", async () => {
    const studentLeaveList = vi.fn(async () => LIST);
    await go(fakeApi({ meGet: vi.fn(async () => principal()), studentLeaveList }));
    const table = await screen.findByRole("table", { name: "Student leave" });
    expect(within(table).getByText("Aarav Rao")).toBeTruthy();
    expect(within(table).getAllByText("Grade 5 A").length).toBe(2);
    expect(within(table).getAllByText("Meera Rao").length).toBe(2);
    expect(within(table).getByText(/Half day/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Approve/ })).toBeNull();
    expect(studentLeaveList).toHaveBeenCalledWith({ query: { status: "PENDING" } });
  });

  it("the Academic admin approves; the word and the student are on the button", async () => {
    const studentLeaveApprove = vi.fn(async () => REQ("1", "Aarav Rao", { status: "APPROVED" }));
    await go(fakeApi({ meGet: vi.fn(async () => academic()), studentLeaveList: vi.fn(async () => LIST), studentLeaveApprove }));
    fireEvent.click(await screen.findByRole("button", { name: "Approve: Aarav Rao" }));
    await waitFor(() => expect(studentLeaveApprove).toHaveBeenCalledWith({ path: { id: "1" }, body: {} }));
    expect(await screen.findByText("Approved. The parent has been told.")).toBeTruthy();
  });

  it("declining asks first and takes an optional note", async () => {
    const studentLeaveDecline = vi.fn(async () => REQ("2", "Isha Das", { status: "DECLINED" }));
    await go(fakeApi({ meGet: vi.fn(async () => academic()), studentLeaveList: vi.fn(async () => LIST), studentLeaveDecline }));
    fireEvent.click(await screen.findByRole("button", { name: "Decline: Isha Das" }));
    expect(await screen.findByRole("alertdialog", { name: "Decline the leave for Isha Das?" })).toBeTruthy();
    expect(studentLeaveDecline).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Note for the parent (optional)"), { target: { value: "Exam day" } });
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Decline" }));
    await waitFor(() => expect(studentLeaveDecline).toHaveBeenCalledWith({ path: { id: "2" }, body: { note: "Exam day" } }));
    expect(await screen.findByText("Declined. The parent has been told.")).toBeTruthy();
  });

  it("when the other approver was first, the screen says so and reloads", async () => {
    const studentLeaveList = vi.fn(async () => LIST);
    const studentLeaveApprove = vi.fn(async () => { throw new ApiError("CONFLICT", 409, "x", undefined, [{ field: "status", rule: "alreadyDecided" }]); });
    await go(fakeApi({ meGet: vi.fn(async () => academic()), studentLeaveList, studentLeaveApprove }));
    fireEvent.click(await screen.findByRole("button", { name: "Approve: Aarav Rao" }));
    expect(await screen.findByText("Someone decided this request first. Nothing was changed.")).toBeTruthy();
    await waitFor(() => expect(studentLeaveList.mock.calls.length).toBeGreaterThan(1));
  });

  it("has no accessibility violations", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => academic()), studentLeaveList: vi.fn(async () => LIST) }));
    await screen.findByRole("table", { name: "Student leave" });
    const r = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });
});
