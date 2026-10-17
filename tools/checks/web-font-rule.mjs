// Rule web-fonts-local: web fonts are self-hosted. next/font/google downloads from Google on every build (no retry in Next),
// which failed CI at random (a different Next app each time, on commits that did not touch web code).
const IMPORT = /(?:from\s*|import\s*\(\s*|require\s*\(\s*)["']next\/font\/google["']/;

/** Returns the 1-based line numbers that import next/font/google (comments are ignored). */
export function googleFontImportLines(text) {
  const lines = [];
  text.split("\n").forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, "");
    if (IMPORT.test(code)) lines.push(i + 1);
  });
  return lines;
}
