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
  m.activeSchool = { ...m.activeSchool!, role, permissions: perms, navigation: [{ title: "Overview", items: [{ key: "dashboard-operations", label: "Dashboard" }] }, { title: "Transport", items: [{ key: "transport", label: "Transport" }] }] };
  return m;
};
const manager = () => as("TRANSPORT_MANAGER", { transport: { read: "school", create: "school", update: "school", delete: "school" } });
const reader = () => as("PRINCIPAL", { transport: { read: "school" } });
const go = async (api: ReturnType<typeof fakeApi>) => {
  renderApp(<WebAdminApp />, { api, port: fakePort(IN()).port });
  fireEvent.click(await screen.findByRole("button", { name: "Transport" }));
};

const VEHICLE = { id: "v1", registration: "KA-01-1234", label: "Bus 3", capacity: 2, status: "ACTIVE" };
const stop = (id: string, sequence: number, name: string, arrivalTime: string | null = null) => ({ id, sequence, name, lat: null, lng: null, arrivalTime });
const ROUTE = { id: "r1", name: "North loop", direction: "MORNING", startTime: "07:15", vehicle: VEHICLE, driver: { id: "d1", employeeId: "E1", name: "Ravi Driver" }, stops: [stop("s1", 1, "Lake Road", "07:20"), stop("s2", 2, "Market")] };
const MANIFEST = { route: ROUTE, capacity: 2, assigned: 1, stops: [
  { id: "s1", sequence: 1, name: "Lake Road", arrivalTime: "07:20", students: [{ id: "k1", name: "Asha Rao", enrollmentId: "S001", className: "5 B" }] },
  { id: "s2", sequence: 2, name: "Market", arrivalTime: null, students: [] },
] };
const base = (over: Record<string, unknown> = {}) => ({
  meGet: vi.fn(async () => manager()),
  transportRoutes: vi.fn(async () => ({ items: [ROUTE] })),
  transportVehicles: vi.fn(async () => ({ items: [VEHICLE] })),
  transportDrivers: vi.fn(async () => ({ items: [{ id: "d1", employeeId: "E1", name: "Ravi Driver" }] })),
  transportManifest: vi.fn(async () => MANIFEST),
  ...over,
});
const openRoute = async () => fireEvent.click(await screen.findByRole("button", { name: "Stops: North loop" }));

describe("transport screen", () => {
  it("lists the routes with their direction, vehicle, driver and stops, and opens one with who rides it and how full the vehicle is", async () => {
    await go(fakeApi(base()));
    const table = await screen.findByRole("table", { name: "Routes" });
    expect(within(table).getByText("North loop")).toBeTruthy();
    expect(within(table).getByText("Morning, to school")).toBeTruthy();
    expect(within(table).getByText("Bus 3")).toBeTruthy();
    expect(within(table).getByText("Ravi Driver")).toBeTruthy();
    await openRoute();
    expect(await screen.findByText("1 of 2 seats taken")).toBeTruthy();
    expect(screen.getByText(/Asha Rao, 5 B/)).toBeTruthy();
    expect(screen.getByText("Nobody yet.")).toBeTruthy();
  });

  it("stops: add one, move it up, save: the whole ordered list is sent; seats lost are said in words", async () => {
    const transportSetStops = vi.fn(async () => ({ ...ROUTE, droppedSeats: 2 }));
    await go(fakeApi(base({ transportSetStops })));
    await openRoute();
    await screen.findByText("1 of 2 seats taken");
    fireEvent.click(screen.getAllByRole("button", { name: "Add" })[0]!); // the add-a-stop button inside the route card
    const names = screen.getAllByLabelText("Stop name");
    expect(names).toHaveLength(3);
    fireEvent.change(names[2]!, { target: { value: "School gate" } });
    fireEvent.change(screen.getAllByLabelText("Planned time")[2]!, { target: { value: "07:40" } });
    fireEvent.click(screen.getByRole("button", { name: "Move up: School gate" }));
    fireEvent.click(screen.getByRole("button", { name: "Save stops" }));
    await waitFor(() => expect(transportSetStops).toHaveBeenCalledWith({ path: { id: "r1" }, body: { stops: [{ name: "Lake Road", arrivalTime: "07:20" }, { name: "School gate", arrivalTime: "07:40" }, { name: "Market" }] } }));
    expect(await screen.findByText(/Stops saved\. 2 students lost their seat/)).toBeTruthy();
  });

  it("a stop with no name or a time that is not HH:MM cannot be saved", async () => {
    await go(fakeApi(base()));
    await openRoute();
    await screen.findByText("1 of 2 seats taken");
    const save = screen.getByRole("button", { name: "Save stops" }) as HTMLButtonElement;
    fireEvent.change(screen.getAllByLabelText("Planned time")[0]!, { target: { value: "7.20" } });
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getAllByLabelText("Planned time")[0]!, { target: { value: "07:20" } });
    expect(save.disabled).toBe(false);
    fireEvent.change(screen.getAllByLabelText("Stop name")[1]!, { target: { value: "  " } });
    expect(save.disabled).toBe(true);
  });

  it("seats a student: find by name, choose them, choose the stop, seat; and takes a seat away", async () => {
    const transportFindStudents = vi.fn(async () => ({ items: [{ id: "k2", name: "Bilal Khan", enrollmentId: "S002", className: "5 B" }] }));
    const transportAssign = vi.fn(async () => ({ studentId: "k2", items: [] }));
    const transportUnassign = vi.fn(async () => undefined);
    await go(fakeApi(base({ transportFindStudents, transportAssign, transportUnassign })));
    await openRoute();
    await screen.findByText("1 of 2 seats taken");
    const seat = screen.getByRole("button", { name: "Seat on this route" }) as HTMLButtonElement;
    expect(seat.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Find a student"), { target: { value: "bil" } });
    await waitFor(() => expect(transportFindStudents).toHaveBeenCalledWith({ query: { search: "bil" } }));
    fireEvent.click(await screen.findByRole("button", { name: /Bilal Khan, 5 B/ }));
    fireEvent.change(screen.getByLabelText("Stop"), { target: { value: "s2" } });
    expect(seat.disabled).toBe(false);
    fireEvent.click(seat);
    await waitFor(() => expect(transportAssign).toHaveBeenCalledWith({ path: { studentId: "k2" }, body: { routeId: "r1", stopId: "s2" } }));
    expect(await screen.findByText("Student seated.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove: Asha Rao" }));
    await waitFor(() => expect(transportUnassign).toHaveBeenCalledWith({ path: { studentId: "k1", direction: "MORNING" } }));
  });

  it("a full vehicle is said in words; one letter is not searched", async () => {
    const transportFindStudents = vi.fn(async () => ({ items: [{ id: "k2", name: "Bilal Khan", enrollmentId: "S002", className: null }] }));
    const transportAssign = vi.fn(async () => { throw new ApiError("CONFLICT", 409, "no", undefined, [{ field: "routeId", rule: "vehicleFull" }]); });
    await go(fakeApi(base({ transportFindStudents, transportAssign })));
    await openRoute();
    await screen.findByText("1 of 2 seats taken");
    fireEvent.change(screen.getByLabelText("Find a student"), { target: { value: "b" } });
    expect(transportFindStudents).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Find a student"), { target: { value: "bi" } });
    fireEvent.click(await screen.findByRole("button", { name: /Bilal Khan/ }));
    fireEvent.click(screen.getByRole("button", { name: "Seat on this route" }));
    expect(await screen.findByText("The vehicle has no free seat.")).toBeTruthy();
  });

  it("vehicles: add one (plate and name trimmed), see a plate refused in words, switch one out of service, delete one", async () => {
    const transportCreateVehicle = vi.fn()
      .mockRejectedValueOnce(new ApiError("CONFLICT", 409, "no", undefined, [{ field: "registration", rule: "registrationInUse" }]))
      .mockResolvedValue(VEHICLE);
    const transportUpdateVehicle = vi.fn(async () => VEHICLE);
    const transportDeleteVehicle = vi.fn(async () => undefined);
    await go(fakeApi(base({ transportCreateVehicle, transportUpdateVehicle, transportDeleteVehicle })));
    fireEvent.click(await screen.findByRole("radio", { name: "Vehicles" }));
    const table = await screen.findByRole("table", { name: "Vehicles" });
    expect(within(table).getByText("KA-01-1234")).toBeTruthy();
    expect(within(table).getByText("In service")).toBeTruthy();
    const add = screen.getByRole("button", { name: "Add" }) as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Number plate"), { target: { value: " KA-02-9999 " } });
    fireEvent.change(screen.getByLabelText("Name (for example Bus 3)"), { target: { value: " Van 1 " } });
    fireEvent.change(screen.getByLabelText("Seats"), { target: { value: "14" } });
    fireEvent.click(add);
    expect(await screen.findByText("That number plate is already on the list.")).toBeTruthy();
    expect(transportCreateVehicle).toHaveBeenCalledWith({ body: { registration: "KA-02-9999", label: "Van 1", capacity: 14 } });
    fireEvent.click(screen.getByRole("button", { name: "Edit: Bus 3" }));
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "OUT_OF_SERVICE" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(transportUpdateVehicle).toHaveBeenCalledWith({ path: { id: "v1" }, body: { label: "Bus 3", capacity: 2, status: "OUT_OF_SERVICE" } }));
    fireEvent.click(screen.getByRole("button", { name: "Delete: Bus 3" }));
    await waitFor(() => expect(transportDeleteVehicle).toHaveBeenCalledWith({ path: { id: "v1" } }));
  });

  it("a new route: name, direction, time, vehicle and driver are sent; a time that is not HH:MM cannot be sent", async () => {
    const transportCreateRoute = vi.fn(async () => ROUTE);
    await go(fakeApi(base({ transportCreateRoute })));
    await screen.findByRole("table", { name: "Routes" });
    const add = screen.getByRole("button", { name: "Add" }) as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Route name"), { target: { value: " South loop " } });
    fireEvent.change(screen.getByLabelText("Direction"), { target: { value: "AFTERNOON" } });
    fireEvent.change(screen.getByLabelText("Starts at"), { target: { value: "3pm" } });
    expect(add.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Starts at"), { target: { value: "15:30" } });
    fireEvent.change(screen.getByLabelText("Vehicle"), { target: { value: "v1" } });
    fireEvent.change(screen.getByLabelText("Driver"), { target: { value: "d1" } });
    fireEvent.click(add);
    await waitFor(() => expect(transportCreateRoute).toHaveBeenCalledWith({ body: { name: "South loop", direction: "AFTERNOON", startTime: "15:30", vehicleId: "v1", driverId: "d1" } }));
  });

  it("a reader (the Principal) sees routes and who rides, with no add, edit, seat or remove controls", async () => {
    await go(fakeApi(base({ meGet: vi.fn(async () => reader()) })));
    await screen.findByRole("table", { name: "Routes" });
    expect(screen.queryByRole("button", { name: "Add" })).toBeNull();
    await openRoute();
    await screen.findByText("1 of 2 seats taken");
    expect(screen.queryByRole("button", { name: "Save stops" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Seat on this route" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Remove:/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    expect((screen.getByLabelText("Route name") as HTMLInputElement).disabled).toBe(true);
  });

  it("no accessibility violations on the routes list and an open route", async () => {
    await go(fakeApi(base()));
    await openRoute();
    await screen.findByText("1 of 2 seats taken");
    const r = await axe.run(document.body, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 120)}`)).toEqual([]);
  });
});
