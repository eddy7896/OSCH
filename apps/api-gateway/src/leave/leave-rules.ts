/** Pure rules of leave (P3-6, ADR-0013). Leave is counted in HALF-DAYS (a whole day is 2), so a half day needs no fractions. Nothing here touches the network. */
import { addDays, isDate, weekday } from '../attendance/attendance-rules.js';

export const HALVES = ['MORNING', 'AFTERNOON'] as const;
export const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;
export const MAX_RANGE_DAYS = 366;

const DAYS_TEXT = /^(\d{1,3})(?:\.([05]))?$/;
/** `12` -> 24, `12.5` -> 25; null for anything that is not a whole or half number of days. */
export function parseHalfDays(text: string): number | null {
  const m = DAYS_TEXT.exec(text.trim());
  return m ? Number(m[1]) * 2 + (m[2] === '5' ? 1 : 0) : null;
}
/** 25 -> `12.5`, 24 -> `12`. */
export const formatHalfDays = (n: number): string => (n % 2 === 0 ? String(n / 2) : `${Math.floor(n / 2)}.5`);

export type RangeProblem = 'notADate' | 'endBeforeStart' | 'rangeTooLong' | 'halfNeedsOneDay' | 'notAWorkingDay' | 'noWorkingDays';
/** How many half-days a request is, counting only the school's working days, or what is wrong with it. */
export function countHalfDays(start: string, end: string, half: string | null | undefined, workingDays: readonly string[]): { halfDays: number } | { problem: RangeProblem } {
  if (!isDate(start) || !isDate(end)) return { problem: 'notADate' };
  if (end < start) return { problem: 'endBeforeStart' };
  if (addDays(start, MAX_RANGE_DAYS) < end) return { problem: 'rangeTooLong' };
  if (half) {
    if (start !== end) return { problem: 'halfNeedsOneDay' };
    return workingDays.includes(weekday(start)) ? { halfDays: 1 } : { problem: 'notAWorkingDay' };
  }
  let days = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) if (workingDays.includes(weekday(d))) days += 1;
  return days === 0 ? { problem: 'noWorkingDays' } : { halfDays: days * 2 };
}

export interface Span { startDate: string; endDate: string; half?: string | null }
/** Whether two requests ask for the same time. A morning and an afternoon of one day do not clash. */
export function overlaps(a: Span, b: Span): boolean {
  if (a.endDate < b.startDate || b.endDate < a.startDate) return false;
  if (a.startDate === a.endDate && b.startDate === b.endDate && a.startDate === b.startDate && a.half && b.half && a.half !== b.half) return false;
  return true;
}

/** The academic year that holds the whole request, or null: a request cannot straddle two years (its balance belongs to one). */
export function yearHolding<T extends { startDate: string; endDate: string }>(years: readonly T[], start: string, end: string): T | null {
  return years.find((y) => y.startDate <= start && end <= y.endDate) ?? null;
}
