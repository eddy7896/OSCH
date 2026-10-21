import { describe, expect, it } from 'vitest';
import vectors from '../vectors.json' with { type: 'json' };
import { formatDate, formatMoney, formatTime, mulDivRound, parseMoney, percentOf, splitEvenly } from '../src/index.js';

describe('shared vectors (the Dart twin runs the same file)', () => {
  it.each(vectors.money.format)('formatMoney($minor $currency $locale $decimals) = $expected', (v) => {
    expect(formatMoney(v.minor, { currency: v.currency, locale: v.locale, decimals: v.decimals as 'auto' | 'always' })).toBe(v.expected);
    expect(formatMoney(BigInt(v.minor), { currency: v.currency, locale: v.locale, decimals: v.decimals as 'auto' | 'always' })).toBe(v.expected);
  });
  it.each(vectors.money.parse)('parseMoney("$text") = $minor', (v) => expect(parseMoney(v.text)).toBe(BigInt(v.minor)));
  it.each(vectors.money.parseInvalid)('parseMoney("%s") is refused', (text) => expect(() => parseMoney(text)).toThrow(RangeError));
  it.each(vectors.money.mulDivRound)('mulDivRound($amount, $num, $den) = $expected', (v) => expect(mulDivRound(BigInt(v.amount), BigInt(v.num), BigInt(v.den))).toBe(BigInt(v.expected)));
  it.each(vectors.money.percentOf)('percentOf($minor, $bp) = $expected', (v) => expect(percentOf(BigInt(v.minor), v.bp)).toBe(BigInt(v.expected)));
  it.each(vectors.money.splitEvenly)('splitEvenly($total, $parts)', (v) => expect(splitEvenly(BigInt(v.total), v.parts).map(String)).toEqual(v.expected));
  it.each(vectors.money.splitInvalid)('splitEvenly(10, %s) is refused', (parts) => expect(() => splitEvenly(10n, parts)).toThrow(RangeError));
  it.each(vectors.dates.format)('formatDate($date $locale year=$withYear) = $expected', (v) => expect(formatDate(v.date, { locale: v.locale, withYear: v.withYear })).toBe(v.expected));
  it.each(vectors.dates.invalid)('formatDate("%s") is refused', (d) => expect(() => formatDate(d)).toThrow(RangeError));
  it.each(vectors.times.format)('formatTime($time) = $expected', (v) => expect(formatTime(v.time, { locale: v.locale })).toBe(v.expected));
  it.each(vectors.times.invalid)('formatTime("%s") is refused', (t) => expect(() => formatTime(t)).toThrow(RangeError));
});

describe('properties that must always hold', () => {
  const rnd = (seed: number) => () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  it('splitEvenly always adds up exactly, differs by at most one minor unit, and puts the larger pieces first', () => {
    const r = rnd(7);
    for (let i = 0; i < 500; i++) {
      const total = BigInt(Math.floor(r() * 2e9) - 1e9);
      const parts = 1 + Math.floor(r() * 24);
      const out = splitEvenly(total, parts);
      expect(out.reduce((a, b) => a + b, 0n)).toBe(total);
      const abs = out.map((x) => (x < 0n ? -x : x));
      expect(abs.reduce((a, b) => (a > b ? a : b)) - abs.reduce((a, b) => (a < b ? a : b))).toBeLessThanOrEqual(1n);
      for (let k = 1; k < abs.length; k++) expect(abs[k - 1]! >= abs[k]!).toBe(true);
    }
  });
  it('what formatMoney writes (always showing the fraction) parseMoney reads back', () => {
    const r = rnd(11);
    for (let i = 0; i < 500; i++) {
      const minor = BigInt(Math.floor(r() * 2 ** 52)) * (r() < 0.5 ? -1n : 1n);
      expect(parseMoney(formatMoney(minor, { decimals: 'always' }))).toBe(minor);
      expect(parseMoney(formatMoney(minor, { decimals: 'always', locale: 'en-US', currency: 'USD' }), { currency: 'USD' })).toBe(minor);
    }
  });
  it('mulDivRound is symmetric around zero and never off by more than half a unit', () => {
    const r = rnd(3);
    for (let i = 0; i < 500; i++) {
      const a = BigInt(Math.floor(r() * 1e9)), n = BigInt(1 + Math.floor(r() * 5000)), d = BigInt(1 + Math.floor(r() * 5000));
      expect(mulDivRound(-a, n, d)).toBe(-mulDivRound(a, n, d));
      const exactTimes2 = 2n * a * n, got2 = 2n * mulDivRound(a, n, d) * d;
      expect((exactTimes2 > got2 ? exactTimes2 - got2 : got2 - exactTimes2) <= d).toBe(true);
    }
  });
});
