/** A report as a table (P2-9): one shape that both the CSV and the PDF are made from, so the two can never disagree. Amounts stay as paise until the last step. */
export type ColumnKind = 'text' | 'date' | 'money' | 'count';

export interface Column {
  key: string;
  /** Already in the reader's language. */
  label: string;
  kind: ColumnKind;
  /** Relative width in the PDF. */
  weight: number;
}

export interface ReportTable {
  title: string;
  /** Lines under the title: the school, the period. */
  subtitle: string[];
  columns: Column[];
  /** Cells as strings: text as is, dates `YYYY-MM-DD`, money as paise, counts as integers. */
  rows: string[][];
  /** Summary rows drawn in bold under the data. */
  totals: string[][];
}

/** Paise as a plain decimal, `123456` -> `1234.56`, `-5` -> `-0.05`: what a spreadsheet reads as a number (no symbol, no grouping). */
export function decimalOf(minor: string | bigint): string {
  const v = BigInt(minor);
  const neg = v < 0n;
  const abs = neg ? -v : v;
  return `${neg ? '-' : ''}${abs / 100n}.${String(abs % 100n).padStart(2, '0')}`;
}

/**
 * A spreadsheet runs a text cell that starts with `=`, `+`, `-`, `@`, tab or carriage return as a formula (CSV injection through a student's
 * name or a payment reference), so such a cell gets a leading apostrophe. Number columns are generated here and are safe as they are.
 */
export const safeText = (s: string): string => (/^[=+\-@\t\r]/.test(s) ? `'${s}` : s);

const quote = (s: string): string => (/[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s);

/** UTF-8 with a byte-order mark (so Excel opens Hindi and Urdu correctly), comma separated, CRLF line ends, a header row first. */
export function toCsv(table: ReportTable): string {
  const cell = (c: Column, v: string): string => (v === '' ? '' : c.kind === 'money' ? decimalOf(v) : c.kind === 'text' ? safeText(v) : v);
  const line = (cells: string[]): string => cells.map((v, i) => quote(cell(table.columns[i]!, v))).join(',');
  const body = [table.columns.map((c) => quote(safeText(c.label))).join(','), ...table.rows.map(line), ...table.totals.map(line)];
  return `﻿${body.join('\r\n')}\r\n`;
}
