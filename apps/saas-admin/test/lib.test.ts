import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MESSAGES } from "@oruschools/i18n";

const EN = MESSAGES.en as Record<string, string>;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sources(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

describe("messages", () => {
  it("every message key the app refers to exists in the English catalogue", () => {
    const used = new Set<string>();
    for (const file of sources("src")) for (const m of readFileSync(file, "utf8").matchAll(/["']((?:saas|auth|action|error|status|settings|app)[A-Z][A-Za-z]*)["']/g)) used.add(m[1]!);
    expect(used.size).toBeGreaterThan(15);
    expect([...used].filter((k) => !(k in EN))).toEqual([]);
  });
});
