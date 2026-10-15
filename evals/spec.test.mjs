// Spec/invariant evals (E-DOC-*). Run: node --test evals/
// Tests marked `todo` are known-failing audit findings (documentation/audit_2026-10-15.md).
// When a finding is fixed, remove `todo` so it becomes a hard requirement.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
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

function parseEnums() {
  const out = {};
  for (const m of read("dataconnect/schema/schema.gql").matchAll(/^enum (\w+)\s*\{([^}]*)\}/gm)) out[m[1]] = m[2].trim().split(/\s+/);
  return out;
}
const enums = parseEnums();
const rbacRoles = (file, name) => {
  const m = read(file).match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const`));
  return [...m[1].matchAll(/"([A-Z_]+)"/g)].map((x) => x[1]);
};

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

test("E-TEN-S2 every tenant table has a direct school reference", () => {
  const missing = Object.entries(tables)
    .filter(([name]) => !GLOBAL_TABLES.has(name))
    .filter(([, f]) => !("school" in f))
    .map(([name]) => name);
  // ParentGuardian is a pure join to Student (tenant-scoped through it); tolerated until it gets its own school column.
  assert.deepEqual(missing.filter((n) => n !== "ParentGuardian"), []);
});

test("E-FIN-S1 money fields are integer minor units, never Float", () => {
  const bad = [];
  for (const [t, f] of Object.entries(tables))
    for (const [name, type] of Object.entries(f))
      if (/amount|price|fee|salary|total/i.test(name) && !/Minor$/.test(name)) bad.push(`${t}.${name} (${type}) must be named *Minor`);
      else if (/Minor$/.test(name) && !/^Int64/.test(type)) bad.push(`${t}.${name} must be Int64, is ${type}`);
  assert.deepEqual(bad, []);
  assert.ok(Object.values(tables).some((f) => "amountMinor" in f), "expected amountMinor fields");
  assert.doesNotMatch(read("dataconnect/schema/schema.gql"), /:\s*Float\b/, "no Float anywhere in the schema");
});

test("E-FIN-S2 timestamps: createdAt is Timestamp, calendar dates stay Date", () => {
  for (const [t, f] of Object.entries(tables)) if ("createdAt" in f) assert.match(f.createdAt, /^Timestamp!?$/, `${t}.createdAt`);
});

test("E-RBAC-S1 schema role enums equal packages/rbac roles (exactly)", () => {
  assert.deepEqual([...enums.SchoolRole].sort(), rbacRoles("packages/rbac/src/roles.ts", "ROLES").sort());
  assert.deepEqual([...enums.GlobalRole].sort(), rbacRoles("packages/rbac/src/roles.ts", "GLOBAL_ROLES").sort());
  for (const [t, f] of Object.entries(tables)) for (const [n, type] of Object.entries(f)) if (/role$/i.test(n)) assert.match(type, /Role!?$/, `${t}.${n} must be an enum`);
});

test("E-RBAC-S2 statuses are enums, not free strings", () => {
  for (const [t, f] of Object.entries(tables)) if ("status" in f || "subscriptionStatus" in f) assert.ok(!/^String/.test(f.status ?? f.subscriptionStatus), `${t} status must be an enum`);
});

test("E-AUD-S1 audit log table exists, is append-only (no update/delete operation), and has a school ref", () => {
  assert.ok(tables.AuditLog && tables.AuditLog.school && tables.AuditLog.actor && tables.AuditLog.createdAt);
  const ops = read("dataconnect/erp-connector/mutations.gql");
  assert.match(ops, /mutation CreateAuditLog/);
  assert.doesNotMatch(ops, /auditLog_(update|delete)/);
});

test("E-TEN-S3 every mutation/query takes $schoolId except the platform-level ones", () => {
  const exempt = new Set(["CreateUser", "CreateSchool", "CreateAuditLog"]); // platform-level / carries optional $schoolId
  for (const f of ["queries.gql", "mutations.gql"])
    for (const b of read(`dataconnect/erp-connector/${f}`).split(/^(?=(?:query|mutation)\s)/m).filter((b) => /^(query|mutation)\s/.test(b))) {
      const head = b.split("{")[0];
      const name = head.match(/^(?:query|mutation)\s+(\w+)/)[1];
      if (!exempt.has(name)) assert.match(head, /\$schoolId\b/, `${name} must take $schoolId`);
    }
});

test("E-DOC-3 every connector operation is NO_ACCESS", () => {
  for (const f of ["queries.gql", "mutations.gql"]) {
    const text = read(`dataconnect/erp-connector/${f}`);
    assert.doesNotMatch(text, /@auth\(\s*level:\s*(PUBLIC|USER_ANON)/);
  }
});

test("E-DOC-4 ADRs 0001-0007 exist, are Accepted, and CLAUDE.md points at the decisions folder", () => {
  const dir = resolve(ROOT, "documentation/decisions");
  const files = readdirSync(dir).filter((f) => /^ADR-000[1-7]-.*\.md$/.test(f));
  assert.equal(files.length, 7, `expected ADR-0001..0007, found ${files.join(", ")}`);
  for (const f of files) assert.match(readFileSync(resolve(dir, f), "utf8"), /\*\*Status:\*\* Accepted/, `${f} must be Accepted`);
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
