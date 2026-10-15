// E-CI-*: the workflow validator catches what GitHub would reject, and the real workflows are valid.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { checkWorkflow } from "../tools/checks/workflow-check.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ctx = {
  rootScripts: JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).scripts,
  turboTasks: Object.keys(JSON.parse(readFileSync(resolve(ROOT, "turbo.json"), "utf8")).tasks),
  exists: (p) => existsSync(resolve(ROOT, p)),
  isDir: (p) => existsSync(resolve(ROOT, p)) && statSync(resolve(ROOT, p)).isDirectory(),
};
const wf = (steps) => `name: t\non: push\njobs:\n  a:\n    runs-on: ubuntu-latest\n    steps:\n${steps}\n`;

test("E-CI-1 every real workflow in .github/workflows is valid (parses, scripts/tasks/paths exist)", () => {
  const dir = resolve(ROOT, ".github/workflows");
  const files = readdirSync(dir).filter((f) => /\.ya?ml$/.test(f));
  assert.ok(files.length > 0);
  for (const f of files) assert.deepEqual(checkWorkflow(readFileSync(resolve(dir, f), "utf8"), ctx), [], f);
});

test("E-CI-2 the exact bug that broke the first two Phase 0 pushes is caught (unquoted colon in a step name)", () => {
  const bad = wf("      - name: Languages: sources valid\n        run: npm run i18n:check");
  assert.match(checkWorkflow(bad, ctx).join("\n"), /YAML does not parse/);
  assert.deepEqual(checkWorkflow(wf('      - name: "Languages: sources valid"\n        run: npm run i18n:check'), ctx), []);
});

test("E-CI-3 unknown npm scripts, turbo tasks and missing files are caught", () => {
  const p = checkWorkflow(wf("      - run: npm run does-not-exist\n      - run: npx turbo run build nonsense\n      - run: node tools/nope.mjs\n      - run: bash tools/tests/missing.sh"), ctx).join("\n");
  assert.match(p, /npm run does-not-exist/);
  assert.match(p, /turbo task "nonsense"/);
  assert.match(p, /tools\/nope\.mjs/);
  assert.match(p, /missing\.sh/);
});

test("E-CI-4 structural mistakes are caught: no jobs, no runs-on, no steps, step with neither uses nor run, unpinned action", () => {
  assert.match(checkWorkflow("name: t\non: push\n", ctx).join(), /no jobs/);
  assert.match(checkWorkflow("on: push\njobs:\n  a:\n    steps:\n      - run: echo hi\n", ctx).join(), /missing runs-on/);
  assert.match(checkWorkflow("on: push\njobs:\n  a:\n    runs-on: x\n", ctx).join(), /no steps/);
  assert.match(checkWorkflow(wf("      - name: nothing"), ctx).join(), /needs `uses` or `run`/);
  assert.match(checkWorkflow(wf("      - uses: actions/checkout@main"), ctx).join(), /not pinned/);
  assert.match(checkWorkflow(wf("      - uses: checkout"), ctx).join(), /must be owner\/repo@version/);
});

test("E-CI-5 valid steps pass: pinned actions, root scripts, workspace scripts, known turbo tasks", () => {
  const ok = wf("      - uses: actions/checkout@v4\n      - run: npm ci\n      - run: npm run tokens:check\n      - run: npm run start:dev -w api-gateway\n      - run: npx turbo run build lint typecheck test\n      - run: node --test evals/*.test.mjs\n      - run: bash tools/tests/dataconnect-tenancy.sh");
  assert.deepEqual(checkWorkflow(ok, ctx), []);
});

test("E-CI-6 `node --test <directory>` is caught (works on Node 20, breaks on Node 22: the first real CI failure)", () => {
  assert.match(checkWorkflow(wf("      - run: node --test evals/"), ctx).join(), /passes a directory/);
  assert.deepEqual(checkWorkflow(wf("      - run: node --test evals/*.test.mjs"), ctx), []);
});
