/**
 * Money is a whole number of MINOR units (paise) held as a bigint, never a float (ADR-0004). Everything here is exact for any
 * Int64 and has a Dart twin in packages/flutter-core (`OruFormat`); both are run against `vectors.json`.
 */

/** Minor digits per currency (INR has 2: 100 paise to the rupee). Unknown currencies use 2. */
export const MINOR_DIGITS: Readonly<Record<string, number>> = { INR: 2, USD: 2, EUR: 2, GBP: 2, AED: 2, PKR: 2, BDT: 2, NPR: 2, LKR: 2, JPY: 0, KWD: 3, BHD: 3, OMR: 3 };
const SYMBOLS: Readonly<Record<string, string>> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };

export const minorDigitsOf = (currency: string): number => MINOR_DIGITS[currency.toUpperCase()] ?? 2;

export type Grouping = 'indian' | 'western';
const INDIAN_LANGUAGES = new Set(['hi', 'bn', 'as', 'mr', 'doi', 'gu', 'pa', 'or', 'ta', 'te', 'kn', 'ml', 'ks', 'ur', 'sd']);
const INDIAN_REGIONS = new Set(['IN', 'PK', 'BD', 'NP', 'LK']);

/** Digit grouping by locale: lakh and crore (12,34,567) for the Indian subcontinent, thousands (1,234,567) elsewhere. */
export function groupingFor(locale: string): Grouping {
  const parts = locale.replace('_', '-').split('-');
  const region = parts.find((p, i) => i > 0 && /^[A-Za-z]{2}$/.test(p))?.toUpperCase();
  if (region) return INDIAN_REGIONS.has(region) ? 'indian' : 'western';
  return INDIAN_LANGUAGES.has((parts[0] ?? '').toLowerCase()) ? 'indian' : 'western';
}

/** Inserts separators into a string of digits. */
export function groupDigits(digits: string, grouping: Grouping): string {
  if (digits.length <= 3) return digits;
  if (grouping === 'western') return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

export interface MoneyFormat {
  /** ISO code, default INR. */
  currency?: string;
  /** The school's locale, default en-IN. Decides the digit grouping. Digits are always 0-9. */
  locale?: string;
  /** `auto` (default) shows the fraction only when it is not zero (₹1,250 and ₹1,250.50); `always` shows it every time. */
  decimals?: 'auto' | 'always';
}

const toBig = (minor: bigint | string): bigint => (typeof minor === 'bigint' ? minor : BigInt(minor));

/** `₹1,82,40,000`, `-₹500`, `₹1,250.50`. Exact for any size of amount. */
export function formatMoney(minor: bigint | string, { currency = 'INR', locale = 'en-IN', decimals = 'auto' }: MoneyFormat = {}): string {
  const n = toBig(minor);
  const neg = n < 0n;
  const digits = minorDigitsOf(currency);
  const abs = (neg ? -n : n).toString().padStart(digits + 1, '0');
  const whole = abs.slice(0, abs.length - digits);
  const fraction = abs.slice(abs.length - digits);
  const showFraction = digits > 0 && (decimals === 'always' || /[1-9]/.test(fraction));
  const code = currency.toUpperCase();
  const symbol = SYMBOLS[code] ?? `${code} `;
  return `${neg ? '-' : ''}${symbol}${groupDigits(whole, groupingFor(locale))}${showFraction ? `.${fraction}` : ''}`;
}

/**
 * Reads what a person typed into minor units: `1,250.5`, `₹1250`, `1,82,40,000`. Accepts at most the currency's minor digits
 * (`10.999` is refused, never rounded), a leading minus, and the currency symbol. Throws RangeError for anything else.
 */
export function parseMoney(text: string, { currency = 'INR' }: { currency?: string } = {}): bigint {
  const digits = minorDigitsOf(currency);
  let s = text.trim();
  const neg = s.startsWith('-');
  if (neg) s = s.slice(1).trim();
  const symbol = SYMBOLS[currency.toUpperCase()];
  if (symbol && s.startsWith(symbol)) s = s.slice(symbol.length).trim();
  s = s.replace(/,/g, '');
  const m = /^(\d+)(?:\.(\d+))?$/.exec(s);
  if (!m || m[1] === undefined) throw new RangeError('not an amount');
  const fraction = m[2] ?? '';
  if (fraction.length > digits) throw new RangeError(`more than ${digits} decimal places`);
  const value = BigInt(m[1] + fraction.padEnd(digits, '0'));
  return neg ? -value : value;
}

/** amount x numerator / denominator, rounded half away from zero (₹0.005 rounds to ₹0.01, -₹0.005 to -₹0.01). */
export function mulDivRound(amount: bigint, numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new RangeError('division by zero');
  let num = amount * numerator;
  let den = denominator;
  if (den < 0n) {
    num = -num;
    den = -den;
  }
  const neg = num < 0n;
  const abs = neg ? -num : num;
  const q = abs / den;
  const r = abs % den;
  const rounded = r * 2n >= den ? q + 1n : q;
  return neg ? -rounded : rounded;
}

/** A percentage given in basis points (1% = 100): a 12.5% concession is `percentOf(fee, 1250)`. */
export const percentOf = (minor: bigint, basisPoints: bigint | number): bigint => mulDivRound(minor, BigInt(basisPoints), 10000n);

/** Splits an amount into `parts` pieces that add up to it exactly; the extra minor units go to the first pieces (₹100 in 3: 33.34, 33.33, 33.33). */
export function splitEvenly(total: bigint, parts: number): bigint[] {
  if (!Number.isInteger(parts) || parts < 1) throw new RangeError('parts must be a whole number of at least 1');
  const n = BigInt(parts);
  const neg = total < 0n;
  const abs = neg ? -total : total;
  const base = abs / n;
  const extra = Number(abs % n);
  return Array.from({ length: parts }, (_, i) => {
    const v = base + (i < extra ? 1n : 0n);
    return neg ? -v : v;
  });
}
