// E-GATE-P2: documentation/phase2_gate.md says which automated test proves each Phase 2 gate criterion. This eval proves the table cannot rot:
// every criterion of the plan's gate is in it, and every file and test name it cites still exists.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const doc = readFileSync("documentation/phase2_gate.md", "utf8");
const plan = readFileSync("documentation/phase2_plan.md", "utf8");
const GATE = ["E-RBAC-FULL", "E-FIN-1", "E-FIN-2", "E-TEN-2", "E-IMP-1", "E-AUD-1"];

test("E-GATE-P2-1 every gate criterion of the plan is in the gate review, and the plan still lists them", () => {
  for (const id of GATE) {
    assert.ok(plan.includes(`**${id}:**`), `${id} is no longer in the plan's gate`);
    assert.ok(doc.includes(`| ${id} |`), `${id} is missing from documentation/phase2_gate.md`);
  }
});

test("E-GATE-P2-2 every evidence line `file :: test name` points at a file that exists and contains that test name", () => {
  const lines = [...doc.matchAll(/`([^`:]+?) :: ([^`]+?)`/g)];
  assert.ok(lines.length >= 12, `only ${lines.length} evidence lines`);
  for (const [, file, name] of lines) {
    assert.ok(existsSync(file), `${file} does not exist`);
    assert.ok(readFileSync(file, "utf8").includes(name), `${file} does not contain "${name}"`);
  }
});

test("E-GATE-P2-3 the review states what is NOT proven, not only what is", () => {
  assert.match(doc, /## Not proven/);
  assert.match(doc, /real (Cloud SQL|database)/i);
});
