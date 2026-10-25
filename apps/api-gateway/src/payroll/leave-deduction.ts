/**
 * The payroll proposal for unpaid leave (P3-8, ADR-0013 decisions 8 and 10, E-ACAD-3). The cut for one day is the person's monthly gross pay divided by the school's working days
 * of that month; a half day is half of that; the result is rounded DOWN to the paisa. All money is bigint paise: nothing here uses a floating-point number.
 */
import { addDays, weekday } from '../attendance/attendance-rules.js';
import { countHalfDays } from '../leave/leave-rules.js';

/** How many days of the month the school works. */
export function workingDaysInMonth(year: number, month: number, workingDays: readonly string[]): number {
  const first = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`;
  const last = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  let n = 0;
  for (let d = first; d <= last; d = addDays(d, 1)) if (workingDays.includes(weekday(d))) n += 1;
  return n;
}

export const monthBounds = (year: number, month: number): { first: string; last: string } => ({
  first: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`,
  last: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10),
});

/** The half-days of a leave that fall inside a month, counting only the school's working days. */
export function halfDaysInMonth(leave: { startDate: string; endDate: string; half?: string | null }, year: number, month: number, workingDays: readonly string[]): number {
  const { first, last } = monthBounds(year, month);
  const start = leave.startDate > first ? leave.startDate : first;
  const end = leave.endDate < last ? leave.endDate : last;
  if (end < start) return 0;
  const counted = countHalfDays(start, end, leave.half, workingDays);
  return 'halfDays' in counted ? counted.halfDays : 0;
}

/** gross × half-days ÷ (2 × working days of the month), rounded down. Zero when the school works no day that month. */
export function deductionMinor(grossMinor: bigint, halfDays: number, monthWorkingDays: number): bigint {
  if (grossMinor <= 0n || halfDays <= 0 || monthWorkingDays <= 0) return 0n;
  return (grossMinor * BigInt(halfDays)) / (2n * BigInt(monthWorkingDays));
}

/** The name of the line the proposal becomes; it is also how an applied proposal is recognised. */
export const LEAVE_LINE_NAME = 'Unpaid leave';
