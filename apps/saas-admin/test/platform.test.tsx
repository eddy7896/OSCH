import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@oruschools/api-client";
import { PlatformApp } from "@/components/PlatformApp";
import { OWNER, fakeApi, fakePort, renderApp, school } from "./helpers";

vi.mock("@/i18n/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ replace: vi.fn() }) }));

describe("PlatformApp: who sees what", () => {
  it("signed out: the sign-in screen, and no gateway call is made", () => {
    const api = fakeApi();
    renderApp(<PlatformApp />, { port: fakePort({ status: "out" }).port, api });
    expect(screen.getByRole("heading", { name: "Sign in to the platform" })).toBeTruthy();
    expect(api.platformSchoolsList).not.toHaveBeenCalled();
  });

  it("while Firebase is still deciding: a status message, no sign-in form flash", () => {
    renderApp(<PlatformApp />, { port: fakePort({ status: "loading" }).port, api: fakeApi() });
    expect(screen.queryByLabelText("Password")).toBeNull();
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("signed in but not the platform owner: a clear no-access screen, no school list, and a way to sign out", () => {
    const api = fakeApi();
    const { port } = fakePort({ status: "in", user: { uid: "u2", email: "teacher@example.com", displayName: null }, isOwner: false });
    renderApp(<PlatformApp />, { port, api });
    expect(screen.getByText("This account cannot use the platform area")).toBeTruthy();
    expect(api.platformSchoolsList).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(port.signOut).toHaveBeenCalled();
  });

  it("the owner: the platform area with the navigation, language and who is signed in", async () => {
    renderApp(<PlatformApp />, { port: fakePort(OWNER).port, api: fakeApi() });
    expect(await screen.findByRole("navigation", { name: "Platform sections" })).toBeTruthy();
    expect(screen.getByText("Owner")).toBeTruthy();
    expect(screen.getByLabelText("Language")).toBeTruthy();
    expect(await screen.findByText("No schools yet")).toBeTruthy();
  });

  it("signing out and in again switches screens as Firebase reports it", async () => {
    const { port, emit } = fakePort(OWNER);
    renderApp(<PlatformApp />, { port, api: fakeApi() });
    await screen.findByRole("navigation", { name: "Platform sections" });
    emit({ status: "out" });
    expect(await screen.findByRole("heading", { name: "Sign in to the platform" })).toBeTruthy();
  });
});

describe("Schools", () => {
  const owner = { port: () => fakePort(OWNER).port };

  it("lists schools with name, address and status", async () => {
    const api = fakeApi({ platformSchoolsList: vi.fn(async () => ({ items: [school(), school({ id: "2", name: "Hillside", subDomain: "hillside", status: "SUSPENDED" })], limit: 50, offset: 0 })) });
    renderApp(<PlatformApp />, { port: owner.port(), api });
    expect(await screen.findByText("Greenfield School")).toBeTruthy();
    expect(screen.getByText("hillside")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.getByText("Suspended")).toBeTruthy();
    expect(screen.getByText("2 schools")).toBeTruthy();
    expect(api.platformSchoolsList).toHaveBeenCalledWith({ query: { limit: 50, offset: 0 } });
  });

  it("a failed load says so, in words, with a Retry that reloads", async () => {
    const list = vi.fn().mockRejectedValueOnce(new ApiError("NETWORK_ERROR", 0, "x")).mockResolvedValueOnce({ items: [school()], limit: 50, offset: 0 });
    renderApp(<PlatformApp />, { port: owner.port(), api: fakeApi({ platformSchoolsList: list }) });
    expect((await screen.findByRole("alert")).textContent).toContain("We could not load the schools");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Greenfield School")).toBeTruthy();
  });

  it("shows more only when a full page came back, and appends the next page", async () => {
    const full = Array.from({ length: 50 }, (_, i) => school({ id: String(i), name: `S${i}`, subDomain: `s${i}` }));
    const list = vi.fn().mockResolvedValueOnce({ items: full, limit: 50, offset: 0 }).mockResolvedValueOnce({ items: [school({ id: "x", name: "Last", subDomain: "last" })], limit: 50, offset: 50 });
    renderApp(<PlatformApp />, { port: owner.port(), api: fakeApi({ platformSchoolsList: list }) });
    fireEvent.click(await screen.findByRole("button", { name: "Show more" }));
    expect(await screen.findByText("Last")).toBeTruthy();
    expect(list).toHaveBeenLastCalledWith({ query: { limit: 50, offset: 50 } });
    expect(screen.queryByRole("button", { name: "Show more" })).toBeNull();
    expect(screen.getByText("S0")).toBeTruthy();
  });

  it("creates a school: sends name, lowercased address and language, then shows it confirmed and reloads", async () => {
    const list = vi.fn().mockResolvedValueOnce({ items: [], limit: 50, offset: 0 }).mockResolvedValueOnce({ items: [school()], limit: 50, offset: 0 });
    const api = fakeApi({ platformSchoolsList: list });
    renderApp(<PlatformApp />, { port: owner.port(), api });
    fireEvent.click(await screen.findByRole("button", { name: "Create school" }));
    fireEvent.change(screen.getByLabelText("School name"), { target: { value: " Greenfield School " } });
    fireEvent.change(screen.getByLabelText("Web address"), { target: { value: "GreenField" } });
    fireEvent.change(screen.getByLabelText("Default language"), { target: { value: "hi" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Create school" }).at(-1)!);
    await waitFor(() => expect(api.platformSchoolsCreate).toHaveBeenCalledWith({ body: { name: "Greenfield School", subDomain: "greenfield", defaultLanguage: "hi" } }));
    expect(await screen.findByText("School created")).toBeTruthy();
    expect(await screen.findByText("Greenfield School")).toBeTruthy();
  });

  it("an invalid field is marked and the form stays open with the entered text", async () => {
    const create = vi.fn().mockRejectedValue(new ApiError("INVALID_REQUEST", 400, "x", "r", [{ field: "subDomain", rule: "matches" }]));
    renderApp(<PlatformApp />, { port: owner.port(), api: fakeApi({ platformSchoolsCreate: create }) });
    fireEvent.click(await screen.findByRole("button", { name: "Create school" }));
    fireEvent.change(screen.getByLabelText("School name"), { target: { value: "X" } });
    fireEvent.change(screen.getByLabelText("Web address"), { target: { value: "bad name" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Create school" }).at(-1)!);
    expect(await screen.findByLabelText("Web address")).toHaveProperty("ariaInvalid", "true");
    expect((screen.getByLabelText("School name") as HTMLInputElement).value).toBe("X");
    expect(screen.getByLabelText("School name").getAttribute("aria-invalid")).not.toBe("true");
  });

  it("a taken address is reported as a conflict, in words", async () => {
    const create = vi.fn().mockRejectedValue(new ApiError("CONFLICT", 409, "x"));
    renderApp(<PlatformApp />, { port: owner.port(), api: fakeApi({ platformSchoolsCreate: create }) });
    fireEvent.click(await screen.findByRole("button", { name: "Create school" }));
    fireEvent.change(screen.getByLabelText("School name"), { target: { value: "X" } });
    fireEvent.change(screen.getByLabelText("Web address"), { target: { value: "taken" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Create school" }).at(-1)!);
    expect((await screen.findByRole("alert")).textContent).toContain("already exists");
  });

  it("edit sends only what changed, and the web address cannot be edited", async () => {
    const api = fakeApi({ platformSchoolsList: vi.fn(async () => ({ items: [school()], limit: 50, offset: 0 })) });
    renderApp(<PlatformApp />, { port: owner.port(), api });
    fireEvent.click(await screen.findByRole("button", { name: "Edit: Greenfield School" }));
    expect((screen.getByLabelText("Web address") as HTMLInputElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("School name"), { target: { value: "Greenfield Public School" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(api.platformSchoolsUpdate).toHaveBeenCalledWith({ path: { id: school().id }, body: { name: "Greenfield Public School" } }));
    expect(await screen.findByText("Changes saved")).toBeTruthy();
  });

  it("saving an edit with no change calls nothing", async () => {
    const api = fakeApi({ platformSchoolsList: vi.fn(async () => ({ items: [school()], limit: 50, offset: 0 })) });
    renderApp(<PlatformApp />, { port: owner.port(), api });
    fireEvent.click(await screen.findByRole("button", { name: "Edit: Greenfield School" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("heading", { name: "Schools" })).toBeTruthy();
    expect(api.platformSchoolsUpdate).not.toHaveBeenCalled();
  });

  it("suspending asks first, names the school, and sends the reason", async () => {
    const api = fakeApi({ platformSchoolsList: vi.fn(async () => ({ items: [school()], limit: 50, offset: 0 })) });
    renderApp(<PlatformApp />, { port: owner.port(), api });
    fireEvent.click(await screen.findByRole("button", { name: "Suspend: Greenfield School" }));
    expect(screen.getByText("Suspend Greenfield School?")).toBeTruthy();
    expect(api.platformSchoolsSuspend).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Reason (optional)"), { target: { value: "Unpaid" } });
    fireEvent.click(screen.getByRole("button", { name: "Suspend" }));
    await waitFor(() => expect(api.platformSchoolsSuspend).toHaveBeenCalledWith({ path: { id: school().id }, body: { reason: "Unpaid" } }));
    expect(await screen.findByText("School suspended")).toBeTruthy();
  });

  it("cancelling a suspension changes nothing", async () => {
    const api = fakeApi({ platformSchoolsList: vi.fn(async () => ({ items: [school()], limit: 50, offset: 0 })) });
    renderApp(<PlatformApp />, { port: owner.port(), api });
    fireEvent.click(await screen.findByRole("button", { name: "Suspend: Greenfield School" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await screen.findByRole("heading", { name: "Schools" })).toBeTruthy();
    expect(api.platformSchoolsSuspend).not.toHaveBeenCalled();
  });

  it("a suspended school offers Reactivate, not Suspend", async () => {
    const api = fakeApi({ platformSchoolsList: vi.fn(async () => ({ items: [school({ status: "SUSPENDED" })], limit: 50, offset: 0 })) });
    renderApp(<PlatformApp />, { port: owner.port(), api });
    expect(screen.queryByRole("button", { name: /^Suspend:/ })).toBeNull();
    fireEvent.click(await screen.findByRole("button", { name: "Reactivate: Greenfield School" }));
    await waitFor(() => expect(api.platformSchoolsActivate).toHaveBeenCalledWith({ path: { id: school().id }, body: {} }));
    expect(await screen.findByText("School reactivated")).toBeTruthy();
  });

  it("a refusal from the gateway is shown, not swallowed", async () => {
    const api = fakeApi({
      platformSchoolsList: vi.fn(async () => ({ items: [school()], limit: 50, offset: 0 })),
      platformSchoolsSuspend: vi.fn().mockRejectedValue(new ApiError("FORBIDDEN", 403, "x")),
    });
    renderApp(<PlatformApp />, { port: owner.port(), api });
    fireEvent.click(await screen.findByRole("button", { name: "Suspend: Greenfield School" }));
    fireEvent.click(screen.getByRole("button", { name: "Suspend" }));
    expect((await screen.findByRole("alert")).textContent).toContain("do not have permission");
  });
});
