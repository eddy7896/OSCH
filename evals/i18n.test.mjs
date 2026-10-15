// E-I18N-*: languages, right-to-left, fonts and translation honesty (ADR-0006). Run: node --test evals/
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "../packages/i18n/scripts/lib.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const json = (p) => JSON.parse(read(p));

const registry = json("packages/i18n/locales.json");
const descriptions = json("packages/i18n/messages/_descriptions.json");
const status = json("packages/i18n/messages/status.json");
const catalogs = {};
for (const f of readdirSync(resolve(ROOT, "packages/i18n/messages"))) if (/^[a-z]{2,3}\.json$/.test(f)) catalogs[f.slice(0, -5)] = json(`packages/i18n/messages/${f}`);
const provenance = json("packages/flutter-core/assets/fonts/provenance.json");
const codes = registry.locales.map((l) => l.code);

test("E-I18N-1 language sources are valid (registry, catalogs, placeholders, descriptions)", () => {
  assert.deepEqual(validate(registry, catalogs, descriptions), []);
});

test("E-I18N-2 English is primary; the right-to-left set is exactly ur, ks, sd, ps, fa, ar; the major regional languages are present", () => {
  assert.equal(registry.default, "en");
  assert.equal(registry.locales[0].code, "en");
  assert.deepEqual(registry.locales.filter((l) => l.dir === "rtl").map((l) => l.code).sort(), ["ar", "fa", "ks", "ps", "sd", "ur"]);
  for (const c of ["hi", "bn", "mr", "gu", "pa", "ta", "te", "kn", "ml", "or", "as", "ur", "ks", "doi"]) assert.ok(codes.includes(c), c);
});

test("E-I18N-3 translation honesty: only Hindi and Urdu are 'ready' (complete drafts) and NO language is marked reviewed yet", () => {
  assert.deepEqual(registry.locales.filter((l) => l.tier === "ready").map((l) => l.code).sort(), ["hi", "ur"]);
  const enKeys = Object.keys(catalogs.en);
  for (const c of ["hi", "ur"]) assert.deepEqual(Object.keys(catalogs[c]).sort(), [...enKeys].sort(), `${c} must be complete`);
  for (const c of Object.keys(catalogs).filter((c) => c !== "en")) {
    assert.ok(status[c], `${c} has translations but no entry in messages/status.json`);
    assert.equal(status[c].reviewed, false, `${c} is marked reviewed: a native-speaker review is a release gate (P6-5); do not set this without one`);
  }
});

test("E-I18N-4 brand tagline is never translated (brand guidelines)", () => {
  for (const c of Object.keys(catalogs)) assert.equal(catalogs[c].appWebsite, catalogs.en.appWebsite, c);
  assert.match(catalogs.en.appWebsite, /Schools\. People\. Progress\./);
});

test("E-I18N-5 every language's sample text is covered by the SHIPPED fonts (provenance.json), no missing glyphs", () => {
  assert.deepEqual(Object.keys(provenance.coverage).sort(), [...codes].sort());
  for (const [c, r] of Object.entries(provenance.coverage)) assert.deepEqual(r.missing, [], `${c} is missing glyphs`);
  assert.match(provenance.upstreamCommit, /^[0-9a-f]{40}$/, "fonts must come from a pinned upstream commit");
});

test("E-I18N-6 font bundle: every family/weight file exists with its licence, and the size budget (5 MB per app) holds", () => {
  const scriptFamilies = Object.values(registry.scripts).map((s) => s.flutterFamily).sort();
  assert.deepEqual(Object.keys(provenance.families).sort(), scriptFamilies);
  for (const [family, entry] of Object.entries(provenance.families)) {
    assert.ok(existsSync(resolve(ROOT, `packages/flutter-core/assets/fonts/OFL-${family}.txt`)), `licence for ${family}`);
    for (const file of Object.keys(entry.files)) assert.ok(existsSync(resolve(ROOT, `packages/flutter-core/assets/fonts/${file}`)), file);
  }
  assert.ok(provenance.totalBytes < 5 * 1024 * 1024, `fonts are ${(provenance.totalBytes / 1048576).toFixed(2)} MB`);
});

test("E-I18N-7 pubspec declares every font file the registry names", () => {
  const pubspec = read("packages/flutter-core/pubspec.yaml");
  for (const s of Object.values(registry.scripts)) {
    assert.match(pubspec, new RegExp(`family: ${s.flutterFamily}\\b`), s.flutterFamily);
    for (const w of s.weights) assert.match(pubspec, new RegExp(`assets/fonts/${s.flutterFamily}-(Regular|SemiBold|Bold)\\.ttf\\n\\s+weight: ${w}\\b`), `${s.flutterFamily} ${w}`);
  }
});

test("E-I18N-8 an ARB file exists per language; Hindi/Urdu ARBs are complete, others contain no half-translations", () => {
  for (const c of codes) {
    const arb = json(`packages/flutter-core/lib/l10n/app_${c}.arb`);
    assert.equal(arb["@@locale"], c);
    const keys = Object.keys(arb).filter((k) => !k.startsWith("@"));
    assert.equal(keys.length, Object.keys(catalogs[c] ?? {}).length, c);
  }
});

test("E-I18N-9 web apps: a [locale] root layout sets lang AND dir, prerenders every language, and never ignores the language choice", () => {
  for (const app of ["web-admin", "saas-admin", "landing-page"]) {
    const layout = read(`apps/${app}/src/app/[locale]/layout.tsx`);
    assert.match(layout, /<html lang=\{locale\} dir=\{directionOf\(locale\)\}/, `${app}: lang and dir`);
    assert.match(layout, /generateStaticParams/, app);
    assert.ok(!existsSync(resolve(ROOT, `apps/${app}/src/app/layout.tsx`)), `${app}: a root layout outside [locale] would hard-code lang`);
    const routing = read(`apps/${app}/src/i18n/routing.ts`);
    assert.match(routing, /localeDetection: false/, `${app}: English is primary; Accept-Language must not switch language`);
    assert.match(routing, /defaultLocale: DEFAULT_LOCALE/, app);
    assert.match(read(`apps/${app}/src/proxy.ts`), /createMiddleware\(routing\)/, app);
    assert.match(read(`apps/${app}/next.config.ts`), /withNextIntl\(nextConfig\)/, app);
    assert.match(read(`apps/${app}/src/app/globals.css`), /@oruschools\/i18n\/i18n\.css/, app);
  }
});

test("E-I18N-10 the generated web font loaders are identical across the three apps and cover every script", () => {
  const a = read("apps/web-admin/src/app/fonts.ts");
  assert.equal(read("apps/saas-admin/src/app/fonts.ts"), a);
  assert.equal(read("apps/landing-page/src/app/fonts.ts"), a);
  for (const s of Object.values(registry.scripts)) assert.ok(a.includes(`variable: "${s.webVar}"`), s.webVar);
});

test("E-I18N-11 Flutter shells use the localization stack (delegates, builder) and the Driver app keeps its 64px density", () => {
  for (const role of ["teacher", "staff", "parent", "driver"]) {
    const main = read(`apps/mobile-${role}/lib/main.dart`);
    assert.match(main, /oruLocalizationsDelegates/, role);
    assert.match(main, /oruAppBuilder\(/, role);
    assert.match(main, /localeResolutionCallback: oruLocaleResolution/, role);
    assert.match(main, /const Locale\(OruLocales\.defaultCode\)/, `${role}: English default`);
  }
  const driver = read("apps/mobile-driver/lib/main.dart");
  assert.match(driver, /OruTheme\.light\(density: OruDensity\.driver\)/, "driver theme must use the 64px density");
  assert.match(driver, /oruAppBuilder\(density: OruDensity\.driver\)/, "the locale-aware rebuild must keep the 64px density, or Urdu/Hindi would silently shrink the controls");
  for (const role of ["teacher", "staff", "parent"]) assert.doesNotMatch(read(`apps/mobile-${role}/lib/main.dart`), /OruDensity\.driver/, `${role} must not use driver density`);
});

test("E-I18N-12 Kashmiri, Dogri and Sindhi (no Flutter localizations) are routed to fallbacks, and direction is authoritative", () => {
  const byCode = Object.fromEntries(registry.locales.map((l) => [l.code, l]));
  assert.equal(byCode.ks.flutterFallback, "ur");
  assert.equal(byCode.sd.flutterFallback, "ur");
  assert.equal(byCode.doi.flutterFallback, "hi");
  assert.equal(byCode.ks.dir, "rtl");
});

test("E-I18N-13 tall scripts get minimum line heights that only ever RAISE the design value", () => {
  const styles = json("documentation/design-system/tokens.json").type.groups.flatMap((g) => g.styles);
  const css = read("packages/i18n/generated/i18n.css");
  for (const s of styles) {
    const m = css.match(new RegExp(`html:lang\\(ur\\) \\.text-${s.name}[^{]*\\{\\n  line-height: (\\d+)px;`));
    if (m) assert.ok(Number(m[1]) > parseFloat(s.lineHeight), `${s.name} must be raised, not lowered`);
  }
  assert.equal(registry.scripts.Nastaliq.minLineHeight, 2.0);
});
