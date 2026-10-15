// Detects PHYSICAL left/right in layout code, which breaks right-to-left languages (ADR-0006).
// Use logical equivalents: ms-/me-/ps-/pe-/start-/end-/text-start/text-end, margin-inline-*, EdgeInsetsDirectional,
// AlignmentDirectional, TextAlign.start/end, PositionedDirectional, BorderDirectional, BorderRadiusDirectional.
// Pure functions so they can be unit-tested (evals/rtl-patterns.test.mjs).

export const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// Tailwind utilities and CSS properties. Applied to .tsx/.ts/.css source (comments stripped).
const WEB = [
  ["tailwind margin/padding left/right (ml-, pr-, -ml-)", /(?<![\w-])-?(?:m|p)[lr]-(?:\d|\[|px\b|auto|full|\()/],
  ["tailwind left-/right- offsets (also negative: -left-2)", /(?<![\w-])-?(?:left|right)-(?:\d|\[|px\b|auto|full|1\/2|\()/],
  ["tailwind text-left / text-right", /(?<![\w-])text-(?:left|right)(?![\w-])/],
  ["tailwind border-l/r and rounded-l/r/tl/tr/bl/br", /(?<![\w-])(?:border|rounded)-(?:l|r|tl|tr|bl|br)(?:-|\b)/],
  ["tailwind float/clear left/right", /(?<![\w-])(?:float|clear)-(?:left|right)(?![\w-])/],
  ["CSS margin/padding/border-left/right (incl. -width/-color/-style)", /\b(?:margin|padding|border)-(?:left|right)(?:-[a-z]+)?\s*:/],
  ["CSS border-top/bottom-left/right-radius", /\bborder-(?:top|bottom)-(?:left|right)-radius\s*:/],
  ["CSS text-align left/right", /text-align\s*:\s*(?:left|right)\b/],
  ["CSS float/clear left/right", /\b(?:float|clear)\s*:\s*(?:left|right)\b/],
];
// `left:` / `right:` as a CSS property (any value: 0, auto, var(--x), 10px). Only in .css (a bare `left:` is ordinary in TS).
const CSS_ONLY = ["CSS left/right offset property", /(?:^|[;{\s])(?:left|right)\s*:/m];
// Inline style objects in TSX.
const TSX_ONLY = ["inline style left/right", /style=\{\{[^}]*\b(?:left|right)\s*:/];

export function webViolation(text, { css = false } = {}) {
  const t = stripComments(text);
  const extra = css ? [CSS_ONLY] : [TSX_ONLY];
  for (const [label, re] of [...WEB, ...extra]) if (re.test(t)) return label;
  return null;
}

// ---- Dart -------------------------------------------------------------------------------------------------------------

/** The argument text of every call to `callee(` (paren-aware, so nested calls do not truncate it). */
export function callArgs(text, callee) {
  const out = [];
  for (let i = text.indexOf(callee); i !== -1; i = text.indexOf(callee, i + 1)) {
    let depth = 1;
    let j = i + callee.length;
    for (; j < text.length && depth > 0; j++) {
      if (text[j] === "(") depth++;
      else if (text[j] === ")") depth--;
    }
    out.push(text.slice(i + callee.length, j - 1));
  }
  return out;
}

/** Names of the named arguments given at the TOP level of an argument list (nested calls ignored). */
export function topLevelNames(args) {
  const names = [];
  let depth = 0;
  let start = 0;
  const flush = (end) => {
    const m = args.slice(start, end).match(/^\s*(\w+)\s*:/);
    if (m) names.push(m[1]);
  };
  for (let i = 0; i < args.length; i++) {
    const c = args[i];
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    else if (c === "," && depth === 0) {
      flush(i);
      start = i + 1;
    }
  }
  flush(args.length);
  return names;
}

const has = (names, ...wanted) => names.some((n) => wanted.includes(n));

export function dartViolation(text) {
  const t = stripComments(text);
  if (/EdgeInsets\.fromLTRB/.test(t)) return "EdgeInsets.fromLTRB (use EdgeInsetsDirectional.fromSTEB)";
  if (/\bAlignment\.(?:centerLeft|centerRight|topLeft|topRight|bottomLeft|bottomRight)\b/.test(t)) return "Alignment.*Left/Right (use AlignmentDirectional)";
  if (/\bTextAlign\.(?:left|right)\b/.test(t)) return "TextAlign.left/right (use TextAlign.start/end)";
  for (const args of callArgs(t, "EdgeInsets.only(")) if (has(topLevelNames(args), "left", "right")) return "EdgeInsets.only(left/right) (use EdgeInsetsDirectional.only(start/end))";
  for (const args of callArgs(t, "Positioned(")) if (has(topLevelNames(args), "left", "right")) return "Positioned(left/right) (use PositionedDirectional)";
  for (const args of callArgs(t, "Border(")) if (has(topLevelNames(args), "left", "right")) return "Border(left/right) (use BorderDirectional)";
  for (const args of callArgs(t, "BorderRadius.only(")) if (has(topLevelNames(args), "topLeft", "topRight", "bottomLeft", "bottomRight")) return "BorderRadius.only(topLeft...) (use BorderRadiusDirectional)";
  return null;
}
