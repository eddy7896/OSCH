import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WebAdminApp } from "@/components/WebAdminApp";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { IN, SCHOOL, fakeApi, fakePort, me, renderApp } from "./helpers";

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

const school = (defaultLanguage: string) => fakeApi({ publicSchoolsBySubdomain: vi.fn(async () => ({ ...SCHOOL, defaultLanguage })) });
const withMe = (language: { chosen: string | null; effective: string }) => fakeApi({ meGet: vi.fn(async () => me({ language })) });

describe("the language people start in (ADR-0006: a choice, never detected)", () => {
  it("signed out at the default address: the school's default language is applied once", async () => {
    renderApp(<WebAdminApp />, { api: school("hi"), port: fakePort().port });
    await screen.findByRole("heading", { name: /Sign in to/ });
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/", { locale: "hi" }));
    expect(nav.replace).toHaveBeenCalledTimes(1);
  });

  it("this device's own choice beats the school's default, including a choice of English", async () => {
    document.cookie = "ORU_LOCALE=ur; Path=/";
    renderApp(<WebAdminApp />, { api: school("hi"), port: fakePort().port });
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/", { locale: "ur" }));
    nav.replace.mockClear();
    document.cookie = "ORU_LOCALE=en; Path=/";
    renderApp(<WebAdminApp />, { api: school("hi"), port: fakePort().port });
    await screen.findAllByRole("heading", { name: /Sign in to/ });
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it("an address that already names a language is that visit's choice: no redirect", async () => {
    renderApp(<WebAdminApp />, { api: school("hi"), port: fakePort().port, locale: "ur" });
    await screen.findByRole("heading", { name: /Greenfield School/ });
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it("a school whose default is English changes nothing", async () => {
    renderApp(<WebAdminApp />, { api: school("en"), port: fakePort().port });
    await screen.findByRole("heading", { name: /Sign in to/ });
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it("signed in: the account's choice wins over the device and the school default", async () => {
    document.cookie = "ORU_LOCALE=hi; Path=/";
    renderApp(<WebAdminApp />, { api: withMe({ chosen: "ur", effective: "ur" }), port: fakePort(IN()).port });
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/", { locale: "ur" }));
  });

  it("signed in with no account choice: the device's choice, then the school default the gateway reports", async () => {
    renderApp(<WebAdminApp />, { api: withMe({ chosen: null, effective: "hi" }), port: fakePort(IN()).port });
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/", { locale: "hi" }));
    nav.replace.mockClear();
    document.cookie = "ORU_LOCALE=ur; Path=/";
    renderApp(<WebAdminApp />, { api: withMe({ chosen: null, effective: "hi" }), port: fakePort(IN()).port });
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/", { locale: "ur" }));
  });

  it("an account that chose English stays in English even when the school default is another language", async () => {
    renderApp(<WebAdminApp />, { api: withMe({ chosen: "en", effective: "en" }), port: fakePort(IN()).port });
    await screen.findByRole("navigation", { name: "School sections" });
    expect(nav.replace).not.toHaveBeenCalled();
  });
});

describe("the language switcher", () => {
  it("remembers the choice on this device, saves it to the account when signed in, and changes the page's language", async () => {
    const api = fakeApi({ mePreferences: vi.fn(async () => ({ language: "ur" })) });
    renderApp(<LanguageSwitcher />, { api, port: fakePort(IN()).port });
    fireEvent.change(await screen.findByLabelText("Language"), { target: { value: "ur" } });
    expect(document.cookie).toContain("ORU_LOCALE=ur");
    await waitFor(() => expect(api.mePreferences).toHaveBeenCalledWith({ body: { language: "ur" } }));
    expect(nav.replace).toHaveBeenCalledWith("/", { locale: "ur" });
  });

  it("signed out: the device remembers it and nothing is sent to the gateway", async () => {
    const api = fakeApi({ mePreferences: vi.fn() });
    renderApp(<LanguageSwitcher />, { api, port: fakePort().port });
    fireEvent.change(await screen.findByLabelText("Language"), { target: { value: "hi" } });
    expect(document.cookie).toContain("ORU_LOCALE=hi");
    expect(api.mePreferences).not.toHaveBeenCalled();
    expect(nav.replace).toHaveBeenCalledWith("/", { locale: "hi" });
  });

  it("if saving to the account fails the language still changes", async () => {
    const api = fakeApi({ mePreferences: vi.fn().mockRejectedValue(new Error("offline")) });
    renderApp(<LanguageSwitcher />, { api, port: fakePort(IN()).port });
    fireEvent.change(await screen.findByLabelText("Language"), { target: { value: "ur" } });
    await waitFor(() => expect(api.mePreferences).toHaveBeenCalled());
    expect(nav.replace).toHaveBeenCalledWith("/", { locale: "ur" });
  });
});
