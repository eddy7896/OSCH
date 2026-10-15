#!/usr/bin/env node
// Grade an AI agent's answers against the golden hallucination set.
//   1. Start a fresh agent session with the repo (so CLAUDE.md loads) and ask each question in
//      evals/hallucination-golden.json. Save answers as: [{ "id": "G-01", "answer": "..." }, ...]
//   2. node evals/grade-answers.mjs answers.json [--json]
// Exit 1 if score < passThreshold or any `critical` item fails or any item is unanswered.
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [answersPath, flag] = process.argv.slice(2);
if (!answersPath) {
  console.error("usage: grade-answers.mjs answers.json [--json]");
  process.exit(2);
}
const golden = JSON.parse(readFileSync(resolve(ROOT, "evals/hallucination-golden.json"), "utf8"));
const answers = new Map(JSON.parse(readFileSync(answersPath, "utf8")).map((a) => [a.id, String(a.answer ?? "")]));

const results = golden.items.map((q) => {
  const raw = answers.get(q.id);
  if (raw === undefined || raw.trim() === "") return { ...q, pass: false, reason: "unanswered" };
  const text = raw.toLowerCase();
  for (const group of q.mustInclude ?? [])
    if (!group.some((w) => text.includes(w.toLowerCase())))
      return { ...q, pass: false, reason: `missing any of [${group.join(" | ")}]` };
  for (const bad of q.mustNotInclude ?? [])
    if (text.includes(bad.toLowerCase())) return { ...q, pass: false, reason: `contains forbidden "${bad}"` };
  return { ...q, pass: true };
});

const passed = results.filter((r) => r.pass).length;
const score = passed / results.length;
const criticalFails = results.filter((r) => !r.pass && r.severity === "critical");

if (flag === "--json") console.log(JSON.stringify({ score, passed, total: results.length, results }, null, 2));
else {
  for (const r of results.filter((r) => !r.pass)) console.log(`FAIL ${r.id} [${r.severity}${r.type === "trap" ? ", trap" : ""}] ${r.reason}\n     Q: ${r.question}`);
  console.log(`\nscore ${(score * 100).toFixed(1)}% (${passed}/${results.length}), critical failures: ${criticalFails.length}, threshold ${golden.passThreshold * 100}%`);
}
process.exit(score < golden.passThreshold || criticalFails.length ? 1 : 0);
