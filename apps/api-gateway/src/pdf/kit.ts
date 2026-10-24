import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getMessages, isRtl, matchLanguageTag } from '@oruschools/i18n';
import { Canvas, FontLibrary, type CanvasRenderingContext2D } from 'skia-canvas';

/**
 * Shared by the printed documents (fee receipts, payslips, report tables): fonts for every bundled script, the right font for a string, the
 * direction of a string, and a small page helper that lays text out from the reading edge of the school's language. Drawn with skia-canvas, which
 * shapes Devanagari, Nastaliq Urdu and the other scripts correctly and embeds real, subsetted fonts (spike of 2026-10-22; PDFKit crashes on Nastaliq).
 */
const here = dirname(fileURLToPath(import.meta.url));
/** The bundled Noto fonts live in the shared Flutter package; a deployment must ship that folder (or point RECEIPT_FONT_DIR at a copy). */
export const FONT_DIR = process.env['RECEIPT_FONT_DIR'] ?? resolve(here, '../../../../packages/flutter-core/assets/fonts');

const FAMILIES: Array<[string, string, string?]> = [
  ['OruSans', 'NotoSans-Regular.ttf', 'normal'], ['OruSans', 'NotoSans-Bold.ttf', 'bold'],
  ['OruDeva', 'NotoSansDevanagari-Regular.ttf', 'normal'], ['OruDeva', 'NotoSansDevanagari-Bold.ttf', 'bold'],
  ['OruBeng', 'NotoSansBengali-Regular.ttf', 'normal'], ['OruBeng', 'NotoSansBengali-Bold.ttf', 'bold'],
  ['OruGuru', 'NotoSansGurmukhi-Regular.ttf', 'normal'], ['OruGuru', 'NotoSansGurmukhi-Bold.ttf', 'bold'],
  ['OruGujr', 'NotoSansGujarati-Regular.ttf', 'normal'], ['OruGujr', 'NotoSansGujarati-Bold.ttf', 'bold'],
  ['OruOrya', 'NotoSansOriya-Regular.ttf', 'normal'], ['OruOrya', 'NotoSansOriya-Bold.ttf', 'bold'],
  ['OruTaml', 'NotoSansTamil-Regular.ttf', 'normal'], ['OruTaml', 'NotoSansTamil-Bold.ttf', 'bold'],
  ['OruTelu', 'NotoSansTelugu-Regular.ttf', 'normal'], ['OruTelu', 'NotoSansTelugu-Bold.ttf', 'bold'],
  ['OruKnda', 'NotoSansKannada-Regular.ttf', 'normal'], ['OruKnda', 'NotoSansKannada-Bold.ttf', 'bold'],
  ['OruMlym', 'NotoSansMalayalam-Regular.ttf', 'normal'], ['OruMlym', 'NotoSansMalayalam-Bold.ttf', 'bold'],
  ['OruNastaliq', 'NotoNastaliqUrdu-Regular.ttf', 'normal'], ['OruNastaliq', 'NotoNastaliqUrdu-Bold.ttf', 'bold'],
  ['OruNaskh', 'NotoNaskhArabic-Regular.ttf', 'normal'], ['OruNaskh', 'NotoNaskhArabic-Bold.ttf', 'bold'],
];
let fontsReady = false;
export function ensureFonts(): void {
  if (fontsReady) return;
  if (!existsSync(join(FONT_DIR, 'NotoSans-Regular.ttf'))) throw new Error(`receipt fonts not found in ${FONT_DIR}`);
  const byFamily = new Map<string, Array<{ path: string; weight: string }>>();
  for (const [family, file, weight] of FAMILIES) {
    const path = join(FONT_DIR, file);
    if (existsSync(path)) (byFamily.get(family) ?? byFamily.set(family, []).get(family)!).push({ path, weight: weight ?? 'normal' });
  }
  for (const [family, files] of byFamily) FontLibrary.use(family, files.map((f) => f.path));
  fontsReady = true;
}

/** The font family that can draw this text: the first non-Latin script in it, else Noto Sans. Arabic script is Nastaliq for Urdu, Naskh for the rest. */
export function familyFor(text: string, language: string): string {
  const ranges: Array<[RegExp, string]> = [
    [/[ऀ-ॿ]/, 'OruDeva'], [/[ঀ-৿]/, 'OruBeng'], [/[਀-੿]/, 'OruGuru'], [/[઀-૿]/, 'OruGujr'], [/[଀-୿]/, 'OruOrya'],
    [/[஀-௿]/, 'OruTaml'], [/[ఀ-౿]/, 'OruTelu'], [/[ಀ-೿]/, 'OruKnda'], [/[ഀ-ൿ]/, 'OruMlym'],
    [/[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/, language === 'ur' ? 'OruNastaliq' : 'OruNaskh'],
  ];
  for (const [re, family] of ranges) if (re.test(text)) return family;
  return 'OruSans';
}

/** Each string is laid out in its OWN script's direction (an English address on an Urdu receipt stays left-to-right inside), while where it sits follows the language. */
export const directionOfText = (text: string): 'ltr' | 'rtl' => (/[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/.test(text) ? 'rtl' : 'ltr');


/** The printed documents' colours, the product's light-theme text, muted, border and danger tones (written as rgb so no raw hex sits in the source). */
export const INK = { paper: 'rgb(255, 255, 255)', text: 'rgb(21, 24, 56)', muted: 'rgb(86, 92, 118)', line: 'rgb(195, 200, 218)', danger: 'rgb(196, 35, 35)' } as const;

export interface PageKit {
  canvas: Canvas;
  /** The drawing context of the CURRENT page. */
  readonly ctx: CanvasRenderingContext2D;
  /** Starts another page of the same size (a white page); everything drawn after goes there. */
  newPage(): void;
  W: number;
  H: number;
  M: number;
  rtl: boolean;
  /** Labels in the page's language (English for any key a language does not have yet). */
  t: Record<string, string>;
  font(text: string, size: number, bold?: boolean): void;
  fit(text: string, max: number): string;
  /** Text starting at the reading edge: left for left-to-right languages, right for right-to-left ones. */
  edge(text: string, y: number, size: number, opts?: { bold?: boolean; color?: string; maxWidth?: number; center?: boolean }): void;
  /** Text on the far side from the reading edge, right-aligned in left-to-right languages. */
  far(text: string, y: number, size: number, opts?: { bold?: boolean; color?: string; maxWidth?: number }): void;
  rule(y: number, color?: string): void;
  language: string;
}

/** A blank white page with the drawing helpers bound to it. An unknown language prints in English. */
export function createPage(W: number, H: number, language: string, M = 28): PageKit {
  ensureFonts();
  const code = matchLanguageTag(language) ?? 'en';
  const t = getMessages(code);
  const rtl = isRtl(code);
  const canvas = new Canvas(W, H);
  let ctx = canvas.getContext('2d');
  const blank = () => {
    ctx.fillStyle = INK.paper;
    ctx.fillRect(0, 0, W, H);
  };
  blank();
  const newPage = () => {
    ctx = canvas.newPage(W, H);
    blank();
  };
  const font = (text: string, size: number, bold = false) => {
    const fam = familyFor(text, code);
    ctx.font = `${bold ? 'bold ' : ''}${size}px ${fam === 'OruSans' ? 'OruSans' : `${fam}, OruSans`}`;
  };
  const fit = (text: string, max: number): string => {
    if (ctx.measureText(text).width <= max) return text;
    let s = text;
    while (s.length > 1 && ctx.measureText(`${s}\u2026`).width > max) s = s.slice(0, -1);
    return `${s}\u2026`;
  };
  const edge: PageKit['edge'] = (text, y, size, opts = {}) => {
    font(text, size, opts.bold);
    ctx.fillStyle = opts.color ?? INK.text;
    ctx.direction = directionOfText(text);
    ctx.textAlign = opts.center ? 'center' : rtl ? 'right' : 'left';
    ctx.fillText(fit(text, opts.maxWidth ?? W - 2 * M), opts.center ? W / 2 : rtl ? W - M : M, y);
  };
  const far: PageKit['far'] = (text, y, size, opts = {}) => {
    font(text, size, opts.bold);
    ctx.fillStyle = opts.color ?? INK.text;
    ctx.direction = directionOfText(text);
    ctx.textAlign = rtl ? 'left' : 'right';
    ctx.fillText(fit(text, opts.maxWidth ?? W - 2 * M), rtl ? M : W - M, y);
  };
  const rule: PageKit['rule'] = (y, color = INK.line) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(M, y);
    ctx.lineTo(W - M, y);
    ctx.stroke();
  };
  return { canvas, get ctx() { return ctx; }, newPage, W, H, M, rtl, t, font, fit, edge, far, rule, language: code };
}
