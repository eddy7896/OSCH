// E-DC-AUD-*: every state-changing mutation audits itself atomically, and exemptions are honest.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseOperations, auditProblems, exemptionProblems } from "../tools/checks/dc-rules.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(readFileSync(resolve(ROOT, "tools/checks/drift-config.json"), "utf8"));
const gql = (s) => parseOperations(s);

test("E-DC-AUD-1 a mutation without auditLog_insert is reported", () => {
  const ops = gql(`mutation Rename($schoolId: UUID!) @auth(level: NO_ACCESS) @transaction {\n  school_update(id: $schoolId, data: {name: "x"})\n}\n`);
  assert.match(auditProblems(ops, {}).join(), /Rename changes data but has no auditLog_insert/);
});

test("E-DC-AUD-2 an audit row outside a @transaction is reported (change and audit would not be atomic)", () => {
  const ops = gql(`mutation Rename($schoolId: UUID!) @auth(level: NO_ACCESS) {\n  school_update(id: $schoolId, data: {name: "x"})\n  auditLog_insert(data: {action: "a"})\n}\n`);
  assert.match(auditProblems(ops, {}).join(), /not @transaction/);
});

test("E-DC-AUD-3 an audited transactional mutation passes, queries are ignored", () => {
  const ops = gql(`query Get($schoolId: UUID!) @auth(level: NO_ACCESS) { schools { id } }\nmutation Rename($schoolId: UUID!) @auth(level: NO_ACCESS) @transaction {\n  school_update(id: $schoolId, data: {name: "x"})\n  auditLog_insert(data: {action: "a"})\n}\n`);
  assert.deepEqual(auditProblems(ops, {}), []);
});

test("E-DC-AUD-4 an exemption silences the rule, but a stale exemption (no such mutation) is reported", () => {
  const ops = gql(`mutation Seed($x: Int!) @auth(level: NO_ACCESS) { school_insert(data: {}) }\n`);
  assert.deepEqual(auditProblems(ops, { Seed: "seed operation, no actor exists yet" }), []);
  assert.match(auditProblems(ops, { Seed: "seed operation, no actor exists yet", Gone: "was removed last month" }).join(), /Gone, which is not a mutation/);
});

test("E-DC-AUD-5 an exemption needs a written reason", () => {
  assert.match(exemptionProblems("audit", { A: "" }).join(), /A needs a written reason/);
  assert.match(exemptionProblems("audit", { A: "tbd" }).join(), /A needs a written reason/);
  assert.deepEqual(exemptionProblems("audit", { A: "Phase 0 seed operation, audited later" }), []);
});

test("E-DC-AUD-6 the real connector passes, and every Phase 1 mutation is audited without an exemption", () => {
  const ops = ["mutations.gql", "queries.gql"].flatMap((f) => gql(readFileSync(resolve(ROOT, "dataconnect/erp-connector", f), "utf8")));
  assert.deepEqual(auditProblems(ops, config.auditExemptOperations), []);
  const phase1 = ["ProvisionSchool", "UpdateSchool", "SetSubscriptionStatus", "AddMembership", "UpdateMembership", "RemoveMembership", "CreateInvitation", "RevokeInvitation", "AcceptInvitation"];
  for (const n of phase1) assert.equal(config.auditExemptOperations[n], undefined, `${n} must not be exempt`);
});
