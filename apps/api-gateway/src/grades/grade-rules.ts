/**
 * Pure rules of exams and grading (P3-5, ADR-0013, E-EXAM-1). Marks are whole TENTHS of a mark; percentages and grades are computed with integers
 * only (BigInt for the multiplication), always rounding DOWN, so a student is never graded above what they scored. Nothing here uses floating point.
 */

export const MAX_TENTHS = 100_000; // 10,000 marks: far above any real exam, small enough that no product overflows

const MARKS = /^(\d{1,5})(?:\.(\d))?$/;
/** `72.5` -> 725, `72` -> 720; null for anything else (more than one decimal, a sign, an exponent, text). */
export function parseTenths(text: string): number | null {
  const m = MARKS.exec(text.trim());
  if (!m) return null;
  const tenths = Number(m[1]) * 10 + Number(m[2] ?? '0');
  return tenths <= MAX_TENTHS ? tenths : null;
}
/** 725 -> `72.5`, 720 -> `72`. */
export const formatTenths = (tenths: number): string => (tenths % 10 === 0 ? String(tenths / 10) : `${Math.floor(tenths / 10)}.${tenths % 10}`);

/** The share of the maximum, rounded down: `whole` is the integer percent used to find a band, `display` has one decimal (`33.3`). */
export function percentOf(tenths: number, maxTenths: number): { whole: number; display: string } {
  if (maxTenths <= 0) return { whole: 0, display: '0.0' };
  const thousandths = Number((BigInt(tenths) * 1000n) / BigInt(maxTenths));
  return { whole: Math.floor(thousandths / 10), display: `${Math.floor(thousandths / 10)}.${thousandths % 10}` };
}

export interface Band {
  label: string;
  minPercent: number;
  maxPercent: number;
}
/** A starting set a new school is offered; nothing is forced and the school may edit or replace it. */
export const STANDARD_BANDS: readonly Band[] = [
  { label: 'A1', minPercent: 90, maxPercent: 100 }, { label: 'A2', minPercent: 80, maxPercent: 89 }, { label: 'B1', minPercent: 70, maxPercent: 79 },
  { label: 'B2', minPercent: 60, maxPercent: 69 }, { label: 'C1', minPercent: 50, maxPercent: 59 }, { label: 'C2', minPercent: 40, maxPercent: 49 },
  { label: 'D', minPercent: 33, maxPercent: 39 }, { label: 'E', minPercent: 0, maxPercent: 32 },
];

export type BandsProblem = 'badRange' | 'labelTaken' | 'overlap' | 'gap' | 'startsAboveZero' | 'endsBelowHundred';
/** What is wrong with a set of bands, or null. An empty set is allowed (the school has not set any). Together they must cover 0 to 100 with no gap and no overlap. */
export function bandsProblem(bands: readonly Band[]): BandsProblem | null {
  if (bands.length === 0) return null;
  const labels = new Set<string>();
  for (const b of bands) {
    if (![b.minPercent, b.maxPercent].every((n) => Number.isInteger(n) && n >= 0 && n <= 100) || b.minPercent > b.maxPercent || b.label.trim() === '') return 'badRange';
    if (labels.has(b.label.trim().toLowerCase())) return 'labelTaken';
    labels.add(b.label.trim().toLowerCase());
  }
  const sorted = [...bands].sort((a, b) => a.minPercent - b.minPercent);
  if (sorted[0]!.minPercent > 0) return 'startsAboveZero';
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.minPercent <= sorted[i - 1]!.maxPercent) return 'overlap';
    if (sorted[i]!.minPercent > sorted[i - 1]!.maxPercent + 1) return 'gap';
  }
  return sorted[sorted.length - 1]!.maxPercent < 100 ? 'endsBelowHundred' : null;
}
/** The band label for a whole percent, or null when the school has no bands. */
export const gradeFor = (bands: readonly Band[], wholePercent: number): string | null => bands.find((b) => wholePercent >= b.minPercent && wholePercent <= b.maxPercent)?.label ?? null;

/** The bands stored on the school (JSON text); anything unreadable is treated as none. */
export function parseBands(text: string): Band[] {
  try {
    const v: unknown = JSON.parse(text || '[]');
    return Array.isArray(v) ? v.filter((b): b is Band => !!b && typeof b === 'object' && typeof (b as Band).label === 'string' && Number.isInteger((b as Band).minPercent) && Number.isInteger((b as Band).maxPercent)).sort((a, b) => b.minPercent - a.minPercent) : [];
  } catch {
    return [];
  }
}
export const bandsText = (bands: readonly Band[]): string => JSON.stringify(bands.map((b) => ({ label: b.label.trim(), minPercent: b.minPercent, maxPercent: b.maxPercent })));

export interface ExamFacts {
  id: string;
  title: string;
  date: string;
  maxTenths: number;
  subject: { id: string; name: string; code: string };
}
export interface MarkFact { tenths: number; absent: boolean }
export interface ExamLine { id: string; title: string; date: string; maxTenths: number; marksTenths: number | null; absent: boolean; percent: string | null; grade: string | null }
export interface SubjectLine {
  subject: { id: string; name: string; code: string };
  exams: ExamLine[];
  marksTenths: number;
  maxTenths: number;
  percent: string;
  grade: string | null;
  /** Exams of this subject that have no mark for the student yet: left out of the totals. */
  pending: number;
}
export interface CardTotals { marksTenths: number; maxTenths: number; percent: string; grade: string | null; pending: number }

/**
 * A student's report card for a term. An exam they were absent for counts as 0 out of its maximum; an exam with no mark yet is `pending` and left
 * out. Every total is the sum of the lines above it, so the card always adds up.
 */
export function reportCard(exams: readonly ExamFacts[], marks: ReadonlyMap<string, MarkFact>, bands: readonly Band[]): { subjects: SubjectLine[]; totals: CardTotals } {
  const bySubject = new Map<string, SubjectLine>();
  const grade = (m: number, max: number): { percent: string; grade: string | null } => {
    const p = percentOf(m, max);
    return { percent: p.display, grade: gradeFor(bands, p.whole) };
  };
  for (const e of [...exams].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))) {
    const line = bySubject.get(e.subject.id) ?? { subject: e.subject, exams: [], marksTenths: 0, maxTenths: 0, percent: '0.0', grade: null, pending: 0 };
    bySubject.set(e.subject.id, line);
    const m = marks.get(e.id);
    if (!m) {
      line.pending += 1;
      line.exams.push({ id: e.id, title: e.title, date: e.date, maxTenths: e.maxTenths, marksTenths: null, absent: false, percent: null, grade: null });
      continue;
    }
    line.marksTenths += m.tenths;
    line.maxTenths += e.maxTenths;
    const g = m.absent ? { percent: '0.0', grade: gradeFor(bands, 0) } : grade(m.tenths, e.maxTenths);
    line.exams.push({ id: e.id, title: e.title, date: e.date, maxTenths: e.maxTenths, marksTenths: m.tenths, absent: m.absent, percent: g.percent, grade: g.grade });
  }
  const subjects = [...bySubject.values()].sort((a, b) => a.subject.name.localeCompare(b.subject.name));
  for (const s of subjects) Object.assign(s, s.maxTenths > 0 ? grade(s.marksTenths, s.maxTenths) : { percent: '0.0', grade: null });
  const marksTenths = subjects.reduce((n, s) => n + s.marksTenths, 0), maxTenths = subjects.reduce((n, s) => n + s.maxTenths, 0);
  return { subjects, totals: { marksTenths, maxTenths, pending: subjects.reduce((n, s) => n + s.pending, 0), ...(maxTenths > 0 ? grade(marksTenths, maxTenths) : { percent: '0.0', grade: null }) } };
}
