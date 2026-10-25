import { leaveCovers, suggest, uncovered, whyNot, type CandidateFact, type LeaveFact, type LessonFact, type PeriodFact, type SubstitutionFact, type World } from './substitution-rules.js';

const P = (id: string, startTime: string, endTime: string, isBreak = false): PeriodFact => ({ id, startTime, endTime, isBreak });
const periods = [P('p1', '08:00', '08:40'), P('p2', '08:40', '09:20'), P('br', '09:20', '09:40', true), P('p3', '09:40', '10:20'), P('p4', '12:00', '12:40'), P('p5', '12:40', '13:20')];

describe('half-day leave', () => {
  it('splits the school day at its midpoint: p1 to p3 are the morning, p4 and p5 the afternoon', () => {
    for (const id of ['p1', 'p2', 'p3']) { const p = periods.find((x) => x.id === id)!; expect(leaveCovers('MORNING', p, periods)).toBe(true); expect(leaveCovers('AFTERNOON', p, periods)).toBe(false); }
    for (const id of ['p4', 'p5']) { const p = periods.find((x) => x.id === id)!; expect(leaveCovers('MORNING', p, periods)).toBe(false); expect(leaveCovers('AFTERNOON', p, periods)).toBe(true); }
    expect(leaveCovers(null, periods[0]!, periods)).toBe(true);
  });
  it('the lessons left uncovered are the absent teacher\'s own, on that weekday, in the covered periods, never a break', () => {
    const lessons = [{ id: 'a', staffId: 't1', day: 'MON', periodId: 'p1' }, { id: 'b', staffId: 't1', day: 'MON', periodId: 'p4' }, { id: 'c', staffId: 't1', day: 'TUE', periodId: 'p1' }, { id: 'd', staffId: 't2', day: 'MON', periodId: 'p1' }, { id: 'e', staffId: 't1', day: 'MON', periodId: 'br' }];
    expect(uncovered(lessons, { id: 'l', staffId: 't1', startDate: '2090-05-07', endDate: '2090-05-07' }, 'MON', periods)).toEqual(['a', 'b']);
    expect(uncovered(lessons, { id: 'l', staffId: 't1', startDate: '2090-05-07', endDate: '2090-05-07', half: 'AFTERNOON' }, 'MON', periods)).toEqual(['b']);
  });
});

describe('who can cover', () => {
  const slot = { day: 'MON', periodId: 'p1', subjectId: 'maths', staffId: 't1' };
  const cand = (staffId: string, subjectIds: string[] = ['maths'], name = staffId): CandidateFact => ({ staffId, name, subjectIds });
  const world = (o: Partial<World> = {}): World => ({ lessons: [], leaves: [], periods, substitutions: [], ...o });
  it('names the reason each person cannot', () => {
    const date = '2090-05-07';
    expect(whyNot(cand('t1'), slot, date, world())).toBe('sameAsAbsent');
    expect(whyNot(cand('t2', ['art']), slot, date, world())).toBe('notQualified');
    expect(whyNot(cand('t2'), slot, date, world({ lessons: [{ staffId: 't2', day: 'MON', periodId: 'p1' }] }))).toBe('hasOwnLesson');
    expect(whyNot(cand('t2'), slot, date, world({ leaves: [{ id: 'l', staffId: 't2', startDate: date, endDate: date }] }))).toBe('onLeave');
    expect(whyNot(cand('t2'), slot, date, world({ substitutions: [{ substituteId: 't2', date, periodId: 'p1' }] }))).toBe('alreadySubstituting');
    expect(whyNot(cand('t2'), slot, date, world())).toBeNull();
  });
  it('a half day of leave frees the person for the other half', () => {
    const date = '2090-05-07';
    const afternoonLeave: LeaveFact = { id: 'l', staffId: 't2', startDate: date, endDate: date, half: 'AFTERNOON' };
    expect(whyNot(cand('t2'), slot, date, world({ leaves: [afternoonLeave] }))).toBeNull(); // p1 is the morning
    expect(whyNot(cand('t2'), { ...slot, periodId: 'p4' }, date, world({ leaves: [afternoonLeave] }))).toBe('onLeave');
  });
  it('ranks by fewest substitutions this month, then by name', () => {
    const list = suggest([cand('t3', ['maths'], 'Zoya'), cand('t2', ['maths'], 'Asha'), cand('t4', ['maths'], 'Bilal'), cand('t1', ['maths'], 'Absent')], slot, '2090-05-07', world(), new Map([['t2', 2], ['t4', 0], ['t3', 0]]));
    expect(list.map((c) => c.staffId)).toEqual(['t4', 't3', 't2']);
  });
});

/** E-ACAD-2: over many random timetables and leaves, a suggestion is always free and qualified, and following suggestions never double-books anyone. */
describe('E-ACAD-2 property test', () => {
  const rng = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
  const dateOf = (day: string) => `2090-05-${String(8 + DAYS.indexOf(day)).padStart(2, '0')}`; // 8 May 2090 is a Monday

  it.each(Array.from({ length: 200 }, (_, i) => i + 1))('seed %i', (seed) => {
    const r = rng(seed * 7919);
    const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;
    const subjects = ['maths', 'sci', 'art'];
    const staff: CandidateFact[] = Array.from({ length: 4 + Math.floor(r() * 6) }, (_, i) => ({ staffId: `s${i}`, name: `Name${Math.floor(r() * 5)}`, subjectIds: subjects.filter(() => r() < 0.5) }));
    const lessons: LessonFact[] = [];
    for (const s of staff) for (const d of DAYS) for (const p of periods.filter((x) => !x.isBreak)) if (r() < 0.45) lessons.push({ staffId: s.staffId, day: d, periodId: p.id });
    const leaves: LeaveFact[] = staff.filter(() => r() < 0.3).map((s, i) => ({ id: `l${i}`, staffId: s.staffId, startDate: dateOf(pick(DAYS)), endDate: dateOf('FRI'), half: pick([null, 'MORNING', 'AFTERNOON']) }));
    const substitutions: SubstitutionFact[] = [];
    const monthCounts = new Map<string, number>();
    for (let n = 0; n < 40; n++) {
      const day = pick(DAYS), date = dateOf(day), period = pick(periods.filter((p) => !p.isBreak));
      const slot = { day, periodId: period.id, subjectId: pick(subjects), staffId: pick(staff).staffId };
      const world: World = { lessons, leaves, periods, substitutions };
      const list = suggest(staff, slot, date, world, monthCounts);
      // every suggestion is free and qualified
      for (const c of list) {
        expect(c.subjectIds).toContain(slot.subjectId);
        expect(c.staffId).not.toBe(slot.staffId);
        expect(lessons.some((l) => l.staffId === c.staffId && l.day === day && l.periodId === period.id)).toBe(false);
        expect(substitutions.some((s) => s.substituteId === c.staffId && s.date === date && s.periodId === period.id)).toBe(false);
        expect(leaves.some((l) => l.staffId === c.staffId && l.startDate <= date && date <= l.endDate && leaveCovers(l.half, period, periods))).toBe(false);
      }
      // everyone left out has a reason
      for (const c of staff) if (!list.some((x) => x.staffId === c.staffId)) expect(whyNot(c, slot, date, world)).not.toBeNull();
      // ranking is by fewest first
      for (let i = 1; i < list.length; i++) expect(list[i]!.substitutionsThisMonth).toBeGreaterThanOrEqual(list[i - 1]!.substitutionsThisMonth);
      // follow the top suggestion
      const top = list[0];
      if (top) { substitutions.push({ substituteId: top.staffId, date, periodId: period.id }); monthCounts.set(top.staffId, (monthCounts.get(top.staffId) ?? 0) + 1); }
    }
    // nobody ended up in two places in one period on one date
    const seen = new Set<string>();
    for (const s of substitutions) { const k = `${s.substituteId}|${s.date}|${s.periodId}`; expect(seen.has(k)).toBe(false); seen.add(k); }
  });
});
