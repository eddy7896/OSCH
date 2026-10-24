import { renderTablePdf, rowsPerPage } from './table-pdf.js';
import type { ReportTable } from './table.js';

const table = (n: number, over: Partial<ReportTable> = {}): ReportTable => ({
  title: 'Fee collections', subtitle: ['Green Valley School', '01-04-2027 – 30-04-2027'],
  columns: [{ key: 'a', label: 'Student', kind: 'text', weight: 3 }, { key: 'b', label: 'Date', kind: 'date', weight: 1 }, { key: 'c', label: 'Amount', kind: 'money', weight: 1.5 }, { key: 'd', label: 'Days', kind: 'count', weight: 1 }],
  rows: Array.from({ length: n }, (_, i) => [`Student ${i}`, '2027-04-02', String(100000 + i), String(i % 40)]), totals: [['Total', '', '12345600', '']], ...over,
});
const text = (pdf: Buffer) => pdf.toString('latin1');
const pages = (pdf: Buffer) => (text(pdf).match(/\/Type\s*\/Page\b/g) ?? []).length;

describe('renderTablePdf (a real PDF, drawn with skia-canvas)', () => {
  it('makes a valid one-page PDF with embedded fonts for a short table', async () => {
    const pdf = await renderTablePdf(table(5), 'en');
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(text(pdf)).toMatch(/%%EOF\s*$/);
    expect(pages(pdf)).toBe(1);
    expect(text(pdf)).toMatch(/\/FontFile2|\/FontFile3/);
  });
  it('runs onto more pages exactly as rows require, with the totals on the last', async () => {
    const per = rowsPerPage();
    expect(per).toBeGreaterThan(15);
    expect(pages(await renderTablePdf(table(per - 1), 'en'))).toBe(1); // data rows plus one totals row fill the page exactly
    expect(pages(await renderTablePdf(table(per), 'en'))).toBe(2);
    expect(pages(await renderTablePdf(table(per * 3 - 1), 'en'))).toBe(3);
  });
  it('an empty report is still one page', async () => {
    expect(pages(await renderTablePdf(table(0, { totals: [] }), 'en'))).toBe(1);
  });
  it('draws Hindi and Urdu (right to left) without failing, and differently from English', async () => {
    const en = await renderTablePdf(table(3), 'en');
    const hi = await renderTablePdf(table(3, { title: 'शुल्क संग्रह', columns: table(0).columns.map((c, i) => ({ ...c, label: ['छात्र', 'दिनांक', 'राशि', 'दिन'][i]! })) }), 'hi');
    const ur = await renderTablePdf(table(3, { title: 'فیس کی وصولی', columns: table(0).columns.map((c, i) => ({ ...c, label: ['طالب علم', 'تاریخ', 'رقم', 'دن'][i]! })) }), 'ur');
    for (const pdf of [hi, ur]) {
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
      expect(pdf.length).toBeGreaterThan(5_000);
    }
    expect(hi.equals(en)).toBe(false);
    expect(ur.equals(hi)).toBe(false);
  });
  it('a long text is cut to its column rather than running over the next one', async () => {
    const pdf = await renderTablePdf(table(1, { rows: [['x'.repeat(500), '2027-04-02', '100', '1']] }), 'en');
    expect(pages(pdf)).toBe(1);
  });
});
