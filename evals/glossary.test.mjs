// The glossary (packages/i18n/glossary.json): its own consistency, that it covers the product's controlled vocabulary,
// that the shipped Hindi and Urdu drafts follow it, and that documentation/glossary.md is generated from it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { accepted, glossaryHits, glossaryMarkdown, glossaryProblems, glossaryWarnings, isExactTerm, plainEnglish } from "../tools/translations/lib.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const json = (p) => JSON.parse(readFileSync(resolve(ROOT, p), "utf8"));
const glossary = json("packages/i18n/glossary.json").terms;
const en = json("packages/i18n/messages/en.json");

test("E-GL-1 the glossary is well formed: unique terms, a category and a plain definition, and a rendering in every language unless the term is kept in English", () => {
  assert.deepEqual(glossaryProblems(glossary), []);
  assert.ok(glossary.length >= 100, `only ${glossary.length} terms`);
  for (const e of glossary.filter((x) => x.keep)) assert.ok(!e.hi && !e.ur, e.term);
});

test("E-GL-2 problems in a glossary are caught", () => {
  assert.match(glossaryProblems([{ term: "A", category: "x", definition: "a long enough definition", hi: { preferred: "x", alternatives: [] }, ur: { preferred: "y", alternatives: [] } }, { term: "a", category: "x", definition: "a long enough definition", hi: { preferred: "x", alternatives: [] }, ur: { preferred: "y", alternatives: [] } }]).join(), /duplicate term/);
  assert.match(glossaryProblems([{ term: "B", category: "x", definition: "short" }]).join(), /plain definition/);
  assert.match(glossaryProblems([{ term: "C", category: "x", definition: "a long enough definition", hi: { preferred: "", alternatives: [] }, ur: { preferred: "y", alternatives: [] } }]).join(), /no preferred hi/);
  assert.match(glossaryProblems([{ term: "D", category: "x", definition: "a long enough definition", keep: true, hi: { preferred: "x", alternatives: [] } }]).join(), /kept terms have no hi/);
});

test("E-GL-3 the product's controlled vocabulary is all in the glossary: every role, menu group, menu item and attendance status", () => {
  const controlled = Object.keys(en).filter((k) => /^(role|nav|section|status)[A-Z]/.test(k) && k !== "statusLoading");
  assert.ok(controlled.length >= 50);
  const missing = controlled.filter((k) => glossaryHits(en[k], glossary).length === 0);
  assert.deepEqual(missing, [], `no glossary term for: ${missing.map((k) => `${k}="${en[k]}"`).join(", ")}`);
});

test("E-GL-4 messages that are exactly one term use that term's rendering, in both languages", () => {
  for (const lang of ["hi", "ur"]) {
    const cat = json(`packages/i18n/messages/${lang}.json`);
    const wrong = [];
    for (const [key, text] of Object.entries(en)) {
      const entry = isExactTerm(text, glossary);
      if (!entry || entry.keep) continue;
      if (!accepted(entry, lang).some((r) => cat[key].toLowerCase().includes(r.toLowerCase()))) wrong.push(`${key}: "${text}" should use ${accepted(entry, lang).join(" / ")}, has "${cat[key]}"`);
    }
    assert.deepEqual(wrong, [], lang);
  }
});

test("E-GL-5 every shipped draft message follows the glossary wherever it contains a term", () => {
  for (const lang of ["hi", "ur"]) assert.deepEqual(glossaryWarnings({ en, texts: json(`packages/i18n/messages/${lang}.json`), glossary, lang }), [], lang);
});

test("E-GL-6 matching reads whole words, ignores ICU syntax, and prefers the longer term", () => {
  const names = (m) => glossaryHits(m, glossary).map((e) => e.term).sort();
  assert.deepEqual(names("Staff attendance"), ["Staff attendance"]);
  assert.deepEqual(names("Attendance"), ["Attendance"]);
  assert.deepEqual(names("Sent to {email}"), []);
  assert.deepEqual(names("{count, plural, one{{count} school} other{{count} schools}}"), ["School"]);
  assert.deepEqual(names("Classification of subjects"), ["Subject"]); // "Class" inside "Classification" is not a word
  assert.deepEqual(names("OruSchools. Schools. People. Progress."), ["OruSchools", "Schools. People. Progress."]); // the tagline wins over School and People inside it
  assert.equal(plainEnglish("{count, plural, one{{count} school} other{x}}").includes("plural"), false);
});

test("E-GL-7 documentation/glossary.md is exactly what the glossary generates", () => {
  assert.equal(readFileSync(resolve(ROOT, "documentation/glossary.md"), "utf8"), glossaryMarkdown(glossary) + "\n", "run: node tools/translations.mjs glossary-md > documentation/glossary.md");
});
