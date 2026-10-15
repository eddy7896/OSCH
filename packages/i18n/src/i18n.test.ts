import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  LOCALES,
  MESSAGES,
  directionOf,
  getMessages,
  isFullyTranslated,
  isLocale,
  isRtl,
  localeInfo,
  matchLanguageTag,
  negotiateLocale,
} from "./index.js";

describe("registry", () => {
  it("English is the default and the only primary language; 19 languages", () => {
    expect(DEFAULT_LOCALE).toBe("en");
    expect(LOCALES).toHaveLength(19);
    expect(LOCALES.filter((l) => l.tier === "primary").map((l) => l.code)).toEqual(["en"]);
    expect(LOCALES[0]?.code).toBe("en");
  });

  it("right-to-left languages are exactly Urdu, Kashmiri, Sindhi, Pashto, Persian and Arabic", () => {
    expect(LOCALES.filter((l) => l.dir === "rtl").map((l) => l.code).sort()).toEqual(["ar", "fa", "ks", "ps", "sd", "ur"]);
    for (const code of ["ur", "ks", "sd", "ps", "fa", "ar"]) expect(isRtl(code), code).toBe(true);
    for (const code of ["en", "hi", "bn", "ta", "te", "kn", "ml", "gu", "pa", "or", "as", "mr", "doi"]) expect(isRtl(code), code).toBe(false);
  });

  it("major Indian regional languages are present", () => {
    const codes = LOCALES.map((l) => l.code);
    for (const c of ["hi", "bn", "mr", "gu", "pa", "ta", "te", "kn", "ml", "or", "as", "ur", "ks", "doi"]) expect(codes, c).toContain(c);
  });

  it("direction of an unknown language is ltr, never an error", () => {
    expect(directionOf("xx")).toBe("ltr");
    expect(directionOf("")).toBe("ltr");
    expect(localeInfo("xx").code).toBe("en");
  });

  it("only Hindi and Urdu are 'ready'; everything else is 'supported' (fonts and direction, English UI fallback)", () => {
    expect(LOCALES.filter((l) => l.tier === "ready").map((l) => l.code).sort()).toEqual(["hi", "ur"]);
  });
});

describe("language tags", () => {
  it("normalises regional and script variants to supported codes", () => {
    expect(matchLanguageTag("ur-PK")).toBe("ur");
    expect(matchLanguageTag("HI_in")).toBe("hi");
    expect(matchLanguageTag("ks-Arab-IN")).toBe("ks");
    expect(matchLanguageTag("  en-GB ")).toBe("en");
  });
  it("rejects unsupported or junk input", () => {
    for (const bad of ["fr", "xx-YY", "", "   ", null, undefined, "__proto__", "constructor", "toString"]) expect(matchLanguageTag(bad as string), String(bad)).toBeUndefined();
    expect(isLocale("__proto__")).toBe(false);
    expect(isLocale("ur")).toBe(true);
  });
});

describe("negotiation: English is primary, language is an explicit choice (ADR-0006)", () => {
  it("defaults to English", () => {
    expect(negotiateLocale()).toBe("en");
    expect(negotiateLocale({})).toBe("en");
  });
  it("explicit user choice beats the school default; school default beats English", () => {
    expect(negotiateLocale({ cookie: "ur", schoolDefault: "hi" })).toBe("ur");
    expect(negotiateLocale({ schoolDefault: "hi" })).toBe("hi");
    expect(negotiateLocale({ cookie: "fr", schoolDefault: "hi" })).toBe("hi");
    expect(negotiateLocale({ cookie: "fr", schoolDefault: "de" })).toBe("en");
  });
  it("does not accept an Accept-Language style input (it is intentionally not part of the API)", () => {
    // @ts-expect-error acceptLanguage is not a supported input
    expect(negotiateLocale({ acceptLanguage: "ur,hi;q=0.9" })).toBe("en");
  });
});

describe("messages", () => {
  const en = MESSAGES.en;

  it("English is the complete source", () => {
    expect(Object.keys(en).length).toBeGreaterThanOrEqual(30);
    for (const [k, v] of Object.entries(en)) expect(v.trim(), k).not.toBe("");
  });

  it("every language falls back to English per key: getMessages never returns fewer keys than English", () => {
    for (const l of LOCALES) expect(Object.keys(getMessages(l.code)).sort(), l.code).toEqual(Object.keys(en).sort());
  });

  it("translated keys win; untranslated keys stay English", () => {
    expect(getMessages("hi").statusPresent).toBe("उपस्थित");
    expect(getMessages("ur").statusPresent).toBe("حاضر");
    expect(getMessages("ks").statusPresent).toBe(en.statusPresent);
    expect(getMessages("ta").appTeacher).toBe(en.appTeacher);
  });

  it("unknown language gets English", () => {
    expect(getMessages("xx")).toEqual(en);
  });

  it("Hindi and Urdu are complete (every English key translated); the rest are not claimed to be", () => {
    expect(isFullyTranslated("hi")).toBe(true);
    expect(isFullyTranslated("ur")).toBe(true);
    expect(isFullyTranslated("en")).toBe(true);
    expect(isFullyTranslated("ta")).toBe(false);
    expect(isFullyTranslated("xx")).toBe(false);
  });

  it("translations keep the same placeholders as English", () => {
    for (const code of ["hi", "ur"] as const)
      for (const [k, v] of Object.entries(MESSAGES[code])) {
        const names = (s: string) => [...s.matchAll(/\{\s*(\w+)/g)].map((m) => m[1]).filter((n) => !/^(one|other|few|many|two|zero)$/.test(n ?? "")).sort().join();
        expect(names(v), `${code}.${k}`).toBe(names(en[k] as string));
      }
  });

  it("the brand tagline is NOT translated (brand guidelines: do not rewrite it)", () => {
    for (const code of ["hi", "ur"] as const) expect(MESSAGES[code].appWebsite).toBe(en.appWebsite);
  });
});
