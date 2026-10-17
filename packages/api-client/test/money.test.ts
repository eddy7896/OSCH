import { describe, expect, it } from 'vitest';
import { formatMinor, minorToDecimal, parseInt64, toInt64String } from '../src/index.js';

describe('Int64String money', () => {
  it('round-trips the whole Int64 range exactly, including values a JavaScript number cannot hold', () => {
    for (const s of ['0', '1', '-1', '9007199254740993', '-9007199254740993', '9223372036854775807', '-9223372036854775808']) {
      expect(toInt64String(parseInt64(s))).toBe(s);
    }
    expect(Number('9007199254740993')).not.toBe(9007199254740993n as unknown as number); // the trap this avoids
    expect(parseInt64('9007199254740993') + 1n).toBe(9007199254740994n);
  });

  it.each(['', ' 1', '1 ', '+1', '1.5', '1e3', '0x10', '01', '--1', '-', 'NaN', '9223372036854775808', '-9223372036854775809', '12345678901234567890'])('rejects "%s"', (bad) => {
    expect(() => parseInt64(bad)).toThrow(RangeError);
  });

  it('refuses a bigint outside Int64 on the way out', () => {
    expect(() => toInt64String(2n ** 63n)).toThrow(RangeError);
    expect(() => toInt64String(-(2n ** 63n) - 1n)).toThrow(RangeError);
  });

  it('writes minor units as exact decimals', () => {
    expect(minorToDecimal('0')).toBe('0.00');
    expect(minorToDecimal('5')).toBe('0.05');
    expect(minorToDecimal('123456')).toBe('1234.56');
    expect(minorToDecimal('-123456')).toBe('-1234.56');
    expect(minorToDecimal('9223372036854775807')).toBe('92233720368547758.07');
    expect(minorToDecimal(1500n, 0)).toBe('1500');
    expect(minorToDecimal(1500n, 3)).toBe('1.500');
  });

  it('formats rupees exactly and with Indian digit grouping', () => {
    expect(formatMinor('123456789', 'INR', 'en-IN')).toBe('₹12,34,567.89');
    expect(formatMinor('5', 'INR', 'en-IN')).toBe('₹0.05');
    expect(formatMinor('-250000', 'INR', 'en-IN')).toMatch(/^-₹2,500\.00$/);
    const big = formatMinor('9007199254740993', 'INR', 'en-IN');
    expect(big).toBe('₹9,00,71,99,25,47,409.93');
    expect(big.replace(/\D/g, '')).toBe('9007199254740993'); // every digit survives: no float rounding
  });
});
