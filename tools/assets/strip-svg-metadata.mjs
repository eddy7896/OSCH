#!/usr/bin/env node
// Copy an SVG while removing the <metadata> block (C2PA provenance manifests make up ~31% of the brand SVG bytes).
// Usage: node tools/assets/strip-svg-metadata.mjs <in.svg> <out.svg>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("usage: strip-svg-metadata.mjs <in.svg> <out.svg>");
  process.exit(2);
}
const svg = readFileSync(input, "utf8");
const stripped = svg.replace(/<metadata[\s\S]*?<\/metadata>/g, "").replace(/\s+xmlns:c2pa="[^"]*"/g, "");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, stripped);
console.log(`${output}: ${svg.length} -> ${stripped.length} bytes`);
