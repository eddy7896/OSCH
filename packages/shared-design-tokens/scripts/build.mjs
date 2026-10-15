#!/usr/bin/env node
// Usage: node scripts/build.mjs [--check]
//   (default)  write generated files
//   --check    exit 1 if any generated file is missing or differs from what the source would produce
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { collect, toDart, toThemeCss, toTokensCss, toTokensDts, toTokensJs } from "./lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const SOURCE = resolve(root, "documentation/design-system/tokens.json");
const tokens = collect(JSON.parse(readFileSync(SOURCE, "utf8")));
// Web font variables for every bundled script, in registry order (single source: packages/i18n/locales.json).
const registry = JSON.parse(readFileSync(resolve(root, "packages/i18n/locales.json"), "utf8"));
const webFontVars = Object.values(registry.scripts).map((s) => s.webVar);

const outputs = {
  [resolve(here, "../generated/tokens.css")]: toTokensCss(tokens),
  [resolve(here, "../generated/theme.css")]: toThemeCss(tokens, webFontVars),
  [resolve(here, "../generated/tokens.js")]: toTokensJs(tokens),
  [resolve(here, "../generated/tokens.d.ts")]: toTokensDts(),
  [resolve(root, "packages/flutter-core/lib/src/tokens.g.dart")]: toDart(tokens),
};

const check = process.argv.includes("--check");
let stale = 0;
for (const [file, content] of Object.entries(outputs)) {
  const rel = file.replace(root + "/", "");
  if (check) {
    if (!existsSync(file) || readFileSync(file, "utf8") !== content) {
      console.error(`STALE  ${rel}`);
      stale++;
    }
  } else {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
    console.log(`wrote  ${rel}`);
  }
}
if (check) {
  if (stale) {
    console.error(`\n${stale} generated file(s) out of date. Run: npm run tokens:build`);
    process.exit(1);
  }
  console.log("tokens: generated files are up to date");
}
