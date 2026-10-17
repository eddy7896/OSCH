// E-BOOT-*: the SUPER_ADMIN bootstrap helpers (the end-to-end run against the emulators is in the gateway harness).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describePlan, nextClaims, parseArgs } from "../tools/lib/bootstrap-super-admin.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("E-BOOT-1 arguments: an email and an explicit project are required, dry run is the default", () => {
  assert.deepEqual(parseArgs(["--email", "Owner@Example.COM", "--project", "demo-oruschools"]), { apply: false, revoke: false, email: "owner@example.com", project: "demo-oruschools" });
  assert.equal(parseArgs(["--email", "a@b.co", "--project", "my-school-prod", "--apply"]).apply, true);
  assert.equal(parseArgs(["--email", "a@b.co", "--project", "my-school-prod", "--revoke"]).revoke, true);
  assert.throws(() => parseArgs(["--project", "demo-oruschools"]), /--email/);
  assert.throws(() => parseArgs(["--email", "a@b.co"]), /--project/);
  assert.throws(() => parseArgs(["--email", "not-an-email", "--project", "demo-oruschools"]), /--email/);
  assert.throws(() => parseArgs(["--email", "a@b.co", "--project", "Bad Project"]), /--project/);
  assert.throws(() => parseArgs(["--email", "a@b.co", "--project", "demo-oruschools", "--sudo"]), /unknown argument/);
  assert.throws(() => parseArgs(["--email", "--project", "demo-oruschools"]), /needs a value/);
});

test("E-BOOT-2 claims: only globalRole changes, every other claim is kept, and nothing else can be granted", () => {
  assert.deepEqual(nextClaims({ theme: "x" }, false), { theme: "x", globalRole: "SUPER_ADMIN" });
  assert.deepEqual(nextClaims(undefined, false), { globalRole: "SUPER_ADMIN" });
  assert.deepEqual(nextClaims({ globalRole: "SUPER_ADMIN", theme: "x" }, true), { theme: "x" });
  assert.deepEqual(nextClaims({}, true), {});
  const input = { globalRole: "USER" };
  nextClaims(input, false);
  assert.deepEqual(input, { globalRole: "USER" }, "does not mutate its input");
});

test("E-BOOT-3 the plan names the project, the account and the change; the emulator is flagged", () => {
  const text = describePlan({ email: "o@e.co", project: "demo-oruschools", revoke: false, existingClaims: {}, uid: "u1", emulator: true });
  assert.match(text, /demo-oruschools\s+\[EMULATOR\]/);
  assert.match(text, /o@e\.co\s+\(uid u1\)/);
  assert.match(text, /globalRole\s+\(none\)\s+->\s+SUPER_ADMIN/);
});

test("E-BOOT-4 the script is a command-line tool only: it exposes no HTTP surface and the gateway cannot grant the role", () => {
  const script = readFileSync(resolve(ROOT, "tools/bootstrap-super-admin.mjs"), "utf8");
  assert.doesNotMatch(script, /createServer|listen\(|express|@nestjs/);
  assert.match(script, /--apply/);
  // The gateway reads the claim but has no code path that writes it.
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(resolve(dir, e.name)) : [resolve(dir, e.name)]));
  const writers = walk(resolve(ROOT, "apps/api-gateway/src")).filter((f) => /\.ts$/.test(f) && readFileSync(f, "utf8").includes("setCustomUserClaims"));
  assert.deepEqual(writers.map((f) => f.replace(ROOT + "/", "")), []);
});
