import { MAX_IMPORT_ROWS, normalizeHeader, parseCsv } from './csv.js';

describe('parseCsv', () => {
  it('reads a plain file; the header is row 1 and data starts at row 2', () => {
    const r = parseCsv('a,b\n1,2\n3,4\n');
    expect(r.header).toEqual(['a', 'b']);
    expect(r.rows).toEqual([{ row: 2, cells: ['1', '2'] }, { row: 3, cells: ['3', '4'] }]);
    expect(r.problems).toEqual([]);
  });
  it('handles a byte-order mark, CRLF and old Mac CR line ends, and a missing final newline', () => {
    expect(parseCsv('﻿a,b\r\n1,2\r\n3,4').rows.map((x) => x.cells)).toEqual([['1', '2'], ['3', '4']]);
    expect(parseCsv('a,b\r1,2\r3,4').rows.map((x) => x.cells)).toEqual([['1', '2'], ['3', '4']]);
    expect(parseCsv('﻿a,b\n1,2').header).toEqual(['a', 'b']);
  });
  it('quoted cells: commas, doubled quotes and line breaks inside; row numbers follow the file lines', () => {
    const r = parseCsv('name,note\n"Rao, Anita","said ""hi"""\n"two\nlines",x\nlast,y');
    expect(r.rows).toEqual([
      { row: 2, cells: ['Rao, Anita', 'said "hi"'] },
      { row: 3, cells: ['two\nlines', 'x'] },
      { row: 5, cells: ['last', 'y'] },
    ]);
  });
  it('skips blank lines but they still count in the row numbers; trims unquoted cells only', () => {
    const r = parseCsv('a,b\n\n  1 , 2\n,\n" kept ",x');
    expect(r.rows).toEqual([{ row: 3, cells: ['1', '2'] }, { row: 5, cells: [' kept ', 'x'] }]);
  });
  it('empty cells stay empty; short rows are short', () => {
    expect(parseCsv('a,b,c\n1,,3\n4').rows.map((x) => x.cells)).toEqual([['1', '', '3'], ['4']]);
  });
  it('reports an unterminated quote with the row it started on', () => {
    const r = parseCsv('a,b\n1,2\n"oops,3\n4,5');
    expect(r.problems).toContainEqual({ row: 3, rule: 'unterminatedQuote' });
  });
  it('reports no header, no rows, too many rows and over-long cells', () => {
    expect(parseCsv('').problems).toEqual([{ row: 1, rule: 'noHeader' }]);
    expect(parseCsv('a,b\n').problems).toEqual([{ row: 1, rule: 'noRows' }]);
    const many = `a\n${Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => String(i)).join('\n')}`;
    const r = parseCsv(many);
    expect(r.rows).toHaveLength(MAX_IMPORT_ROWS);
    expect(r.problems).toContainEqual({ row: MAX_IMPORT_ROWS + 2, rule: 'tooManyRows' });
    expect(parseCsv(`a\n${'x'.repeat(1001)}`).problems).toContainEqual({ row: 2, rule: 'cellTooLong', column: 'a' });
  });
  it('a quote in the middle of an unquoted cell is just text', () => {
    expect(parseCsv('a\n5" ruler').rows[0]!.cells).toEqual(['5" ruler']);
  });
});

describe('normalizeHeader', () => {
  it('ignores case, spaces and punctuation', () => {
    for (const h of ['First name', 'first_name', 'FIRST-NAME', ' firstName ']) expect(normalizeHeader(h)).toBe('firstname');
  });
});
