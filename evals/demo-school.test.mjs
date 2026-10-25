// E-DEMO: the demo school's accounts share ONE published password, so the seed script must never be able to create them in a real project.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

// Read the roles from source: this eval runs before any package is built.
const ROLES = [...readFileSync("packages/rbac/src/roles.ts", "utf8").match(/export const ROLES = \[([\s\S]*?)\] as const/)[1].matchAll(/"([A-Z_]+)"/g)].map((m) => m[1]);
import { DEMO_PEOPLE, DEMO_SUBDOMAIN, dobFor, loginTable, paymentPlan, payMonths, phoneFor, schoolYear, termAmount, termDates } from "../tools/lib/demo-school.mjs";

test("E-DEMO-1 the seed script refuses to run without the Auth emulator, and with NODE_ENV=production", () => {
  const clean = { ...process.env };
  delete clean.FIREBASE_AUTH_EMULATOR_HOST;
  const none = spawnSync("node", ["tools/seed-demo-school.mjs"], { env: clean, encoding: "utf8" });
  assert.equal(none.status, 2);
  assert.match(none.stderr, /only runs against the local Firebase Auth emulator/);
  const prod = spawnSync("node", ["tools/seed-demo-school.mjs"], { env: { ...clean, FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:1", NODE_ENV: "production" }, encoding: "utf8" });
  assert.equal(prod.status, 2);
  assert.match(prod.stderr, /NODE_ENV=production/);
});

test("E-DEMO-2 the script and its stack script can only point at local emulators and never write credentials anywhere", () => {
  const seed = readFileSync("tools/seed-demo-school.mjs", "utf8");
  const stack = readFileSync("tools/demo-stack.sh", "utf8");
  assert.ok(seed.indexOf("if (!AUTH_HOST)") < seed.indexOf("createUser"), "the emulator check comes before any account is created");
  assert.doesNotMatch(seed, /GOOGLE_APPLICATION_CREDENTIALS|serviceAccount|writeFileSync/);
  assert.match(stack, /--project demo-oruschools/);
  assert.doesNotMatch(stack, /--project oruschools\b/);
});

test("E-DEMO-3 every demo role is a real role, each once, and the platform owner is the only one without a school role", () => {
  const roles = DEMO_PEOPLE.filter((p) => p.role).map((p) => p.role);
  for (const r of roles) assert.ok(ROLES.includes(r), r);
  assert.equal(new Set(roles).size, roles.length);
  assert.equal(DEMO_PEOPLE.filter((p) => !p.role).map((p) => p.key).join(), "owner");
  assert.equal(new Set(DEMO_PEOPLE.map((p) => p.email)).size, DEMO_PEOPLE.length);
  for (const must of ["SYSTEM_ADMIN", "PRINCIPAL", "BURSAR", "ACCOUNTANT", "ACADEMIC_ADMIN", "HR_MANAGER", "ADMISSIONS_OFFICER", "MANAGEMENT"]) assert.ok(roles.includes(must), must);
});

test("E-DEMO-4 the demo address is a valid school address (not a reserved name) and the logins table names every account", () => {
  assert.match(DEMO_SUBDOMAIN, /^[a-z][a-z0-9-]{2,}$/);
  assert.notEqual(DEMO_SUBDOMAIN, "demo"); // reserved by the gateway
  const table = loginTable();
  for (const p of DEMO_PEOPLE) assert.ok(table.includes(p.email), p.key);
  assert.match(table, /greenfield\.localhost:3002/);
});

test("E-DEMO-5 dates: the school year is April to March, terms fall inside it, and the pay months wrap over New Year", () => {
  const y = schoolYear(new Date("2026-10-25T00:00:00Z"));
  assert.deepEqual([y.name, y.startDate, y.endDate], ["2026-2027", "2026-04-01", "2027-03-31"]);
  assert.equal(schoolYear(new Date("2027-02-10T00:00:00Z")).name, "2026-2027");
  assert.equal(schoolYear(new Date("2027-04-01T00:00:00Z")).name, "2027-2028");
  for (const d of termDates(y.startYear)) assert.ok(d >= y.startDate && d <= y.endDate, d);
  assert.deepEqual(payMonths(new Date("2027-01-15T00:00:00Z")), { current: { year: 2027, month: 1 }, last: { year: 2026, month: 12 } });
  assert.deepEqual(payMonths(new Date("2026-10-25T00:00:00Z")).last, { year: 2026, month: 9 });
});

test("E-DEMO-6 money is whole paise, phones are valid and distinct, payment plan is about 60/10/30", () => {
  for (const l of ["1", "2", "3", "4", "5"]) {
    assert.match(termAmount(l), /^[1-9]\d*$/);
    assert.equal(BigInt(termAmount(l)) % 100n, 0n); // whole rupees
  }
  const phones = Array.from({ length: 600 }, (_, i) => phoneFor(i));
  assert.equal(new Set(phones).size, phones.length);
  for (const p of phones) assert.match(p, /^\+[1-9][0-9]{6,14}$/);
  const plan = Array.from({ length: 100 }, (_, n) => paymentPlan(n));
  assert.deepEqual(["FULL", "HALF", "NONE"].map((k) => plan.filter((x) => x === k).length), [60, 10, 30]);
  assert.match(dobFor("3", 5, new Date("2026-10-25T00:00:00Z")), /^\d{4}-\d{2}-\d{2}$/);
});

test("E-DEMO-7 an ambient FIREBASE_PROJECT_ID can never send the demo accounts to another emulator project, and a failed seed stops the demo", () => {
  const seed = readFileSync("tools/seed-demo-school.mjs", "utf8");
  const stack = readFileSync("tools/demo-stack.sh", "utf8");
  assert.match(seed, /const PROJECT = "demo-oruschools";/);
  assert.doesNotMatch(seed, /process\.env\.FIREBASE_PROJECT_ID|GCLOUD_PROJECT|GOOGLE_CLOUD_PROJECT/, "the seed must not read the project from the environment");
  assert.match(stack, /set -o pipefail/);
  assert.match(stack, /seed-demo-school\.mjs 2>&1 \| tee .*\|\| \{[^}]*exit 1/s, "a failing seed must stop the stack");
  assert.match(stack, /GCLOUD_PROJECT=demo-oruschools/);
  for (const app of ["web-admin", "saas-admin"]) assert.match(readFileSync(`apps/${app}/next.config.ts`, "utf8"), /NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST/, `${app} must hand the emulator host to the browser bundle`);
});
