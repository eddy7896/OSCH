import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MESSAGES } from "@oruschools/i18n";
import { NAV, ROLES } from "@oruschools/rbac";
import { isDashboard, ITEM, roleKey, SECTION_KEY } from "@/lib/nav";
import { subdomainFromHost } from "@/lib/school-address";

const EN = MESSAGES.en as Record<string, string>;
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sources(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

describe("subdomainFromHost", () => {
  it.each([
    ["greenfield.oruschools.com", "oruschools.com", "greenfield"],
    ["greenfield.oruschools.com:8443", "oruschools.com", "greenfield"],
    ["Greenfield.OruSchools.com", "oruschools.com", "greenfield"],
    ["greenfield.localhost:3002", "localhost", "greenfield"],
    ["green-field2.localhost", "localhost", "green-field2"],
  ])("%s under %s is the school %s", (host, base, expected) => expect(subdomainFromHost(host, base)).toBe(expected));

  it.each([
    ["oruschools.com", "oruschools.com"],
    ["localhost:3002", "localhost"],
    ["a.b.oruschools.com", "oruschools.com"],
    ["greenfield.evil.com", "oruschools.com"],
    ["greenfield.oruschools.com.evil.com", "oruschools.com"],
    ["evil-oruschools.com", "oruschools.com"],
    ["-bad.oruschools.com", "oruschools.com"],
    ["greenfield.oruschools.com", ""],
  ])("%s under %s is no school", (host, base) => expect(subdomainFromHost(host, base)).toBeNull());
});

describe("navigation words", () => {
  it("every section and item the gateway can send has a word and an icon, and every word exists", () => {
    for (const section of NAV) {
      expect(SECTION_KEY[section.title], section.title).toBeTruthy();
      expect(EN[SECTION_KEY[section.title]!], section.title).toBeTruthy();
      for (const item of section.items) {
        expect(ITEM[item.key], item.key).toBeTruthy();
        expect(EN[ITEM[item.key]!.label], item.key).toBeTruthy();
      }
    }
  });
  it("every role has a name", () => {
    for (const role of ROLES) expect(EN[roleKey(role)], role).toBeTruthy();
    expect(roleKey("SYSTEM_ADMIN")).toBe("roleSystemAdmin");
    expect(roleKey("HR_MANAGER")).toBe("roleHrManager");
  });
  it("the six dashboards are recognised", () => {
    for (const k of NAV[0]!.items.map((i) => i.key)) expect(isDashboard(k), k).toBe(true);
    expect(isDashboard("students")).toBe(false);
  });
});

describe("messages", () => {
  it("every message key the app refers to exists in the English catalogue", () => {
    const used = new Set<string>();
    for (const file of sources("src")) for (const m of readFileSync(file, "utf8").matchAll(/["']((?:web|nav|section|role|action|error|status|settings|app|greeting)[A-Z][A-Za-z]*)["']/g)) used.add(m[1]!);
    expect(used.size).toBeGreaterThan(20);
    expect([...used].filter((k) => !(k in EN))).toEqual([]);
  });
});
