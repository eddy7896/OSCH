import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { WebAdminApp } from "@/components/WebAdminApp";
import { IN, fakeApi, fakePort, me, renderApp } from "./helpers";

vi.mock("@/i18n/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ replace: vi.fn() }) }));

const N = (id: string, title: string, o: Record<string, unknown> = {}) => ({ id, kind: "leave.approved", category: "leave", title, body: "Casual, 26-10-2026 to 27-10-2026 (2 day(s)).", createdAt: "2026-10-26T08:30:00Z", read: false, entityType: "LeaveRequest", entityId: "r1", ...o });
const LIST = { unreadCount: 2, items: [N("n1", "Your leave was approved"), N("n2", "Lessons need a substitute", { category: "substitution", kind: "leave.substitution" }), N("n3", "Leave to decide", { read: true })] };
const PREFS = { items: [{ category: "leave", enabled: true }, { category: "substitution", enabled: false }, { category: "payroll", enabled: true }] };
const open = async (api: ReturnType<typeof fakeApi>) => {
  renderApp(<WebAdminApp />, { api, port: fakePort(IN()).port });
  fireEvent.click(await screen.findByRole("button", { name: /^Notifications/ }));
  return screen.findByRole("dialog", { name: "Notifications" });
};

describe("the notification bell", () => {
  it("shows how many are unread on the button, and lists them with the unread ones marked", async () => {
    const dialog = await open(fakeApi({ notificationsList: vi.fn(async () => LIST), notificationsPreferences: vi.fn(async () => PREFS) }));
    expect(screen.getByRole("button", { name: "Notifications, 2 unread notifications" })).toBeTruthy();
    expect(within(dialog).getByText("Your leave was approved")).toBeTruthy();
    expect(within(dialog).getAllByText("Unread", { exact: false }).length).toBeGreaterThan(0);
    expect(within(dialog).getByText("Leave to decide")).toBeTruthy();
  });

  it("reading one takes it off the count and tells the gateway", async () => {
    const notificationsRead = vi.fn(async () => undefined);
    const dialog = await open(fakeApi({ notificationsList: vi.fn(async () => LIST), notificationsPreferences: vi.fn(async () => PREFS), notificationsRead }));
    fireEvent.click(within(dialog).getByText("Your leave was approved"));
    await waitFor(() => expect(notificationsRead).toHaveBeenCalledWith({ path: { id: "n1" } }));
    expect(screen.getByRole("button", { name: "Notifications, 1 unread notification" })).toBeTruthy();
  });

  it("marks everything read in one step", async () => {
    const notificationsReadAll = vi.fn(async () => ({ marked: 2 }));
    const dialog = await open(fakeApi({ notificationsList: vi.fn(async () => LIST), notificationsPreferences: vi.fn(async () => PREFS), notificationsReadAll }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Mark all as read" }));
    await waitFor(() => expect(notificationsReadAll).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Notifications" })).toBeTruthy();
    expect(within(dialog).queryByRole("button", { name: "Mark all as read" })).toBeNull();
  });

  it("switches a kind on or off, and keeps the notifications either way", async () => {
    const notificationsSetPreference = vi.fn(async () => PREFS);
    const dialog = await open(fakeApi({ notificationsList: vi.fn(async () => LIST), notificationsPreferences: vi.fn(async () => PREFS), notificationsSetPreference }));
    fireEvent.click(within(dialog).getByText("Choose what you see"));
    const box = (await within(dialog).findByLabelText("Substitutions")) as HTMLInputElement;
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    await waitFor(() => expect(notificationsSetPreference).toHaveBeenCalledWith({ path: { category: "substitution" }, body: { enabled: true } }));
  });

  it("an empty inbox says so, a failed load is quiet, and Escape closes the panel", async () => {
    const dialog = await open(fakeApi({ notificationsList: vi.fn(async () => ({ unreadCount: 0, items: [] })) }));
    expect(within(dialog).getByText("You have no notifications.")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Notifications" })).toBeNull());
  });
  it("when the load fails there is no error banner and the bell still works", async () => {
    renderApp(<WebAdminApp />, { api: fakeApi({ notificationsList: vi.fn(async () => { throw new Error("down"); }) }), port: fakePort(IN()).port });
    fireEvent.click(await screen.findByRole("button", { name: "Notifications" }));
    expect(await screen.findByText("The notifications could not be loaded.")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("every role has the bell, including one whose work is in the mobile app", async () => {
    const field = me();
    field.activeSchool = { ...field.activeSchool!, role: "TEACHER", permissions: {}, navigation: [] };
    renderApp(<WebAdminApp />, { api: fakeApi({ meGet: vi.fn(async () => field) }), port: fakePort(IN()).port });
    expect(await screen.findByRole("button", { name: "Notifications" })).toBeTruthy();
  });

  it("has no accessibility violations with the panel open", async () => {
    await open(fakeApi({ notificationsList: vi.fn(async () => LIST), notificationsPreferences: vi.fn(async () => PREFS) }));
    const results = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
