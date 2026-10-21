/**
 * Money crosses the API as `Int64String`: a whole number of MINOR units (paise) written as a decimal string (ADR-0004).
 * JavaScript numbers lose precision above 2^53, so these helpers go through BigInt and never through Number.
 */
const INT64 = /^-?(0|[1-9][0-9]{0,18})$/;
const MIN = -(2n ** 63n);
const MAX = 2n ** 63n - 1n;

export function parseInt64(value: string): bigint {
  if (!INT64.test(value)) throw new RangeError(`not an Int64 string: ${JSON.stringify(value.slice(0, 40))}`);
  const n = BigInt(value);
  if (n < MIN || n > MAX) throw new RangeError('outside the Int64 range');
  return n;
}

export function toInt64String(value: bigint): string {
  if (value < MIN || value > MAX) throw new RangeError('outside the Int64 range');
  return value.toString();
}

/** Exact decimal text of a minor-unit amount, for example 123456789012345678 paise -> "1234567890123456.78". */
export function minorToDecimal(minor: bigint | string, minorDigits = 2): string {
  const n = typeof minor === 'string' ? parseInt64(minor) : minor;
  const neg = n < 0n;
  const abs = (neg ? -n : n).toString().padStart(minorDigits + 1, '0');
  const whole = abs.slice(0, abs.length - minorDigits);
  const frac = abs.slice(abs.length - minorDigits);
  return `${neg ? '-' : ''}${whole}${minorDigits > 0 ? `.${frac}` : ''}`;
}

/** Localised currency text, exact for any Int64 (Intl formats the decimal string without going through a float). */
export function formatMinor(minor: bigint | string, currency: string, locale: string, minorDigits = 2): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: minorDigits, maximumFractionDigits: minorDigits }).format(minorToDecimal(minor, minorDigits) as unknown as number);
}
