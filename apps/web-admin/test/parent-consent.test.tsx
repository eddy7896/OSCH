import { fireEvent, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { WebAdminApp } from "@/components/WebAdminApp";
import { IN, fakeApi, fakePort, me, renderApp } from "./helpers";

vi.mock("@/i18n/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ replace: vi.fn() }) }));

const sysadmin = () => {
  const m = me();
  m.activeSchool = { ...m.activeSchool!, role: "SYSTEM_ADMIN", permissions: { consent_overview: { read: "school" } }, navigation: [{ title: "Administration", items: [{ key: "consent", label: "Parent consent" }] }] };
  return m;
};

const OVERVIEW = {
  noticeVersion: 1,
  counts: { parents: 4, current: 1, withdrawn: 1, oldVersion: 1, none: 1 },
  items: [
    { id: "a", name: "Asha Parent", state: "CURRENT", noticeVersion: 1, language: "hi", recordedAt: "2026-11-10T08:00:00Z" },
    { id: "b", name: "Bilal Parent", state: "WITHDRAWN", noticeVersion: 1, language: "en", recordedAt: "2026-11-11T08:00:00Z" },
    { id: "c", name: "Chitra Parent", state: "OLD_VERSION", noticeVersion: 0, language: "en", recordedAt: "2026-10-01T08:00:00Z" },
    { id: "d", name: "Dev Parent", state: "NONE", noticeVersion: null, language: null, recordedAt: null },
  ],
};

describe("parent consent (System Admin)", () => {
  it("shows who has agreed, who withdrew, who agreed to an older notice and who has not, with the counts and no child details", async () => {
    const consentOverview = vi.fn(async () => OVERVIEW);
    renderApp(<WebAdminApp />, { api: fakeApi({ meGet: vi.fn(async () => sysadmin()), consentOverview }), port: fakePort(IN()).port });
    fireEvent.click(await screen.findByRole("button", { name: "Parent consent" }));
    expect(await screen.findByText("1 of 4 parents have agreed to this version.")).toBeTruthy();
    expect(screen.getByText("Privacy notice, version 1")).toBeTruthy();
    for (const [name, state] of [["Asha Parent", "Agreed"], ["Bilal Parent", "Withdrawn"], ["Chitra Parent", "Agreed to an earlier version"], ["Dev Parent", "Not yet"]]) {
      expect(screen.getByText(name!)).toBeTruthy();
      expect(screen.getByText(state!)).toBeTruthy();
    }
    expect(screen.queryByRole("button", { name: /withdraw|agree/i })).toBeNull(); // read only
    expect(consentOverview).toHaveBeenCalledTimes(1);
    const found = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
    expect(found.violations.map((v) => v.id)).toEqual([]);
  });

  it("no parent accounts yet says so", async () => {
    renderApp(<WebAdminApp />, { api: fakeApi({ meGet: vi.fn(async () => sysadmin()), consentOverview: vi.fn(async () => ({ noticeVersion: 1, counts: { parents: 0, current: 0, withdrawn: 0, oldVersion: 0, none: 0 }, items: [] })) }), port: fakePort(IN()).port });
    fireEvent.click(await screen.findByRole("button", { name: "Parent consent" }));
    expect(await screen.findByText("There are no parent accounts yet.")).toBeTruthy();
  });
});
