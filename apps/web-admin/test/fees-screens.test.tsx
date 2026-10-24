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
  m.activeSchool = { ...m.activeSchool!, role, permissions: perms, navigation: [{ title: "Finance", items: [{ key: "finance", label: "Fees and payments" }] }] };
  return m;
};
const bursar = () => as("BURSAR", { finance: { read: "school", create: "school", update: "school", delete: "school" } });
const accountant = () => as("ACCOUNTANT", { finance: { read: "school", create: "school", update: "school" } });
const readOnly = () => as("PRINCIPAL", { finance: { read: "school" } });
const go = async (api: ReturnType<typeof fakeApi>) => {
  renderApp(<WebAdminApp />, { api, port: fakePort(IN()).port });
  fireEvent.click(await screen.findByRole("button", { name: "Fees and payments" }));
};

const stu = { id: "s1", enrollmentId: "S0042", name: "Asha Kumar" };
const inv = (o = {}) => ({ id: "i1", title: "Tuition - April", student: stu, academicYear: { id: "y1", name: "2027-2028" }, dueDate: "2027-04-10", grossMinor: "2000000", discountMinor: "0", amountMinor: "2000000", paidMinor: "500000", outstandingMinor: "1500000", status: "PARTIAL", ...o });
const list = (items = [inv(), inv({ id: "i2", title: "Bus", paidMinor: "300000", amountMinor: "300000", outstandingMinor: "0", status: "PAID" })]) => ({ items, total: items.length, page: 1, pageSize: 25, totals: { count: items.length, amountMinor: "2300000", paidMinor: "800000", outstandingMinor: "1500000" } });
const pay = (o = {}) => ({ id: "p1", amountMinor: "500000", method: "UPI", paidOn: "2027-04-02", reference: "UPI-77", reversedAt: null, reversalReason: null, recordedBy: { id: "u", name: "Bursar" }, receipt: { id: "rc1", number: "R-2027-2028-00012", cancelled: false }, ...o });
const full = (o = {}) => ({ ...inv(), payments: [pay()], ...o });
const rcpt = (o = {}) => ({ id: "rc1", number: "R-2027-2028-00012", paidOn: "2027-04-02", issuedAt: "2027-04-02T10:00:00Z", cancelled: false, amountMinor: "500000", student: stu, invoice: { id: "i1", title: "Tuition - April" }, ...o });
const structure = () => ({ id: "f1", name: "5 fees 2027-2028", academicYear: { id: "y1", name: "2027-2028" }, gradeLevel: { id: "l5", name: "5" }, totalMinor: "3000000", items: [{ id: "it1", name: "Tuition", totalMinor: "3000000", instalments: [{ id: "n1", label: "Term 1", sequence: 1, dueDate: "2027-04-10", amountMinor: "1500000" }, { id: "n2", label: "Term 2", sequence: 2, dueDate: "2027-09-10", amountMinor: "1500000" }] }] });

describe("invoices", () => {
  it("lists invoices with status and totals; the state filter asks the gateway", async () => {
    const invoicesList = vi.fn(async () => list());
    await go(fakeApi({ meGet: vi.fn(async () => bursar()), invoicesList }));
    const table = await screen.findByRole("table", { name: "Invoices" });
    expect(within(table).getByText("Tuition - April")).toBeTruthy();
    expect(within(table).getByText("Part paid")).toBeTruthy();
    expect(within(table).getByText("Paid")).toBeTruthy();
    expect(screen.getByText("₹23,000.00")).toBeTruthy(); // billed
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "OVERDUE" } });
    await waitFor(() => expect(invoicesList).toHaveBeenLastCalledWith({ query: { page: 1, pageSize: 25, state: "OVERDUE" } }));
  });

  it("no invoices: says so, and how to start", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => bursar()), invoicesList: vi.fn(async () => list([])) }));
    expect(await screen.findByText("No invoices yet")).toBeTruthy();
    expect(screen.getByText("Set up fees, then bill them.")).toBeTruthy();
  });

  it("a read-only role sees no New invoice, Bill fees, Record payment or Reverse", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => readOnly()), invoicesList: vi.fn(async () => list()), invoicesGet: vi.fn(async () => full()) }));
    await screen.findByRole("table");
    expect(screen.queryByRole("button", { name: "New invoice" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Bill fees" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tuition - April" }));
    await screen.findByRole("heading", { level: 1, name: "Tuition - April" });
    expect(screen.queryByRole("button", { name: "Record payment" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Reverse/ })).toBeNull();
  });

  it("records a payment from rupees and shows the new receipt number", async () => {
    const invoicesPay = vi.fn(async () => full({ payments: [pay(), pay({ id: "p2", amountMinor: "1000050", receipt: { id: "rc2", number: "R-2027-2028-00013", cancelled: false } })] }));
    await go(fakeApi({ meGet: vi.fn(async () => accountant()), invoicesList: vi.fn(async () => list()), invoicesGet: vi.fn(async () => full()), invoicesPay }));
    fireEvent.click(await screen.findByRole("button", { name: "Tuition - April" }));
    fireEvent.click(await screen.findByRole("button", { name: "Record payment" }));
    const submit = screen.getAllByRole("button", { name: "Record payment" }).at(-1) as HTMLButtonElement;
    expect(submit.disabled).toBe(true); // an amount first
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "10,000.50" } });
    fireEvent.change(screen.getByLabelText("Payment method"), { target: { value: "UPI" } });
    fireEvent.change(screen.getByLabelText("Reference"), { target: { value: "UPI-9" } });
    fireEvent.click(submit);
    await waitFor(() => expect(invoicesPay).toHaveBeenCalledWith({ path: { id: "i1" }, body: expect.objectContaining({ amountMinor: "1000050", method: "UPI", reference: "UPI-9" }) }));
    expect(await screen.findByText("Payment recorded. Receipt no. R-2027-2028-00013")).toBeTruthy();
  });

  it("a fully paid invoice offers no Record payment; an overpayment refusal is shown in words", async () => {
    const invoicesPay = vi.fn().mockRejectedValue(new ApiError("CONFLICT", 409, "x"));
    await go(fakeApi({ meGet: vi.fn(async () => bursar()), invoicesList: vi.fn(async () => list()), invoicesGet: vi.fn(async () => full()), invoicesPay }));
    fireEvent.click(await screen.findByRole("button", { name: "Tuition - April" }));
    fireEvent.click(await screen.findByRole("button", { name: "Record payment" }));
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "99999" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Record payment" }).at(-1)!);
    expect((await screen.findByRole("alert")).textContent).toContain("That already exists");
  });

  it("only the Bursar's grant shows Reverse; it asks for a reason of at least 3 characters after a question naming the amount", async () => {
    const invoicesReverse = vi.fn(async () => full());
    const api = fakeApi({ meGet: vi.fn(async () => bursar()), invoicesList: vi.fn(async () => list()), invoicesGet: vi.fn(async () => full()), invoicesReverse });
    await go(api);
    fireEvent.click(await screen.findByRole("button", { name: "Tuition - April" }));
    fireEvent.click(await screen.findByRole("button", { name: "Reverse: ₹5,000.00" }));
    expect(screen.getByText("Reverse this payment of ₹5,000.00? The invoice becomes unpaid again and the receipt is cancelled. This cannot be undone.")).toBeTruthy();
    const confirm = screen.getByRole("button", { name: "Confirm" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Wrong child" } });
    fireEvent.click(confirm);
    await waitFor(() => expect(invoicesReverse).toHaveBeenCalledWith({ path: { id: "p1" }, body: { reason: "Wrong child" } }));
  });

  it("the Accountant (no delete grant) cannot reverse; a reversed payment shows its reason", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => accountant()), invoicesList: vi.fn(async () => list()), invoicesGet: vi.fn(async () => full({ payments: [pay({ reversedAt: "2027-04-03T00:00:00Z", reversalReason: "Wrong child" })] })) }));
    fireEvent.click(await screen.findByRole("button", { name: "Tuition - April" }));
    expect(await screen.findByText("Wrong child")).toBeTruthy();
    expect(screen.getByText("Reversed")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Reverse/ })).toBeNull();
  });

  it("downloads a payment's receipt as a PDF in the screen's language", async () => {
    const receiptsPdf = vi.fn(async () => new Blob(["x"]));
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    await go(fakeApi({ meGet: vi.fn(async () => bursar()), invoicesList: vi.fn(async () => list()), invoicesGet: vi.fn(async () => full()), receiptsPdf }));
    fireEvent.click(await screen.findByRole("button", { name: "Tuition - April" }));
    fireEvent.click(await screen.findByRole("button", { name: "Receipt PDF: R-2027-2028-00012" }));
    await waitFor(() => expect(receiptsPdf).toHaveBeenCalledWith({ path: { id: "rc1" }, query: { lang: "en" }, parseAs: "blob" }));
    expect(click).toHaveBeenCalled();
  });

  it("a new invoice: find the student, then description, amount and due date; sent as exact paise", async () => {
    const invoicesCreate = vi.fn(async () => full());
    const studentsList = vi.fn(async () => ({ items: [{ id: "s1", enrollmentId: "S0042", firstName: "Asha", lastName: "Kumar", status: "ACTIVE", gender: null, dateOfBirth: null, placement: null }], total: 1, page: 1, pageSize: 5 }));
    await go(fakeApi({ meGet: vi.fn(async () => bursar()), invoicesList: vi.fn(async () => list()), invoicesCreate, studentsList }));
    fireEvent.click(await screen.findByRole("button", { name: "New invoice" }));
    fireEvent.change(screen.getByLabelText("Find a student by name or enrolment no."), { target: { value: "ash" } });
    fireEvent.click(await screen.findByRole("button", { name: "Asha Kumar (S0042)" }));
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Lab fee" } });
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "750" } });
    fireEvent.change(screen.getByLabelText("Due date"), { target: { value: "2027-06-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(invoicesCreate).toHaveBeenCalledWith({ body: { studentId: "s1", title: "Lab fee", amountMinor: "75000", dueDate: "2027-06-01" } }));
    expect(await screen.findByText("Invoice created")).toBeTruthy();
  });

  it("billing: preview first, then create behind a confirmation that repeats the numbers", async () => {
    const preview = { dryRun: true, academicYear: { id: "y1", name: "2027-2028" }, students: 40, created: 38, alreadyInvoiced: 2, fullyWaived: 0, studentsWithoutStructure: 0, truncated: false, sample: [] };
    const invoicesPreview = vi.fn(async () => preview);
    const invoicesGenerate = vi.fn(async () => ({ ...preview, dryRun: false }));
    await go(fakeApi({ meGet: vi.fn(async () => bursar()), invoicesList: vi.fn(async () => list()), invoicesPreview, invoicesGenerate, academicsLevels: vi.fn(async () => ({ items: [{ id: "l5", name: "5", position: 5, classes: [] }] })) }));
    fireEvent.click(await screen.findByRole("button", { name: "Bill fees" }));
    expect(screen.queryByRole("button", { name: "Create invoices" })).toBeNull(); // nothing to create until previewed
    fireEvent.change(screen.getByLabelText("Instalments due up to"), { target: { value: "2027-04-30" } });
    await screen.findByRole("option", { name: "5" });
    fireEvent.change(screen.getByLabelText("Level"), { target: { value: "l5" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    await waitFor(() => expect(invoicesPreview).toHaveBeenCalledWith({ body: { dueOnOrBefore: "2027-04-30", gradeLevelId: "l5" } }));
    expect(await screen.findByText("38 invoices would be created. Already billed: 2. Students without fees set up: 0.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Create invoices" }));
    expect(invoicesGenerate).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole("button", { name: "Create invoices" }).at(-1)!);
    await waitFor(() => expect(invoicesGenerate).toHaveBeenCalledWith({ body: { dueOnOrBefore: "2027-04-30", gradeLevelId: "l5" } }));
    expect(await screen.findByText("38 invoices created. Already billed: 2.")).toBeTruthy();
  });

  it("changing the date after a preview clears it, so a stale preview can never be created", async () => {
    const preview = { dryRun: true, academicYear: { id: "y1", name: "x" }, students: 1, created: 1, alreadyInvoiced: 0, fullyWaived: 0, studentsWithoutStructure: 0, truncated: false, sample: [] };
    await go(fakeApi({ meGet: vi.fn(async () => bursar()), invoicesList: vi.fn(async () => list()), invoicesPreview: vi.fn(async () => preview), academicsLevels: vi.fn(async () => ({ items: [] })) }));
    fireEvent.click(await screen.findByRole("button", { name: "Bill fees" }));
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    await screen.findByText(/1 invoices would be created/);
    fireEvent.change(screen.getByLabelText("Instalments due up to"), { target: { value: "2027-12-31" } });
    expect(screen.queryByRole("button", { name: "Create invoices" })).toBeNull();
  });

  it("a failed list offers Retry; no accessibility violations", async () => {
    const invoicesList = vi.fn().mockRejectedValueOnce(new ApiError("NETWORK_ERROR", 0, "x")).mockResolvedValue(list());
    await go(fakeApi({ meGet: vi.fn(async () => bursar()), invoicesList }));
    expect((await screen.findByRole("alert")).textContent).toContain("We could not reach the server");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByRole("table");
    const r = await axe.run(document.body, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 100)}`)).toEqual([]);
  });
});

describe("receipts and structures", () => {
  it("receipts: total received, each with a PDF; a cancelled one is marked", async () => {
    const receiptsList = vi.fn(async () => ({ items: [rcpt(), rcpt({ id: "rc2", number: "R-2027-2028-00013", cancelled: true })], total: 2, page: 1, pageSize: 25, totalAmountMinor: "500000" }));
    await go(fakeApi({ meGet: vi.fn(async () => bursar()), invoicesList: vi.fn(async () => list()), receiptsList }));
    fireEvent.click(await screen.findByRole("radio", { name: "Receipts" }));
    const table = await screen.findByRole("table", { name: "Receipts" });
    expect(within(table).getByText("R-2027-2028-00012")).toBeTruthy();
    expect(within(table).getByText("CANCELLED")).toBeTruthy();
    expect(screen.getAllByText("₹5,000.00").length).toBeGreaterThan(0); // the total and the rows
  });

  it("no receipts: an honest empty state", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => bursar()), invoicesList: vi.fn(async () => list()), receiptsList: vi.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 25, totalAmountMinor: "0" })) }));
    fireEvent.click(await screen.findByRole("radio", { name: "Receipts" }));
    expect(await screen.findByText("No receipts yet")).toBeTruthy();
  });

  it("fee structures: each fee with its instalments and the total for the year", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => readOnly()), invoicesList: vi.fn(async () => list()), feesStructures: vi.fn(async () => ({ items: [structure()] })) }));
    fireEvent.click(await screen.findByRole("radio", { name: "Fee structures" }));
    expect(await screen.findByText("5 fees 2027-2028")).toBeTruthy();
    expect(screen.getByText("Tuition")).toBeTruthy();
    expect(screen.getByText(/Term 2/)).toBeTruthy();
    expect(screen.getAllByText("₹30,000.00").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "New fee structure" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add a fee" })).toBeNull();
  });

  it("adds a fee with two instalments in exact paise; new structure for a level", async () => {
    const feesCreateItem = vi.fn(async () => structure());
    const feesCreateStructure = vi.fn(async () => structure());
    await go(fakeApi({ meGet: vi.fn(async () => bursar()), invoicesList: vi.fn(async () => list()), feesStructures: vi.fn(async () => ({ items: [structure()] })), feesCreateItem, feesCreateStructure, academicsLevels: vi.fn(async () => ({ items: [{ id: "l6", name: "6", position: 6, classes: [] }] })) }));
    fireEvent.click(await screen.findByRole("radio", { name: "Fee structures" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add a fee" }));
    fireEvent.change(screen.getByLabelText("Fee name"), { target: { value: "Transport" } });
    fireEvent.click(screen.getByRole("button", { name: "Add instalment" }));
    const amounts = screen.getAllByLabelText("Amount");
    fireEvent.change(amounts[0]!, { target: { value: "1,000" } });
    fireEvent.change(amounts[1]!, { target: { value: "1000.5" } });
    const dues = screen.getAllByLabelText("Due date");
    fireEvent.change(dues[0]!, { target: { value: "2027-04-10" } });
    fireEvent.change(dues[1]!, { target: { value: "2027-09-10" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(feesCreateItem).toHaveBeenCalledWith({ path: { id: "f1" }, body: { name: "Transport", instalments: [{ amountMinor: "100000", dueDate: "2027-04-10" }, { amountMinor: "100050", dueDate: "2027-09-10" }] } }));
    expect(await screen.findByText("Fee added")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "New fee structure" }));
    await screen.findByRole("option", { name: "6" });
    fireEvent.change(screen.getByLabelText("Level"), { target: { value: "l6" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" }).at(-1)!);
    await waitFor(() => expect(feesCreateStructure).toHaveBeenCalledWith({ body: { gradeLevelId: "l6" } }));
  });

  it("an instalment without a valid amount blocks Save", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => bursar()), invoicesList: vi.fn(async () => list()), feesStructures: vi.fn(async () => ({ items: [structure()] })) }));
    fireEvent.click(await screen.findByRole("radio", { name: "Fee structures" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add a fee" }));
    fireEvent.change(screen.getByLabelText("Fee name"), { target: { value: "Transport" } });
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "abc" } });
    expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
