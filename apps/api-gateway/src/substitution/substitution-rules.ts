/**
 * Pure rules of substitution (P3-7, ADR-0013 decisions 4 and 6, E-ACAD-2). A suggestion is always someone who is free in the period and qualified for the subject; the database
 * checks the same rules again when an assignment is saved. Nothing here touches the network.
 */
import { minutes } from '../schedule/schedule-rules.js';

export interface PeriodFact { id: string; startTime: string; endTime: string; isBreak: boolean }

/**
 * Whether a leave covers a period. A whole day covers every period; a half day covers the morning or the afternoon, the school day being split at the midpoint between
 * the first teaching period's start and the last one's end (a period starting before the midpoint is in the morning).
 */
export function leaveCovers(half: string | null | undefined, period: PeriodFact, periods: readonly PeriodFact[]): boolean {
  if (!half) return true;
  const teaching = periods.filter((p) => !p.isBreak);
  if (teaching.length === 0) return false;
  const first = Math.min(...teaching.map((p) => minutes(p.startTime))), last = Math.max(...teaching.map((p) => minutes(p.endTime)));
  const morning = minutes(period.startTime) * 2 < first + last;
  return half === 'MORNING' ? morning : !morning;
}

export interface LeaveFact { id: string; staffId: string; startDate: string; endDate: string; half?: string | null }
export interface LessonFact { staffId: string; day: string; periodId: string }
export interface SubstitutionFact { substituteId: string; date: string; periodId: string }
export interface SlotFact { day: string; periodId: string; subjectId: string; staffId: string }
export interface CandidateFact { staffId: string; name: string; subjectIds: readonly string[] }
export interface World {
  lessons: readonly LessonFact[];
  /** Approved leave only. */
  leaves: readonly LeaveFact[];
  periods: readonly PeriodFact[];
  /** Substitutions already decided for the date. */
  substitutions: readonly SubstitutionFact[];
}

export type Why = 'sameAsAbsent' | 'notQualified' | 'hasOwnLesson' | 'onLeave' | 'alreadySubstituting';

/** The first reason a person cannot cover this lesson on this date, or null when they can. */
export function whyNot(c: CandidateFact, slot: SlotFact, date: string, w: World): Why | null {
  if (c.staffId === slot.staffId) return 'sameAsAbsent';
  if (!c.subjectIds.includes(slot.subjectId)) return 'notQualified';
  if (w.lessons.some((l) => l.staffId === c.staffId && l.day === slot.day && l.periodId === slot.periodId)) return 'hasOwnLesson';
  const period = w.periods.find((p) => p.id === slot.periodId);
  // on leave when an approved leave covers the date and, for a half day, this period; a leave we cannot place in the day counts as the whole day (safer)
  if (w.leaves.some((l) => l.staffId === c.staffId && l.startDate <= date && date <= l.endDate && (!period || leaveCovers(l.half, period, w.periods)))) return 'onLeave';
  if (w.substitutions.some((s) => s.substituteId === c.staffId && s.date === date && s.periodId === slot.periodId)) return 'alreadySubstituting';
  return null;
}

/** Everyone who can cover, fewest substitutions this month first, then by name. */
export function suggest(candidates: readonly CandidateFact[], slot: SlotFact, date: string, w: World, monthCounts: ReadonlyMap<string, number>): Array<CandidateFact & { substitutionsThisMonth: number }> {
  return candidates
    .filter((c) => whyNot(c, slot, date, w) === null)
    .map((c) => ({ ...c, substitutionsThisMonth: monthCounts.get(c.staffId) ?? 0 }))
    .sort((a, b) => a.substitutionsThisMonth - b.substitutionsThisMonth || a.name.localeCompare(b.name) || a.staffId.localeCompare(b.staffId));
}

/** The lessons of an absent teacher that a leave leaves uncovered on a date: their timetable for that weekday, limited to the periods the leave covers. */
export function uncovered(lessons: ReadonlyArray<LessonFact & { id: string }>, leave: LeaveFact, weekday: string, periods: readonly PeriodFact[]): string[] {
  return lessons
    .filter((l) => l.staffId === leave.staffId && l.day === weekday)
    .filter((l) => { const p = periods.find((x) => x.id === l.periodId); return p ? !p.isBreak && leaveCovers(leave.half, p, periods) : false; })
    .map((l) => l.id);
}
