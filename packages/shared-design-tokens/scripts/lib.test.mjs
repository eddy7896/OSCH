import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { collect, resolveColors, toDart, toThemeCss, toTokensCss, toTokensJs } from "./lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const real = JSON.parse(readFileSync(resolve(here, "../../../documentation/design-system/tokens.json"), "utf8"));
const built = collect(real);

const mini = (colors) => ({
  color: { tokens: colors },
  spacing: { tokens: [{ name: "space-1", value: "4px" }] },
  radius: { tokens: [{ name: "radius-sm", value: "8px" }] },
  size: { tokens: [{ name: "control-touch", value: "48px" }] },
  shadow: { tokens: [{ name: "shadow-card", value: { light: "0 1px 2px rgba(21, 24, 56, 0.06)", dark: "0 1px 2px rgba(0, 0, 0, 0.4)" } }] },
  type: { families: { sans: '"Noto Sans", sans-serif' }, groups: [{ styles: [{ name: "body", fontSize: "14px", lineHeight: "22px", fontWeight: 400 }] }] },
});

describe("resolveColors", () => {
  it("resolves {alias} references through the light theme", () => {
    const { all } = resolveColors(mini([
      { name: "indigo-600", value: "#4F46E5" },
      { name: "primary", value: { light: "{indigo-600}", dark: "{indigo-600}" } },
    ]));
    expect(all.primary).toBe("#4f46e5");
  });

  it("uses the LIGHT value, never the dark one (DS-1)", () => {
    const { all } = resolveColors(mini([{ name: "bg", value: { light: "#f5f6fa", dark: "#0f1122" } }]));
    expect(all.bg).toBe("#f5f6fa");
  });

  it("throws on an unknown reference", () => {
    expect(() => resolveColors(mini([{ name: "a", value: "{missing}" }]))).toThrow(/unknown token reference/);
  });

  it("throws on an alias cycle instead of looping forever", () => {
    expect(() => resolveColors(mini([{ name: "a", value: "{b}" }, { name: "b", value: "{a}" }]))).toThrow(/cycle/);
  });

  it("throws if a token does not resolve to a hex colour", () => {
    expect(() => resolveColors(mini([{ name: "a", value: "red" }]))).toThrow(/non-hex/);
  });
});

describe("real design tokens", () => {
  it("primary is Oru Indigo 600 and on-primary is white", () => {
    expect(built.color.primary).toBe("#4f46e5");
    expect(built.color["on-primary"]).toBe("#ffffff");
  });

  it("raw indigo steps and app-icon colours are NOT exposed to product code", () => {
    expect(Object.keys(built.color).filter((n) => /^indigo-\d+$|^app-/.test(n))).toEqual([]);
    expect(Object.keys(built.colorAll)).toEqual(expect.arrayContaining(["indigo-500", "app-parent"]));
  });

  it("every exposed colour is a 6-digit hex", () => {
    for (const [n, v] of Object.entries(built.color)) expect(v, n).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("has all 11 text styles and none under 13px", () => {
    expect(built.styles).toHaveLength(11);
    for (const s of built.styles) expect(s.fontSize, s.name).toBeGreaterThanOrEqual(13);
  });
});

describe("outputs", () => {
  const css = toTokensCss(built), theme = toThemeCss(built), dart = toDart(built), js = toTokensJs(built);

  it("is deterministic (same input, byte-identical output)", () => {
    expect(toTokensCss(collect(real))).toBe(css);
    expect(toDart(collect(real))).toBe(dart);
  });

  it("emits light only: no dark values anywhere, color-scheme light", () => {
    for (const out of [css, theme, dart, js]) {
      expect(out).not.toMatch(/prefers-color-scheme|data-theme|dark/i);
    }
    expect(css).toContain("color-scheme: light;");
    expect(css).toContain("--bg: #f5f6fa;");
    expect(css).not.toContain("#0f1122");
  });

  it("tailwind theme is `inline` (avoids --radius-sm/--shadow-card self-reference) and resets defaults", () => {
    expect(theme).toContain("@theme inline {");
    for (const reset of ["--color-*: initial;", "--radius-*: initial;", "--shadow-*: initial;", "--text-*: initial;"]) expect(theme).toContain(reset);
    expect(theme).toContain("--color-primary: var(--primary);");
    expect(theme).toContain("--text-title--line-height: 30px;");
    expect(theme).not.toMatch(/--color-indigo|--color-app-/);
    // The self-referencing text (--radius-sm: var(--radius-sm)) is only safe BECAUSE of `inline`: Tailwind substitutes
    // the value into utilities and emits no theme variable. The compiled-CSS check lives in the app build (see README).
    expect(theme.indexOf("@theme inline {")).toBeLessThan(theme.indexOf("--radius-sm: var(--radius-sm)"));
  });

  it("font stack lists every script variable passed in, then the design-system literal stack", () => {
    const stack = toThemeCss(built, ["--font-a", "--font-b"]).match(/--font-sans: ([^;]+);/)[1];
    expect(stack.startsWith("var(--font-a), var(--font-b), ")).toBe(true);
    expect(stack).toContain('"Noto Sans"');
  });

  it("web stat styles carry tabular figures (stat, stat-sm only)", () => {
    expect(theme).toMatch(/\.text-stat,\n\.text-stat-sm \{\n  font-variant-numeric: tabular-nums;/);
    expect(theme).not.toMatch(/\.text-body[^\n]*\{\n  font-variant-numeric/);
  });

  it("dart constants match the design values", () => {
    expect(dart).toContain("static const Color primary = Color(0xFF4F46E5);");
    expect(dart).toMatch(/static const double controlTouch = 48(\.0)?;/);
    expect(dart).toMatch(/static const double controlDriver = 64(\.0)?;/);
    expect(dart).toContain("fontSize: 28, height: 1.2857, fontWeight: FontWeight.w700, letterSpacing: -0.28");
    expect(dart).toContain("blurRadius: 2");
    expect(dart).toContain("0x0F151838"); // rgba(21,24,56,0.06): alpha 0.06*255 = 15 = 0x0F
    expect(dart).not.toMatch(/indigo|appParent|appDriver/i);
  });

  it("stat styles get tabular figures in Dart", () => {
    expect(dart).toMatch(/static const TextStyle stat = .*FontFeature\.tabularFigures\(\)/);
    expect(dart).not.toMatch(/static const TextStyle body = .*tabularFigures/);
  });

  it("generated header warns not to edit by hand", () => {
    for (const out of [css, theme, dart]) expect(out).toMatch(/GENERATED/);
  });
});
