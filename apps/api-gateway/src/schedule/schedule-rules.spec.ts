import { DAYS, daysFromText, daysText, isTime, minutes, normalizeDays, numberPeriods, periodProblem } from './schedule-rules.js';

describe('working days', () => {
  it('puts the days in week order, drops duplicates and ignores case and spaces', () => {
    expect(normalizeDays([' sat', 'MON', 'mon', 'Wed'])).toEqual(['MON', 'WED', 'SAT']);
    expect(normalizeDays([...DAYS])).toEqual([...DAYS]);
  });
  it('refuses an empty list or a day that does not exist', () => {
    expect(normalizeDays([])).toBeNull();
    expect(normalizeDays(['MON', 'FUNDAY'])).toBeNull();
    expect(normalizeDays(['monday'])).toBeNull();
  });
  it('round-trips through its stored text, and a damaged text falls back to Monday to Saturday', () => {
    expect(daysFromText(daysText(['TUE', 'THU']))).toEqual(['TUE', 'THU']);
    expect(daysFromText('')).toEqual(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);
    expect(daysFromText('XYZ')).toEqual(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);
  });
});

describe('times', () => {
  it('accepts only real 24-hour HH:MM', () => {
    for (const ok of ['00:00', '08:30', '23:59']) expect(isTime(ok), ok).toBe(true);
    for (const bad of ['24:00', '8:30', '08:60', '0830', '08:3', '', 'ab:cd', '08:30:00']) expect(isTime(bad), bad).toBe(false);
  });
  it('counts minutes since midnight', () => {
    expect(minutes('00:00')).toBe(0);
    expect(minutes('09:10')).toBe(550);
    expect(minutes('23:59')).toBe(1439);
  });
});

describe('periodProblem', () => {
  const others = [{ label: 'Period 1', startTime: '08:30', endTime: '09:10' }, { label: 'Period 2', startTime: '09:10', endTime: '09:50' }];
  const p = (label: string, startTime: string, endTime: string) => ({ label, startTime, endTime });
  it('accepts a period that touches its neighbours without overlapping', () => {
    expect(periodProblem(p('Period 3', '09:50', '10:30'), others)).toBeNull();
    expect(periodProblem(p('Early', '07:50', '08:30'), others)).toBeNull();
  });
  it('refuses bad times, an end that is not after the start, and overlaps of every kind', () => {
    expect(periodProblem(p('X', '25:00', '26:00'), others)).toBe('timeInvalid');
    expect(periodProblem(p('X', '10:00', '10:00'), others)).toBe('endNotAfterStart');
    expect(periodProblem(p('X', '11:00', '10:00'), others)).toBe('endNotAfterStart');
    expect(periodProblem(p('X', '08:45', '09:00'), others)).toBe('overlaps'); // inside one
    expect(periodProblem(p('X', '09:00', '09:20'), others)).toBe('overlaps'); // across two
    expect(periodProblem(p('X', '08:00', '10:30'), others)).toBe('overlaps'); // around both
    expect(periodProblem(p('X', '09:49', '10:30'), others)).toBe('overlaps'); // one minute in
  });
  it('refuses a label or a start time that is already taken, whatever the case', () => {
    expect(periodProblem(p(' period 1 ', '11:00', '11:40'), others)).toBe('labelTaken');
    expect(periodProblem(p('Other', '08:30', '08:40'), others)).toBe('startTaken');
  });
});

describe('numbering', () => {
  it('numbers only the teaching periods, in time order', () => {
    const periods = [
      { startTime: '09:50', isBreak: true }, { startTime: '08:30', isBreak: false }, { startTime: '10:10', isBreak: false }, { startTime: '09:10', isBreak: false },
    ];
    const n = numberPeriods(periods);
    expect(n.map((x) => [x.startTime, x.number])).toEqual([['08:30', 1], ['09:10', 2], ['09:50', null], ['10:10', 3]]);
  });
});
