/** Pure rules of the timetable (P3-3, ADR-0013): who clashes with whom, and how loaded a teacher is. The database enforces the same two rules with unique keys. */
import { DAYS } from '../schedule/schedule-rules.js';

export interface SlotLike {
  id: string;
  classId: string;
  staffId: string;
  day: string;
  periodId: string;
}

/** What stops `want` being placed: its class already has a lesson in that slot, or its teacher is teaching another class in it. `ignoreId` is the entry being replaced. */
export function slotProblem(all: readonly SlotLike[], want: Omit<SlotLike, 'id'>, ignoreId?: string): 'classBusy' | 'teacherBusy' | null {
  const there = all.filter((e) => e.id !== ignoreId && e.day === want.day && e.periodId === want.periodId);
  if (there.some((e) => e.classId === want.classId)) return 'classBusy';
  if (there.some((e) => e.staffId === want.staffId)) return 'teacherBusy';
  return null;
}

/** Lessons per week for each member of staff, in total and by day. */
export function weeklyLoad(entries: ReadonlyArray<Pick<SlotLike, 'staffId' | 'day'>>): Map<string, { total: number; byDay: Record<string, number> }> {
  const out = new Map<string, { total: number; byDay: Record<string, number> }>();
  for (const e of entries) {
    const row = out.get(e.staffId) ?? { total: 0, byDay: Object.fromEntries(DAYS.map((d) => [d, 0])) };
    row.total += 1;
    row.byDay[e.day] = (row.byDay[e.day] ?? 0) + 1;
    out.set(e.staffId, row);
  }
  return out;
}
