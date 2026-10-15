// E-RTL-*: the physical-direction detector flags what it must and leaves logical code alone.
import { test } from "node:test";
import assert from "node:assert/strict";
import { callArgs, dartViolation, topLevelNames, webViolation } from "../tools/checks/rtl-patterns.mjs";

const mustFlagWeb = [
  'className="ml-4"', 'className="mr-2"', 'className="pl-3"', 'className="pr-[7px]"', 'className="-ml-2"',
  'className="text-left"', 'className="text-right"', 'className="left-0"', 'className="right-4"', 'className="-left-2"', 'className="-right-px"',
  'className="border-l"', 'className="border-r-2"', 'className="rounded-l-lg"', 'className="rounded-tr-md"', 'className="float-left"',
];
const mustFlagCss = [
  ".a{margin-left:8px}", ".a{padding-right:1rem}", ".a{border-left:1px solid}", ".a{border-left-width:2px}", ".a{border-right-color:red}",
  ".a{border-top-left-radius:4px}", ".a{text-align:left}", ".a{float:right}", ".a{position:absolute;left:0}", ".a{right:auto}", ".a{ left: var(--x) }", ".a{right:-8px}",
];
const mustPassWeb = [
  'className="ms-4 me-2 ps-3 pe-3"', 'className="text-start text-end"', 'className="start-0 end-4"', 'className="border-s border-e"', 'className="rounded-s-lg rounded-ee-md"',
  'className="flex items-center gap-4 p-4"', 'className="max-w-md"', "// ml-4 in a comment is fine", "/* margin-left: 4px in a block comment */",
  'const x = { left: 1 }', // a bare `left:` in TypeScript is ordinary; only .css and style={{}} are checked
];
const mustPassCss = [".a{margin-inline-start:8px}", ".a{padding-inline:4px}", ".a{inset-inline-start:0}", ".a{text-align:start}", ".a{float:inline-start}", "/* left: 0 */ .a{top:0}", ".a{--left:1px}"];

test("E-RTL-1 tailwind and inline-style physical directions are flagged", () => {
  for (const s of mustFlagWeb) assert.ok(webViolation(s), `should flag: ${s}`);
  assert.ok(webViolation('<div style={{ left: 4 }} />'), "inline style left");
  assert.ok(webViolation('<div style={{ position: "absolute", right: 0 }} />'), "inline style right");
});

test("E-RTL-2 CSS physical properties are flagged, including offsets with any value", () => {
  for (const s of mustFlagCss) assert.ok(webViolation(s, { css: true }), `should flag: ${s}`);
});

test("E-RTL-3 logical equivalents and comments are NOT flagged", () => {
  for (const s of mustPassWeb) assert.equal(webViolation(s), null, `should pass: ${s}`);
  for (const s of mustPassCss) assert.equal(webViolation(s, { css: true }), null, `should pass: ${s}`);
});

test("E-RTL-4 Dart: physical forms are flagged even when other calls are nested inside (paren-aware)", () => {
  const bad = [
    "EdgeInsets.only(left: 8)", "EdgeInsets.only(top: 4, right: 8)", "EdgeInsets.only(top: EdgeInsets.zero.top, left: 1)", "EdgeInsets.fromLTRB(1, 2, 3, 4)",
    "Alignment.centerLeft", "Alignment.topRight", "TextAlign.left", "TextAlign.right",
    "Positioned(left: 4, child: Text('x'))", "Positioned(child: Foo(), left: 4)", "Positioned(child: Foo(bar: Baz()), right: 2)",
    "Border(left: BorderSide(width: 1))", "Border(top: BorderSide(), right: BorderSide())",
    "BorderRadius.only(topLeft: Radius.circular(8))", "BorderRadius.only(bottomRight: Radius.circular(8))",
  ];
  for (const s of bad) assert.ok(dartViolation(s), `should flag: ${s}`);
});

test("E-RTL-5 Dart: logical forms and nested names are NOT flagged", () => {
  const good = [
    "EdgeInsetsDirectional.only(start: 8)", "EdgeInsets.only(top: 4, bottom: 8)", "EdgeInsets.symmetric(horizontal: 16)", "EdgeInsets.all(8)",
    "AlignmentDirectional.centerStart", "Alignment.center", "TextAlign.start", "TextAlign.center",
    "PositionedDirectional(start: 4, child: Text('x'))", "Positioned(top: 0, child: Foo(left: 3))", "Positioned.fill(child: Foo())",
    "Border(top: BorderSide(), bottom: BorderSide())", "BorderRadius.circular(8)", "BorderRadiusDirectional.only(topStart: Radius.circular(8))",
    "// EdgeInsets.only(left: 8) in a comment", "/* TextAlign.left */",
  ];
  for (const s of good) assert.equal(dartViolation(s), null, `should pass: ${s}`);
});

test("E-RTL-6 the paren-aware helpers behave", () => {
  assert.deepEqual(callArgs("a(b(c), d: 2) e(f)", "a("), ["b(c), d: 2"]);
  assert.deepEqual(topLevelNames("child: Foo(left: 1), left: 4, top: 0"), ["child", "left", "top"]);
  assert.deepEqual(topLevelNames("Foo(left: 1)"), []);
});
