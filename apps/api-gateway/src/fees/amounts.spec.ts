import { discountOf, netOf, totalDiscount, type ConcessionRule } from './amounts.js';

const pct = (bp: number, feeItemId?: string): ConcessionRule => ({ kind: 'PERCENT', basisPoints: bp, feeItemId: feeItemId ?? null });
const fixed = (amountMinor: bigint, feeItemId?: string): ConcessionRule => ({ kind: 'FIXED', amountMinor, feeItemId: feeItemId ?? null });
const LAKH_25K = 12_500_000n; // Rs 1,25,000.00

describe('discountOf', () => {
  it('percent of an instalment, exactly: 10% of Rs 1,25,000 is Rs 12,500', () => expect(discountOf(LAKH_25K, pct(1000))).toBe(1_250_000n));
  it('rounds half away from zero to the paisa: 12.5% of Rs 33.33 (3333 paise) is 416.625, so 417', () => expect(discountOf(3333n, pct(1250))).toBe(417n));
  it('0% takes nothing, 100% takes the whole instalment', () => {
    expect(discountOf(LAKH_25K, pct(0))).toBe(0n);
    expect(discountOf(LAKH_25K, pct(10_000))).toBe(LAKH_25K);
  });
  it('a fixed amount is taken as it is, but never more than the instalment', () => {
    expect(discountOf(LAKH_25K, fixed(500_000n))).toBe(500_000n);
    expect(discountOf(100_000n, fixed(500_000n))).toBe(100_000n);
  });
  it('is exact beyond what a JavaScript number holds', () => {
    const big = 123_456_789_012_345n; // under 10^15 paise
    expect(discountOf(big, pct(5000))).toBe(61_728_394_506_173n); // 50% of an odd number: 61728394506172.5 rounds up
    expect(discountOf(big, fixed(big - 1n))).toBe(big - 1n);
  });
});

describe('totalDiscount and netOf', () => {
  it('concessions are worked out on the full instalment and added, whatever order they come in', () => {
    const a = [pct(1000), fixed(250_000n)];
    expect(totalDiscount(LAKH_25K, 'tuition', a)).toBe(1_500_000n);
    expect(totalDiscount(LAKH_25K, 'tuition', [...a].reverse())).toBe(1_500_000n);
    expect(netOf(LAKH_25K, 'tuition', a)).toBe(11_000_000n);
  });
  it('never takes more than the instalment: 80% + 50% leaves zero, not a negative amount', () => {
    expect(netOf(LAKH_25K, 'tuition', [pct(8000), pct(5000)])).toBe(0n);
  });
  it('a concession on one item does not touch another item', () => {
    const rules = [pct(5000, 'tuition')];
    expect(netOf(1_000_000n, 'tuition', rules)).toBe(500_000n);
    expect(netOf(1_000_000n, 'transport', rules)).toBe(1_000_000n);
  });
  it('a concession with no item applies to every item', () => {
    for (const item of ['tuition', 'transport']) expect(netOf(1_000_000n, item, [pct(1000)])).toBe(900_000n);
  });
  it('no concessions, no discount', () => expect(netOf(LAKH_25K, 'tuition', [])).toBe(LAKH_25K));
});
