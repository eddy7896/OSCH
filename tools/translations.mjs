#!/usr/bin/env node
// The translation review workflow (P1-15). Reviewers work on the review page; this tool moves their decisions into the repo.
//   node tools/translations.mjs status
//   node tools/translations.mjs glossary-check --lang ur                        messages whose words differ from the glossary
//   node tools/translations.mjs glossary-md                                      prints documentation/glossary.md
//   node tools/translations.mjs export --lang ur [--out bundle.json]         what the review page is filled from
//   node tools/translations.mjs import --lang ur --from <dir> [--apply]       approved edits into messages/ur.json (dry run unless --apply)
//   node tools/translations.mjs mark-reviewed --lang ur --reviewer "Name" --from <dir> --confirm-native-speaker [--apply]
// `--from` is a directory of the review documents (the review page's records exported as JSON files).
// Nothing here ever marks a language reviewed on its own: that needs every message approved, a named reviewer, and the explicit flag.
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applyUpdates, bundleFor, canMarkReviewed, glossaryMarkdown, glossaryProblems, glossaryWarnings, planImport, readReviews } from "./translations/lib.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MESSAGES = join(ROOT, "packages/i18n/messages");
const json = (p) => JSON.parse(readFileSync(p, "utf8"));
const args = process.argv.slice(2);
const command = args[0];
const flag = (name) => args.includes(`--${name}`);
const value = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const fail = (msg, code = 2) => { console.error(`error: ${msg}`); process.exit(code); };

const en = json(join(MESSAGES, "en.json"));
const descriptions = json(join(MESSAGES, "_descriptions.json"));
const status = json(join(MESSAGES, "status.json"));
const glossary = json(join(ROOT, "packages/i18n/glossary.json")).terms;
const languages = () => Object.keys(status).filter((k) => !k.startsWith("_"));
const catalogOf = (lang) => json(join(MESSAGES, `${lang}.json`));

function docsIn(dir) {
  const out = [];
  const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : p.endsWith(".json") && out.push(json(p)); } };
  walk(resolve(dir));
  return out;
}
function need(lang) {
  if (!lang || !languages().includes(lang)) fail(`--lang must be one of: ${languages().join(", ")}`);
  return lang;
}
function summarise(plan) {
  console.log(`  would change   ${plan.updates.length}`);
  console.log(`  approved as is ${plan.approvedUnchanged.length}`);
  console.log(`  flagged        ${plan.flagged.length}`);
  console.log(`  rejected       ${plan.rejected.length}`);
  console.log(`  no decision    ${plan.notReviewed.length}`);
  if (plan.unknown.length) console.log(`  unknown keys   ${plan.unknown.length}`);
  for (const r of plan.rejected) console.log(`    REJECTED ${r.key}: ${r.problems.join("; ")}`);
  for (const f of plan.flagged) console.log(`    FLAGGED  ${f.key}${f.comment ? `: ${f.comment}` : ""}`);
}

if (command === "status") {
  for (const lang of languages()) {
    const cat = catalogOf(lang);
    const missing = Object.keys(en).filter((k) => !(k in cat)).length;
    console.log(`${lang}  ${Object.keys(en).length - missing}/${Object.keys(en).length} translated   reviewed: ${status[lang].reviewed ? `yes (${status[lang].reviewer})` : "NO"}   ${status[lang].note ?? ""}`);
  }
} else if (command === "glossary-md") {
  const problems = glossaryProblems(glossary);
  if (problems.length) fail(`the glossary has problems:\n  ${problems.join("\n  ")}`, 1);
  process.stdout.write(glossaryMarkdown(glossary) + "\n");
} else if (command === "glossary-check") {
  const lang = need(value("lang"));
  const warnings = glossaryWarnings({ en, texts: catalogOf(lang), glossary, lang });
  for (const w of warnings) console.log(`${w.key}: "${w.term}" is usually ${w.expected.join(" / ")}`);
  console.log(`\n${lang}: ${warnings.length} message${warnings.length === 1 ? "" : "s"} to look at (a prompt for the reviewer, not an error)`);
} else if (command === "export") {
  const lang = need(value("lang"));
  const bundle = bundleFor({ lang, en, descriptions, catalog: catalogOf(lang), glossary });
  const out = value("out");
  if (out) { writeFileSync(out, JSON.stringify(bundle, null, 2)); console.log(`wrote ${bundle.items.length} messages to ${out}`); } else console.log(JSON.stringify(bundle, null, 2));
} else if (command === "import" || command === "mark-reviewed") {
  const lang = need(value("lang"));
  const from = value("from");
  if (!from) fail("--from <directory of review documents> is required");
  const plan = planImport({ en, catalog: catalogOf(lang), decisions: readReviews(docsIn(from), lang) });
  console.log(`${lang}: review ${command === "import" ? "import" : "check"}`);
  summarise(plan);
  if (command === "import") {
    if (!flag("apply")) { console.log("\ndry run: nothing written. Add --apply to write the approved edits into messages (then run npm run i18n:build)."); process.exit(0); }
    if (plan.updates.length === 0) { console.log("\nnothing to change."); process.exit(0); }
    writeFileSync(join(MESSAGES, `${lang}.json`), JSON.stringify(applyUpdates(en, catalogOf(lang), plan.updates), null, 2) + "\n");
    console.log(`\nwrote ${plan.updates.length} edits to messages/${lang}.json. Now run: npm run i18n:build`);
  } else {
    const reviewer = value("reviewer");
    const verdict = canMarkReviewed(plan);
    if (!verdict.ok) fail(`${lang} cannot be marked reviewed: ${verdict.reasons.join("; ")}`, 1);
    if (!reviewer || reviewer.trim().length < 3) fail("--reviewer \"Full name\" is required (the native speaker who reviewed it)");
    if (!flag("confirm-native-speaker")) fail("--confirm-native-speaker is required: say that the reviewer is a native speaker of this language");
    if (plan.updates.length > 0) fail(`apply the ${plan.updates.length} approved edits first (import --apply), then mark reviewed`);
    if (!flag("apply")) { console.log(`\ndry run: ${lang} qualifies. Add --apply to record "reviewed by ${reviewer}".`); process.exit(0); }
    status[lang] = { reviewed: true, reviewer: reviewer.trim(), note: `reviewed ${new Date().toISOString().slice(0, 10)}` };
    writeFileSync(join(MESSAGES, "status.json"), JSON.stringify(status, null, 2) + "\n");
    console.log(`\nrecorded: ${lang} reviewed by ${reviewer.trim()}.`);
  }
} else {
  console.log("usage: node tools/translations.mjs status | export --lang L [--out f] | import --lang L --from DIR [--apply] | mark-reviewed --lang L --reviewer NAME --from DIR --confirm-native-speaker [--apply]");
  process.exit(command ? 2 : 0);
}
