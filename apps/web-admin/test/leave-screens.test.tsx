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
  m.activeSchool = { ...m.activeSchool!, role, permissions: perms, navigation: [{ title: "HR", items: [{ key, label }] }] };
  return m;
};
const principal = () => as("PRINCIPAL", { leave: { read: "school", approve: "school" }, staff: { read: "school" } }, "leave", "Leave");
const hr = () => as("HR_MANAGER", { leave: { read: "school", create: "school", update: "school" }, staff: { read: "school" } }, "leave", "Leave");
const bursar = () => as("BURSAR", { leave: { read: "school" } }, "leave", "Leave");
const go = async (api: ReturnType<typeof fakeApi>, name = "Leave") => {
  renderApp(<WebAdminApp />, { api, port: fakePort(IN()).port });
  fireEvent.click(await screen.findByRole("button", { name }));
};

const REQ = (id: string, name: string, o: Record<string, unknown> = {}) => ({ id, staff: { id: `s-${id}`, employeeId: `E${id}`, name }, type: { id: "ty1", name: "Casual", paid: true }, startDate: "2026-10-26", endDate: "2026-10-27", half: null, days: "2", reason: "Family event", status: "PENDING", decision: null, createdAt: "2026-10-20T08:00:00Z", ...o });
const REQUESTS = { items: [REQ("1", "Asha Rao"), REQ("2", "Bilal Khan", { type: { id: "ty2", name: "Unpaid", paid: false }, startDate: "2026-10-28", endDate: "2026-10-28", half: "MORNING", days: "0.5" })] };
const TYPES = { items: [{ id: "ty1", name: "Casual", paid: true, quotaDays: "12" }, { id: "ty2", name: "Unpaid", paid: false, quotaDays: "0" }] };
const PEOPLE = { items: [{ id: "p1", employeeId: "E1", firstName: "Asha", lastName: "Rao", department: null, designation: null, hasAccount: true, status: "ACTIVE" }], total: 1, page: 1, pageSize: 100 };
const BAL = { items: [{ staffId: "p1", academicYearId: "y1", type: { id: "ty1", name: "Casual", paid: true }, allowedDays: "12", remainingDays: "9.5", recorded: true }] };
const base = (over: Record<string, unknown> = {}) => ({ leaveRequests: vi.fn(async () => REQUESTS), leaveTypes: vi.fn(async () => TYPES), staffList: vi.fn(async () => PEOPLE), leaveBalances: vi.fn(async () => BAL), ...over });

describe("leave requests", () => {
  it("lists requests with person, type, dates and half days, days and status; the Bursar reads without buttons", async () => {
    const api = fakeApi({ meGet: vi.fn(async () => bursar()), ...base() });
    await go(api);
    const table = await screen.findByRole("table", { name: "Requests" });
    expect(within(table).getByText("Asha Rao")).toBeTruthy();
    expect(within(table).getByText(/\(morning\)/)).toBeTruthy();
    expect(within(table).getAllByText("Pending").length).toBe(2);
    expect(screen.queryByRole("button", { name: /^Approve/ })).toBeNull();
    expect(api.leaveRequests).toHaveBeenCalledWith({ query: { status: "PENDING" } });
  });

  it("the Principal approves; the word and the person are on the button", async () => {
    const leaveApprove = vi.fn(async () => REQ("1", "Asha Rao", { status: "APPROVED" }));
    await go(fakeApi({ meGet: vi.fn(async () => principal()), ...base({ leaveApprove }) }));
    fireEvent.click(await screen.findByRole("button", { name: "Approve: Asha Rao" }));
    await waitFor(() => expect(leaveApprove).toHaveBeenCalledWith({ path: { id: "1" } }));
    expect(await screen.findByText("Leave approved")).toBeTruthy();
  });

  it("rejecting asks first and takes an optional note", async () => {
    const leaveReject = vi.fn(async () => REQ("2", "Bilal Khan", { status: "REJECTED" }));
    await go(fakeApi({ meGet: vi.fn(async () => principal()), ...base({ leaveReject }) }));
    fireEvent.click(await screen.findByRole("button", { name: "Reject: Bilal Khan" }));
    expect(await screen.findByRole("alertdialog", { name: "Reject the leave of Bilal Khan?" })).toBeTruthy();
    expect(leaveReject).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Note for the person (optional)"), { target: { value: "Exams that day" } });
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Reject" }));
    await waitFor(() => expect(leaveReject).toHaveBeenCalledWith({ path: { id: "2" }, body: { note: "Exams that day" } }));
    expect(await screen.findByText("Leave rejected")).toBeTruthy();
  });

  it("says why an approval was refused", async () => {
    const leaveApprove = vi.fn(async () => { throw new ApiError("CONFLICT", 409, "x", undefined, [{ field: "id", rule: "overBalance" }]); });
    await go(fakeApi({ meGet: vi.fn(async () => principal()), ...base({ leaveApprove }) }));
    fireEvent.click(await screen.findByRole("button", { name: "Approve: Asha Rao" }));
    expect(await screen.findByText("That is more than the days left.")).toBeTruthy();
  });

  it("HR cannot approve or reject: no such buttons", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => hr()), ...base() }));
    await screen.findByRole("table", { name: "Requests" });
    expect(screen.queryByRole("button", { name: /^(Approve|Reject)/ })).toBeNull();
  });

  it("has no accessibility violations", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => principal()), ...base() }));
    await screen.findByRole("table", { name: "Requests" });
    const results = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

describe("leave types and allowances", () => {
  it("HR adds a paid type with a number of days, and the add waits for them", async () => {
    const leaveCreateType = vi.fn(async () => TYPES.items[0]);
    await go(fakeApi({ meGet: vi.fn(async () => hr()), ...base({ leaveCreateType }) }));
    fireEvent.click(await screen.findByRole("radio", { name: "Types and allowances" }));
    const add = (await screen.findAllByRole("button", { name: "Add a leave type" })).at(-1) as HTMLButtonElement;
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Sick" } });
    expect(add.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Days a year"), { target: { value: "7.5" } });
    fireEvent.click(add);
    await waitFor(() => expect(leaveCreateType).toHaveBeenCalledWith({ body: { name: "Sick", paid: true, quotaDays: "7.5" } }));
    expect(await screen.findByText("Leave type added")).toBeTruthy();
  });

  it("sets one person's allowance; Save waits for a change; refusals are explained", async () => {
    const leaveSetBalance = vi.fn(async () => { throw new ApiError("CONFLICT", 409, "x", undefined, [{ field: "allowedDays", rule: "belowDaysTaken" }]); });
    await go(fakeApi({ meGet: vi.fn(async () => hr()), ...base({ leaveSetBalance }) }));
    fireEvent.click(await screen.findByRole("radio", { name: "Types and allowances" }));
    const field = await screen.findByLabelText("Allowed days for Casual");
    const save = within(field.closest("form")!).getByRole("button", { name: "Save" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(field, { target: { value: "1" } });
    fireEvent.click(save);
    await waitFor(() => expect(leaveSetBalance).toHaveBeenCalledWith({ path: { staffId: "p1", typeId: "ty1" }, body: { allowedDays: "1" } }));
    expect(await screen.findByText("That is less than the days already taken.")).toBeTruthy();
  });

  it("asks before removing a type; the Principal sees the types without any change buttons", async () => {
    const leaveDeleteType = vi.fn(async () => undefined);
    await go(fakeApi({ meGet: vi.fn(async () => hr()), ...base({ leaveDeleteType }) }));
    fireEvent.click(await screen.findByRole("radio", { name: "Types and allowances" }));
    fireEvent.click(await screen.findByRole("button", { name: "Remove: Unpaid" }));
    expect(await screen.findByRole("alertdialog", { name: "Remove Unpaid?" })).toBeTruthy();
    expect(leaveDeleteType).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(leaveDeleteType).toHaveBeenCalledWith({ path: { id: "ty2" } }));
  });

  it("a reader sees the types only", async () => {
    const api = fakeApi({ meGet: vi.fn(async () => principal()), ...base() });
    await go(api);
    fireEvent.click(await screen.findByRole("radio", { name: "Types and allowances" }));
    await screen.findByRole("table", { name: "Types and allowances" });
    expect(screen.queryByRole("button", { name: /^(Add a leave type|Remove)/ })).toBeNull();
    expect(api.staffList).not.toHaveBeenCalled();
  });
});

describe("substitution board", () => {
  const acad = () => as("ACADEMIC_ADMIN", { academics: { read: "school", update: "school" } }, "substitution", "Substitutions");
  const reader = () => as("PRINCIPAL", { academics: { read: "school" } }, "substitution", "Substitutions");
  const NEED = (n: number, cover: unknown = null) => ({ date: "2026-10-26", leaveRequestId: "l1", absent: { id: "t1", employeeId: "E1", name: "Asha Rao" }, slot: { entryId: `e${n}`, day: "MON", period: { id: `p${n}`, label: `Period ${n}`, startTime: "08:30", endTime: "09:10" }, class: { id: "c1", name: "5 B" }, subject: { id: "s1", name: "Mathematics", code: "MATH" } }, cover });
  const NEEDS = { from: "2026-10-26", to: "2026-11-08", items: [NEED(1), NEED(2, { id: "cv1", substitute: { id: "t3", employeeId: "E3", name: "Chitra Nair" } })] };
  const SUG = { need: NEED(1), candidates: [{ staff: { id: "t2", employeeId: "E2", name: "Bilal Khan" }, substitutionsThisMonth: 0 }, { staff: { id: "t3", employeeId: "E3", name: "Chitra Nair" }, substitutionsThisMonth: 2 }] };
  const sb = (over: Record<string, unknown> = {}) => ({ substitutionNeeds: vi.fn(async () => NEEDS), substitutionSuggestions: vi.fn(async () => SUG), ...over });

  it("lists lessons that need cover with who is away and who covers, and nothing is assigned by itself", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => reader()), ...sb() }), "Substitutions");
    const table = await screen.findByRole("table", { name: "Substitutions" });
    expect(within(table).getByText("Not chosen yet")).toBeTruthy();
    expect(within(table).getByText("Chitra Nair")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Choose/ })).toBeNull();
  });

  it("the Academic admin chooses a substitute from the suggestions and the choice is sent", async () => {
    const substitutionAssign = vi.fn(async () => NEED(1));
    await go(fakeApi({ meGet: vi.fn(async () => acad()), ...sb({ substitutionAssign }) }), "Substitutions");
    fireEvent.click(await screen.findByRole("button", { name: /^Choose: .*Period 1/ }));
    expect(await screen.findByText("0 covers this month")).toBeTruthy();
    expect(screen.getByText("2 covers this month")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Choose Bilal Khan" }));
    await waitFor(() => expect(substitutionAssign).toHaveBeenCalledWith({ body: { entryId: "e1", date: "2026-10-26", substituteStaffId: "t2" } }));
    expect(await screen.findByText("Cover chosen")).toBeTruthy();
  });

  it("changing or removing cover; a refusal is explained and the list is looked at again", async () => {
    const substitutionClear = vi.fn(async () => undefined);
    const substitutionAssign = vi.fn(async () => { throw new ApiError("CONFLICT", 409, "x", undefined, [{ field: "substituteStaffId", rule: "hasOwnLesson" }]); });
    await go(fakeApi({ meGet: vi.fn(async () => acad()), ...sb({ substitutionClear, substitutionAssign }) }), "Substitutions");
    fireEvent.click(await screen.findByRole("button", { name: /^Change: .*Period 2/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Remove cover" }));
    await waitFor(() => expect(substitutionClear).toHaveBeenCalledWith({ path: { id: "cv1" } }));
    expect(await screen.findByText("Cover removed")).toBeTruthy();
    fireEvent.click(await screen.findByRole("button", { name: /^Choose: .*Period 1/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Choose Bilal Khan" }));
    expect(await screen.findByText("That teacher has a lesson of their own then.")).toBeTruthy();
  });

  it("with nobody free it says so; with no needs it says nothing waits", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => acad()), ...sb({ substitutionSuggestions: vi.fn(async () => ({ need: NEED(1), candidates: [] })) }) }), "Substitutions");
    fireEvent.click(await screen.findByRole("button", { name: /^Choose: .*Period 1/ }));
    expect(await screen.findByText("Nobody is free and qualified for this lesson.")).toBeTruthy();
  });
  it("an empty range says nothing is waiting", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => reader()), ...sb({ substitutionNeeds: vi.fn(async () => ({ from: "a", to: "b", items: [] })) }) }), "Substitutions");
    expect(await screen.findByText("No lessons are waiting for cover in this range.")).toBeTruthy();
  });
});

describe("unpaid leave in a pay run", () => {
  const payrollMe = (apply: boolean) => as("HR_MANAGER", { payroll: { read: "school", create: "school", ...(apply ? { update: "school" } : {}) } }, "payroll", "Payroll");
  const RUN = { id: "r1", year: 2026, month: 10, status: "DRAFT", preparedBy: { id: "u", name: "Hema" }, approvedBy: null, approvedAt: null, paidBy: null, paidOn: null, paymentReference: null, totals: { payslips: 1, grossMinor: "3000000", deductionsMinor: "0", netMinor: "3000000" }, payslips: [{ id: "ps1", staff: { id: "s1", employeeId: "E1", name: "Asha Rao", department: null, designation: null }, lines: [], grossMinor: "3000000", deductionsMinor: "0", netMinor: "3000000" }] };
  const LIST = { items: [{ id: "r1", year: 2026, month: 10, status: "DRAFT", preparedBy: { id: "u", name: "Hema" }, approvedBy: null, approvedAt: null, paidBy: null, paidOn: null, paymentReference: null }] };
  const prop = (applied: unknown = null) => ({ run: { id: "r1", year: 2026, month: 10, status: "DRAFT" }, workingDays: 27, withoutPayslip: [{ id: "x", employeeId: "E9", name: "Dev Patel" }], items: [{ staff: { id: "s1", employeeId: "E1", name: "Asha Rao" }, payslipId: "ps1", monthlyGrossMinor: "3000000", days: "1.5", proposedMinor: "166666", leaves: [], applied }] });
  const open = async (api: ReturnType<typeof fakeApi>) => {
    await go(api, "Payroll");
    fireEvent.click(await screen.findByText(/10\/2026/));
  };
  it("shows the proposal and applies it at the proposed amount; nothing is deducted by showing it", async () => {
    const leaveDeductionApply = vi.fn(async () => prop({ lineId: "l", amountMinor: "166666" }));
    await open(fakeApi({ meGet: vi.fn(async () => payrollMe(true)), payrollRuns: vi.fn(async () => LIST), payrollRun: vi.fn(async () => RUN), leaveDeductionProposals: vi.fn(async () => prop()), leaveDeductionApply }));
    expect(await screen.findByText("Unpaid leave in this month")).toBeTruthy();
    expect(screen.getByText("₹1,666.66")).toBeTruthy();
    expect(screen.getByText(/Dev Patel/)).toBeTruthy();
    expect(leaveDeductionApply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Apply: Asha Rao" }));
    await waitFor(() => expect(leaveDeductionApply).toHaveBeenCalledWith({ path: { id: "ps1" }, body: {} }));
    expect(await screen.findByText("Deduction applied")).toBeTruthy();
  });
  it("HR may change the amount first (rupees become paise); a refusal is explained", async () => {
    const leaveDeductionApply = vi.fn(async () => { throw new ApiError("INVALID_REQUEST", 400, "x", undefined, [{ field: "amountMinor", rule: "aboveMonthlyGross" }]); });
    await open(fakeApi({ meGet: vi.fn(async () => payrollMe(true)), payrollRuns: vi.fn(async () => LIST), payrollRun: vi.fn(async () => RUN), leaveDeductionProposals: vi.fn(async () => prop()), leaveDeductionApply }));
    fireEvent.change(await screen.findByLabelText("Amount to deduct: Asha Rao"), { target: { value: "1,000.50" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply: Asha Rao" }));
    await waitFor(() => expect(leaveDeductionApply).toHaveBeenCalledWith({ path: { id: "ps1" }, body: { amountMinor: "100050" } }));
    expect(await screen.findByText("That is more than the month's pay.")).toBeTruthy();
  });
  it("without the update grant, or once applied, there is no Apply button", async () => {
    await open(fakeApi({ meGet: vi.fn(async () => payrollMe(false)), payrollRuns: vi.fn(async () => LIST), payrollRun: vi.fn(async () => RUN), leaveDeductionProposals: vi.fn(async () => prop()) }));
    await screen.findByText("Unpaid leave in this month");
    expect(screen.queryByRole("button", { name: /^Apply/ })).toBeNull();
  });
});
