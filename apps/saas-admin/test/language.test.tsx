import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlatformApp } from "@/components/PlatformApp";
import { OWNER, fakeApi, fakePort, renderApp } from "./helpers";

const nav = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ replace: nav.replace }) }));

const clearCookie = () => {
  document.cookie = "ORU_LOCALE=; Max-Age=0; Path=/";
};
beforeEach(() => {
  nav.replace.mockClear();
  clearCookie();
});
afterEach(clearCookie);

describe("saas-admin language", () => {
  it("applies this device's remembered language once, signed out or in", async () => {
    document.cookie = "ORU_LOCALE=ur; Path=/";
    renderApp(<PlatformApp />, { port: fakePort().port, api: fakeApi() });
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/", { locale: "ur" }));
    expect(nav.replace).toHaveBeenCalledTimes(1);
  });

  it("with nothing remembered the app stays in English (no detection)", async () => {
    renderApp(<PlatformApp />, { port: fakePort().port, api: fakeApi() });
    await screen.findByRole("heading", { name: "Sign in to the platform" });
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it("the sign-in screen offers the language choice, and a choice is remembered and saved when signed in", async () => {
    renderApp(<PlatformApp />, { port: fakePort().port, api: fakeApi() });
    fireEvent.change(await screen.findByLabelText("Language"), { target: { value: "hi" } });
    expect(document.cookie).toContain("ORU_LOCALE=hi");
    expect(nav.replace).toHaveBeenCalledWith("/", { locale: "hi" });
  });

  it("signed in as the owner, choosing a language saves it to the account", async () => {
    const api = fakeApi({ mePreferences: vi.fn(async () => ({ language: "ur" })) });
    renderApp(<PlatformApp />, { port: fakePort(OWNER).port, api });
    fireEvent.change(await screen.findByLabelText("Language"), { target: { value: "ur" } });
    await waitFor(() => expect(api.mePreferences).toHaveBeenCalledWith({ body: { language: "ur" } }));
  });
});
