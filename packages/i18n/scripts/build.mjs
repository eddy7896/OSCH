#!/usr/bin/env node
// Usage: node scripts/build.mjs [--check] [--quiet]
//   (default)  write generated files, then run `flutter gen-l10n` if Flutter is installed
//   --check    exit 1 if any generated file is missing or stale (does not run gen-l10n)
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { patchPubspec, toArb, toDartLocales, toFontsTs, toI18nCss, toLocalesTs, toMessagesTs, toPubspecFontsBlock, validate } from "./lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = resolve(here, "..");
const root = resolve(pkg, "../..");
const check = process.argv.includes("--check");
const quiet = process.argv.includes("--quiet");
const log = (m) => !quiet && console.log(m);
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

const registry = readJson(resolve(pkg, "locales.json"));
const descriptions = readJson(resolve(pkg, "messages/_descriptions.json"));
const catalogs = {};
for (const f of readdirSync(resolve(pkg, "messages")))
  if (/^[a-z]{2,3}\.json$/.test(f)) catalogs[f.replace(".json", "")] = readJson(resolve(pkg, "messages", f));

const problems = validate(registry, catalogs, descriptions);
if (problems.length) {
  console.error("i18n source is invalid:\n  - " + problems.join("\n  - "));
  process.exit(1);
}

const tokens = readJson(resolve(root, "documentation/design-system/tokens.json"));
const textStyles = tokens.type.groups.flatMap((g) => g.styles).map((s) => ({ name: s.name, fontSize: parseFloat(s.fontSize), lineHeight: parseFloat(s.lineHeight), letterSpacingEm: s.letterSpacing ? parseFloat(s.letterSpacing) : 0 }));
const flutter = resolve(root, "packages/flutter-core");

const outputs = {
  [resolve(pkg, "src/locales.generated.ts")]: toLocalesTs(registry),
  [resolve(pkg, "src/messages.generated.ts")]: toMessagesTs(registry, catalogs),
  [resolve(pkg, "generated/i18n.css")]: toI18nCss(registry, textStyles),
  [resolve(flutter, "lib/src/locales.g.dart")]: toDartLocales(registry),
};
for (const l of registry.locales) outputs[resolve(flutter, `lib/l10n/app_${l.code}.arb`)] = toArb(l.code, catalogs, descriptions, registry.default);
for (const app of ["web-admin", "saas-admin", "landing-page"]) outputs[resolve(root, `apps/${app}/src/app/fonts.ts`)] = toFontsTs(registry);
const pubspecPath = resolve(flutter, "pubspec.yaml");
outputs[pubspecPath] = patchPubspec(readFileSync(pubspecPath, "utf8"), toPubspecFontsBlock(registry));

let stale = 0;
for (const [file, content] of Object.entries(outputs)) {
  const rel = file.replace(root + "/", "");
  const current = existsSync(file) ? readFileSync(file, "utf8") : null;
  if (check) {
    if (current !== content) {
      console.error(`STALE  ${rel}`);
      stale++;
    }
  } else if (current !== content) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
    log(`wrote  ${rel}`);
  }
}

if (check) {
  if (stale) {
    console.error(`\n${stale} generated i18n file(s) out of date. Run: npm run i18n:build`);
    process.exit(1);
  }
  log("i18n: generated files are up to date");
} else {
  const r = spawnSync("flutter", ["gen-l10n"], { cwd: flutter, encoding: "utf8" });
  if (r.error) log("note: flutter not found; skipped `flutter gen-l10n` (run it before committing Flutter changes)");
  else if (r.status !== 0) {
    console.error(r.stdout + r.stderr);
    process.exit(r.status ?? 1);
  } else log("ran   flutter gen-l10n");
}
