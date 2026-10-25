/** Pure rules of attendance (P3-4, ADR-0013). Nothing here touches the network. */
import { createHash } from 'node:crypto';
import { DAYS } from '../schedule/schedule-rules.js';

/** The seven fixed meanings. A school may relabel them, never add, remove or redefine one. */
export const STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'LEAVE', 'MEDICAL', 'HALF_DAY', 'EXCUSED'] as const;
export type Status = (typeof STATUSES)[number];
/** Shown until a school sets its own wording. */
export const DEFAULT_LABELS: Record<Status, string> = { PRESENT: 'Present', ABSENT: 'Absent', LATE: 'Late', LEAVE: 'On leave', MEDICAL: 'Medical', HALF_DAY: 'Half day', EXCUSED: 'Excused' };

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
export function isDate(s: string): boolean {
  const m = DATE.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === s;
}
/** Today's date at the school (India Standard Time: the product's market and the only zone a school can be in for now). */
export const today = (now: Date = new Date()): string => new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
export const weekday = (date: string): (typeof DAYS)[number] => (['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const)[new Date(`${date}T00:00:00Z`).getUTCDay()]!;
export const addDays = (date: string, n: number): string => new Date(new Date(`${date}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);

/** A stable id for a mark, so saving the same student on the same day twice is one row. */
export function markId(dayId: string, studentId: string): string {
  const h = createHash('sha1').update(`${dayId.toLowerCase()}:${studentId.toLowerCase()}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
/** A stable id for a staff member's day. */
export const staffDayId = (staffId: string, date: string): string => markId(`staff-${date}`, staffId);

export interface Wanted { status: Status; note: string | null }
export interface Existing extends Wanted { id: string }
/** What to write so the day holds exactly `wanted`: marks to save (new or changed) and marks to remove. A PRESENT entry means "no exception". */
export function diffMarks(existing: ReadonlyMap<string, Existing>, wanted: ReadonlyMap<string, Wanted>): { save: Array<[string, Wanted]>; remove: Array<[string, string]> } {
  const exceptions = [...wanted].filter(([, w]) => w.status !== 'PRESENT');
  const keep = new Set(exceptions.map(([id]) => id));
  return {
    save: exceptions.filter(([id, w]) => { const e = existing.get(id); return !e || e.status !== w.status || (e.note ?? null) !== w.note; }),
    remove: [...existing].filter(([id]) => !keep.has(id)).map(([student, e]) => [student, e.id]),
  };
}

export function countStatuses(marks: ReadonlyArray<{ status: string }>, rosterSize: number): Record<Status, number> {
  const out = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  for (const m of marks) out[m.status as Status] += 1;
  out.PRESENT = Math.max(0, rosterSize - marks.length);
  return out;
}
