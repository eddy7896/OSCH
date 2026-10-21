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
export function bundleFor({ lang, en, descriptions, catalog }) {
  return {
    lang,
    items: Object.keys(en).map((key) => {
      let vars = [];
      try { vars = [...icuVars(en[key]).keys()].sort(); } catch { /* English is validated by the build */ }
      return { key, en: en[key], description: descriptions[key] ?? "", draft: catalog[key] ?? null, vars };
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
