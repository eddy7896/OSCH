import { bandsProblem, formatTenths, gradeFor, parseBands, parseTenths, percentOf, reportCard, STANDARD_BANDS, bandsText } from './grade-rules.js';

/** Shared vectors for E-EXAM-1: input, expected. A client that computes the same numbers must agree with these. */
const PERCENT_VECTORS: Array<[number, number, number, string]> = [
  [725, 1000, 72, '72.5'], [0, 1000, 0, '0.0'], [1000, 1000, 100, '100.0'], [999, 1000, 99, '99.9'], [1, 3, 33, '33.3'], [2, 3, 66, '66.6'], [895, 1000, 89, '89.5'], [899, 1000, 89, '89.9'], [330, 1000, 33, '33.0'], [329, 1000, 32, '32.9'], [10, 70, 14, '14.2'],
];

describe('marks and percentages (integers only)', () => {
  it.each(PERCENT_VECTORS)('%i of %i is %i percent (%s)', (m, max, whole, shown) => expect(percentOf(m, max)).toEqual({ whole, display: shown }));
  it('parses marks with at most one decimal and refuses everything else', () => {
    expect(parseTenths('72.5')).toBe(725); expect(parseTenths('72')).toBe(720); expect(parseTenths('0.5')).toBe(5); expect(parseTenths(' 100 ')).toBe(1000);
    for (const bad of ['72.55', '-1', '1e3', '', 'abc', '72.', '.5', '100000', '1,5']) expect(parseTenths(bad), bad).toBeNull();
    expect(formatTenths(725)).toBe('72.5'); expect(formatTenths(720)).toBe('72'); expect(formatTenths(5)).toBe('0.5');
  });
  it('never rounds a student up into a better band', () => {
    expect(gradeFor(parseBands(bandsText(STANDARD_BANDS)), percentOf(899, 1000).whole)).toBe('A2'); // 89.9 is not 90
    expect(gradeFor(parseBands(bandsText(STANDARD_BANDS)), percentOf(900, 1000).whole)).toBe('A1');
  });
});

describe('grade bands', () => {
  const b = (label: string, minPercent: number, maxPercent: number) => ({ label, minPercent, maxPercent });
  it('the starting set is valid', () => expect(bandsProblem(STANDARD_BANDS)).toBeNull());
  it('an empty set is allowed', () => expect(bandsProblem([])).toBeNull());
  it('refuses overlap, gaps, a start above zero, an end below 100, a duplicate label and a bad range', () => {
    expect(bandsProblem([b('A', 0, 50), b('B', 50, 100)])).toBe('overlap');
    expect(bandsProblem([b('A', 0, 49), b('B', 51, 100)])).toBe('gap');
    expect(bandsProblem([b('A', 1, 100)])).toBe('startsAboveZero');
    expect(bandsProblem([b('A', 0, 99)])).toBe('endsBelowHundred');
    expect(bandsProblem([b('A', 0, 49), b('a', 50, 100)])).toBe('labelTaken');
    expect(bandsProblem([b('A', 60, 50)])).toBe('badRange');
    expect(bandsProblem([b('A', 0, 101)])).toBe('badRange');
    expect(bandsProblem([b('A', 0.5, 100)])).toBe('badRange');
  });
  it('order does not matter; the whole range is covered exactly once', () => {
    expect(bandsProblem([b('B', 50, 100), b('A', 0, 49)])).toBeNull();
    for (let p = 0; p <= 100; p++) expect(STANDARD_BANDS.filter((x) => p >= x.minPercent && p <= x.maxPercent), String(p)).toHaveLength(1);
  });
  it('no bands: no grade', () => expect(gradeFor([], 50)).toBeNull());
});

describe('report card', () => {
  const subject = (id: string, name: string) => ({ id, name, code: name.slice(0, 1) });
  const exams = [
    { id: 'e1', title: 'Unit 1', date: '2090-05-01', maxTenths: 500, subject: subject('m', 'Maths') },
    { id: 'e2', title: 'Unit 2', date: '2090-06-01', maxTenths: 500, subject: subject('m', 'Maths') },
    { id: 'e3', title: 'Unit 1', date: '2090-05-02', maxTenths: 1000, subject: subject('s', 'Science') },
    { id: 'e4', title: 'Unit 2', date: '2090-06-02', maxTenths: 1000, subject: subject('s', 'Science') },
  ];
  it('adds up: subjects are the sum of their exams and the total the sum of the subjects; absent is zero; unmarked is pending', () => {
    const marks = new Map([['e1', { tenths: 450, absent: false }], ['e2', { tenths: 0, absent: true }], ['e3', { tenths: 725, absent: false }]]);
    const c = reportCard(exams, marks, parseBands(bandsText(STANDARD_BANDS)));
    const maths = c.subjects.find((s) => s.subject.id === 'm')!, sci = c.subjects.find((s) => s.subject.id === 's')!;
    expect(maths).toMatchObject({ marksTenths: 450, maxTenths: 1000, percent: '45.0', grade: 'C2', pending: 0 });
    expect(maths.exams.find((e) => e.id === 'e2')).toMatchObject({ absent: true, marksTenths: 0, percent: '0.0', grade: 'E' });
    expect(sci).toMatchObject({ marksTenths: 725, maxTenths: 1000, percent: '72.5', grade: 'B1', pending: 1 });
    expect(c.totals).toMatchObject({ marksTenths: 1175, maxTenths: 2000, percent: '58.7', grade: 'C1', pending: 1 });
    expect(c.totals.marksTenths).toBe(c.subjects.reduce((n, s) => n + s.marksTenths, 0));
    expect(c.totals.marksTenths).toBe(c.subjects.flatMap((s) => s.exams).reduce((n, e) => n + (e.marksTenths ?? 0), 0));
  });
  it('a school with no bands still gets marks and percentages', () => {
    const c = reportCard(exams, new Map([['e1', { tenths: 250, absent: false }]]), []);
    expect(c.totals.grade).toBeNull();
    expect(c.subjects[0]!.percent).toBe('50.0');
  });
  it('nothing marked: zero out of zero, no division', () => expect(reportCard(exams, new Map(), []).totals).toEqual({ marksTenths: 0, maxTenths: 0, percent: '0.0', grade: null, pending: 4 }));
});
