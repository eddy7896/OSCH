import { addDays, ageingBands, effectiveStatus, storedStatus } from './invoice-rules.js';

const inv = (status: string, amount: bigint, paid: bigint, dueDate: string) => ({ status, amountMinor: amount, paidMinor: paid, dueDate });
const TODAY = '2027-05-15';

describe('effectiveStatus', () => {
  it('settled is PAID, however late', () => {
    expect(effectiveStatus(inv('PAID', 100n, 100n, '2027-01-01'), TODAY)).toBe('PAID');
    expect(effectiveStatus(inv('PENDING', 100n, 100n, '2027-01-01'), TODAY)).toBe('PAID'); // paid in full counts even if the stored status lags
  });
  it('unpaid and past due is OVERDUE, part-paid or not', () => {
    expect(effectiveStatus(inv('PENDING', 100n, 0n, '2027-05-14'), TODAY)).toBe('OVERDUE');
    expect(effectiveStatus(inv('PENDING', 100n, 40n, '2027-05-14'), TODAY)).toBe('OVERDUE');
  });
  it('due today is not overdue yet', () => expect(effectiveStatus(inv('PENDING', 100n, 0n, TODAY), TODAY)).toBe('PENDING'));
  it('not yet due: PARTIAL when something was paid, else PENDING', () => {
    expect(effectiveStatus(inv('PENDING', 100n, 40n, '2027-06-01'), TODAY)).toBe('PARTIAL');
    expect(effectiveStatus(inv('PENDING', 100n, 0n, '2027-06-01'), TODAY)).toBe('PENDING');
  });
});

describe('storedStatus', () => {
  it('PAID exactly when paid reaches the amount', () => {
    expect(storedStatus(100n, 100n)).toBe('PAID');
    expect(storedStatus(100n, 99n)).toBe('PENDING');
    expect(storedStatus(100n, 0n)).toBe('PENDING');
  });
});

describe('addDays', () => {
  it('moves calendar dates across months, years and leap days', () => {
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
    expect(addDays('2027-12-31', 1)).toBe('2028-01-01');
    expect(addDays('2027-05-15', -91)).toBe('2027-02-13');
  });
});

describe('ageingBands', () => {
  const bands = ageingBands('2027-05-15');
  it('are five and in order', () => expect(bands.map((b) => b.key)).toEqual(['NOT_DUE', 'DAYS_1_30', 'DAYS_31_60', 'DAYS_61_90', 'DAYS_OVER_90']));
  it('leave no gap and no overlap: every due date falls in exactly one band', () => {
    const inBand = (date: string) => bands.filter((b) => (!b.from || date >= b.from) && (!b.to || date <= b.to)).map((b) => b.key);
    for (let back = -40; back <= 200; back++) expect(inBand(addDays('2027-05-15', -back)), `${back} days overdue`).toHaveLength(1);
    expect(inBand('2027-05-15')).toEqual(['NOT_DUE']); // due today
    expect(inBand('2027-05-14')).toEqual(['DAYS_1_30']);
    expect(inBand('2027-04-15')).toEqual(['DAYS_1_30']); // exactly 30 days
    expect(inBand('2027-04-14')).toEqual(['DAYS_31_60']); // 31 days
    expect(inBand('2027-02-13')).toEqual(['DAYS_OVER_90']); // 91 days
  });
});
