/**
 * A small, strict CSV reader (RFC 4180 plus what spreadsheets really write): a leading byte-order mark, CRLF, LF or CR line ends,
 * quoted cells with commas, doubled quotes and line breaks inside, and a trailing blank line. Fully blank lines are skipped.
 * Row numbers count the way a spreadsheet does: the header is row 1, the first data row is row 2 (blank lines still count).
 */
export const MAX_IMPORT_ROWS = 500;
export const MAX_IMPORT_COLUMNS = 40;
export const MAX_CELL_LENGTH = 1000;

export type CsvProblem = { row: number; rule: 'unterminatedQuote' | 'cellTooLong' | 'tooManyColumns' | 'tooManyRows' | 'noHeader' | 'noRows'; column?: string };
export interface ParsedCsv {
  header: string[];
  /** Data rows with their spreadsheet row number. */
  rows: Array<{ row: number; cells: string[] }>;
  problems: CsvProblem[];
}

export function parseCsv(input: string): ParsedCsv {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const records: Array<{ row: number; cells: string[] }> = [];
  const problems: CsvProblem[] = [];
  let cells: string[] = [];
  let cell = '';
  let inQuotes = false;
  let quoted = false;
  let line = 1;
  let startLine = 1;
  let blank = true;

  const endCell = () => {
    cells.push(quoted ? cell : cell.trim());
    if (cell.length > 0 || quoted) blank = false;
    cell = '';
    quoted = false;
  };
  const endRecord = () => {
    endCell();
    if (!blank) records.push({ row: startLine, cells });
    cells = [];
    blank = true;
    startLine = line;
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else {
        if (c === '\n') line++;
        cell += c;
      }
      continue;
    }
    if (c === '"' && cell.trim() === '') {
      inQuotes = true;
      quoted = true;
      cell = '';
    } else if (c === ',') endCell();
    else if (c === '\r' || c === '\n') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      line++;
      endRecord();
    } else cell += c;
  }
  if (inQuotes) problems.push({ row: startLine, rule: 'unterminatedQuote' });
  else if (cell !== '' || cells.length > 0 || quoted) endRecord();

  const header = records.shift();
  if (!header) {
    problems.push({ row: 1, rule: 'noHeader' });
    return { header: [], rows: [], problems };
  }
  if (header.cells.length > MAX_IMPORT_COLUMNS) problems.push({ row: header.row, rule: 'tooManyColumns' });
  if (records.length === 0) problems.push({ row: header.row, rule: 'noRows' });
  if (records.length > MAX_IMPORT_ROWS) problems.push({ row: records[MAX_IMPORT_ROWS]!.row, rule: 'tooManyRows' });
  for (const r of records.slice(0, MAX_IMPORT_ROWS)) {
    r.cells.forEach((v, idx) => {
      if (v.length > MAX_CELL_LENGTH) problems.push({ row: r.row, rule: 'cellTooLong', column: header.cells[idx] ?? String(idx + 1) });
    });
  }
  return { header: header.cells, rows: records.slice(0, MAX_IMPORT_ROWS), problems };
}

/** "First name", "first_name" and "FIRSTNAME" are the same column. */
export const normalizeHeader = (h: string): string => h.toLowerCase().replace(/[^a-z0-9]/g, '');
