// E-PRIV-*: children's data protection (documentation/modules/children-data-protection.md). Run: node --test evals/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { trackingMarkersIn, trackingPackagesIn, TRACKING_PACKAGES } from "../tools/checks/tracking-rule.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const walk = (dir) => readdirSync(resolve(ROOT, dir), { withFileTypes: true }).flatMap((e) => (["node_modules", ".next", "dist", "build", ".dart_tool", "generated"].includes(e.name) ? [] : e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));

test("E-PRIV-1 the rule recognises advertising and analytics SDKs in npm and pub manifests", () => {
  assert.deepEqual(trackingPackagesIn('{ "dependencies": { "posthog-js": "^1.0.0", "next": "16" } }'), ["posthog-js"]);
  assert.deepEqual(trackingPackagesIn("dependencies:\n  flutter:\n    sdk: flutter\n  firebase_analytics: ^11.0.0\n  mixpanel_flutter: ^2.0.0\n").sort(), ["firebase_analytics", "mixpanel_flutter"]);
  assert.deepEqual(trackingPackagesIn("dependencies:\n  google_mobile_ads: ^5.0.0\n"), ["google_mobile_ads"]);
  assert.deepEqual(trackingPackagesIn('{ "name": "x-posthog-js-thing", "dependencies": { "react": "19" } }'), []);
  assert.ok(TRACKING_PACKAGES.length >= 30);
});

test("E-PRIV-1 the rule recognises analytics and advertising tags and calls in source", () => {
  assert.deepEqual(trackingMarkersIn('<script src="https://www.googletagmanager.com/gtm.js?id=GTM-1"></script>'), ["Google Tag Manager"]);
  assert.ok(trackingMarkersIn("gtag('event', 'page_view')").includes("Google Analytics"));
  assert.ok(trackingMarkersIn("fbq('track', 'PageView')").includes("Meta pixel"));
  assert.ok(trackingMarkersIn("posthog.capture('x')").includes("PostHog"));
  assert.deepEqual(trackingMarkersIn("const analyticsEnabled = false; // never track"), []);
});

test("E-PRIV-1 no app or package depends on an advertising or analytics SDK, and none loads a tag", () => {
  const manifests = ["apps", "packages"].flatMap(walk).filter((f) => /(^|\/)(package\.json|pubspec\.yaml)$/.test(f));
  assert.ok(manifests.length > 10, "found the manifests");
  const offenders = manifests.flatMap((f) => trackingPackagesIn(read(f)).map((n) => `${f}: ${n}`));
  const tags = ["apps", "packages"].flatMap(walk).filter((f) => /\.(ts|tsx|js|jsx|mjs|html|dart|swift|kt|plist)$/.test(f) && !f.endsWith(".test.mjs") && !f.includes("/test/") && !f.endsWith("tracking-rule.mjs")).flatMap((f) => trackingMarkersIn(read(f)).map((n) => `${f}: ${n}`));
  assert.deepEqual([...offenders, ...tags], []);
});

test("E-PRIV-5 the words of a push are generic in every language: no placeholder, so nothing about a child can be put in them", () => {
  const dir = "packages/i18n/messages";
  const catalogs = readdirSync(resolve(ROOT, dir)).filter((f) => /^[a-z]{2,3}\.json$/.test(f));
  assert.ok(catalogs.length >= 3);
  for (const f of catalogs) {
    const c = JSON.parse(read(`${dir}/${f}`));
    const keys = Object.keys(c).filter((k) => k.startsWith("push"));
    if (f === "en.json") assert.deepEqual(keys.sort(), ["pushBody", "pushTitle"]);
    for (const k of keys) {
      assert.doesNotMatch(c[k], /[{}]/, `${f} ${k} has a placeholder`);
      assert.doesNotMatch(c[k], /\d/, `${f} ${k} has a number (a count, a date or a score)`);
    }
  }
});

test("E-PRIV-5 the push provider is given ids only: no title, body or notification in the message", () => {
  const src = read("apps/api-gateway/src/push/fcm-push-sender.ts").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""); // comments are not the message
  const message = src.slice(src.indexOf("this.messaging.sendEach("), src.indexOf("res.responses"));
  assert.match(message, /data:\s*\{ type: m\.data\.type, noticeId: m\.data\.noticeId, schoolId: m\.data\.schoolId \}/);
  assert.doesNotMatch(message, /notification\s*:|\btitle\b|\bbody\b|alert\s*:/i);
  assert.match(message, /apns-push-type['"]?:\s*['"]background/);
  const types = read("apps/api-gateway/src/push/push.types.ts");
  assert.match(types, /data: \{ type: 'notice'; noticeId: string; schoolId: string \}/);
});
