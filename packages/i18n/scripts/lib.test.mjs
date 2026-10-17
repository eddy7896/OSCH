import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { icuVars, usesPound, patchPubspec, toArb, toDartLocales, toFontsTs, toI18nCss, toPubspecFontsBlock, validate, WEB_FONT_DIR, WEIGHT_NAMES, webUnicodeRange } from "./lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const registry = JSON.parse(readFileSync(resolve(here, "../locales.json"), "utf8"));
const en = JSON.parse(readFileSync(resolve(here, "../messages/en.json"), "utf8"));
const descriptions = JSON.parse(readFileSync(resolve(here, "../messages/_descriptions.json"), "utf8"));
const tokens = JSON.parse(readFileSync(resolve(here, "../../../documentation/design-system/tokens.json"), "utf8"));
const styles = tokens.type.groups.flatMap((g) => g.styles).map((s) => ({ name: s.name, fontSize: parseFloat(s.fontSize), lineHeight: parseFloat(s.lineHeight), letterSpacingEm: s.letterSpacing ? parseFloat(s.letterSpacing) : 0 }));
const catalogs = { en, hi: JSON.parse(readFileSync(resolve(here, "../messages/hi.json"), "utf8")), ur: JSON.parse(readFileSync(resolve(here, "../messages/ur.json"), "utf8")) };
const clone = (o) => JSON.parse(JSON.stringify(o));

describe("icuVars", () => {
  it("finds plain and plural variables with the right ARB type", () => {
    expect([...icuVars("Good morning, {name}")]).toEqual([["name", "String"]]);
    expect([...icuVars("{count, plural, one{{count} change} other{{count} changes}}")]).toEqual([["count", "int"]]);
  });
  it("a bare {count} inside a plural branch never downgrades the int type", () => {
    expect(icuVars("{count, plural, one{{count} x} other{{count} y}}").get("count")).toBe("int");
  });
  it("branch keywords are not variables", () => {
    expect([...icuVars("{n, plural, one{a} other{b}}").keys()]).toEqual(["n"]);
    expect([...icuVars("{n, plural, =0{none} one{{n} item for {who}} other{{n} items}}").keys()].sort()).toEqual(["n", "who"]);
  });
});

describe("ICU parsing is real (not a brace counter)", () => {
  it("an apostrophe-quoted placeholder is LITERAL text, not a placeholder (ICU quoting)", () => {
    expect([...icuVars("Good morning '{name}'")]).toEqual([]);
    expect([...icuVars("Good morning {name}")]).toEqual([["name", "String"]]);
  });
  it("a plural without an `other` branch is invalid (it throws at render time in next-intl)", () => {
    expect(() => icuVars("{count, plural, one{{count} change}}")).toThrow(/MISSING_OTHER_CLAUSE/);
  });
  it("detects # inside plurals, which Flutter gen-l10n does not substitute", () => {
    expect(usesPound("{count, plural, one{# change} other{# changes}}")).toBe(true);
    expect(usesPound("{count, plural, one{{count} change} other{{count} changes}}")).toBe(false);
  });
  it("select branches and nested placeholders are found", () => {
    expect([...icuVars("{g, select, male{{name} he} other{{name} they}}")].sort()).toEqual([["g", "String"], ["name", "String"]]);
  });
});

describe("validate (the real sources are valid)", () => {
  it("accepts the shipped registry and catalogs", () => {
    expect(validate(registry, catalogs, descriptions)).toEqual([]);
  });

  it("rejects a translation key that English does not have", () => {
    const c = clone(catalogs); c.hi.bogus = "x";
    expect(validate(registry, c, descriptions).join()).toMatch(/hi: key "bogus" does not exist/);
  });
  it("rejects changed placeholders", () => {
    const c = clone(catalogs); c.hi.greetingMorning = "सुप्रभात";
    expect(validate(registry, c, descriptions).join()).toMatch(/hi\.greetingMorning: placeholders/);
  });
  it("rejects empty translations, HTML and syntactically invalid ICU (unbalanced braces)", () => {
    const c = clone(catalogs); c.ur.actionSave = "  "; c.hi.actionCancel = "<b>रद्द</b>"; c.hi.syncSyncing = "{x";
    const p = validate(registry, c, descriptions).join("\n");
    expect(p).toMatch(/ur\.actionSave: empty/);
    expect(p).toMatch(/hi\.actionCancel: HTML/);
    expect(p).toMatch(/hi\.syncSyncing: invalid ICU message/);
  });
  it("rejects a plural with no `other` branch, a # in a plural, and an apostrophe-quoted placeholder", () => {
    const c = clone(catalogs);
    c.hi.syncChangesPending = "{count, plural, one{{count} बदलाव}}";
    c.ur.actionSave = "محفوظ";
    c.ur.greetingMorning = "صبح بخیر '{name}'";
    const d = clone(catalogs); d.hi.syncChangesPending = "{count, plural, one{# बदलाव} other{# बदलाव}}";
    expect(validate(registry, c, descriptions).join("\n")).toMatch(/hi\.syncChangesPending: invalid ICU message \(MISSING_OTHER_CLAUSE/);
    expect(validate(registry, c, descriptions).join("\n")).toMatch(/ur\.greetingMorning: placeholders \{\} differ from English \{name\}/);
    expect(validate(registry, d, descriptions).join("\n")).toMatch(/hi\.syncChangesPending: do not use # in plurals/);
  });
  it("requires a translator description for every key", () => {
    const d = clone(descriptions); delete d.actionSave;
    expect(validate(registry, catalogs, d).join()).toMatch(/"actionSave" has no translator description/);
  });
  it("requires exactly one primary locale that is the default", () => {
    const r = clone(registry); r.locales[1].tier = "primary";
    expect(validate(r, catalogs, descriptions).join()).toMatch(/exactly one primary/);
  });
  it("rejects a locale whose font has no script entry, and a missing sample", () => {
    const r = clone(registry); r.locales[1].font = "Klingon"; r.locales[2].sample = "";
    const p = validate(r, catalogs, descriptions).join("\n");
    expect(p).toMatch(/font "Klingon" has no entry/);
    expect(p).toMatch(/missing sample text/);
  });
});

describe("outputs", () => {
  it("ARB: English carries descriptions and typed placeholders; other languages carry only translations", () => {
    const arb = JSON.parse(toArb("en", catalogs, descriptions, "en"));
    expect(arb["@@locale"]).toBe("en");
    expect(arb["@syncChangesPending"].placeholders.count.type).toBe("int");
    expect(arb["@greetingMorning"].placeholders.name.type).toBe("String");
    const hi = JSON.parse(toArb("hi", catalogs, descriptions, "en"));
    expect(Object.keys(hi).some((k) => k.startsWith("@") && k !== "@@locale")).toBe(false);
    expect(JSON.parse(toArb("ks", catalogs, descriptions, "en"))).toEqual({ "@@locale": "ks" }); // untranslated: all English fallback
  });

  it("ARB plural uses {count}, not '#' (Flutter gen-l10n does not substitute '#')", () => {
    for (const code of ["en", "hi", "ur"]) expect(catalogs[code].syncChangesPending, code).not.toContain("#");
  });

  it("Dart registry marks Kashmiri right-to-left (Flutter itself does not) and borrows Urdu strings", () => {
    const dart = toDartLocales(registry);
    expect(dart).toMatch(/code: 'ks'[^\n]*TextDirection\.rtl[^\n]*flutterFallback: 'ur'/);
    expect(dart).toMatch(/code: 'doi'[^\n]*TextDirection\.ltr[^\n]*flutterFallback: 'hi'/);
    expect(dart).toMatch(/code: 'ur'[^\n]*fontFamily: 'NotoNastaliqUrdu'[^\n]*minLineHeight: 2/);
  });

  it("web fonts: one local loader per script, committed WOFF2 paths, non-Latin lazy with their own unicode-range, never Google", () => {
    const ts = toFontsTs(registry);
    expect(ts).not.toMatch(/from\s*["']next\/font\/google["']/); // the header comment may mention it; an import may not
    expect(ts).toContain('import localFont from "next/font/local"');
    for (const s of Object.values(registry.scripts)) {
      expect(ts).toContain(`variable: "${s.webVar}"`);
      for (const w of s.weights) expect(ts).toContain(`${WEB_FONT_DIR}/${s.flutterFamily}-${WEIGHT_NAMES[w]}.woff2", weight: "${w}"`);
    }
    expect(ts.match(/preload: false/g)).toHaveLength(Object.keys(registry.scripts).length - 1);
    expect(ts.match(/prop: "unicode-range"/g)).toHaveLength(Object.keys(registry.scripts).length - 1); // Latin has none
  });

  it("web unicode-range keeps a script's own blocks and drops the shared ASCII / punctuation ranges", () => {
    const dev = webUnicodeRange(registry.scripts.Devanagari.ranges);
    expect(dev).toContain("U+0900-097F");
    expect(dev).toContain("U+20B9");
    expect(dev).not.toMatch(/U\+0020|U\+00A0|U\+2000/); // digits, space, nbsp, general punctuation come from Noto Sans
    expect(webUnicodeRange([[32, 64], 160, [8192, 8303], [2304, 2431]])).toBe("U+0900-097F");
  });

  it("CSS: RTL scripts get their primary font and generous line heights; Latin gets no override", () => {
    const css = toI18nCss(registry, styles);
    expect(css).toMatch(/html:lang\(ur\),\nhtml:lang\(ks\) \{\n  font-family: var\(--font-noto-nastaliq-urdu\)/);
    expect(css).toContain("html:lang(ur) .text-display,\nhtml:lang(ks) .text-display {\n  line-height: 56px;"); // ceil(2.0 * 28)
    expect(css).not.toMatch(/html:lang\(en\)/);
    expect(css).toContain("--font-script-stack:");
  });

  it("CSS removes Latin tracking for every non-Latin language (display has -0.01em in the design)", () => {
    const css = toI18nCss(registry, styles);
    expect(css).toContain("html:lang(ur) .text-display,\nhtml:lang(ks) .text-display {\n  letter-spacing: 0;");
    expect(css).toContain("html:lang(hi) .text-display,\nhtml:lang(mr) .text-display,\nhtml:lang(doi) .text-display {\n  letter-spacing: 0;");
    expect(css).not.toMatch(/html:lang\(en\)/);
  });

  it("CSS never lowers a design line height (only raises)", () => {
    const css = toI18nCss(registry, styles);
    for (const m of css.matchAll(/\.text-([\w-]+)[^{]*\{\n  line-height: (\d+)px;/g)) {
      const style = styles.find((s) => s.name === m[1]);
      expect(Number(m[2]), m[1]).toBeGreaterThan(style.lineHeight);
    }
  });

  it("pubspec fonts block lists every family and weight, and patching is idempotent and requires markers", () => {
    const block = toPubspecFontsBlock(registry);
    expect((block.match(/- family:/g) ?? []).length).toBe(Object.keys(registry.scripts).length);
    const spec = `flutter:\n  generate: true\n  # BEGIN GENERATED FONTS\n  # END GENERATED FONTS\n`;
    const once = patchPubspec(spec, block);
    expect(patchPubspec(once, block)).toBe(once);
    expect(() => patchPubspec("flutter:\n", block)).toThrow(/markers/);
  });
});
