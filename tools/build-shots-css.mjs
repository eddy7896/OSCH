// Builds web-admin's stylesheet WITHOUT touching .next (so a running dev server is left alone), for the Hub's screen pictures (documentation/screen-previews.md).
// Usage: node tools/build-shots-css.mjs <out.css>
import fs from 'node:fs';
import path from 'node:path';
import { compile } from '@tailwindcss/node';
import { Scanner } from '@tailwindcss/oxide';
const root = path.resolve(import.meta.dirname, '..');
const base = path.join(root, 'apps/web-admin/src/app');
const css = fs.readFileSync(path.join(base, 'globals.css'), 'utf8');
const compiler = await compile(css, { base, onDependency() {} });
const sources = [...compiler.sources, { base: path.join(root, 'apps/web-admin/src'), pattern: '**/*', negated: false }, { base: path.join(root, 'packages/shared-ui/src'), pattern: '**/*', negated: false }];
const scanner = new Scanner({ sources });
const out = compiler.build(scanner.scan());
fs.writeFileSync(process.argv[2], out);
console.log('css bytes', out.length);
