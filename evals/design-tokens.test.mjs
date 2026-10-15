// E-DS-*: design tokens are internally consistent and meet the accessibility claims the design system makes.
// Run: node --test evals/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tokens = JSON.parse(readFileSync(resolve(ROOT, "documentation/design-system/tokens.json"), "utf8"));
const raw = Object.fromEntries(tokens.color.tokens.map((t) => [t.name, t.value]));

function colour(name, theme) {
  let v = raw[name];
  assert.ok(v !== undefined, `unknown token ${name}`);
  if (typeof v === "object") v = v[theme];
  const ref = v.match(/^\{(.+)\}$/);
  return ref ? colour(ref[1], theme) : v;
}
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const THEMES = ["light", "dark"];
const check = (fg, bg, min, theme) => {
  const r = ratio(colour(fg, theme), colour(bg, theme));
  assert.ok(r >= min, `${theme}: ${fg} on ${bg} = ${r.toFixed(2)}:1, needs ${min}:1`);
};

test("E-DS-1 every token reference resolves in both themes", () => {
  for (const t of tokens.color.tokens) for (const th of THEMES) assert.match(colour(t.name, th), /^#[0-9a-f]{6}$/i, `${t.name} (${th})`);
});

test("E-DS-2 body text pairs meet 4.5:1 in both themes", () => {
  for (const th of THEMES) {
    for (const fg of ["text", "text-muted"])
      for (const bg of ["bg", "surface", "surface-muted", "surface-brand", "primary-soft"]) check(fg, bg, 4.5, th);
    for (const bg of ["surface", "bg", "primary-soft", "surface-muted"]) check("primary-text", bg, 4.5, th);
    for (const bg of ["primary", "primary-hover", "success-solid", "danger-solid"]) check("on-primary", bg, 4.5, th);
  }
});

test("E-DS-3 every status tone fg/bg pair meets 4.5:1 (also on surface)", () => {
  for (const th of THEMES)
    for (const tone of ["success", "warning", "danger", "info", "purple", "teal"]) {
      check(`${tone}-fg`, `${tone}-bg`, 4.5, th);
      check(`${tone}-fg`, "surface", 4.5, th);
    }
});

test("E-DS-4 controls, focus ring and main chart series meet 3:1", () => {
  for (const th of THEMES) {
    for (const bg of ["surface", "surface-muted", "bg"]) check("border-strong", bg, 3, th);
    for (const bg of ["surface", "bg", "surface-muted", "surface-brand", "primary-soft"]) check("focus", bg, 3, th);
    check("chart-1", "surface", 3, th);
  }
});

test("E-DS-5 app-icon colour claims: white mark ≥4.5 except Driver (Ink mark), which fails with white", () => {
  for (const app of ["app-erp", "app-teacher", "app-staff", "app-parent"]) assert.ok(ratio(colour(app, "light"), "#ffffff") >= 4.5, app);
  assert.ok(ratio(colour("app-driver", "light"), "#151838") >= 7, "driver Ink mark");
  assert.ok(ratio(colour("app-driver", "light"), "#ffffff") < 3, "driver must NOT use a white mark");
});

test("E-DS-6 indigo-500 must not be used for text on white (documented as failing 4.5:1)", () => {
  assert.ok(ratio(colour("indigo-500", "light"), "#ffffff") < 4.5);
  assert.notEqual(colour("primary", "light"), colour("indigo-500", "light"), "primary must be indigo-600, not 500");
  assert.equal(colour("primary", "light").toLowerCase(), "#4f46e5");
});

test("E-DS-7 minimum sizes: caption ≥13px, touch ≥48px, driver ≥56px", () => {
  const px = (s) => parseInt(s, 10);
  const styles = tokens.type.groups.flatMap((g) => g.styles);
  for (const s of styles) assert.ok(px(s.fontSize) >= 13, `${s.name} is ${s.fontSize}`);
  const size = Object.fromEntries(tokens.size.tokens.map((t) => [t.name, px(t.value)]));
  assert.ok(size["control-touch"] >= 48);
  assert.ok(size["control-driver"] >= 56 && size["control-driver"] <= 72);
});

test("E-DS-8 type uses exactly one product family (Noto Sans first)", () => {
  assert.deepEqual(Object.keys(tokens.type.families), ["sans"]);
  assert.match(tokens.type.families.sans, /^"Noto Sans"/);
});
