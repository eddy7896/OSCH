// Pure logic of the translation review workflow (no files, no network), so the evals can test it.
import { icuVars, usesPound } from "../../packages/i18n/scripts/lib.mjs";

/** What is wrong with a translation of an English message. Empty list = fine. Same rules as the i18n build. */
export function problemsFor(enText, text) {
  if (typeof text !== "string" || text.trim() === "") return ["empty"];
  const problems = [];
  if (/[<>]/.test(text)) problems.push("HTML is not allowed");
  let vars;
  try {
    vars = icuVars(text);
    if (usesPound(text)) problems.push("do not use # in plurals; write the count placeholder");
  } catch (e) {
    return [...problems, `not a valid message (${String(e.message ?? e).split("\n")[0]})`];
  }
  let enVars;
  try { enVars = icuVars(enText); } catch { enVars = new Map(); }
  const want = [...enVars.keys()].sort().join(","), got = [...vars.keys()].sort().join(",");
  if (want !== got) problems.push(`placeholders {${got}} differ from English {${want}}`);
  return problems;
}

/** Everything a reviewer needs for one language: each English message, its context, the current draft. */
export function bundleFor({ lang, en, descriptions, catalog, glossary = [] }) {
  return {
    lang,
    glossary: glossary.map((e) => ({ term: e.term, category: e.category, definition: e.definition, note: e.note ?? "", use: accepted(e, lang) })),
    items: Object.keys(en).map((key) => {
      let vars = [];
      try { vars = [...icuVars(en[key]).keys()].sort(); } catch { /* English is validated by the build */ }
      return { key, en: en[key], description: descriptions[key] ?? "", draft: catalog[key] ?? null, vars, terms: glossaryHits(en[key], glossary).map((e) => ({ term: e.term, use: accepted(e, lang) })) };
    }),
  };
}

/** Review documents (as the review page writes them, or as an export wraps them) -> one decision per key. */
export function readReviews(docs, lang) {
  const decisions = new Map();
  for (const raw of docs) {
    const d = raw && typeof raw === "object" && raw.data && typeof raw.data === "object" ? raw.data : raw;
    if (!d || d.lang !== lang || typeof d.key !== "string" || !["approved", "flagged"].includes(d.status)) continue;
    const prior = decisions.get(d.key);
    if (!prior || String(d.at ?? "") >= String(prior.at ?? "")) decisions.set(d.key, { key: d.key, status: d.status, text: typeof d.text === "string" ? d.text : "", comment: typeof d.comment === "string" ? d.comment : "", by: typeof d.by === "string" ? d.by : "", at: d.at ?? "" });
  }
  return decisions;
}

/** What importing would do. Nothing is changed here. */
export function planImport({ en, catalog, decisions }) {
  const plan = { updates: [], approvedUnchanged: [], flagged: [], rejected: [], unknown: [], notReviewed: [] };
  for (const key of Object.keys(en)) {
    const d = decisions.get(key);
    if (!d) { plan.notReviewed.push(key); continue; }
    if (d.status === "flagged") { plan.flagged.push({ key, comment: d.comment }); continue; }
    const text = d.text.trim();
    const problems = problemsFor(en[key], text);
    if (problems.length > 0) { plan.rejected.push({ key, problems }); continue; }
    if (text === catalog[key]) plan.approvedUnchanged.push(key);
    else plan.updates.push({ key, from: catalog[key] ?? null, to: text });
  }
  for (const key of decisions.keys()) if (!(key in en)) plan.unknown.push(key);
  return plan;
}

/** A language may be marked reviewed only when every message was approved by a person, with nothing flagged, rejected or unknown. */
export function canMarkReviewed(plan) {
  const reasons = [];
  if (plan.notReviewed.length) reasons.push(`${plan.notReviewed.length} messages have no decision yet`);
  if (plan.flagged.length) reasons.push(`${plan.flagged.length} messages are flagged`);
  if (plan.rejected.length) reasons.push(`${plan.rejected.length} approved texts break the rules (placeholders or format)`);
  if (plan.unknown.length) reasons.push(`${plan.unknown.length} decisions name messages that no longer exist`);
  return { ok: reasons.length === 0, reasons };
}

/** The catalog after applying the updates, in English's key order. */
export function applyUpdates(en, catalog, updates) {
  const next = { ...catalog };
  for (const u of updates) next[u.key] = u.to;
  return Object.fromEntries(Object.keys(en).filter((k) => k in next).map((k) => [k, next[k]]));
}

// ---------------------------------------------------------------------------------------------------------------------
// Glossary (packages/i18n/glossary.json): the fixed vocabulary reviewers and the tools check translations against.

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const termForms = (entry) => (entry.match && entry.match.length ? entry.match : [entry.term.toLowerCase()]);

/** English text with ICU syntax removed, so `{email}` and `plural, one{` are not mistaken for words. */
export function plainEnglish(message) {
  return message
    .replace(/\{\s*[A-Za-z_]\w*\s*,\s*(?:plural|select)\s*,/g, " ")
    .replace(/\b(?:zero|one|two|few|many|other)\{/g, " ")
    .replace(/\{\s*[A-Za-z_]\w*\s*\}/g, " ")
    .replace(/[{}]/g, " ");
}

/** The glossary terms an English message contains (whole words, longest first, a shorter term inside a longer match is skipped). */
export function glossaryHits(message, glossary) {
  const text = plainEnglish(message);
  const bare = text.trim().replace(/[.…!?:]+$/u, "").trim().toLowerCase();
  const found = [];
  for (const entry of glossary) {
    for (const form of termForms(entry)) {
      if (entry.exactOnly && bare !== form) continue; // a menu title: only counts when it is the whole message
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(form)}(?![\\p{L}\\p{N}])`, "giu");
      for (const m of text.matchAll(re)) found.push({ entry, start: m.index, end: m.index + m[0].length, len: form.length });
    }
  }
  found.sort((a, b) => b.len - a.len || a.start - b.start);
  const taken = [];
  const hits = new Map();
  for (const f of found) {
    if (taken.some((t) => f.start < t.end && f.end > t.start)) continue;
    taken.push(f);
    hits.set(f.entry.term, f.entry);
  }
  return [...hits.values()];
}

/** The renderings a translation may use for a term in a language, or null when the term is kept in English / has none. */
export function accepted(entry, lang) {
  if (entry.keep) return [entry.term];
  const t = entry[lang];
  return t ? [t.preferred, ...(t.alternatives ?? [])] : null;
}

/** Messages that contain a term but whose translation uses none of its accepted renderings. A prompt for a reviewer, not a verdict. */
export function glossaryWarnings({ en, texts, glossary, lang }) {
  const out = [];
  for (const key of Object.keys(en)) {
    const text = texts[key];
    if (typeof text !== "string") continue;
    for (const entry of glossaryHits(en[key], glossary)) {
      const ok = accepted(entry, lang);
      if (ok && !ok.some((r) => text.toLowerCase().includes(r.toLowerCase()))) out.push({ key, term: entry.term, expected: ok });
    }
  }
  return out;
}

/** True when the whole English message is just one glossary term (plus punctuation): the translation must use its rendering. */
export function isExactTerm(message, glossary) {
  const bare = plainEnglish(message).trim().replace(/[.…!?:]+$/u, "").trim().toLowerCase();
  return glossary.find((e) => termForms(e).includes(bare));
}

/** Checks the glossary file itself. */
export function glossaryProblems(glossary) {
  const problems = [];
  const seen = new Set();
  for (const e of glossary) {
    if (!e.term || typeof e.term !== "string") { problems.push("an entry has no term"); continue; }
    if (seen.has(e.term.toLowerCase())) problems.push(`duplicate term: ${e.term}`);
    seen.add(e.term.toLowerCase());
    if (!e.category) problems.push(`${e.term}: no category`);
    if (!e.definition || e.definition.length < 8) problems.push(`${e.term}: needs a plain definition`);
    for (const lang of ["hi", "ur"]) {
      if (e.keep) { if (e[lang]) problems.push(`${e.term}: kept terms have no ${lang} entry`); continue; }
      if (!e[lang]?.preferred) problems.push(`${e.term}: no preferred ${lang} rendering`);
      if (e[lang] && !Array.isArray(e[lang].alternatives)) problems.push(`${e.term}: ${lang}.alternatives must be a list`);
    }
  }
  return problems;
}

/** The glossary as a readable document (documentation/glossary.md is generated from it). */
export function glossaryMarkdown(glossary) {
  const cats = [...new Set(glossary.map((e) => e.category))];
  const cell = (s) => String(s ?? "").replace(/\|/g, "\\|");
  const render = (t, keep) => (keep ? "keep in English" : [t.preferred, ...(t.alternatives.length ? [`(also: ${t.alternatives.join(", ")})`] : [])].join(" "));
  const lines = [
    "# Glossary for translators",
    "",
    "> Generated from `packages/i18n/glossary.json` by `node tools/translations.mjs glossary-md`. Do not edit this file; edit the JSON.",
    "",
    "The fixed vocabulary of OruSchools in English, Hindi and Urdu. Use the same word for the same thing everywhere, so that a parent, a teacher and a bursar always see the same term.",
    "",
    "**The Hindi and Urdu words are drafts by the assistant. A native speaker confirms or replaces them during review; where the reviewer chooses differently, the JSON is updated and every message is checked against it.**",
    "",
    "Rules that apply to every term:",
    "- Keep `{words in braces}` exactly as written; the app fills them in.",
    "- Do not translate OruSchools, the brand tagline, or example addresses and numbers.",
    "- Plurals and grammar may change the ending of a word; the root should stay the same.",
    "- If a term has two Urdu or Hindi words in the table, use the first one unless the grammar needs the other.",
    "",
  ];
  for (const cat of cats) {
    lines.push(`## ${cat}`, "", "| English | Meaning | हिन्दी | اردو | Note |", "|---|---|---|---|---|");
    for (const e of glossary.filter((x) => x.category === cat)) lines.push(`| ${cell(e.term)} | ${cell(e.definition)} | ${cell(render(e.hi, e.keep))} | ${cell(render(e.ur, e.keep))} | ${cell(e.note)} |`);
    lines.push("");
  }
  return lines.join("\n");
}
