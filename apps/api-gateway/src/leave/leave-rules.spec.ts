import { countHalfDays, formatHalfDays, overlaps, parseHalfDays, yearHolding } from './leave-rules.js';

const MON_SAT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

describe('leave rules', () => {
  it('days are whole or half numbers, kept as half-days', () => {
    expect(parseHalfDays('12')).toBe(24); expect(parseHalfDays('12.5')).toBe(25); expect(parseHalfDays('0.5')).toBe(1); expect(parseHalfDays('0')).toBe(0);
    for (const bad of ['12.3', '-1', '1e1', '', 'a', '1000', '1.25', '.5']) expect(parseHalfDays(bad), bad).toBeNull();
    expect(formatHalfDays(25)).toBe('12.5'); expect(formatHalfDays(24)).toBe('12'); expect(formatHalfDays(1)).toBe('0.5');
  });
  it('counts only working days: Monday to Sunday is six days on a Monday-to-Saturday school', () => {
    expect(countHalfDays('2026-10-26', '2026-11-01', null, MON_SAT)).toEqual({ halfDays: 12 }); // 26 Oct 2026 is a Monday
    expect(countHalfDays('2026-10-26', '2026-10-26', null, MON_SAT)).toEqual({ halfDays: 2 });
    expect(countHalfDays('2026-10-26', '2026-10-30', null, ['MON', 'FRI'])).toEqual({ halfDays: 4 });
  });
  it('a half day is one half-day on one working day', () => {
    expect(countHalfDays('2026-10-26', '2026-10-26', 'MORNING', MON_SAT)).toEqual({ halfDays: 1 });
    expect(countHalfDays('2026-10-26', '2026-10-27', 'MORNING', MON_SAT)).toEqual({ problem: 'halfNeedsOneDay' });
    expect(countHalfDays('2026-11-01', '2026-11-01', 'AFTERNOON', MON_SAT)).toEqual({ problem: 'notAWorkingDay' });
  });
  it('refuses a bad range', () => {
    expect(countHalfDays('2026-02-30', '2026-03-01', null, MON_SAT)).toEqual({ problem: 'notADate' });
    expect(countHalfDays('2026-10-27', '2026-10-26', null, MON_SAT)).toEqual({ problem: 'endBeforeStart' });
    expect(countHalfDays('2026-01-01', '2027-06-01', null, MON_SAT)).toEqual({ problem: 'rangeTooLong' });
    expect(countHalfDays('2026-11-01', '2026-11-01', null, MON_SAT)).toEqual({ problem: 'noWorkingDays' });
  });
  it('overlap: touching days clash; a morning and an afternoon of one day do not', () => {
    const r = (startDate: string, endDate: string, half?: string) => ({ startDate, endDate, half });
    expect(overlaps(r('2026-10-26', '2026-10-28'), r('2026-10-28', '2026-10-30'))).toBe(true);
    expect(overlaps(r('2026-10-26', '2026-10-27'), r('2026-10-28', '2026-10-30'))).toBe(false);
    expect(overlaps(r('2026-10-26', '2026-10-26', 'MORNING'), r('2026-10-26', '2026-10-26', 'AFTERNOON'))).toBe(false);
    expect(overlaps(r('2026-10-26', '2026-10-26', 'MORNING'), r('2026-10-26', '2026-10-26', 'MORNING'))).toBe(true);
    expect(overlaps(r('2026-10-26', '2026-10-26', 'MORNING'), r('2026-10-26', '2026-10-27'))).toBe(true);
  });
  it('a request belongs to one academic year', () => {
    const years = [{ id: 'a', startDate: '2026-04-01', endDate: '2027-03-31' }, { id: 'b', startDate: '2027-04-01', endDate: '2028-03-31' }];
    expect(yearHolding(years, '2026-10-26', '2026-10-30')?.id).toBe('a');
    expect(yearHolding(years, '2027-03-30', '2027-04-02')).toBeNull();
  });
});
