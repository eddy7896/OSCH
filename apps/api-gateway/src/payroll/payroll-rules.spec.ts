import { monthAllowed, negativeNet, period, totalsOf } from './payroll-rules.js';
import { squeeze } from './payslip-pdf.js';

describe('totalsOf', () => {
  it('adds earnings and deductions exactly, as bigint', () => {
    const t = totalsOf([{ kind: 'EARNING', amountMinor: '4600000' }, { kind: 'EARNING', amountMinor: '1800000' }, { kind: 'DEDUCTION', amountMinor: '250000' }, { kind: 'DEDUCTION', amountMinor: 300000n }]);
    expect(t).toEqual({ grossMinor: 6400000n, deductionsMinor: 550000n, netMinor: 5850000n });
  });
  it('is exact beyond what a JavaScript number holds', () => {
    expect(totalsOf([{ kind: 'EARNING', amountMinor: '123456789012345' }, { kind: 'EARNING', amountMinor: '123456789012345' }, { kind: 'DEDUCTION', amountMinor: '1' }]).netMinor).toBe(246913578024689n);
  });
  it('an empty payslip is zero', () => expect(totalsOf([])).toEqual({ grossMinor: 0n, deductionsMinor: 0n, netMinor: 0n }));
});

describe('negativeNet', () => {
  it('names the people paid less than zero', () => {
    const slips = [
      { name: 'Asha', lines: [{ kind: 'EARNING', amountMinor: '100' }, { kind: 'DEDUCTION', amountMinor: '40' }] },
      { name: 'Bilal', lines: [{ kind: 'EARNING', amountMinor: '100' }, { kind: 'DEDUCTION', amountMinor: '101' }] },
      { name: 'Chitra', lines: [{ kind: 'DEDUCTION', amountMinor: '1' }] },
      { name: 'Dev', lines: [{ kind: 'EARNING', amountMinor: '50' }, { kind: 'DEDUCTION', amountMinor: '50' }] },
    ];
    expect(negativeNet(slips)).toEqual(['Bilal', 'Chitra']);
  });
});

describe('monthAllowed', () => {
  const now = new Date('2027-05-15T10:00:00Z');
  it('allows the past, this month and the next one only', () => {
    expect(monthAllowed(2027, 4, now)).toBe(true);
    expect(monthAllowed(2027, 5, now)).toBe(true);
    expect(monthAllowed(2027, 6, now)).toBe(true);
    expect(monthAllowed(2027, 7, now)).toBe(false);
    expect(monthAllowed(2028, 1, now)).toBe(false);
  });
  it('wraps December to January', () => {
    const dec = new Date('2027-12-20T00:00:00Z');
    expect(monthAllowed(2028, 1, dec)).toBe(true);
    expect(monthAllowed(2028, 2, dec)).toBe(false);
  });
  it('refuses nonsense', () => {
    for (const [y, m] of [[2027, 0], [2027, 13], [2027.5, 3], [1999, 5], [2027, 1.5]] as const) expect(monthAllowed(y, m, now)).toBe(false);
  });
});

describe('period and squeeze', () => {
  it('writes the month as MM/YYYY', () => expect(period(2027, 4)).toBe('04/2027'));
  it('keeps a payslip with few lines as it is, and sums the surplus into one last line so the page never overflows', () => {
    const few = [{ name: 'A', amountMinor: '1' }];
    expect(squeeze(few, 'More')).toBe(few);
    const many = Array.from({ length: 14 }, (_, i) => ({ name: `L${i}`, amountMinor: '100' }));
    const out = squeeze(many, 'More');
    expect(out).toHaveLength(9);
    expect(out[8]).toEqual({ name: 'More (6)', amountMinor: '600' });
    expect(out.reduce((t, l) => t + BigInt(l.amountMinor), 0n)).toBe(1400n); // nothing lost
  });
});
