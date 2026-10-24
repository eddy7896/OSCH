import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatMoney } from '@oruschools/format';
import { getMessages, isRtl, matchLanguageTag } from '@oruschools/i18n';
import { Canvas, FontLibrary } from 'skia-canvas';

/**
 * The fee receipt as a PDF (P2-7c, ADR-0012). The page is drawn cell by cell with skia-canvas, which shapes Devanagari, Nastaliq Urdu and the other
 * scripts correctly and embeds real, subsetted fonts (chosen in the 2026-10-22 spike; PDFKit crashes on Nastaliq). The web page is the primary view;
 * this is the same content. Labels come from the school's language (packages/i18n); names and titles are printed as they were typed.
 */
export interface ReceiptPdfModel {
  number: string;
  /** YYYY-MM-DD, the day the fee was paid. */
  paidOn: string;
  cancelled: boolean;
  school: { name: string; address: string | null; phone: string | null; email: string | null };
  student: { name: string; enrollmentId: string; className: string | null };
  invoiceTitle: string;
  amountMinor: string;
  balanceAfterMinor: string;
  method: string;
  reference: string | null;
  receivedBy: string;
  academicYear: string;
}

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
function ensureFonts(): void {
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

const dmy = (iso: string): string => `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}`;
const METHOD_KEY: Record<string, string> = { CASH: 'paymentMethodCash', CHEQUE: 'paymentMethodCheque', BANK_TRANSFER: 'paymentMethodBankTransfer', UPI: 'paymentMethodUpi', OTHER: 'paymentMethodOther' };

/** The labels the receipt prints, in the school's language (English for any key a language does not have yet). */
export function receiptLabels(language: string): Record<string, string> {
  return getMessages(language);
}

/** The printed receipt's colours, the product's light-theme text, muted, border and danger tones (written as rgb so no raw hex sits in the source). */
const INK = { paper: 'rgb(255, 255, 255)', text: 'rgb(21, 24, 56)', muted: 'rgb(86, 92, 118)', line: 'rgb(195, 200, 218)', danger: 'rgb(196, 35, 35)' } as const;

export const RECEIPT_WIDTH = 420;
export const RECEIPT_HEIGHT = 595;

/** Draws the receipt (A5 portrait) and returns the PDF bytes. */
export const renderReceiptPdf = (model: ReceiptPdfModel, language: string): Promise<Buffer> => renderReceipt(model, language, 'pdf');

/** The same drawing as PDF (the product) or PNG (for looking at it while developing). */
export async function renderReceipt(model: ReceiptPdfModel, language: string, format: 'pdf' | 'png'): Promise<Buffer> {
  ensureFonts();
  const code = matchLanguageTag(language) ?? 'en'; // an unknown language prints in English
  const t = receiptLabels(code);
  const rtl = isRtl(code);
  const W = RECEIPT_WIDTH, H = RECEIPT_HEIGHT, M = 28;
  const canvas = new Canvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = INK.paper;
  ctx.fillRect(0, 0, W, H);

  const font = (text: string, size: number, bold = false) => {
    const fam = familyFor(text, language);
    ctx.font = `${bold ? 'bold ' : ''}${size}px ${fam === 'OruSans' ? 'OruSans' : `${fam}, OruSans`}`;
  };
  /** Text starting at the reading edge: left for left-to-right languages, right for right-to-left ones. */
  const edge = (text: string, y: number, size: number, opts: { bold?: boolean; color?: string; maxWidth?: number; center?: boolean } = {}) => {
    font(text, size, opts.bold);
    ctx.fillStyle = opts.color ?? INK.text;
    ctx.direction = directionOfText(text);
    ctx.textAlign = opts.center ? 'center' : rtl ? 'right' : 'left';
    const x = opts.center ? W / 2 : rtl ? W - M : M;
    ctx.fillText(fit(text, opts.maxWidth ?? W - 2 * M), x, y);
  };
  /** A value on the far side from its label. */
  const far = (text: string, y: number, size: number, opts: { bold?: boolean; color?: string; maxWidth?: number } = {}) => {
    font(text, size, opts.bold);
    ctx.fillStyle = opts.color ?? INK.text;
    ctx.direction = directionOfText(text);
    ctx.textAlign = rtl ? 'left' : 'right';
    ctx.fillText(fit(text, opts.maxWidth ?? W - 2 * M), rtl ? M : W - M, y);
  };
  const fit = (text: string, max: number): string => {
    if (ctx.measureText(text).width <= max) return text;
    let s = text;
    while (s.length > 1 && ctx.measureText(`${s}…`).width > max) s = s.slice(0, -1);
    return `${s}…`;
  };
  const rule = (y: number, color = INK.line) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(M, y);
    ctx.lineTo(W - M, y);
    ctx.stroke();
  };

  // header: the school
  edge(model.school.name, 44, 18, { bold: true });
  let y = 62;
  for (const line of [model.school.address, [model.school.phone, model.school.email].filter(Boolean).join('   ')].filter((l): l is string => !!l)) {
    edge(line, y, 10.5, { color: INK.muted });
    y += 15;
  }
  rule(y + 4, INK.text);

  // title, number, date
  y += 34;
  edge(t['receiptTitle'] ?? 'Fee receipt', y, 17, { bold: true });
  y += 26;
  const row = (label: string, value: string, opts: { bold?: boolean; size?: number } = {}) => {
    edge(label, y, 11, { color: INK.muted, maxWidth: 150 });
    far(value, y, opts.size ?? 12.5, { bold: opts.bold, maxWidth: W - 2 * M - 160 });
    y += 24;
  };
  row(t['receiptNumber'] ?? 'Receipt no.', model.number, { bold: true });
  row(t['receiptDate'] ?? 'Date', dmy(model.paidOn));
  rule(y - 8);
  y += 8;
  row(t['receiptStudent'] ?? 'Student', model.student.name, { bold: true });
  row(t['receiptEnrollment'] ?? 'Enrolment no.', model.student.enrollmentId);
  if (model.student.className) row(t['receiptClass'] ?? 'Class', model.student.className);
  row(t['receiptFor'] ?? 'Payment for', model.invoiceTitle);
  rule(y - 8);
  y += 10;

  // the amount
  edge(t['receiptAmountPaid'] ?? 'Amount paid', y + 10, 12, { color: INK.muted, maxWidth: 160 });
  far(formatMoney(BigInt(model.amountMinor), { currency: 'INR', locale: 'en-IN', decimals: 'always' }), y + 14, 26, { bold: true, maxWidth: W - 2 * M - 170 });
  y += 48;
  row(t['receiptMethod'] ?? 'Paid by', t[METHOD_KEY[model.method] ?? 'paymentMethodOther'] ?? model.method);
  if (model.reference) row(t['receiptReference'] ?? 'Reference', model.reference);
  row(t['receiptBalance'] ?? 'Balance on this invoice', formatMoney(BigInt(model.balanceAfterMinor), { currency: 'INR', locale: 'en-IN', decimals: 'always' }));
  row(t['receiptReceivedBy'] ?? 'Received by', model.receivedBy);

  // footer
  rule(H - 56);
  edge(`${t['receiptFooter'] ?? 'This is a computer-generated receipt.'}   \u2066${model.academicYear}\u2069`, H - 36, 9.5, { color: INK.muted, center: true });

  if (model.cancelled) {
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.globalAlpha = 0.28;
    const word = t['receiptCancelled'] ?? 'CANCELLED';
    font(word, familyFor(word, language) === 'OruSans' ? 64 : 46, true);
    ctx.fillStyle = INK.danger;
    ctx.textAlign = 'center';
    ctx.direction = directionOfText(word);
    ctx.fillText(word, 0, 0);
    ctx.restore();
  }
  return canvas.toBuffer(format);
}
