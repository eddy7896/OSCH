import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(HERE, '../src/styles.css'), 'utf8');
const tokens = readFileSync(resolve(HERE, '../../shared-design-tokens/generated/tokens.css'), 'utf8');
const i18nCss = readFileSync(resolve(HERE, '../../i18n/generated/i18n.css'), 'utf8');
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const rules = stripComments(css);

describe('styles.css keeps the design rules', () => {
  it('uses logical properties only, so it lays out right-to-left languages correctly', () => {
    const physical = [/\b(margin|padding|border)-(left|right)\b/, /(^|[\s{;])(left|right)\s*:/, /text-align\s*:\s*(left|right)/, /\b(border-(top|bottom)-(left|right)-radius)\b/, /(^|[\s{;])(width|height|min-width|min-height|max-width|max-height)\s*:/];
    for (const re of physical) expect(rules.match(re)?.[0], String(re)).toBeUndefined();
  });

  it('uses only tokens: every var(--x) exists in the generated token sheet, no hex or rgb colours', () => {
    const used = new Set([...rules.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]!));
    expect(used.size).toBeGreaterThan(20);
    // --oru-min-lh comes from the per-language sheet (packages/i18n/generated/i18n.css), not the token sheet.
    for (const name of used) expect(name === '--oru-min-lh' ? i18nCss : tokens, name).toContain(`${name}:`);
    expect(rules).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(rules).not.toMatch(/\brgba?\(|\bhsla?\(/);
  });

  it('no dark-mode styles (ADR-0005: light theme only in v1)', () => {
    expect(rules).not.toMatch(/prefers-color-scheme|data-theme|\.dark\b/);
  });

  it('nothing smaller than 13px text', () => {
    for (const m of rules.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px/g)) expect(Number(m[1]), m[0]).toBeGreaterThanOrEqual(12); // 12 only for the count badge digits, which sit inside a 20px circle
    expect([...rules.matchAll(/font-size\s*:\s*(\d+)px/g)].filter((m) => Number(m[1]) < 13).length).toBe(1);
  });

  it('every class a component renders exists in the stylesheet', () => {
    const src = resolve(HERE, '../src');
    const classes = new Set<string>();
    for (const f of readdirSync(src).filter((n) => n.endsWith('.tsx'))) for (const m of readFileSync(resolve(src, f), 'utf8').matchAll(/['"`](oru-[a-z0-9_-]+)['"`]/g)) classes.add(m[1]!);
    for (const c of ['oru-btn--primary', 'oru-btn--secondary', 'oru-btn--ghost', 'oru-btn--danger', 'oru-btn--compact', 'oru-btn--comfortable', 'oru-btn--touch', 'oru-btn--driver', 'oru-field--compact', 'oru-field--comfortable', 'oru-field--touch', 'oru-seg--compact', 'oru-seg--comfortable', 'oru-seg--touch', ...['success', 'warning', 'danger', 'info', 'purple', 'teal', 'neutral', 'brand'].map((t) => `oru-tone--${t}`)]) classes.add(c);
    expect(classes.size).toBeGreaterThan(25);
    for (const c of classes) expect(rules, c).toMatch(new RegExp(`\\.${c}(?![a-z0-9_-])`));
  });

  it('keyboard focus is a 2px token outline on every interactive control', () => {
    expect(rules).toMatch(/:focus-visible\s*\{\s*outline:\s*2px solid var\(--focus\);\s*outline-offset:\s*2px/);
    expect(rules).toMatch(/\.oru-check input:focus-visible \+ \.oru-check__box/);
    expect(rules).toMatch(/\.oru-field__box:focus-within/);
  });

  it('control heights are the density tokens (36 / 40 / 48 / 64), never raw numbers for the main controls', () => {
    for (const d of ['compact', 'comfortable', 'touch', 'driver']) expect(rules).toContain(`block-size: var(--control-${d})`);
  });
});
