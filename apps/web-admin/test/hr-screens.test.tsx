import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@oruschools/api-client";
import { WebAdminApp } from "@/components/WebAdminApp";
import { rupeesToMinor } from "@/lib/display";
import { IN, fakeApi, fakePort, me, renderApp } from "./helpers";

vi.mock("@/i18n/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ replace: vi.fn() }) }));

type Perms = NonNullable<ReturnType<typeof me>["activeSchool"]>["permissions"];
const as = (role: string, perms: Perms, nav: Array<{ key: string; label: string }>) => {
  const m = me();
  m.activeSchool = { ...m.activeSchool!, role, permissions: perms, navigation: [{ title: "HR", items: nav }] };
  return m;
};
const NAVS = [{ key: "staff", label: "Staff" }, { key: "payroll", label: "Payroll" }];
const hr = () => as("HR_MANAGER", { staff: { read: "school", create: "school" }, payroll: { read: "school", create: "school", update: "school" } }, NAVS);
const principal = () => as("PRINCIPAL", { payroll: { read: "school", approve: "school" } }, [NAVS[1]!]);
const bursar = () => as("BURSAR", { payroll: { read: "school", create: "school", update: "school", delete: "school" } }, [NAVS[1]!]);
const go = async (api: ReturnType<typeof fakeApi>, name: string) => {
  renderApp(<WebAdminApp />, { api, port: fakePort(IN()).port });
  fireEvent.click(await screen.findByRole("button", { name }));
};

const member = (o = {}) => ({ id: "t1", employeeId: "E0007", firstName: "Sana", lastName: "Iqbal", department: "Science", designation: "Teacher", status: "ACTIVE", hasAccount: false, ...o });
const staffList = (items = [member(), member({ id: "t2", employeeId: "E0008", firstName: "Ravi", lastName: "Menon", department: "Arts", status: "LEFT" })]) => ({ items, total: items.length, page: 1, pageSize: 25 });
const staffFull = () => ({ ...member(), userId: null, phone: "+919876543210", email: "sana@example.com", dateOfBirth: null, gender: null, dateOfJoining: "2020-06-01", address: null, emergencyContactName: null, emergencyContactPhone: null, hasPhoto: false, documents: [] });
const salary = (lines = [{ id: "l1", kind: "EARNING", name: "Basic pay", amountMinor: "4600000" }, { id: "l2", kind: "DEDUCTION", name: "Advance recovery", amountMinor: "250000" }]) => ({ staff: { id: "t1", employeeId: "E0007", name: "Sana Iqbal" }, lines, grossMinor: "4600000", deductionsMinor: "250000", netMinor: "4350000" });
const slip = (o = {}) => ({ id: "ps1", staff: { id: "t1", employeeId: "E0007", name: "Sana Iqbal", department: "Science", designation: "Teacher" }, lines: [{ id: "x1", kind: "EARNING", name: "Basic pay", amountMinor: "4600000", manual: false }, { id: "x2", kind: "DEDUCTION", name: "Advance recovery", amountMinor: "250000", manual: false }], grossMinor: "4600000", deductionsMinor: "250000", netMinor: "4350000", ...o });
const person = (name: string) => ({ id: "u", name });
const runFull = (o = {}) => ({ id: "r1", year: 2027, month: 4, status: "DRAFT", preparedBy: person("Hema HR"), approvedBy: null, approvedAt: null, paidBy: null, paidOn: null, paymentReference: null, totals: { payslips: 1, grossMinor: "4600000", deductionsMinor: "250000", netMinor: "4350000" }, payslips: [slip()], ...o });
const runRow = (o = {}) => ({ id: "r1", year: 2027, month: 4, status: "DRAFT", preparedBy: person("Hema HR"), approvedBy: null, approvedAt: null, paidBy: null, paidOn: null, paymentReference: null, ...o });

describe("rupeesToMinor", () => {
  it("reads what a person types as exact paise", () => {
    expect(rupeesToMinor("45000")).toBe("4500000");
    expect(rupeesToMinor("45,000.5")).toBe("4500050");
    expect(rupeesToMinor(" 45000.50 ")).toBe("4500050");
    expect(rupeesToMinor("0.05")).toBe("5");
    expect(rupeesToMinor("007")).toBe("700");
    expect(rupeesToMinor("999999999999999.99")).toBe("99999999999999999"); // exact, past what a float holds
  });
  it("refuses anything that is not a positive amount of rupees and paise", () => {
    for (const bad of ["", "abc", "0", "0.00", "-5", "1.234", "1e5", "1,2,3x", "12.", ".5", "1000000000000000"]) expect(rupeesToMinor(bad), bad).toBeNull();
  });
});

describe("staff screen", () => {
  it("lists staff with employee no., department, designation and status; filters ask the gateway", async () => {
    const staffList_ = vi.fn(async () => staffList());
    await go(fakeApi({ meGet: vi.fn(async () => hr()), staffList: staffList_, staffDepartments: vi.fn(async () => ({ items: ["Arts", "Science"] })) }), "Staff");
    const table = await screen.findByRole("table", { name: "Staff" });
    expect(within(table).getByText("E0007")).toBeTruthy();
    expect(within(table).getByText("Left")).toBeTruthy();
    fireEvent.change(await screen.findByLabelText("Department"), { target: { value: "Science" } });
    await waitFor(() => expect(staffList_).toHaveBeenLastCalledWith({ query: { page: 1, pageSize: 25, department: "Science" } }));
    fireEvent.change(screen.getByLabelText("Search by name or employee no."), { target: { value: "sana" } });
    await waitFor(() => expect(staffList_).toHaveBeenLastCalledWith({ query: { page: 1, pageSize: 25, search: "sana", department: "Science" } }));
  });

  it("adds a staff member sending only what was filled; no Add button without the grant", async () => {
    const staffCreate = vi.fn(async () => staffFull());
    await go(fakeApi({ meGet: vi.fn(async () => hr()), staffList: vi.fn(async () => staffList()), staffDepartments: vi.fn(async () => ({ items: [] })), staffCreate }), "Staff");
    fireEvent.click(await screen.findByRole("button", { name: "Add staff member" }));
    expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Sana" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Iqbal" } });
    fireEvent.change(screen.getAllByLabelText("Department")[0]!, { target: { value: "Science" } }); // the form field, not the filter
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(staffCreate).toHaveBeenCalledWith({ body: { firstName: "Sana", lastName: "Iqbal", department: "Science" } }));
    expect(await screen.findByText("Staff member added")).toBeTruthy();
  });

  it("a role without the create grant sees no Add button", async () => {
    const m = as("PRINCIPAL", { staff: { read: "school" } }, [NAVS[0]!]);
    await go(fakeApi({ meGet: vi.fn(async () => m), staffList: vi.fn(async () => staffList()), staffDepartments: vi.fn(async () => ({ items: [] })) }), "Staff");
    await screen.findByRole("table");
    expect(screen.queryByRole("button", { name: "Add staff member" })).toBeNull();
  });

  it("the staff page shows the profile and, for HR, the salary lines with the net; HR can add a line from rupees but not remove one", async () => {
    const payrollAddLine = vi.fn(async () => salary());
    const api = fakeApi({ meGet: vi.fn(async () => hr()), staffList: vi.fn(async () => staffList()), staffDepartments: vi.fn(async () => ({ items: [] })), staffGet: vi.fn(async () => staffFull()), payrollSalary: vi.fn(async () => salary()), payrollAddLine });
    await go(api, "Staff");
    fireEvent.click(await screen.findByRole("button", { name: "Sana Iqbal" }));
    expect(await screen.findByText("Basic pay")).toBeTruthy();
    expect(screen.getByText("₹43,500.00")).toBeTruthy(); // net
    expect(screen.queryByRole("button", { name: /^Remove/ })).toBeNull();
    fireEvent.change(screen.getByLabelText("Component"), { target: { value: "House rent allowance" } });
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "18,000.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Add salary line" }));
    await waitFor(() => expect(payrollAddLine).toHaveBeenCalledWith({ path: { staffId: "t1" }, body: { kind: "EARNING", name: "House rent allowance", amountMinor: "1800050" } }));
  });

  it("a role that may not see pay sees the profile and no salary; the Bursar can remove a line", async () => {
    const noPay = as("PRINCIPAL", { staff: { read: "school" } }, [NAVS[0]!]);
    const salaryCall = vi.fn();
    await go(fakeApi({ meGet: vi.fn(async () => noPay), staffList: vi.fn(async () => staffList()), staffDepartments: vi.fn(async () => ({ items: [] })), staffGet: vi.fn(async () => staffFull()), payrollSalary: salaryCall }), "Staff");
    fireEvent.click(await screen.findByRole("button", { name: "Sana Iqbal" }));
    expect(await screen.findByText("E0007")).toBeTruthy();
    expect(screen.queryByText("Salary")).toBeNull();
    expect(salaryCall).not.toHaveBeenCalled();
  });

  it("the Bursar can remove a salary line", async () => {
    const payrollRemoveLine = vi.fn(async () => salary());
    const m = as("BURSAR", { staff: { read: "school" }, payroll: { read: "school", create: "school", delete: "school" } }, [NAVS[0]!]);
    await go(fakeApi({ meGet: vi.fn(async () => m), staffList: vi.fn(async () => staffList()), staffDepartments: vi.fn(async () => ({ items: [] })), staffGet: vi.fn(async () => staffFull()), payrollSalary: vi.fn(async () => salary()), payrollRemoveLine }), "Staff");
    fireEvent.click(await screen.findByRole("button", { name: "Sana Iqbal" }));
    fireEvent.click(await screen.findByRole("button", { name: "Remove: Advance recovery" }));
    await waitFor(() => expect(payrollRemoveLine).toHaveBeenCalledWith({ path: { id: "l2" } }));
  });

  it("an amount that is not rupees blocks the button", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => hr()), staffList: vi.fn(async () => staffList()), staffDepartments: vi.fn(async () => ({ items: [] })), staffGet: vi.fn(async () => staffFull()), payrollSalary: vi.fn(async () => salary()) }), "Staff");
    fireEvent.click(await screen.findByRole("button", { name: "Sana Iqbal" }));
    await screen.findByText("Basic pay");
    fireEvent.change(screen.getByLabelText("Component"), { target: { value: "Bonus" } });
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "12.345" } });
    expect((screen.getByRole("button", { name: "Add salary line" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("a failed list offers Retry; no accessibility violations", async () => {
    const list = vi.fn().mockRejectedValueOnce(new ApiError("NETWORK_ERROR", 0, "x")).mockResolvedValue(staffList());
    await go(fakeApi({ meGet: vi.fn(async () => hr()), staffList: list, staffDepartments: vi.fn(async () => ({ items: ["Arts"] })) }), "Staff");
    expect((await screen.findByRole("alert")).textContent).toContain("We could not reach the server");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByRole("table");
    const r = await axe.run(document.body, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 100)}`)).toEqual([]);
  });
});

describe("payroll screen", () => {
  it("lists the runs by month with status; a new run is only offered to roles that may create, and sends year and month", async () => {
    const payrollCreateRun = vi.fn(async () => runFull());
    await go(fakeApi({ meGet: vi.fn(async () => hr()), payrollRuns: vi.fn(async () => ({ items: [runRow(), runRow({ id: "r0", month: 3, status: "PAID", paidOn: "2027-04-01" })] })), payrollCreateRun }), "Payroll");
    const table = await screen.findByRole("table", { name: "Payroll" });
    expect(within(table).getByText("04/2027")).toBeTruthy();
    expect(within(table).getByText("Paid")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "New pay run" }));
    fireEvent.change(screen.getByLabelText("Month"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Year"), { target: { value: "2027" } });
    fireEvent.click(screen.getAllByRole("button", { name: "New pay run" }).at(-1)!);
    await waitFor(() => expect(payrollCreateRun).toHaveBeenCalledWith({ body: { year: 2027, month: 5 } }));
    expect(await screen.findByText("Pay run created")).toBeTruthy();
  });

  it("no runs: an honest empty state", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => hr()), payrollRuns: vi.fn(async () => ({ items: [] })) }), "Payroll");
    expect(await screen.findByText("No pay runs yet")).toBeTruthy();
  });

  it("a draft run: totals, the payslips with their lines, and only HR's own buttons (none of approve, pay or delete)", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => hr()), payrollRuns: vi.fn(async () => ({ items: [runRow()] })), payrollRun: vi.fn(async () => runFull()) }), "Payroll");
    fireEvent.click(await screen.findByRole("button", { name: "04/2027" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Payroll 04/2027" })).toBeTruthy();
    expect(screen.getAllByText("₹43,500.00").length).toBeGreaterThan(0);
    expect(screen.getByText("Advance recovery")).toBeTruthy();
    for (const b of ["Approve", "Mark as paid", "Delete draft", "Payslip PDF"]) expect(screen.queryByRole("button", { name: b })).toBeNull();
  });

  it("the Principal approves, after a confirmation that names the month, the staff and the net pay", async () => {
    const payrollApprove = vi.fn(async () => runFull({ status: "APPROVED" }));
    const payrollRun = vi.fn().mockResolvedValueOnce(runFull()).mockResolvedValue(runFull({ status: "APPROVED", approvedBy: person("Priya Principal"), approvedAt: "2027-04-28T10:00:00Z" }));
    await go(fakeApi({ meGet: vi.fn(async () => principal()), payrollRuns: vi.fn(async () => ({ items: [runRow()] })), payrollRun, payrollApprove }), "Payroll");
    fireEvent.click(await screen.findByRole("button", { name: "04/2027" }));
    fireEvent.click(await screen.findByRole("button", { name: "Approve" }));
    expect(payrollApprove).not.toHaveBeenCalled();
    expect(screen.getByText("Approve payroll for 04/2027? 1 staff, net pay ₹43,500.00. This cannot be undone.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(payrollApprove).toHaveBeenCalledWith({ path: { id: "r1" } }));
    expect(await screen.findByText(/Priya Principal/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
  });

  it("cancelling the confirmation changes nothing", async () => {
    const payrollApprove = vi.fn();
    await go(fakeApi({ meGet: vi.fn(async () => principal()), payrollRuns: vi.fn(async () => ({ items: [runRow()] })), payrollRun: vi.fn(async () => runFull()), payrollApprove }), "Payroll");
    fireEvent.click(await screen.findByRole("button", { name: "04/2027" }));
    fireEvent.click(await screen.findByRole("button", { name: "Approve" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(payrollApprove).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Approve" })).toBeTruthy();
  });

  it("an empty draft cannot be approved", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => principal()), payrollRuns: vi.fn(async () => ({ items: [runRow()] })), payrollRun: vi.fn(async () => runFull({ totals: { payslips: 0, grossMinor: "0", deductionsMinor: "0", netMinor: "0" }, payslips: [] })) }), "Payroll");
    fireEvent.click(await screen.findByRole("button", { name: "04/2027" }));
    expect((await screen.findByRole("button", { name: "Approve" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("the Bursar pays an approved run with a reference and date, and downloads payslip PDFs in the screen's language", async () => {
    const payrollPay = vi.fn(async () => runFull({ status: "PAID" }));
    const payrollPayslipPdf = vi.fn(async () => new Blob(["x"]));
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    await go(fakeApi({ meGet: vi.fn(async () => bursar()), payrollRuns: vi.fn(async () => ({ items: [runRow({ status: "APPROVED" })] })), payrollRun: vi.fn(async () => runFull({ status: "APPROVED" })), payrollPay, payrollPayslipPdf }), "Payroll");
    fireEvent.click(await screen.findByRole("button", { name: "04/2027" }));
    fireEvent.click(await screen.findByRole("button", { name: "Payslip PDF" }));
    await waitFor(() => expect(payrollPayslipPdf).toHaveBeenCalledWith({ path: { id: "ps1" }, query: { lang: "en" }, parseAs: "blob" }));
    expect(click).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull(); // the Bursar never approves
    fireEvent.click(screen.getByRole("button", { name: "Mark as paid" }));
    expect(screen.getByText("Record payment of ₹43,500.00 for 04/2027? This cannot be undone.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Reference"), { target: { value: "NEFT-9" } });
    fireEvent.change(screen.getByLabelText("Paid on"), { target: { value: "2027-04-30" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(payrollPay).toHaveBeenCalledWith({ path: { id: "r1" }, body: { reference: "NEFT-9", paidOn: "2027-04-30" } }));
  });

  it("the Bursar deletes a draft after confirming, and lands back at the list", async () => {
    const payrollDeleteRun = vi.fn(async () => undefined);
    await go(fakeApi({ meGet: vi.fn(async () => bursar()), payrollRuns: vi.fn(async () => ({ items: [runRow()] })), payrollRun: vi.fn(async () => runFull()), payrollDeleteRun }), "Payroll");
    fireEvent.click(await screen.findByRole("button", { name: "04/2027" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete draft" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(payrollDeleteRun).toHaveBeenCalledWith({ path: { id: "r1" } }));
    expect(await screen.findByRole("button", { name: "Back to the list" })).toBeTruthy();
  });

  it("a refusal from the gateway (for example someone else approved first) is shown in words", async () => {
    const payrollApprove = vi.fn().mockRejectedValue(new ApiError("CONFLICT", 409, "x"));
    await go(fakeApi({ meGet: vi.fn(async () => principal()), payrollRuns: vi.fn(async () => ({ items: [runRow()] })), payrollRun: vi.fn(async () => runFull()), payrollApprove }), "Payroll");
    fireEvent.click(await screen.findByRole("button", { name: "04/2027" }));
    fireEvent.click(await screen.findByRole("button", { name: "Approve" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect((await screen.findByRole("alert")).textContent).toContain("That already exists");
  });

  it("no accessibility violations on a run page", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => principal()), payrollRuns: vi.fn(async () => ({ items: [runRow()] })), payrollRun: vi.fn(async () => runFull()) }), "Payroll");
    fireEvent.click(await screen.findByRole("button", { name: "04/2027" }));
    await screen.findByRole("heading", { level: 1, name: "Payroll 04/2027" });
    const r = await axe.run(document.body, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 100)}`)).toEqual([]);
  });
});
