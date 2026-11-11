import { fireEvent, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { WebAdminApp } from "@/components/WebAdminApp";
import { IN, fakeApi, fakePort, me, renderApp } from "./helpers";

vi.mock("@/i18n/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ replace: vi.fn() }) }));

type Perms = NonNullable<ReturnType<typeof me>["activeSchool"]>["permissions"];
const as = (role: string, perms: Perms, key: string, label: string) => {
  const m = me();
  m.activeSchool = { ...m.activeSchool!, role, permissions: perms, navigation: [{ title: "Group", items: [{ key, label }] }] };
  return m;
};
const principal = () => as("PRINCIPAL", { message_reports: { read: "school", update: "school" } }, "message-reports", "Reported messages");
const sysadmin = () => as("SYSTEM_ADMIN", { audit_log: { read: "school" } }, "audit", "Audit log");
const go = async (api: ReturnType<typeof fakeApi>, name: string) => {
  renderApp(<WebAdminApp />, { api, port: fakePort(IN()).port });
  fireEvent.click(await screen.findByRole("button", { name }));
};
const person = (id: string, name: string) => ({ userId: id, name });
const REPORT = (id: string, o: Record<string, unknown> = {}) => ({
  id, note: "This is not fine", reportedAt: "2026-11-02T08:00:00Z", reportedBy: person("p1", "Meera Rao"), reviewed: false, reviewedAt: null,
  message: { id: `m-${id}`, body: "Rude words about the homework", hidden: true, sentAt: "2026-11-02T07:00:00Z", sender: person("t1", "Tara Teach"), student: { id: "s1", name: "Asha Rao" }, staff: person("t1", "Tara Teach"), guardian: person("p1", "Meera Rao") },
  ...o,
});
const DETAIL = (id: string) => ({
  ...REPORT(id),
  conversation: [
    { id: "a", sender: person("p1", "Meera Rao"), body: "Good morning teacher", hidden: false, sentAt: "2026-11-02T06:00:00Z", reported: false },
    { id: `m-${id}`, sender: person("t1", "Tara Teach"), body: "Rude words about the homework", hidden: true, sentAt: "2026-11-02T07:00:00Z", reported: true },
  ],
});

describe("reported messages (Principal)", () => {
  it("lists a report with the words even though they were hidden, who reported it and the note; the whole conversation opens on request", async () => {
    const messageReportsOne = vi.fn(async ({ path }: { path: { id: string } }) => DETAIL(path.id));
    await go(fakeApi({ meGet: vi.fn(async () => principal()), messageReportsList: vi.fn(async () => ({ items: [REPORT("r1")] })), messageReportsOne }), "Reported messages");
    expect(await screen.findByText(/Reported by Meera Rao/)).toBeTruthy();
    expect(screen.getByText(/About Asha Rao, between Tara Teach and Meera Rao/)).toBeTruthy();
    expect(screen.getByText("Their note: This is not fine")).toBeTruthy();
    expect(screen.getByText("Waiting")).toBeTruthy();
    expect(messageReportsOne).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Read the conversation: Tara Teach" }));
    expect(await screen.findByText("Good morning teacher")).toBeTruthy();
    expect(screen.getByText("reported")).toBeTruthy();
    expect(messageReportsOne).toHaveBeenCalledWith({ path: { id: "r1" } });
    const found = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
    expect(found.violations.map((v) => v.id)).toEqual([]);
  });

  it("closing sends the note and says so; a closed report has no form", async () => {
    const messageReportsClose = vi.fn(async () => REPORT("r1", { reviewed: true }));
    await go(fakeApi({ meGet: vi.fn(async () => principal()), messageReportsList: vi.fn(async () => ({ items: [REPORT("r1"), REPORT("r2", { reviewed: true })] })), messageReportsOne: vi.fn(async ({ path }: { path: { id: string } }) => DETAIL(path.id)), messageReportsClose }), "Reported messages");
    const open = await screen.findAllByRole("button", { name: /^Read the conversation/ });
    fireEvent.click(open[1]!);
    await screen.findAllByText("Good morning teacher");
    expect(screen.queryByRole("button", { name: "Close this report" })).toBeNull();
    fireEvent.click(open[0]!);
    await waitFor(() => expect(screen.getByRole("button", { name: "Close this report" })).toBeTruthy());
    fireEvent.change(screen.getByLabelText("What you decided (optional)"), { target: { value: "Spoke to the teacher" } });
    fireEvent.click(screen.getByRole("button", { name: "Close this report" }));
    await waitFor(() => expect(messageReportsClose).toHaveBeenCalledWith({ path: { id: "r1" }, body: { note: "Spoke to the teacher" } }));
    expect(await screen.findByText("Report closed.")).toBeTruthy();
  });

  it("says so when nothing was reported", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => principal()), messageReportsList: vi.fn(async () => ({ items: [] })) }), "Reported messages");
    expect(await screen.findByText("No reports.")).toBeTruthy();
  });
});

describe("message audit trail (System Admin)", () => {
  const ENTRY = (id: string, o: Record<string, unknown> = {}) => ({ id, at: "2026-11-02T07:00:00Z", action: "message.send", actor: person("t1", "Tara Teach"), to: "Meera Rao", student: "Asha Rao", title: null, body: "See you at the meeting", note: null, ...o });

  it("shows who wrote to whom about whom with the words, and a class message with its title; Show older asks for the next page", async () => {
    const messageAuditMessages = vi.fn(async ({ query }: { query: { limit: number; offset: number } }) =>
      query.offset === 0 ? { items: [ENTRY("e1"), ENTRY("e2", { action: "broadcast.send", to: null, student: null, title: "Trip on Friday", body: "Bring lunch" })], next: 50 } : { items: [ENTRY("e3", { body: "Older words" })], next: null });
    await go(fakeApi({ meGet: vi.fn(async () => sysadmin()), messageAuditMessages }), "Audit log");
    expect(await screen.findByText("Tara Teach to Meera Rao")).toBeTruthy();
    expect(screen.getByText("About Asha Rao")).toBeTruthy();
    expect(screen.getByText("See you at the meeting")).toBeTruthy();
    expect(screen.getByText("Class message")).toBeTruthy();
    expect(screen.getByText("Trip on Friday")).toBeTruthy();
    expect(messageAuditMessages).toHaveBeenCalledWith({ query: { limit: 50, offset: 0 } });
    fireEvent.click(screen.getByRole("button", { name: "Show older" }));
    expect(await screen.findByText("Older words")).toBeTruthy();
    expect(messageAuditMessages).toHaveBeenCalledWith({ query: { limit: 50, offset: 50 } });
    expect(screen.queryByRole("button", { name: "Show older" })).toBeNull();
  });
});
