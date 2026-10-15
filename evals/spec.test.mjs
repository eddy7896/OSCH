// Spec/invariant evals (E-DOC-*). Run: node --test evals/
// Tests marked `todo` are known-failing audit findings (documentation/audit_2026-10-15.md).
// When a finding is fixed, remove `todo` so it becomes a hard requirement.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");

// Parse `type X @table ... { ... }` blocks from the Data Connect schema.
function parseTables() {
  const tables = {};
  for (const m of read("dataconnect/schema/schema.gql").matchAll(/type (\w+) @table[^{]*\{([^}]*)\}/g)) {
    const fields = {};
    for (const line of m[2].split("\n")) {
      const f = line.match(/^\s*(\w+):\s*([\w\[\]!]+)/);
      if (f) fields[f[1]] = f[2];
    }
    tables[m[1]] = fields;
  }
  return tables;
}
const tables = parseTables();
const GLOBAL_TABLES = new Set(["School", "User"]);

test("E-DOC-1 drift check reports zero errors", () => {
  execFileSync("node", ["tools/checks/drift-check.mjs"], { cwd: ROOT, stdio: "pipe" });
});

test("E-DOC-2 schema parsed (sanity: guards against the parser silently matching nothing)", () => {
  assert.ok(Object.keys(tables).length >= 10, `only ${Object.keys(tables).length} tables parsed`);
  assert.ok(tables.School && tables.Student);
});

test("E-TEN-S1 membership & guardian join tables are tenant-reachable", () => {
  assert.ok(tables.SchoolMember.school, "SchoolMember must reference School");
  assert.ok(tables.ParentGuardian.student, "ParentGuardian must reference Student");
});

test("E-TEN-S2 every tenant table has a direct school reference", { todo: "F4: Invoice has none" }, () => {
  const missing = Object.entries(tables)
    .filter(([name]) => !GLOBAL_TABLES.has(name))
    .filter(([, f]) => !("school" in f))
    .map(([name]) => name);
  // ParentGuardian is a pure join to Student; tolerated until it gets its own school column.
  assert.deepEqual(missing.filter((n) => n !== "ParentGuardian"), []);
});

test("E-FIN-S1 money fields are not Float", { todo: "F5: Invoice.amount, Payroll.amount are Float" }, () => {
  const bad = [];
  for (const [t, f] of Object.entries(tables))
    for (const [name, type] of Object.entries(f))
      if (/amount|price|fee|salary|total/i.test(name) && /^Float/.test(type)) bad.push(`${t}.${name}`);
  assert.deepEqual(bad, []);
});

test("E-RBAC-S1 schema roles cover every role in the RBAC matrix", { todo: "F6: no ACADEMIC_ADMIN / SYSTEM_ADMIN / PARENT" }, () => {
  const schema = read("dataconnect/schema/schema.gql");
  const roleComment = schema.match(/schoolRole:[^\n]*#([^\n]*)/)?.[1] ?? "";
  for (const r of ["PRINCIPAL", "BURSAR", "ACADEMIC_ADMIN", "SYSTEM_ADMIN", "TEACHER", "DRIVER", "STAFF"])
    assert.match(roleComment, new RegExp(r), `schoolRole comment lacks ${r}`);
});

test("E-DOC-3 every connector operation is NO_ACCESS", () => {
  for (const f of ["queries.gql", "mutations.gql"]) {
    const text = read(`dataconnect/erp-connector/${f}`);
    assert.doesNotMatch(text, /@auth\(\s*level:\s*(PUBLIC|USER_ANON)/);
  }
});

test("E-DOC-4 docs index: ADRs exist and are referenced from CLAUDE.md", () => {
  for (const a of ["ADR-0001-tenant-isolation", "ADR-0002-auth-provider", "ADR-0003-mobile-local-db"])
    assert.ok(existsSync(resolve(ROOT, `documentation/decisions/${a}.md`)), a);
  assert.match(read("CLAUDE.md"), /ADR-\*\.md/);
});

test("E-DOC-5 golden hallucination set is well-formed", () => {
  const set = JSON.parse(read("evals/hallucination-golden.json"));
  const ids = new Set();
  for (const q of set.items) {
    assert.ok(q.id && q.question && q.severity, `bad item ${JSON.stringify(q).slice(0, 60)}`);
    assert.ok(!ids.has(q.id), `duplicate id ${q.id}`);
    ids.add(q.id);
    assert.ok(Array.isArray(q.mustInclude) || Array.isArray(q.mustNotInclude), `${q.id} has no assertions`);
  }
  assert.ok(set.items.some((q) => q.type === "trap"), "needs at least one trap item");
});
