import { deductionMinor, halfDaysInMonth, monthBounds, workingDaysInMonth } from './leave-deduction.js';

const MON_SAT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

describe('unpaid leave deduction', () => {
  it('working days of a month: November 2026 has 30 days and 5 Sundays, so 25 on a Monday-to-Saturday school', () => {
    expect(workingDaysInMonth(2026, 11, MON_SAT)).toBe(25);
    expect(workingDaysInMonth(2026, 2, MON_SAT)).toBe(24); // February 2026: 28 days, 4 Sundays
    expect(workingDaysInMonth(2026, 11, ['MON', 'TUE', 'WED', 'THU', 'FRI'])).toBe(21);
    expect(monthBounds(2028, 2)).toEqual({ first: '2028-02-01', last: '2028-02-29' });
  });
  it('vectors: gross x half-days / (2 x working days), rounded down to the paisa', () => {
    const vectors: Array<[bigint, number, number, bigint]> = [
      [3_000_000n, 2, 26, 115_384n], // 30,000.00 a month, one day, 26 working days: 1,153.846...
      [3_000_000n, 1, 26, 57_692n], // a half day: 576.923...
      [3_000_000n, 52, 26, 3_000_000n], // every working day of the month: the whole gross
      [2_500_050n, 3, 25, 150_003n], // 25,000.50, a day and a half, 25 working days
      [100n, 1, 26, 1n], // 1.00 a month: rounds down, never up
      [0n, 4, 26, 0n], [3_000_000n, 0, 26, 0n], [3_000_000n, 2, 0, 0n],
    ];
    for (const [gross, half, days, want] of vectors) expect(deductionMinor(gross, half, days), `${gross} ${half} ${days}`).toBe(want);
  });
  it('a leave across a month boundary counts only the days inside the month', () => {
    const leave = { startDate: '2026-10-28', endDate: '2026-11-03' }; // Wed 28 Oct to Tue 3 Nov
    expect(halfDaysInMonth(leave, 2026, 10, MON_SAT)).toBe(8); // Wed, Thu, Fri, Sat
    expect(halfDaysInMonth(leave, 2026, 11, MON_SAT)).toBe(4); // Sun is not worked; Mon, Tue
    expect(halfDaysInMonth(leave, 2026, 12, MON_SAT)).toBe(0);
    expect(halfDaysInMonth({ startDate: '2026-11-09', endDate: '2026-11-09', half: 'MORNING' }, 2026, 11, MON_SAT)).toBe(1);
    expect(halfDaysInMonth({ startDate: '2026-11-01', endDate: '2026-11-01' }, 2026, 11, MON_SAT)).toBe(0); // a Sunday
  });
});
