import { addDays, countStatuses, diffMarks, isDate, markId, today, weekday } from './attendance-rules.js';

describe('attendance rules', () => {
  it('dates: real calendar days only, weekday, adding days, today in India', () => {
    expect(isDate('2026-02-28')).toBe(true);
    for (const bad of ['2026-02-30', '2026-13-01', '26-01-01', '2026-1-1', '']) expect(isDate(bad)).toBe(false);
    expect(weekday('2026-10-26')).toBe('MON');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(today(new Date('2026-10-25T20:00:00Z'))).toBe('2026-10-26'); // 01:30 the next morning in India
    expect(today(new Date('2026-10-25T10:00:00Z'))).toBe('2026-10-25');
  });
  it('a mark id is stable per day and student and differs otherwise', () => {
    expect(markId('D1', 'S1')).toBe(markId('d1', 's1'));
    expect(markId('D1', 'S1')).not.toBe(markId('D1', 'S2'));
    expect(markId('D1', 'S1')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
  });
  it('diff: saves new and changed exceptions, removes the ones no longer listed, and treats PRESENT as no exception', () => {
    const existing = new Map([['s1', { id: 'm1', status: 'ABSENT' as const, note: null }], ['s2', { id: 'm2', status: 'LATE' as const, note: 'bus' }], ['s3', { id: 'm3', status: 'LEAVE' as const, note: null }]]);
    const wanted = new Map([['s1', { status: 'ABSENT' as const, note: null }], ['s2', { status: 'LATE' as const, note: 'rain' }], ['s3', { status: 'PRESENT' as const, note: null }], ['s4', { status: 'MEDICAL' as const, note: null }]]);
    const d = diffMarks(existing, wanted);
    expect(d.save.map(([s]) => s)).toEqual(['s2', 's4']);
    expect(d.remove).toEqual([['s3', 'm3']]);
    expect(diffMarks(new Map(), new Map())).toEqual({ save: [], remove: [] });
  });
  it('counts: everyone without a mark is present', () => {
    expect(countStatuses([{ status: 'ABSENT' }, { status: 'LATE' }, { status: 'ABSENT' }], 30)).toMatchObject({ PRESENT: 27, ABSENT: 2, LATE: 1, LEAVE: 0 });
  });
});
