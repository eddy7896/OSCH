// The R2 tools' pure logic (no network): account id forms, what is reported when configuration is missing, and the bucket's CORS rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { TINY_PNG, accountIdFrom, corsRules, endpointFor, r2FromEnv, sameRules } from "../tools/r2/lib.mjs";

const ID = "abcdef0123456789abcdef0123456789";

test("E-R2-1 the account id is accepted as the bare id or the endpoint address, and nothing else", () => {
  assert.equal(accountIdFrom(ID), ID);
  assert.equal(accountIdFrom(`https://${ID}.r2.cloudflarestorage.com`), ID);
  assert.equal(accountIdFrom(` HTTPS://${ID.toUpperCase()}.R2.CLOUDFLARESTORAGE.COM/ `), ID);
  for (const bad of ["", undefined, "short", `${ID}z`, `https://evil.com/${ID}`, `https://${ID}.evil.com`]) assert.equal(accountIdFrom(bad), undefined, String(bad));
  assert.equal(endpointFor(ID), `https://${ID}.r2.cloudflarestorage.com`);
});

test("E-R2-2 missing configuration is reported by NAME, never by value", () => {
  const none = r2FromEnv({});
  assert.equal(none.ok, false);
  assert.deepEqual(none.problems.map((p) => p.split(" ")[0]), ["R2_ACCOUNT_ID", "R2_ACCESS_KEY", "R2_SECRET_KEY", "R2_BUCKET_NAME"]);
  const leaky = r2FromEnv({ R2_ACCOUNT_ID: "https://nope.example/secret-looking-value", R2_ACCESS_KEY: "k", R2_SECRET_KEY: "topsecret", R2_BUCKET_NAME: "b" });
  assert.equal(leaky.ok, false);
  assert.ok(!JSON.stringify(leaky).includes("secret-looking-value") && !JSON.stringify(leaky).includes("topsecret"));
  const ok = r2FromEnv({ R2_ACCOUNT_ID: ID, R2_ACCESS_KEY: "k", R2_SECRET_KEY: "s", R2_BUCKET_NAME: "b", R2_PUBLIC_URL: "https://files.example.com/" });
  assert.deepEqual(ok, { ok: true, config: { accountId: ID, accessKey: "k", secretKey: "s", bucket: "b", publicUrl: "https://files.example.com" } });
});

test("E-R2-3 the bucket allows a browser to PUT, GET and HEAD from the apps' own addresses and nothing more", () => {
  const [rule, ...rest] = corsRules("http://localhost:3001, http://localhost:3002,https://*.oruschools.com,http://localhost:3001");
  assert.equal(rest.length, 0);
  assert.deepEqual(rule.AllowedOrigins, ["http://localhost:3001", "http://localhost:3002", "https://*.oruschools.com"]);
  assert.deepEqual(rule.AllowedMethods, ["PUT", "GET", "HEAD"]);
  assert.deepEqual(rule.AllowedHeaders, ["content-type"]);
  assert.ok(!rule.AllowedOrigins.includes("*"));
  assert.ok(!rule.AllowedMethods.includes("DELETE"));
});

test("E-R2-4 an empty, wildcard-only or malformed origin list is refused rather than opening the bucket", () => {
  assert.throws(() => corsRules(""), /empty/);
  assert.throws(() => corsRules(undefined), /empty/);
  assert.throws(() => corsRules("*"), /cannot be a bucket origin/);
  assert.throws(() => corsRules("https://app.example.com,*"), /cannot be a bucket origin/);
  assert.throws(() => corsRules("https://app.example.com/path"), /cannot be a bucket origin/);
  assert.throws(() => corsRules("app.example.com"), /cannot be a bucket origin/);
});

test("E-R2-5 applying the same rules again is recognised as no change (order and header case do not matter)", () => {
  const a = corsRules("http://localhost:3001,https://*.oruschools.com");
  const b = [{ ...a[0], AllowedOrigins: [...a[0].AllowedOrigins].reverse(), AllowedHeaders: ["Content-Type"] }];
  assert.ok(sameRules(a, b));
  assert.ok(!sameRules(a, corsRules("http://localhost:3001")));
  assert.ok(!sameRules([], a));
});

test("E-R2-6 the smoke-test image is a real PNG", () => {
  assert.equal(TINY_PNG.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(TINY_PNG.length, 70);
  assert.equal(TINY_PNG.subarray(-8).toString("hex"), "49454e44ae426082"); // ends with the IEND chunk
});
