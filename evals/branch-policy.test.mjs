// E-BRANCH-*: the merge-flow rules of ADR-0010.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkBranchPolicy as c, ownerOf, APPS } from "../tools/checks/branch-policy.mjs";

test("E-BRANCH-1 production accepts only staging or hotfix/*", () => {
  assert.deepEqual(c({ head: "staging", base: "main" }), []);
  assert.deepEqual(c({ head: "hotfix/login-crash", base: "main" }), []);
  assert.match(c({ head: "app/web-admin", base: "main" }).join(), /only accepts merges from staging/);
  assert.match(c({ head: "feat/web-admin/x", base: "main" }).join(), /only accepts merges from staging/);
});

test("E-BRANCH-2 staging accepts app branches, hotfix and a back-merge of main, nothing else", () => {
  for (const head of ["app/api-gateway", "app/shared", "hotfix/x", "main"]) assert.deepEqual(c({ head, base: "staging" }), [], head);
  assert.match(c({ head: "feat/web-admin/x", base: "staging" }).join(), /only accepts app/);
  assert.match(c({ head: "app/not-an-app", base: "staging" }).join(), /not a known app branch/);
});

test("E-BRANCH-3 an app branch may only change its own app (lockfiles excepted)", () => {
  assert.deepEqual(c({ head: "app/web-admin", base: "staging", changedFiles: ["apps/web-admin/src/a.ts", "package-lock.json"] }), []);
  assert.match(c({ head: "app/web-admin", base: "staging", changedFiles: ["apps/saas-admin/x.ts"] }).join(), /belongs to "saas-admin"/);
  assert.match(c({ head: "app/web-admin", base: "staging", changedFiles: ["packages/rbac/src/index.ts"] }).join(), /belongs to "shared"/);
  assert.deepEqual(c({ head: "app/shared", base: "staging", changedFiles: ["packages/rbac/src/index.ts", "dataconnect/schema/a.gql", "documentation/x.md"] }), []);
  assert.match(c({ head: "app/shared", base: "staging", changedFiles: ["apps/web-admin/x.ts"] }).join(), /belongs to "web-admin"/);
});

test("E-BRANCH-4 an app branch accepts only its own feature branches", () => {
  assert.deepEqual(c({ head: "feat/web-admin/login", base: "app/web-admin" }), []);
  assert.deepEqual(c({ head: "fix/shared/schema", base: "app/shared" }), []);
  assert.match(c({ head: "feat/saas-admin/x", base: "app/web-admin" }).join(), /only accepts feat/);
  assert.match(c({ head: "random", base: "app/web-admin" }).join(), /only accepts feat/);
});

test("E-BRANCH-5 every app directory maps to a known app branch; unlisted bases are not policed", () => {
  for (const a of APPS.filter((x) => x !== "shared")) assert.equal(ownerOf(`apps/${a}/x`), a);
  assert.equal(ownerOf("packages/a"), "shared");
  assert.deepEqual(c({ head: "whatever", base: "feat/x" }), []);
});
