// E-CI-SHARD: the gateway integration suite is split across parallel CI jobs; these tests prove the split cannot silently drop a file.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { allIntegrationFiles, assign, plan, verify } from "../tools/tests/gateway-shards.mjs";

test("E-CI-SHARD-1 assign: every file lands in exactly one shard, for any number of shards, and the plan is repeatable", () => {
  const files = Array.from({ length: 23 }, (_, i) => `test/f${String(i).padStart(2, "0")}.integration.ts`);
  const size = (f) => (Number(f.slice(6, 8)) * 37) % 11 + 1;
  for (let n = 1; n <= 9; n++) {
    const shards = assign(files, n, size);
    assert.equal(shards.length, n);
    assert.deepEqual(shards.flat().sort(), [...files].sort(), `n=${n}`);
    assert.deepEqual(assign([...files].reverse(), n, size), shards, "same files in another order give the same plan");
  }
});

test("E-CI-SHARD-2 assign: the work is spread, not piled on one shard", () => {
  const files = Array.from({ length: 20 }, (_, i) => `f${i}`);
  const size = (f) => (f === "f0" ? 50 : 10);
  const loads = assign(files, 3, size).map((s) => s.reduce((t, f) => t + size(f), 0));
  assert.ok(Math.max(...loads) - Math.min(...loads) <= 50, `loads ${loads}`);
});

test("E-CI-SHARD-3 the real repository: the plan covers every integration file once and no shard is empty", () => {
  const all = allIntegrationFiles();
  assert.ok(all.length >= 10, "expected the gateway integration test files");
  for (const n of [1, 2, 3, 4]) {
    const shards = plan(n);
    assert.deepEqual(shards.flat().sort(), all);
    for (const s of shards) assert.ok(s.length > 0, `n=${n} has an empty shard`);
  }
  assert.match(readFileSync("apps/api-gateway/vitest.config.integration.ts", "utf8"), /test\/\*\*\/\*\.integration\.ts/, "the shard planner and the vitest include must name the same files");
});

// A throw-away repository layout with fake reports, to prove the checker catches every way a test can go missing.
function fixture(mutate = () => {}) {
  const root = mkdtempSync(join(tmpdir(), "shards-"));
  mkdirSync(join(root, "test", "harness"), { recursive: true });
  const names = ["test/a.integration.ts", "test/harness/b.integration.ts", "test/harness/c.integration.ts", "test/harness/d.integration.ts", "test/e.integration.ts"];
  for (const [i, n] of names.entries()) writeFileSync(join(root, n), "x".repeat((i + 1) * 100));
  const reports = mkdtempSync(join(tmpdir(), "reports-"));
  const total = 2;
  const planned = plan(total, root);
  const state = { reports: planned.map((files, i) => ({ shard: i + 1, success: true, numTotalTests: files.length * 2, numPassedTests: files.length * 2, testResults: files.map((f) => ({ name: join(root, f), assertionResults: [{ status: "passed", title: "t1" }, { status: "passed", title: "t2" }] })) })) };
  mutate(state, root);
  for (const r of state.reports) if (r) writeFileSync(join(reports, `gateway-shard-${r.shard}-of-${total}.json`), JSON.stringify(r));
  return { root, reports, total };
}
const run = (mutate) => { const f = fixture(mutate); return verify(f.reports, f.total, f.root); };

test("E-CI-SHARD-4 verify: all shards reported, every file once, nothing failed or skipped -> no problems", () => assert.deepEqual(run(), []));

test("E-CI-SHARD-5 verify: a file nobody ran is reported as MISSING", () => {
  const p = run((s) => s.reports[0].testResults.pop());
  assert.ok(p.some((x) => /MISSING/.test(x)), p.join("\n"));
  assert.ok(p.some((x) => /planned file did not run/.test(x)));
});

test("E-CI-SHARD-6 verify: a shard whose job never reported is a problem, not a pass", () => {
  const p = run((s) => (s.reports[1] = null));
  assert.ok(p.some((x) => /shard 2 of 2: no report/.test(x)), p.join("\n"));
  assert.ok(p.some((x) => /MISSING/.test(x)));
});

test("E-CI-SHARD-7 verify: a file run by two shards, or by the wrong shard, is a problem", () => {
  const p = run((s) => s.reports[0].testResults.push(s.reports[1].testResults[0]));
  assert.ok(p.some((x) => /DUPLICATE/.test(x)), p.join("\n"));
  assert.ok(p.some((x) => /belongs to another shard/.test(x)));
});

test("E-CI-SHARD-8 verify: a failed test, a skipped test, an empty file and an unsuccessful run are each caught", () => {
  assert.ok(run((s) => (s.reports[0].testResults[0].assertionResults[0].status = "failed")).some((x) => /FAILED/.test(x)));
  assert.ok(run((s) => (s.reports[0].testResults[0].assertionResults[1].status = "pending")).some((x) => /PENDING \(not run\)/.test(x)));
  assert.ok(run((s) => (s.reports[1].testResults[0].assertionResults = [])).some((x) => /ran no tests/.test(x)));
  assert.ok(run((s) => (s.reports[0].success = false)).some((x) => /did not succeed/.test(x)));
});

test("E-CI-SHARD-9 verify: a new test file that no plan knew about is caught (it must appear in a report)", () => {
  const f = fixture();
  writeFileSync(join(f.root, "test", "harness", "new.integration.ts"), "x");
  const p = verify(f.reports, f.total, f.root);
  assert.ok(p.length > 0 && p.some((x) => /MISSING|did not run|another shard/.test(x)), p.join("\n"));
});

test("E-CI-SHARD-10 the workflow's shard list is exactly 1..GATEWAY_SHARDS, and the completeness job is wired to it", () => {
  const wf = readFileSync(".github/workflows/periodic-checks.yml", "utf8");
  const total = Number(wf.match(/GATEWAY_SHARDS:\s*(\d+)/)?.[1]);
  const list = (wf.match(/shard:\s*\[([^\]]*)\]/)?.[1] ?? "").split(",").map((x) => Number(x.trim()));
  assert.ok(total >= 1);
  assert.deepEqual(list, Array.from({ length: total }, (_, i) => i + 1), "the matrix must list every shard from 1 to GATEWAY_SHARDS");
  assert.match(wf, /needs:\s*gateway\b/);
  assert.match(wf, /if:\s*always\(\)/, "the completeness check must run even when a shard job failed");
  assert.match(wf, /gateway-shards\.mjs verify shard-reports \$\{\{ env\.GATEWAY_SHARDS \}\}/);
  assert.match(wf, /ORU_SHARD:\s*\$\{\{ matrix\.shard \}\}\/\$\{\{ env\.GATEWAY_SHARDS \}\}/);
});
