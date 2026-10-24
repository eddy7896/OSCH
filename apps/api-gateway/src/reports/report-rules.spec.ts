import { bandOf, daysBetween, rangeProblem, realDate, summarisePayments } from './report-rules.js';
import { decimalOf, safeText, toCsv, type ReportTable } from './table.js';

describe('dates', () => {
  it('knows real calendar dates', () => {
    expect(realDate('2028-02-29')).toBe(true);
    expect(realDate('2027-02-29')).toBe(false);
    expect(realDate('2027-13-01')).toBe(false);
    expect(realDate('27-01-01')).toBe(false);
  });
  it('counts days between dates without a time zone moving them', () => {
    expect(daysBetween('2027-03-01', '2027-03-31')).toBe(30);
    expect(daysBetween('2027-12-31', '2028-01-01')).toBe(1);
    expect(daysBetween('2027-04-10', '2027-04-10')).toBe(0);
  });
  it('limits a window to 366 days, both ends included', () => {
    expect(rangeProblem('2027-04-01', '2027-04-01')).toBeNull();
    expect(rangeProblem('2027-01-01', '2027-12-31')).toBeNull();
    expect(rangeProblem('2028-01-01', '2028-12-31')).toBeNull(); // a leap year: 366 days
    expect(rangeProblem('2027-01-01', '2028-01-01')).toBeNull(); // 366 days
    expect(rangeProblem('2027-01-01', '2028-01-02')).toBe('rangeTooLong');
    expect(rangeProblem('2027-05-02', '2027-05-01')).toBe('beforeFrom');
    expect(rangeProblem('2027-02-30', '2027-05-01')).toBe('realDate');
  });
});

describe('ageing of dues', () => {
  it('puts a due date into the band for the days past it', () => {
    expect([0, 1, 30, 31, 60, 61, 90, 91, 400].map(bandOf)).toEqual(['DUE_TODAY', 'DAYS_1_30', 'DAYS_1_30', 'DAYS_31_60', 'DAYS_31_60', 'DAYS_61_90', 'DAYS_61_90', 'DAYS_OVER_90', 'DAYS_OVER_90']);
  });
});

describe('summarisePayments', () => {
  const rows = [
    { paidOn: '2027-04-02', method: 'CASH', amountMinor: '100000', reversed: false },
    { paidOn: '2027-04-02', method: 'UPI', amountMinor: '250050', reversed: false },
    { paidOn: '2027-04-01', method: 'CASH', amountMinor: '50', reversed: false },
    { paidOn: '2027-04-03', method: 'CASH', amountMinor: '999999', reversed: true },
  ];
  it('adds standing payments exactly and keeps reversed ones apart', () => {
    const s = summarisePayments(rows);
    expect(s).toMatchObject({ count: 3, collectedMinor: 350100n, reversedMinor: 999999n });
    expect(s.byMethod).toEqual([{ method: 'CASH', count: 2, amountMinor: 100050n }, { method: 'UPI', count: 1, amountMinor: 250050n }]);
    expect(s.byDay).toEqual([{ date: '2027-04-01', count: 1, amountMinor: 50n }, { date: '2027-04-02', count: 2, amountMinor: 350050n }]);
  });
  it('stays exact beyond what a floating-point number can hold', () => {
    const big = '9007199254740993'; // 2^53 + 1
    expect(summarisePayments([{ paidOn: '2027-04-01', method: 'CASH', amountMinor: big, reversed: false }, { paidOn: '2027-04-01', method: 'CASH', amountMinor: '1', reversed: false }]).collectedMinor).toBe(9007199254740994n);
  });
  it('an empty window is all zero', () => {
    expect(summarisePayments([])).toMatchObject({ count: 0, collectedMinor: 0n, reversedMinor: 0n, byMethod: [], byDay: [] });
  });
});

describe('CSV', () => {
  it('writes paise as plain decimals', () => {
    expect(decimalOf('123456')).toBe('1234.56');
    expect(decimalOf('5')).toBe('0.05');
    expect(decimalOf('0')).toBe('0.00');
    expect(decimalOf('-5')).toBe('-0.05');
    expect(decimalOf(9007199254740993n)).toBe('90071992547409.93');
  });
  it('defuses cells a spreadsheet would run as formulas', () => {
    expect(safeText('=HYPERLINK("x")')).toBe(`'=HYPERLINK("x")`);
    expect(safeText('+91 98765')).toBe("'+91 98765");
    expect(safeText('@cmd')).toBe("'@cmd");
    expect(safeText('-1')).toBe("'-1");
    expect(safeText('Asha Kumar')).toBe('Asha Kumar');
  });
  const table: ReportTable = {
    title: 'T', subtitle: [],
    columns: [{ key: 'a', label: 'Name', kind: 'text', weight: 1 }, { key: 'b', label: 'Amount', kind: 'money', weight: 1 }, { key: 'c', label: 'Days', kind: 'count', weight: 1 }, { key: 'd', label: 'Date', kind: 'date', weight: 1 }],
    rows: [['Asha, "Ash" Kumar', '12500', '3', '2027-04-02'], ['=cmd', '5', '0', '']],
    totals: [['Total', '12505', '', '']],
  };
  it('starts with a byte-order mark, ends lines with CRLF, quotes what needs it, and writes the totals', () => {
    const csv = toCsv(table);
    expect(csv.startsWith('﻿Name,Amount,Days,Date\r\n')).toBe(true);
    expect(csv.split('\r\n')).toEqual(['﻿Name,Amount,Days,Date', '"Asha, ""Ash"" Kumar",125.00,3,2027-04-02', "'=cmd,0.05,0,", 'Total,125.05,,', '']);
  });
  it('keeps Hindi and Urdu text as it is', () => {
    const csv = toCsv({ ...table, rows: [['आशा कुमार', '100', '1', '2027-04-02'], ['آشا کمار', '100', '1', '2027-04-02']], totals: [] });
    expect(csv).toContain('आशा कुमार,1.00');
    expect(csv).toContain('آشا کمار,1.00');
  });
});
