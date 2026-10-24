import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getMessages } from "@oruschools/i18n";
import { ApiError } from "@oruschools/api-client";
import { WebAdminApp } from "@/components/WebAdminApp";
import { AppProviders } from "@/components/Providers";
import { IN, SCHOOL, fakeApi, fakePort, me, renderApp } from "./helpers";

vi.mock("@/i18n/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ replace: vi.fn() }) }));

describe("the address decides the school", () => {
  it("no school address: tells the person to open their school's address, and calls nothing", async () => {
    const api = fakeApi();
    renderApp(<WebAdminApp />, { api, port: fakePort().port, host: "localhost:3002" });
    expect(await screen.findByRole("heading", { level: 1, name: "Open your school's address" })).toBeTruthy();
    expect(api.publicSchoolsBySubdomain).not.toHaveBeenCalled();
  });

  it("looks the school up by the label in front of the base domain", async () => {
    const api = fakeApi();
    renderApp(<WebAdminApp />, { api, port: fakePort().port, host: "greenfield.localhost:3002" });
    await screen.findByRole("heading", { name: "Sign in to Greenfield School" });
    expect(api.publicSchoolsBySubdomain).toHaveBeenCalledWith({ path: { sub: "greenfield" } });
  });

  it("an unknown (or suspended) school is one plain 'not found', with no sign-in form", async () => {
    const api = fakeApi({ publicSchoolsBySubdomain: vi.fn().mockRejectedValue(new ApiError("NOT_FOUND", 404, "x")) });
    renderApp(<WebAdminApp />, { api, port: fakePort().port });
    expect(await screen.findByRole("heading", { name: "We could not find this school" })).toBeTruthy();
    expect(screen.queryByLabelText("Password")).toBeNull();
  });

  it("a failed lookup is an error with Retry, not 'not found'", async () => {
    const lookup = vi.fn().mockRejectedValueOnce(new ApiError("NETWORK_ERROR", 0, "x")).mockResolvedValue(SCHOOL);
    renderApp(<WebAdminApp />, { api: fakeApi({ publicSchoolsBySubdomain: lookup }), port: fakePort().port });
    expect((await screen.findByRole("alert")).textContent).toContain("We could not reach the server");
    expect(screen.queryByText("We could not find this school")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "Sign in to Greenfield School" })).toBeTruthy();
  });
});

describe("signed in", () => {
  const signedIn = (api = fakeApi()) => renderApp(<WebAdminApp />, { api, port: fakePort(IN()).port });

  it("shows the school's own frame: its name, a navigation built from what the gateway sent, in our words and icons", async () => {
    const api = fakeApi();
    signedIn(api);
    const nav = await screen.findByRole("navigation", { name: "School sections" });
    expect(within(nav).getByText("Greenfield School")).toBeTruthy();
    expect(within(nav).getByText("Administration")).toBeTruthy();
    expect(within(nav).getByRole("button", { name: "Users and roles" })).toBeTruthy();
    expect(within(nav).getByRole("button", { name: "Audit log" })).toBeTruthy();
    expect(api.meGet).toHaveBeenCalledTimes(1);
  });

  it("modules the gateway did not send are simply not there", async () => {
    signedIn();
    const nav = await screen.findByRole("navigation", { name: "School sections" });
    for (const word of ["Payroll", "Fees and payments", "Transport", "Staff"]) expect(within(nav).queryByRole("button", { name: word })).toBeNull();
  });

  it("the dashboard greets the person by name with their role, and says honestly that there is nothing yet", async () => {
    signedIn();
    expect(await screen.findByRole("heading", { level: 1, name: /Good (morning|afternoon|evening), Asha Kumar/ })).toBeTruthy();
    expect(screen.getByText("Your role: System administrator")).toBeTruthy();
    expect(screen.getByText("Nothing to show yet")).toBeTruthy();
  });

  it("a module whose screen is not built says so instead of showing nothing", async () => {
    signedIn();
    fireEvent.click(await screen.findByRole("button", { name: "Audit log" }));
    expect(await screen.findByText("This module is not ready yet")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Audit log" }).getAttribute("aria-current")).toBe("page");
    fireEvent.click(screen.getByRole("button", { name: "Dashboard" }));
    expect(await screen.findByText("Nothing to show yet")).toBeTruthy();
  });

  it("an item we have no word for yet shows the gateway's own text rather than a blank", async () => {
    const api = fakeApi({ meGet: vi.fn(async () => me({ activeSchool: { ...me().activeSchool!, navigation: [{ title: "Brand new", items: [{ key: "hologram", label: "Holograms" }] }] } })) });
    signedIn(api);
    expect(await screen.findByRole("button", { name: "Holograms" })).toBeTruthy();
    expect(screen.getByText("Brand new")).toBeTruthy();
  });

  it("someone who is not a member of this school gets a clear 'no access', and no navigation", async () => {
    const api = fakeApi({ meGet: vi.fn(async () => me({ activeSchool: null })) });
    const { port } = fakePort(IN());
    renderApp(<WebAdminApp />, { api, port });
    expect(await screen.findByText("You do not have access to Greenfield School")).toBeTruthy();
    expect(screen.queryByRole("navigation")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(port.signOut).toHaveBeenCalled();
  });

  it("a different active school than this address is treated as no access too", async () => {
    const other = me();
    other.activeSchool!.schoolId = "22222222-2222-4222-8222-222222222222";
    renderApp(<WebAdminApp />, { api: fakeApi({ meGet: vi.fn(async () => other) }), port: fakePort(IN()).port });
    expect(await screen.findByText("You do not have access to Greenfield School")).toBeTruthy();
  });

  it("a failed account load says why, in words, and Retry loads it again", async () => {
    const meGet = vi.fn().mockRejectedValueOnce(new ApiError("UPSTREAM_UNAVAILABLE", 502, "x")).mockResolvedValue(me());
    signedIn(fakeApi({ meGet }));
    expect((await screen.findByRole("alert")).textContent).toContain("We could not load your account");
    expect(screen.getByRole("alert").textContent).toContain("The server is busy");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("navigation", { name: "School sections" })).toBeTruthy();
    expect(meGet).toHaveBeenCalledTimes(2);
  });

  it("signing out in the header calls the sign-in service", async () => {
    const { port } = fakePort(IN());
    renderApp(<WebAdminApp />, { api: fakeApi(), port });
    await screen.findByRole("navigation", { name: "School sections" });
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(port.signOut).toHaveBeenCalledTimes(1);
  });

  it("has no accessibility violations", async () => {
    const { container } = signedIn();
    await screen.findByRole("navigation", { name: "School sections" });
    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(" | ")}`)).toEqual([]);
  });

  it("renders in Urdu without missing words", async () => {
    renderApp(<WebAdminApp />, { api: fakeApi(), port: fakePort(IN()).port, locale: "ur" });
    await screen.findByRole("navigation");
    expect(document.body.textContent).not.toMatch(/nav[A-Z]|section[A-Z]|webYourRole|greeting[A-Z]/);
  });
});

describe("the real wiring sends the school and the token", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("every school request carries the school found from the address and the person's token; the public lookup carries neither", async () => {
    const seen: { url: string; school: string | null; auth: string | null }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const req = new Request(input, init);
        seen.push({ url: new URL(req.url).pathname, school: req.headers.get("X-School-Id"), auth: req.headers.get("Authorization") });
        const body = req.url.includes("/public/") ? SCHOOL : me();
        return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
      }),
    );
    const { port } = fakePort(IN());
    render(
      <NextIntlClientProvider locale="en" messages={getMessages("en")}>
        <AppProviders baseDomain="localhost" apiUrl="http://gateway.test" host="greenfield.localhost:3002" port={port}>
          <WebAdminApp />
        </AppProviders>
      </NextIntlClientProvider>,
    );
    await screen.findByRole("navigation", { name: "School sections" });
    await waitFor(() => expect(seen.length).toBeGreaterThanOrEqual(2));
    const lookup = seen.find((s) => s.url.includes("/public/schools/by-subdomain/greenfield"))!;
    expect(lookup).toMatchObject({ school: null, auth: null });
    const account = seen.find((s) => s.url === "/v1/me")!;
    expect(account).toMatchObject({ school: SCHOOL.id, auth: "Bearer token" });
  });
});
