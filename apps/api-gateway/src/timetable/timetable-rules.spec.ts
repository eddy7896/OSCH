import { slotProblem, weeklyLoad } from './timetable-rules.js';

const e = (id: string, classId: string, staffId: string, day = 'MON', periodId = 'p1') => ({ id, classId, staffId, day, periodId });

describe('timetable rules', () => {
  const all = [e('1', 'c1', 's1')];
  it('refuses a second lesson for a class in the same slot', () => expect(slotProblem(all, { classId: 'c1', staffId: 's2', day: 'MON', periodId: 'p1' })).toBe('classBusy'));
  it('refuses a teacher in two classes in the same slot', () => expect(slotProblem(all, { classId: 'c2', staffId: 's1', day: 'MON', periodId: 'p1' })).toBe('teacherBusy'));
  it('allows the same class and teacher in another day or period', () => {
    expect(slotProblem(all, { classId: 'c1', staffId: 's1', day: 'TUE', periodId: 'p1' })).toBeNull();
    expect(slotProblem(all, { classId: 'c1', staffId: 's1', day: 'MON', periodId: 'p2' })).toBeNull();
  });
  it('lets an entry be replaced by itself', () => expect(slotProblem(all, { classId: 'c1', staffId: 's1', day: 'MON', periodId: 'p1' }, '1')).toBeNull());
  it('counts the weekly load by teacher and day', () => {
    const load = weeklyLoad([e('1', 'c1', 's1'), e('2', 'c1', 's1', 'TUE'), e('3', 'c2', 's2')]);
    expect(load.get('s1')).toMatchObject({ total: 2, byDay: { MON: 1, TUE: 1, WED: 0 } });
    expect(load.get('s2')?.total).toBe(1);
  });
});
