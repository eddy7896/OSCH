// E-GATE-P3: documentation/phase3_gate.md says which automated test proves each Phase 3 gate criterion. This eval proves the table cannot rot:
// every criterion of the plan's gate is in it, and every file and test name it cites still exists.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const doc = readFileSync("documentation/phase3_gate.md", "utf8");
const plan = readFileSync("documentation/phase3_plan.md", "utf8");
const GATE = ["E-ACAD-1", "E-ACAD-2", "E-ACAD-3", "E-ACAD-4", "E-ATT-1", "E-EXAM-1", "E-RBAC-FULL and E-TEN-3", "E-AUD-1"];

test("E-GATE-P3-1 every gate criterion of the plan is in the gate review, and the plan still lists them", () => {
  for (const id of GATE) {
    assert.ok(plan.includes(`**${id}:**`), `${id} is no longer in the plan's gate`);
    assert.ok(doc.includes(`| ${id} |`), `${id} is missing from documentation/phase3_gate.md`);
  }
});

test("E-GATE-P3-2 every evidence line `file :: test name` points at a file that exists and contains that test name", () => {
  const lines = [...doc.matchAll(/`([^`:]+?) :: ([^`]+?)`/g)];
  assert.ok(lines.length >= 25, `only ${lines.length} evidence lines`);
  for (const [, file, name] of lines) {
    assert.ok(existsSync(file), `${file} does not exist`);
    assert.ok(readFileSync(file, "utf8").includes(name), `${file} does not contain "${name}"`);
  }
});

test("E-GATE-P3-3 the review states what is NOT proven, not only what is", () => {
  assert.match(doc, /## Not proven/);
  assert.match(doc, /browser/i);
  assert.match(doc, /production database/i);
});
