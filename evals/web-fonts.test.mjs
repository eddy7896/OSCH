// E-WEBFONT-*: web fonts are self-hosted, current with the Flutter TTFs, and every path the apps use exists.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { googleFontImportLines } from "../tools/checks/web-font-rule.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const p = (...a) => resolve(ROOT, ...a);
const sha = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
const json = (...a) => JSON.parse(readFileSync(p(...a), "utf8"));
const locales = json("packages/i18n/locales.json");
const NAMES = { 400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold" };
const isWoff2 = (file) => readFileSync(file).subarray(0, 4).toString("latin1") === "wOF2";

test("E-WEBFONT-1 the rule finds every way of importing next/font/google and ignores comments", () => {
  assert.deepEqual(googleFontImportLines('import { Poppins } from "next/font/google";'), [1]);
  assert.deepEqual(googleFontImportLines("import {A} from 'next/font/google'"), [1]);
  assert.deepEqual(googleFontImportLines('const m = await import("next/font/google");'), [1]);
  assert.deepEqual(googleFontImportLines('const m = require("next/font/google");'), [1]);
  assert.deepEqual(googleFontImportLines('// Never use next/font/google\nimport localFont from "next/font/local";'), []);
  assert.deepEqual(googleFontImportLines('x();\nimport a from "next/font/google";'), [2]);
});

test("E-WEBFONT-2 no app imports next/font/google (the build would need the network again)", () => {
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (["node_modules", ".next", "dist"].includes(e.name) ? [] : e.isDirectory() ? walk(resolve(dir, e.name)) : [resolve(dir, e.name)]));
  const offenders = walk(p("apps")).filter((f) => /\.(tsx?|jsx?|mjs)$/.test(f) && googleFontImportLines(readFileSync(f, "utf8")).length > 0);
  assert.deepEqual(offenders.map((f) => f.replace(ROOT + "/", "")), []);
});

test("E-WEBFONT-3 every family and weight in locales.json has a committed WOFF2 and licence, and nothing else is there", () => {
  const expected = new Set();
  for (const s of Object.values(locales.scripts)) {
    for (const w of s.weights) {
      const f = `${s.flutterFamily}-${NAMES[w]}.woff2`;
      expected.add(f);
      assert.ok(existsSync(p("packages/i18n/fonts", f)), `${f} missing; run tools/assets/make-web-fonts.py`);
      assert.ok(isWoff2(p("packages/i18n/fonts", f)), `${f} is not a WOFF2 file`);
    }
    assert.ok(existsSync(p("packages/i18n/fonts", `OFL-${s.flutterFamily}.txt`)), `licence for ${s.flutterFamily}`);
  }
  const present = readdirSync(p("packages/i18n/fonts")).filter((f) => f.endsWith(".woff2"));
  assert.deepEqual(present.filter((f) => !expected.has(f)), [], "stray font files");
});

test("E-WEBFONT-4 each WOFF2 is built from the CURRENT Flutter TTF, so web and mobile show the same glyphs", () => {
  const prov = json("packages/i18n/fonts/provenance.json");
  for (const [family, info] of Object.entries(prov.families)) {
    for (const [file, meta] of Object.entries(info.files)) {
      const woff = p("packages/i18n/fonts", file);
      const ttf = p("packages/flutter-core/assets/fonts", meta.sourceTtf);
      assert.equal(sha(ttf), meta.sourceTtfSha256, `${file}: the Flutter TTF changed, rerun tools/assets/make-web-fonts.py (${family})`);
      assert.equal(sha(woff), meta.sha256, `${file}: provenance does not match the file`);
      assert.equal(statSync(woff).size, meta.bytes);
      assert.ok(meta.bytes < statSync(ttf).size, `${file} should be smaller than its TTF`);
    }
  }
});

test("E-WEBFONT-5 Poppins (marketing headlines) is committed, Latin-only, with its licence", () => {
  const prov = json("packages/shared-design-tokens/fonts/provenance.json");
  assert.ok(existsSync(p("packages/shared-design-tokens/fonts/OFL-Poppins.txt")));
  assert.deepEqual(Object.keys(prov.families.Poppins.files).sort(), ["Poppins-Bold.woff2", "Poppins-Medium.woff2"]);
  for (const [file, meta] of Object.entries(prov.families.Poppins.files)) {
    const f = p("packages/shared-design-tokens/fonts", file);
    assert.ok(isWoff2(f));
    assert.equal(sha(f), meta.sha256);
    assert.ok(meta.bytes < 40_000, `${file} is ${meta.bytes} bytes: was it subset to Latin?`);
  }
});

test("E-WEBFONT-6 the whole web font payload stays small (budget phones, weak networks)", () => {
  const total = readdirSync(p("packages/i18n/fonts")).filter((f) => f.endsWith(".woff2")).reduce((n, f) => n + statSync(p("packages/i18n/fonts", f)).size, 0);
  assert.ok(total < 1.5 * 1024 * 1024, `${(total / 1024).toFixed(0)} KiB of Noto WOFF2`);
});

test("E-WEBFONT-7 every font path in an app resolves to a committed file", () => {
  const files = ["web-admin", "saas-admin", "landing-page"].map((a) => p("apps", a, "src/app/fonts.ts")).concat(p("apps/landing-page/src/app/[locale]/layout.tsx"));
  let checked = 0;
  for (const f of files) {
    for (const m of readFileSync(f, "utf8").matchAll(/path:\s*"([^"]+\.woff2)"/g)) {
      assert.ok(existsSync(resolve(dirname(f), m[1])), `${f.replace(ROOT + "/", "")}: ${m[1]} does not exist`);
      checked++;
    }
  }
  assert.ok(checked >= 3 * 26 + 2, `only ${checked} font paths found`);
});

test("E-WEBFONT-8 non-Latin faces are lazy: each has a unicode-range and no shared ASCII range", () => {
  for (const app of ["web-admin", "saas-admin", "landing-page"]) {
    const ts = readFileSync(p("apps", app, "src/app/fonts.ts"), "utf8");
    const lazy = ts.split("\n").filter((l) => l.includes("preload: false"));
    assert.equal(lazy.length, Object.keys(locales.scripts).length - 1);
    for (const l of lazy) {
      const range = /unicode-range", value: "([^"]+)"/.exec(l)?.[1];
      assert.ok(range, "a lazy face without unicode-range would be downloaded on every page");
      assert.doesNotMatch(range, /U\+0020|U\+00A0|U\+2000/);
    }
  }
});
