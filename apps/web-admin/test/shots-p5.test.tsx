// A developer tool, not a test: renders the Phase 4 and 5 web screens (transport, where a check-in was, the school location, announcements) with sample data in English and Urdu
// and writes the page HTML to $SHOTS_DIR/html, for the review pictures in the Project Hub (see documentation/screen-previews.md).
// Run: SHOTS_DIR=/some/dir npx vitest run test/shots-p5.test.tsx
import { mkdirSync, writeFileSync } from "node:fs";
import { fireEvent, screen } from "@testing-library/react";
import { describe, it, vi } from "vitest";
import { getMessages } from "@oruschools/i18n";
import { WebAdminApp } from "@/components/WebAdminApp";
import { IN, fakeApi, fakePort, me, renderApp } from "./helpers";

vi.mock("@/i18n/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ replace: vi.fn() }) }));

const DIR = process.env["SHOTS_DIR"];
type Perms = NonNullable<ReturnType<typeof me>["activeSchool"]>["permissions"];
const as = (role: string, perms: Perms, navigation: NonNullable<ReturnType<typeof me>["activeSchool"]>["navigation"]) => {
  const m = me();
  m.user.displayName = "Meera Joshi";
  m.activeSchool = { ...m.activeSchool!, role, permissions: perms, navigation };
  return m;
};
const nav = (group: string, key: string, label: string) => [{ title: "Overview", items: [{ key: "dashboard-operations", label: "Dashboard" }] }, { title: group, items: [{ key, label }] }];

async function shoot(name: string, locale: string, api: ReturnType<typeof fakeApi>, navKey: string, steps: () => Promise<void>) {
  const { container, unmount } = renderApp(<WebAdminApp />, { api, port: fakePort(IN({ displayName: "Meera Joshi" })).port, locale });
  fireEvent.click(await screen.findByRole("button", { name: getMessages(locale)[navKey]! }));
  await steps();
  await new Promise((r) => setTimeout(r, 200));
  container.querySelectorAll("select").forEach((sel) => Array.from(sel.options).forEach((o) => o.toggleAttribute("selected", o.selected)));
  container.querySelectorAll("input").forEach((i) => { if (i.type === "checkbox") i.toggleAttribute("checked", i.checked); else i.setAttribute("value", i.value); });
  mkdirSync(`${DIR}/html`, { recursive: true });
  writeFileSync(`${DIR}/html/${name}-${locale}.html`, container.innerHTML);
  unmount();
}

const VEH = { id: "v1", registration: "KA-01-1234", label: "Bus 3", capacity: 40, status: "ACTIVE" };
const stop = (id: string, sequence: number, name: string, arrivalTime: string | null) => ({ id, sequence, name, lat: null, lng: null, arrivalTime });
const ROUTE = { id: "r1", name: "North loop", direction: "MORNING", startTime: "07:15", vehicle: VEH, driver: { id: "d1", employeeId: "E0005", name: "Ravi Menon" }, stops: [stop("s1", 1, "Lake Road", "07:20"), stop("s2", 2, "Market", "07:35"), stop("s3", 3, "School gate", "07:50")] };
const ROUTE2 = { id: "r2", name: "South loop", direction: "AFTERNOON", startTime: "15:30", vehicle: { ...VEH, id: "v2", registration: "KA-01-5678", label: "Van 1", capacity: 14 }, driver: null, stops: [stop("t1", 1, "School gate", "15:30"), stop("t2", 2, "Fort Road", "15:50")] };
const kid = (id: string, name: string, cls: string) => ({ id, name, enrollmentId: `S${id.toUpperCase()}`, className: cls });
const MANIFEST = { route: ROUTE, capacity: 40, assigned: 5, stops: [
  { id: "s1", sequence: 1, name: "Lake Road", arrivalTime: "07:20", students: [kid("k1", "Asha Rao", "5 B"), kid("k2", "Bilal Khan", "4 A")] },
  { id: "s2", sequence: 2, name: "Market", arrivalTime: "07:35", students: [kid("k3", "Chitra Nair", "6 A"), kid("k4", "Dev Patel", "5 B"), kid("k5", "Esha Iyer", "5 B")] },
  { id: "s3", sequence: 3, name: "School gate", arrivalTime: "07:50", students: [] },
] };

describe.skipIf(!DIR)("screen pictures: phase 4 and 5 web screens", { timeout: 60_000 }, () => {
  for (const locale of ["en", "ur"]) {
    it(`transport: routes and an open route (${locale})`, async () => {
      const perms = { transport: { read: "school", create: "school", update: "school", delete: "school" } } as Perms;
      const api = fakeApi({
        meGet: vi.fn(async () => as("TRANSPORT_MANAGER", perms, nav("Transport", "transport", "Transport"))),
        transportRoutes: vi.fn(async () => ({ items: [ROUTE, ROUTE2] })), transportVehicles: vi.fn(async () => ({ items: [VEH, ROUTE2.vehicle] })),
        transportDrivers: vi.fn(async () => ({ items: [{ id: "d1", employeeId: "E0005", name: "Ravi Menon" }] })), transportManifest: vi.fn(async () => MANIFEST),
      });
      await shoot("web-admin-transport-routes", locale, api, "navTransport", async () => {
        fireEvent.click(await screen.findByRole("button", { name: `${getMessages(locale)["trnStops"]}: North loop` }));
        await screen.findByText(/Asha Rao/);
      });
    });
    it(`transport: vehicles (${locale})`, async () => {
      const perms = { transport: { read: "school", create: "school", update: "school", delete: "school" } } as Perms;
      const api = fakeApi({ meGet: vi.fn(async () => as("TRANSPORT_MANAGER", perms, nav("Transport", "transport", "Transport"))), transportRoutes: vi.fn(async () => ({ items: [ROUTE, ROUTE2] })), transportVehicles: vi.fn(async () => ({ items: [VEH, ROUTE2.vehicle, { ...VEH, id: "v3", registration: "KA-01-9999", label: "Bus 5", capacity: 36, status: "OUT_OF_SERVICE" }] })), transportDrivers: vi.fn(async () => ({ items: [] })) });
      await shoot("web-admin-transport-vehicles", locale, api, "navTransport", async () => {
        fireEvent.click(await screen.findByRole("radio", { name: getMessages(locale)["trnTabVehicles"]! }));
        await screen.findByRole("table");
      });
    });
    it(`staff attendance: where each check-in was (${locale})`, async () => {
      const perms = { staff_attendance: { read: "school", update: "school" } } as Perms;
      const row = (o: Record<string, unknown>) => ({ staff: { id: "t1", employeeId: "E0001", name: "Asha Rao" }, checkIn: "2026-10-26T03:45:00.000Z", checkOut: null, state: "IN", checkInDeviceTime: null, checkInDistanceM: null, checkInReason: null, checkInStamp: "INSIDE", checkOutReason: null, confirmedAt: null, needsConfirmation: false, ...o });
      const api = fakeApi({ meGet: vi.fn(async () => as("HR_MANAGER", perms, nav("HR", "staff-attendance", "Staff attendance"))), staffAttendancePresence: vi.fn(async () => ({ date: "2026-10-26", items: [
        row({}),
        row({ staff: { id: "t2", employeeId: "E0002", name: "Bilal Khan" }, checkInStamp: "OUTSIDE", checkInDistanceM: 640, checkInReason: "District office", needsConfirmation: true }),
        row({ staff: { id: "t3", employeeId: "E0003", name: "Chitra Nair" }, checkInStamp: "OUTSIDE", checkInDistanceM: 320, checkInReason: "Bank errand", needsConfirmation: false }),
        row({ staff: { id: "t4", employeeId: "E0004", name: "Dev Patel" }, checkIn: null, state: "NONE", checkInStamp: null }),
      ] })) });
      await shoot("web-admin-staff-attendance-where", locale, api, "navStaffAttendance", async () => { await screen.findByRole("table"); });
    });
    it(`settings: the school location (${locale})`, async () => {
      const perms = { settings: { read: "school", update: "school" } } as Perms;
      const profile = { id: "11111111-1111-4111-8111-111111111111", name: "Greenfield School", subDomain: "greenfield", defaultLanguage: "en", currency: "INR", locale: "en-IN", address: "12 Lake Road", contactPhone: "+911234567890", contactEmail: "office@greenfield.example", primaryColor: "#3B3FD6", logoKey: null, activeAcademicYear: { id: "y1", name: "2026-2027" } };
      const api = fakeApi({ meGet: vi.fn(async () => as("SYSTEM_ADMIN", perms, nav("Administration", "settings", "Settings"))), schoolProfile: vi.fn(async () => profile), schoolGeofence: vi.fn(async () => ({ configured: true, lat: 12.9716, lng: 77.5946, radiusM: 150, marginM: 50, hardRingM: 500 })) });
      await shoot("web-admin-settings-location", locale, api, "navSettings", async () => { await screen.findByLabelText(getMessages(locale)["setGeoLat"]!); await screen.findByDisplayValue("12.9716"); });
    });
    it(`announcements (${locale})`, async () => {
      const perms = { announcements: { read: "school", create: "school", update: "school" } } as Perms;
      const api = fakeApi({ meGet: vi.fn(async () => as("PRINCIPAL", perms, nav("Communication", "announcements", "Announcements"))), announcementsList: vi.fn(async () => ({ next: null, items: [
        { id: "a1", title: "Sports day on Friday", body: "All classes meet on the field at 9 am.\nPlease bring kits.", createdAt: "2026-10-28T08:00:00.000Z", updatedAt: "2026-10-28T08:00:00.000Z", withdrawn: false, author: { id: "p", name: "Priya Principal" } },
        { id: "a2", title: "Staff meeting moved to 4 pm", body: "In the hall.", createdAt: "2026-10-20T08:00:00.000Z", updatedAt: "2026-10-20T08:00:00.000Z", withdrawn: false, author: { id: "p", name: "Priya Principal" } },
        { id: "a3", title: "Old notice", body: "", createdAt: "2026-09-01T08:00:00.000Z", updatedAt: "2026-09-02T08:00:00.000Z", withdrawn: true, author: { id: "p", name: "Priya Principal" } },
      ] })) });
      await shoot("web-admin-announcements", locale, api, "navAnnouncements", async () => { await screen.findByText("Sports day on Friday"); });
    });
  }
});
