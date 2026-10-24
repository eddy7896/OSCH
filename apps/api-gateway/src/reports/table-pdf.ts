import { formatMoney } from '@oruschools/format';
import { createPage, directionOfText, INK } from '../pdf/kit.js';
import type { Column, ReportTable } from './table.js';

/** A report table as a PDF (P2-9): A4 landscape, a header row on every page, bold summary rows at the end, page numbers. Same page kit as the receipt and payslip. */
export const TABLE_WIDTH = 842;
export const TABLE_HEIGHT = 595;
const ROW = 20;
const HEAD_END = 86;
const FOOT = 36;

const dmy = (iso: string): string => `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}`;
const show = (c: Column, v: string): string => (v === '' ? '' : c.kind === 'money' ? formatMoney(BigInt(v), { currency: 'INR', locale: 'en-IN', decimals: 'always' }) : c.kind === 'date' ? dmy(v) : v);

/** How many body rows fit on one page. */
export const rowsPerPage = (extraRows = 0): number => Math.floor((TABLE_HEIGHT - HEAD_END - 30 - FOOT - extraRows * ROW) / ROW);

export async function renderTablePdf(table: ReportTable, language: string): Promise<Buffer> {
  const p = createPage(TABLE_WIDTH, TABLE_HEIGHT, language);
  const { W, M, rtl, rule, edge } = p;
  const usable = W - 2 * M;
  const totalWeight = table.columns.reduce((s, c) => s + c.weight, 0);
  // Columns run from the reading edge: left to right in left-to-right languages, right to left in the others.
  let offset = 0;
  const boxes = table.columns.map((c) => {
    const width = (usable * c.weight) / totalWeight;
    const box = { c, x: rtl ? W - M - offset - width : M + offset, width };
    offset += width;
    return box;
  });
  const cell = (text: string, box: { c: Column; x: number; width: number }, y: number, bold: boolean, color: string = INK.text): void => {
    const numeric = box.c.kind === 'money' || box.c.kind === 'count';
    const pad = 5;
    p.font(text, 10.5, bold);
    const ctx = p.ctx;
    ctx.fillStyle = color;
    ctx.direction = directionOfText(text);
    // Numbers sit on the far side of their column (right in left-to-right, left in right-to-left); text starts at the reading edge.
    const left = numeric !== rtl;
    ctx.textAlign = left ? 'right' : 'left';
    ctx.fillText(p.fit(text, box.width - 2 * pad), left ? box.x + box.width - pad : box.x + pad, y);
  };

  const rows = [...table.rows.map((r) => ({ r, bold: false })), ...table.totals.map((r) => ({ r, bold: true }))];
  const perPage = rowsPerPage();
  const pageCount = Math.max(1, Math.ceil(rows.length / perPage));
  for (let page = 0; page < pageCount; page++) {
    if (page > 0) p.newPage();
    edge(table.title, 40, 17, { bold: true });
    let y = 60;
    for (const line of table.subtitle) {
      edge(line, y, 10.5, { color: INK.muted });
      y += 14;
    }
    y = HEAD_END + 8;
    for (const b of boxes) cell(b.c.label, b, y, true, INK.muted);
    rule(y + 7, INK.text);
    y += ROW + 4;
    for (const { r, bold } of rows.slice(page * perPage, (page + 1) * perPage)) {
      if (bold) rule(y - 14);
      boxes.forEach((b, i) => cell(show(b.c, r[i] ?? ''), b, y, bold));
      y += ROW;
    }
    edge(`${page + 1} / ${pageCount}`, TABLE_HEIGHT - FOOT + 14, 9.5, { color: INK.muted, center: true });
  }
  return p.canvas.toBuffer('pdf');
}
