// The translation review workflow's rules (pure logic): what a reviewer may change, what is rejected, and when a language may be called reviewed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyUpdates, bundleFor, canMarkReviewed, planImport, problemsFor, readReviews } from "../tools/translations/lib.mjs";

const en = { hello: "Hello, {name}", count: "{count, plural, one{{count} item} other{{count} items}}", plain: "Save" };
const catalog = { hello: "नमस्ते, {name}", count: "{count, plural, one{{count} चीज़} other{{count} चीज़ें}}", plain: "सहेजें" };
const doc = (key, status, text = "", extra = {}) => ({ lang: "hi", key, status, text, comment: "", by: "A", at: "2026-10-22T10:00:00Z", ...extra });

test("E-TR-1 a translation must keep English's placeholders, be valid and plain", () => {
  assert.deepEqual(problemsFor(en.hello, "नमस्ते, {name}"), []);
  assert.match(problemsFor(en.hello, "नमस्ते")[0], /placeholders \{\} differ from English \{name\}/);
  assert.match(problemsFor(en.hello, "नमस्ते, {nam}")[0], /differ/);
  assert.match(problemsFor(en.hello, "नमस्ते, {name} {extra}")[0], /differ/);
  assert.deepEqual(problemsFor(en.hello, ""), ["empty"]);
  assert.deepEqual(problemsFor(en.hello, "   "), ["empty"]);
  assert.match(problemsFor(en.plain, "<b>सहेजें</b>").join(), /HTML/);
  assert.match(problemsFor(en.hello, "नमस्ते, {name").join(), /not a valid message/);
  assert.match(problemsFor(en.count, "{count, plural, one{# चीज़} other{# चीज़ें}}").join(), /#/);
  assert.match(problemsFor(en.count, "{count, plural, one{{count} चीज़}}").join(), /valid|differ/);
});

test("E-TR-2 the bundle for a language carries each English message, its context, its draft and its placeholders", () => {
  const b = bundleFor({ lang: "hi", en, descriptions: { hello: "Greeting", plain: "Button" }, catalog: { hello: "नमस्ते, {name}" } });
  assert.deepEqual(b.items.map((i) => i.key), ["hello", "count", "plain"]);
  assert.deepEqual(b.items[0], { key: "hello", en: "Hello, {name}", description: "Greeting", draft: "नमस्ते, {name}", vars: ["name"] });
  assert.equal(b.items[1].draft, null);
  assert.equal(b.items[1].description, "");
  assert.deepEqual(b.items[1].vars, ["count"]);
});

test("E-TR-3 only decisions for this language, with a status, count; the latest decision for a key wins; export wrappers are understood", () => {
  const d = readReviews([doc("hello", "approved", "A", { at: "2026-10-22T09:00:00Z" }), doc("hello", "flagged", "", { at: "2026-10-22T11:00:00Z", comment: "unsure" }), doc("plain", "approved", "सहेजें"), { lang: "ur", key: "plain", status: "approved", text: "x" }, doc("count", "pending"), null, "junk", { data: doc("count", "approved", "x") }], "hi");
  assert.equal(d.get("hello").status, "flagged");
  assert.equal(d.get("plain").text, "सहेजें");
  assert.equal(d.get("count").text, "x");
  assert.equal(d.size, 3);
});

test("E-TR-4 an approved edit becomes an update; an unchanged approval, a flag, a broken approval and a missing decision are each reported separately", () => {
  const decisions = readReviews([doc("hello", "approved", "नमस्कार, {name}"), doc("count", "flagged", "", { comment: "plural looks wrong" }), doc("plain", "approved", "सहेजें"), doc("ghost", "approved", "x")], "hi");
  const plan = planImport({ en, catalog, decisions });
  assert.deepEqual(plan.updates, [{ key: "hello", from: "नमस्ते, {name}", to: "नमस्कार, {name}" }]);
  assert.deepEqual(plan.approvedUnchanged, ["plain"]);
  assert.deepEqual(plan.flagged, [{ key: "count", comment: "plural looks wrong" }]);
  assert.deepEqual(plan.unknown, ["ghost"]);
  assert.deepEqual(plan.notReviewed, []);
  const broken = planImport({ en, catalog, decisions: readReviews([doc("hello", "approved", "नमस्कार")], "hi") });
  assert.equal(broken.updates.length, 0);
  assert.equal(broken.rejected[0].key, "hello");
  assert.deepEqual(broken.notReviewed, ["count", "plain"]);
});

test("E-TR-5 a language may be called reviewed only when every message is approved, with nothing flagged, rejected, unknown or missing", () => {
  const all = readReviews(Object.keys(en).map((k) => doc(k, "approved", catalog[k])), "hi");
  assert.deepEqual(canMarkReviewed(planImport({ en, catalog, decisions: all })), { ok: true, reasons: [] });
  const some = readReviews([doc("hello", "approved", catalog.hello)], "hi");
  assert.match(canMarkReviewed(planImport({ en, catalog, decisions: some })).reasons.join(), /2 messages have no decision/);
  const flagged = readReviews([...Object.keys(en).map((k) => doc(k, "approved", catalog[k])), doc("plain", "flagged")], "hi");
  assert.match(canMarkReviewed(planImport({ en, catalog, decisions: flagged })).reasons.join(), /1 messages are flagged/);
  const ghost = readReviews([...Object.keys(en).map((k) => doc(k, "approved", catalog[k])), doc("ghost", "approved", "x")], "hi");
  assert.match(canMarkReviewed(planImport({ en, catalog, decisions: ghost })).reasons.join(), /no longer exist/);
  const bad = readReviews([...Object.keys(en).map((k) => doc(k, "approved", catalog[k])), doc("hello", "approved", "नमस्ते")], "hi");
  assert.match(canMarkReviewed(planImport({ en, catalog, decisions: bad })).reasons.join(), /break the rules/);
});

test("E-TR-6 applying updates keeps English's key order and drops nothing", () => {
  const next = applyUpdates(en, { plain: "p", hello: "h" }, [{ key: "count", to: "c" }]);
  assert.deepEqual(Object.keys(next), ["hello", "count", "plain"]);
  assert.equal(next.count, "c");
  assert.equal(next.plain, "p");
});
