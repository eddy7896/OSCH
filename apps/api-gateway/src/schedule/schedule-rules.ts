/** Pure rules of the bell schedule and working days (P3-1, ADR-0013). Times are `HH:MM`, 24 hour; nothing here touches the network. */

export const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
export type Day = (typeof DAYS)[number];
export const DEFAULT_DAYS: readonly Day[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const isTime = (s: string): boolean => TIME.test(s);
/** Minutes since midnight. Call only with a valid `HH:MM`. */
export const minutes = (s: string): number => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));

/** The days in week order with duplicates gone, or `null` when the list is empty or names a day that does not exist. */
export function normalizeDays(input: readonly string[]): Day[] | null {
  const wanted = new Set(input.map((d) => d.trim().toUpperCase()));
  if (wanted.size === 0 || [...wanted].some((d) => !(DAYS as readonly string[]).includes(d))) return null;
  return DAYS.filter((d) => wanted.has(d));
}
export const daysText = (days: readonly Day[]): string => days.join(',');
export const daysFromText = (text: string): Day[] => normalizeDays(text.split(',')) ?? [...DEFAULT_DAYS];

export interface PeriodLike {
  label: string;
  startTime: string;
  endTime: string;
}

/**
 * What is wrong with a period, as a machine rule, or `null`. `others` are the school's other periods (not the one being edited).
 * Periods may touch (one ends at 09:10, the next starts at 09:10) but never overlap.
 */
export function periodProblem(p: PeriodLike, others: readonly PeriodLike[]): 'timeInvalid' | 'endNotAfterStart' | 'overlaps' | 'labelTaken' | 'startTaken' | null {
  if (!isTime(p.startTime) || !isTime(p.endTime)) return 'timeInvalid';
  const start = minutes(p.startTime), end = minutes(p.endTime);
  if (end <= start) return 'endNotAfterStart';
  for (const o of others) {
    if (o.label.trim().toLowerCase() === p.label.trim().toLowerCase()) return 'labelTaken';
    if (o.startTime === p.startTime) return 'startTaken';
    if (start < minutes(o.endTime) && minutes(o.startTime) < end) return 'overlaps';
  }
  return null;
}

export const TEMPLATES = ['STANDARD', 'SHORT_DAY'] as const;
export type TemplateName = (typeof TEMPLATES)[number];
/** The Data Connect operation that lays down each starting schedule in ONE transaction (the periods themselves are written in `mutations.gql`). */
export const TEMPLATE_OPERATION = { STANDARD: 'applyStandardSchedule', SHORT_DAY: 'applyShortDaySchedule' } as const satisfies Record<TemplateName, string>;

/** Teaching periods are numbered 1, 2, 3 ... in time order; breaks have no number. */
export function numberPeriods<T extends { startTime: string; isBreak: boolean }>(periods: readonly T[]): Array<T & { number: number | null }> {
  let n = 0;
  return [...periods].sort((a, b) => a.startTime.localeCompare(b.startTime)).map((x) => ({ ...x, number: x.isBreak ? null : ++n }));
}
