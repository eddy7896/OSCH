#!/usr/bin/env node
// Splits the gateway integration test files across parallel CI jobs and PROVES that no file was dropped.
//   node tools/tests/gateway-shards.mjs files <shard> <total>        the files shard <shard> of <total> must run (one per line)
//   node tools/tests/gateway-shards.mjs verify <reports-dir> <total>  checks the JSON reports of all shards against the plan
// The plan is computed from the files on disk, by the same function for the runner and the verifier, so they cannot disagree.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const GATEWAY = resolve(here, "../../apps/api-gateway");

/** Every integration test file the gateway suite includes (the vitest config's `test/**\/*.integration.ts`), relative to apps/api-gateway, sorted. */
export function allIntegrationFiles(root = GATEWAY) {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".integration.ts")) out.push(relative(root, full).split("\\").join("/"));
    }
  };
  walk(join(root, "test"));
  return out.sort();
}

/**
 * Longest-first assignment: the biggest files (a rough stand-in for the slowest) are placed one by one on the shard that currently has the
 * least work. Deterministic: same files and sizes, same plan. Returns `total` arrays; every file appears in exactly one of them.
 */
export function assign(files, total, sizeOf = () => 1) {
  if (!Number.isInteger(total) || total < 1) throw new Error("the number of shards must be a whole number of at least 1");
  const shards = Array.from({ length: total }, () => ({ load: 0, files: [] }));
  const order = [...files].sort((a, b) => sizeOf(b) - sizeOf(a) || (a < b ? -1 : 1));
  for (const f of order) {
    const target = shards.reduce((best, s) => (s.load < best.load ? s : best));
    target.files.push(f);
    target.load += Math.max(1, sizeOf(f));
  }
  return shards.map((s) => s.files.sort());
}

/** Measured seconds per file (tools/tests/gateway-shard-weights.json); a file with no entry gets the median, so a new file is placed sensibly. */
export function weights(file = join(here, "gateway-shard-weights.json")) {
  const raw = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  const known = Object.fromEntries(Object.entries(raw).filter(([k, v]) => !k.startsWith("_") && Number.isFinite(v)));
  const sorted = Object.values(known).sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 1;
  return { known, median };
}
export function plan(total, root = GATEWAY, weightFile) {
  const { known, median } = weights(weightFile);
  return assign(allIntegrationFiles(root), total, (f) => known[f] ?? median);
}

/** @returns {string[]} problems; empty means every file ran exactly once, on its planned shard, with no failure and nothing skipped */
export function verify(reportsDir, total, root = GATEWAY) {
  const problems = [];
  const expected = plan(total, root);
  const all = allIntegrationFiles(root);
  if (all.length === 0) problems.push("no integration test files were found on disk");
  const seen = new Map();
  const rows = [];
  for (let i = 1; i <= total; i++) {
    const file = join(reportsDir, `gateway-shard-${i}-of-${total}.json`);
    if (!existsSync(file)) {
      problems.push(`shard ${i} of ${total}: no report (the job did not finish, or it ran with a different number of shards)`);
      continue;
    }
    let report;
    try {
      report = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      problems.push(`shard ${i}: the report is not valid JSON`);
      continue;
    }
    const ran = (report.testResults ?? []).map((r) => relative(root, r.name).split("\\").join("/")).sort();
    const want = expected[i - 1];
    for (const f of want) if (!ran.includes(f)) problems.push(`shard ${i}: planned file did not run: ${f}`);
    for (const f of ran) if (!want.includes(f)) problems.push(`shard ${i}: ran a file that belongs to another shard: ${f}`);
    for (const f of ran) seen.set(f, (seen.get(f) ?? 0) + 1);
    for (const r of report.testResults ?? []) {
      const name = relative(root, r.name).split("\\").join("/");
      const results = r.assertionResults ?? [];
      if (results.length === 0) problems.push(`shard ${i}: ${name} ran no tests`);
      for (const a of results) {
        if (a.status === "failed") problems.push(`shard ${i}: FAILED ${name} > ${a.fullName ?? a.title}`);
        else if (a.status !== "passed") problems.push(`shard ${i}: ${a.status.toUpperCase()} (not run) ${name} > ${a.fullName ?? a.title}`);
      }
    }
    if (report.success !== true) problems.push(`shard ${i}: the run did not succeed`);
    rows.push({ shard: i, files: ran.length, tests: report.numTotalTests ?? 0, passed: report.numPassedTests ?? 0 });
  }
  for (const f of all) {
    const n = seen.get(f) ?? 0;
    if (n === 0) problems.push(`MISSING: ${f} was not run by any shard`);
    if (n > 1) problems.push(`DUPLICATE: ${f} was run by ${n} shards`);
  }
  verify.rows = rows;
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, a, b] = process.argv.slice(2);
  if (cmd === "files") {
    const shard = Number(a), total = Number(b);
    if (!Number.isInteger(shard) || !Number.isInteger(total) || shard < 1 || shard > total) {
      console.error("usage: gateway-shards.mjs files <shard> <total>   (1 <= shard <= total)");
      process.exit(2);
    }
    const files = plan(total)[shard - 1];
    if (files.length === 0) {
      console.error(`shard ${shard} of ${total} has no files: use fewer shards`);
      process.exit(2);
    }
    console.log(files.join("\n"));
  } else if (cmd === "verify") {
    const total = Number(b);
    const problems = verify(resolve(a), total);
    for (const r of verify.rows ?? []) console.log(`shard ${r.shard}/${total}: ${r.files} files, ${r.tests} tests, ${r.passed} passed`);
    const tests = (verify.rows ?? []).reduce((t, r) => t + r.tests, 0);
    if (problems.length) {
      console.error(`\nFAILED: ${problems.length} problem(s)\n${problems.map((p) => `  - ${p}`).join("\n")}`);
      process.exit(1);
    }
    console.log(`\nOK: ${allIntegrationFiles().length} files and ${tests} tests, each file run exactly once across ${total} shards, none failed, none skipped.`);
  } else {
    console.error("usage: gateway-shards.mjs files <shard> <total> | verify <reports-dir> <total>");
    process.exit(2);
  }
}
