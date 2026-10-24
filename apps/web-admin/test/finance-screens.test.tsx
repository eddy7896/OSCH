import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@oruschools/api-client";
import { WebAdminApp } from "@/components/WebAdminApp";
import { IN, fakeApi, fakePort, me, renderApp } from "./helpers";

vi.mock("@/i18n/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ replace: vi.fn() }) }));

const row = (over = {}) => ({ paymentId: "p1", paidOn: "2027-04-02", receiptNumber: "R-2027-00001", student: { id: "s1", enrollmentId: "S0001", name: "Asha Kumar" }, invoice: { id: "i1", title: "Tuition - April" }, method: "UPI", reference: null, amountMinor: "1250000", reversed: false, recordedBy: "Bursar", ...over });
const collections = (over = {}) => ({
  from: "2027-04-01", to: "2027-04-30", detail: true, count: 2, collectedMinor: "2500050", reversedMinor: "100000", byMethod: [{ method: "CASH", count: 1, amountMinor: "1250050" }, { method: "UPI", count: 1, amountMinor: "1250000" }], byDay: [],
  items: [row(), row({ paymentId: "p2", receiptNumber: "R-2027-00002", method: "CASH", amountMinor: "100000", reversed: true })], total: 2, page: 1, pageSize: 25, ...over,
});
const dues = (over = {}) => ({
  asOf: "2027-05-01", detail: true, count: 1, amountMinor: "2000000", paidMinor: "500000", outstandingMinor: "1500000",
  bands: [{ band: "DAYS_1_30", count: 1, outstandingMinor: "1500000" }, { band: "DAYS_OVER_90", count: 0, outstandingMinor: "0" }],
  items: [{ invoiceId: "i1", student: { id: "s1", enrollmentId: "S0001", name: "Asha Kumar" }, title: "Tuition - May", dueDate: "2027-04-10", amountMinor: "2000000", paidMinor: "500000", outstandingMinor: "1500000", daysOverdue: 21, band: "DAYS_1_30" }], total: 1, page: 1, pageSize: 25, ...over,
});
const bursar = (exportGrant = true) => {
  const m = me();
  m.activeSchool = { ...m.activeSchool!, role: "BURSAR", permissions: { reports_finance: { read: "school", ...(exportGrant ? { export: "school" } : {}) } }, navigation: [{ title: "Overview", items: [{ key: "dashboard-finance", label: "Dashboard" }] }, { title: "Reports", items: [{ key: "reports-finance", label: "Financial reports" }] }] };
  return m;
};
const open = async (api: ReturnType<typeof fakeApi>) => {
  api['reportsDues'] ??= vi.fn(async () => dues());
  renderApp(<WebAdminApp />, { api, port: fakePort(IN()).port });
  fireEvent.click(await screen.findByRole("button", { name: "Financial reports" }));
  await screen.findByRole("heading", { level: 1, name: "Financial reports" });
};

afterEach(() => vi.restoreAllMocks());

describe("financial reports screen", () => {
  it("collections: totals, by method, the payments with reversed ones marked, and the amounts in rupees", async () => {
    const api = fakeApi({ meGet: vi.fn(async () => bursar()), reportsCollections: vi.fn(async () => collections()) });
    await open(api);
    const table = await screen.findByRole("table", { name: "Fee collections" });
    expect(within(table).getByText("R-2027-00001")).toBeTruthy();
    expect(within(table).getAllByText("Tuition - April")).toHaveLength(2);
    expect(within(table).getByText("₹12,500.00")).toBeTruthy();
    expect(within(table).getByText("Reversed")).toBeTruthy();
    expect(screen.getByText("₹25,000.50")).toBeTruthy(); // the collected total, exact
    expect(screen.getByText("By payment method")).toBeTruthy();
    expect(api.reportsCollections).toHaveBeenCalledWith({ query: expect.objectContaining({ page: 1, pageSize: 25 }) });
  });

  it("changing the dates asks again for that range", async () => {
    const api = fakeApi({ meGet: vi.fn(async () => bursar()), reportsCollections: vi.fn(async () => collections()) });
    await open(api);
    await screen.findByRole("table");
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2027-01-01" } });
    await waitFor(() => expect(api.reportsCollections).toHaveBeenLastCalledWith({ query: expect.objectContaining({ from: "2027-01-01" }) }));
  });

  it("a role that sees totals only gets no table and is told why", async () => {
    const api = fakeApi({ meGet: vi.fn(async () => bursar(false)), reportsCollections: vi.fn(async () => collections({ detail: false, items: [] })) });
    await open(api);
    expect(await screen.findByText("You can see the totals but not the individual payments.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("an empty range says so; a failed load says why and Retry asks again", async () => {
    // the dashboard asks once before this screen does
    const report = vi.fn().mockRejectedValueOnce(new ApiError("NETWORK_ERROR", 0, "x")).mockRejectedValueOnce(new ApiError("NETWORK_ERROR", 0, "x")).mockResolvedValue(collections({ count: 0, total: 0, items: [], byMethod: [], collectedMinor: "0", reversedMinor: "0" }));
    await open(fakeApi({ meGet: vi.fn(async () => bursar()), reportsCollections: report }));
    expect((await screen.findByRole("alert")).textContent).toContain("We could not reach the server");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Nothing in this range")).toBeTruthy();
  });

  it("downloads: only for people who may export, and the file is asked for in the screen's language", async () => {
    const save = vi.fn();
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(save);
    const api = fakeApi({ meGet: vi.fn(async () => bursar()), reportsCollections: vi.fn(async () => collections()), reportsCollectionsExport: vi.fn(async () => new Blob(["x"])) });
    await open(api);
    fireEvent.click(await screen.findByRole("button", { name: "Download CSV" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(api.reportsCollectionsExport).toHaveBeenCalledWith({ query: expect.objectContaining({ format: "csv", lang: "en" }), parseAs: "blob" });
  });

  it("no export grant: no download buttons", async () => {
    await open(fakeApi({ meGet: vi.fn(async () => bursar(false)), reportsCollections: vi.fn(async () => collections()) }));
    await screen.findByRole("table");
    expect(screen.queryByRole("button", { name: "Download CSV" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Download PDF" })).toBeNull();
  });

  it("a failed download is reported", async () => {
    const api = fakeApi({ meGet: vi.fn(async () => bursar()), reportsCollections: vi.fn(async () => collections()), reportsCollectionsExport: vi.fn().mockRejectedValue(new ApiError("INTERNAL", 500, "x")) });
    await open(api);
    fireEvent.click(await screen.findByRole("button", { name: "Download PDF" }));
    expect(await screen.findByText("The file could not be made. Try again.")).toBeTruthy();
  });

  it("fees outstanding: the total, the ages, and each unpaid invoice with days overdue", async () => {
    const api = fakeApi({ meGet: vi.fn(async () => bursar()), reportsCollections: vi.fn(async () => collections()), reportsDues: vi.fn(async () => dues()) });
    await open(api);
    fireEvent.click(screen.getByRole("radio", { name: "Fees outstanding" }));
    const table = await screen.findByRole("table", { name: "Fees outstanding" });
    expect(within(table).getByText("Tuition - May")).toBeTruthy();
    expect(within(table).getByText("21")).toBeTruthy();
    expect(screen.getByText("1 to 30 days overdue")).toBeTruthy();
    expect(screen.getAllByText("₹15,000.00").length).toBeGreaterThan(0);
  });

  it("nothing outstanding is said in words", async () => {
    await open(fakeApi({ meGet: vi.fn(async () => bursar()), reportsCollections: vi.fn(async () => collections()), reportsDues: vi.fn(async () => dues({ count: 0, total: 0, items: [], outstandingMinor: "0", amountMinor: "0", paidMinor: "0" })) }));
    fireEvent.click(screen.getByRole("radio", { name: "Fees outstanding" }));
    expect(await screen.findByText("No fees outstanding")).toBeTruthy();
  });

  it("has no accessibility violations", async () => {
    await open(fakeApi({ meGet: vi.fn(async () => bursar()), reportsCollections: vi.fn(async () => collections()) }));
    await screen.findByRole("table");
    const results = await axe.run(document.body, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
    expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 120)}`)).toEqual([]);
  });

  it("renders in Urdu right to left without missing words", async () => {
    renderApp(<WebAdminApp />, { api: fakeApi({ meGet: vi.fn(async () => bursar()), reportsCollections: vi.fn(async () => collections()) }), port: fakePort(IN()).port, locale: "ur" });
    fireEvent.click((await screen.findAllByRole("button")).find((b) => b.textContent?.includes("مالی")) ?? (await screen.findAllByRole("button"))[1]!);
    await waitFor(() => expect(document.body.textContent).not.toMatch(/\bweb[A-Z]\w+|\breport[A-Z]\w+/));
  });
});

describe("dashboard key numbers", () => {
  it("shows what this role may read: collected this month, outstanding, and students", async () => {
    const m = bursar();
    m.activeSchool!.permissions = { reports_finance: { read: "school" }, students: { read: "school" } };
    const api = fakeApi({ meGet: vi.fn(async () => m), reportsCollections: vi.fn(async () => collections()), reportsDues: vi.fn(async () => dues()), studentsList: vi.fn(async () => ({ items: [], page: 1, pageSize: 1, total: 1234 })) });
    renderApp(<WebAdminApp />, { api, port: fakePort(IN()).port });
    expect(await screen.findByText("Collected this month")).toBeTruthy();
    expect(await screen.findByText("Outstanding fees")).toBeTruthy();
    expect(await screen.findByText("1,234")).toBeTruthy();
  });

  it("asks only for what the role may read", async () => {
    const m = bursar();
    m.activeSchool!.permissions = { students: { read: "school" } };
    const api = fakeApi({ meGet: vi.fn(async () => m), reportsCollections: vi.fn(), reportsDues: vi.fn(), studentsList: vi.fn(async () => ({ items: [], page: 1, pageSize: 1, total: 7 })) });
    renderApp(<WebAdminApp />, { api, port: fakePort(IN()).port });
    expect(await screen.findByText("7")).toBeTruthy();
    expect(api.reportsCollections).not.toHaveBeenCalled();
    expect(api.reportsDues).not.toHaveBeenCalled();
  });

  it("a number that fails to load is left out, not shown as zero", async () => {
    const m = bursar();
    m.activeSchool!.permissions = { reports_finance: { read: "school" } };
    const api = fakeApi({ meGet: vi.fn(async () => m), reportsCollections: vi.fn().mockRejectedValue(new ApiError("INTERNAL", 500, "x")), reportsDues: vi.fn(async () => dues()) });
    renderApp(<WebAdminApp />, { api, port: fakePort(IN()).port });
    expect(await screen.findByText("Outstanding fees")).toBeTruthy();
    expect(screen.queryByText("Collected this month")).toBeNull();
  });
});
