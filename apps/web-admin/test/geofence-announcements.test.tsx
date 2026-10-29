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
  m.activeSchool = { ...m.activeSchool!, role, permissions: perms, navigation: [{ title: "Group", items: [{ key, label }] }] };
  return m;
};
const withDashboard = (m: ReturnType<typeof me>) => {
  m.activeSchool = { ...m.activeSchool!, navigation: [{ title: "Overview", items: [{ key: "dashboard", label: "Dashboard" }] }, ...m.activeSchool!.navigation] };
  return m;
};
const go = async (api: ReturnType<typeof fakeApi>, name: string) => {
  renderApp(<WebAdminApp />, { api, port: fakePort(IN()).port });
  fireEvent.click(await screen.findByRole("button", { name }));
};
const refused = () => new ApiError("FORBIDDEN", 403, "no");

describe("school location (settings)", () => {
  const profile = { id: "11111111-1111-4111-8111-111111111111", name: "Greenfield School", subDomain: "greenfield", defaultLanguage: "en", currency: "INR", locale: "en-IN", address: null, contactPhone: null, contactEmail: null, primaryColor: null, logoKey: null, activeAcademicYear: { id: "y1", name: "2027-2028" } };
  const sysadmin = () => as("SYSTEM_ADMIN", { settings: { read: "school", update: "school" } }, "settings", "School settings");
  const FENCE = { configured: true, lat: 12.9716, lng: 77.5946, radiusM: 150, marginM: 50, hardRingM: 500 };

  it("with the location unreadable the form starts empty, and Save sends numbers", async () => {
    const schoolSetGeofence = vi.fn(async () => FENCE);
    await go(fakeApi({ meGet: vi.fn(async () => sysadmin()), schoolProfile: vi.fn(async () => profile), schoolGeofence: vi.fn(async () => { throw refused(); }), schoolSetGeofence }), "School settings");
    const save = (await screen.findByRole("button", { name: "Save location" })) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "12.9716" } });
    fireEvent.change(screen.getByLabelText("Longitude"), { target: { value: "77.5946" } });
    fireEvent.change(screen.getByLabelText("Grounds radius (metres)"), { target: { value: "150" } });
    expect(save.disabled).toBe(false);
    fireEvent.click(save);
    await waitFor(() => expect(schoolSetGeofence).toHaveBeenCalledWith({ body: { lat: 12.9716, lng: 77.5946, radiusM: 150, marginM: 50 } }));
    expect(await screen.findByText("Location saved.")).toBeTruthy();
    expect(screen.getByText("Now: 12.9716, 77.5946, grounds 150 m, margin 50 m.")).toBeTruthy();
  });

  it("an out-of-range latitude is refused on the page; a location already set shows and can be switched off", async () => {
    const schoolClearGeofence = vi.fn(async () => ({ configured: false, lat: null, lng: null, radiusM: null, marginM: 50, hardRingM: 500 }));
    await go(fakeApi({ meGet: vi.fn(async () => sysadmin()), schoolProfile: vi.fn(async () => profile), schoolGeofence: vi.fn(async () => FENCE), schoolClearGeofence }), "School settings");
    expect(await screen.findByText("Now: 12.9716, 77.5946, grounds 150 m, margin 50 m.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "120" } });
    expect((screen.getByRole("button", { name: "Save location" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Give a latitude between -90 and 90/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Switch location off" }));
    await waitFor(() => expect(schoolClearGeofence).toHaveBeenCalled());
    expect(await screen.findByText("Location switched off.")).toBeTruthy();
    expect(screen.getByText("No location is set, so nobody is asked for a reason.")).toBeTruthy();
  });

  it("a reader sees the fields but no buttons", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => as("PRINCIPAL", { settings: { read: "school" } }, "settings", "School settings")), schoolProfile: vi.fn(async () => profile), schoolGeofence: vi.fn(async () => FENCE) }), "School settings");
    await screen.findByText("Now: 12.9716, 77.5946, grounds 150 m, margin 50 m.");
    expect(screen.queryByRole("button", { name: "Save location" })).toBeNull();
    expect((screen.getByLabelText("Latitude") as HTMLInputElement).disabled).toBe(true);
  });
});

describe("staff attendance: where, and HR's confirmation", () => {
  const hr = () => as("HR_MANAGER", { staff_attendance: { read: "school", update: "school" } }, "staff-attendance", "Staff attendance");
  const row = (o: Record<string, unknown>) => ({ staff: { id: "t1", employeeId: "E0001", name: "Asha Rao" }, checkIn: "2026-10-26T03:45:00.000Z", checkOut: null, state: "IN", checkInDeviceTime: null, checkInDistanceM: null, checkInReason: null, checkInStamp: "INSIDE", checkOutReason: null, confirmedAt: null, needsConfirmation: false, ...o });
  const PRESENCE = { date: "2026-10-26", items: [
    row({}),
    row({ staff: { id: "t2", employeeId: "E0002", name: "Bilal Khan" }, checkInStamp: "OUTSIDE", checkInDistanceM: 640, checkInReason: "District office", needsConfirmation: true }),
    row({ staff: { id: "t3", employeeId: "E0003", name: "Chitra Nair" }, checkInStamp: "OUTSIDE", checkInDistanceM: 900, checkInReason: "Bank", needsConfirmation: true, confirmedAt: "2026-10-26T06:00:00.000Z" }),
  ] };

  it("shows where each check-in was, with the distance and reason away from school, and who waits for HR", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => hr()), staffAttendancePresence: vi.fn(async () => PRESENCE) }), "Staff attendance");
    const table = await screen.findByRole("table", { name: "Staff attendance" });
    expect(within(table).getByText("At school")).toBeTruthy();
    expect(within(table).getByText(/Away from school, 640 m from the school/)).toBeTruthy();
    expect(within(table).getByText("Reason: District office")).toBeTruthy();
    expect(within(table).getByText("Waiting for HR to confirm")).toBeTruthy();
    expect(within(table).getByText("Confirmed")).toBeTruthy();
  });

  it("HR confirms the one that waits; the confirmed and the near ones have no button", async () => {
    const staffAttendanceConfirm = vi.fn(async () => ({}));
    await go(fakeApi({ meGet: vi.fn(async () => hr()), staffAttendancePresence: vi.fn(async () => PRESENCE), staffAttendanceConfirm }), "Staff attendance");
    await screen.findByRole("table", { name: "Staff attendance" });
    expect(screen.getAllByRole("button", { name: /^Confirm:/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Confirm: Bilal Khan" }));
    await waitFor(() => expect(staffAttendanceConfirm).toHaveBeenCalledWith({ path: { staffId: "t2", date: expect.any(String) } }));
    expect(await screen.findByText("Check-in confirmed.")).toBeTruthy();
  });

  it("a reader (the Principal) sees where but cannot confirm", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => as("PRINCIPAL", { staff_attendance: { read: "school" } }, "staff-attendance", "Staff attendance")), staffAttendancePresence: vi.fn(async () => PRESENCE) }), "Staff attendance");
    await screen.findByText(/Away from school, 640 m/);
    expect(screen.queryByRole("button", { name: /^Confirm:/ })).toBeNull();
  });
});

describe("announcements", () => {
  const LIST = { next: null, items: [
    { id: "a1", title: "Sports day", body: "On Friday.\nBring kits.", createdAt: "2026-10-20T08:00:00.000Z", updatedAt: "2026-10-20T08:00:00.000Z", withdrawn: false, author: { id: "p", name: "Priya Principal" } },
    { id: "a2", title: "Old notice", body: "Gone.", createdAt: "2026-09-01T08:00:00.000Z", updatedAt: "2026-09-02T08:00:00.000Z", withdrawn: true, author: { id: "p", name: "Priya Principal" } },
  ] };
  const principal = () => withDashboard(as("PRINCIPAL", { announcements: { read: "school", create: "school", update: "school" } }, "announcements", "Announcements"));

  it("the Principal sees the list, posts one (trimmed), and withdraws one", async () => {
    const announcementsPost = vi.fn(async () => LIST.items[0]);
    const announcementsWithdraw = vi.fn(async () => LIST.items[0]);
    await go(fakeApi({ meGet: vi.fn(async () => principal()), announcementsList: vi.fn(async () => LIST), announcementsPost, announcementsWithdraw }), "Announcements");
    expect(await screen.findByText("Sports day")).toBeTruthy();
    expect(screen.getByText("Withdrawn")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^Withdraw:/ })).toHaveLength(1);
    const post = screen.getByRole("button", { name: "Post" }) as HTMLButtonElement;
    expect(post.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "  Holiday  " } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "School is closed on Monday. " } });
    fireEvent.click(post);
    await waitFor(() => expect(announcementsPost).toHaveBeenCalledWith({ body: { title: "Holiday", body: "School is closed on Monday." } }));
    expect(await screen.findByText("Announcement posted.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Withdraw: Sports day" }));
    await waitFor(() => expect(announcementsWithdraw).toHaveBeenCalledWith({ path: { id: "a1" } }));
    expect(await screen.findByText("Announcement withdrawn.")).toBeTruthy();
  });

  it("a reader (the Bursar) only reads; no announcements says so", async () => {
    const bursar = () => withDashboard(as("BURSAR", { announcements: { read: "school" } }, "announcements", "Announcements"));
    await go(fakeApi({ meGet: vi.fn(async () => bursar()), announcementsList: vi.fn(async () => LIST) }), "Announcements");
    await screen.findByText("Sports day");
    expect(screen.queryByRole("button", { name: "Post" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Withdraw:/ })).toBeNull();
  });

  it("an empty list says so, and the page has no accessibility violations", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => principal()), announcementsList: vi.fn(async () => ({ items: [], next: null })) }), "Announcements");
    expect(await screen.findByText("No announcements yet.")).toBeTruthy();
    const r = await axe.run(document.body, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 100)}`)).toEqual([]);
  });
});
