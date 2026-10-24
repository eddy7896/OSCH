import { formatMinor } from "@oruschools/api-client";

/** A BCP 47 tag for numbers and dates in India for the language the person chose. */
export const regionLocale = (locale: string): string => `${locale}-IN`;

/** Rupees from paise, exact for any amount, grouped the Indian way for English and Hindi. */
export const rupees = (minor: string, locale: string): string => formatMinor(minor, "INR", regionLocale(locale));

/** `2027-04-02` as `2 Apr 2027` in the person's language. A calendar date has no time zone, so it is read as UTC and shown as UTC. */
export function shortDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(regionLocale(locale), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

export const todayIso = (now: Date = new Date()): string => now.toISOString().slice(0, 10);
export const firstOfMonth = (now: Date = new Date()): string => `${todayIso(now).slice(0, 8)}01`;

/** Message key of a payment method (`BANK_TRANSFER` -> `paymentMethodBankTransfer`). */
export const methodKey = (method: string): string => `paymentMethod${method.toLowerCase().replace(/(^|_)([a-z])/g, (_m, _u, c: string) => c.toUpperCase())}`;

export const BAND_KEY: Record<string, string> = {
  DUE_TODAY: "webBandDueToday",
  DAYS_1_30: "webBand1To30",
  DAYS_31_60: "webBand31To60",
  DAYS_61_90: "webBand61To90",
  DAYS_OVER_90: "webBandOver90",
};

/**
 * Rupees typed by a person (`45000`, `45,000.5`, `45000.50`) as paise for the gateway, or null when it is not an amount. Whole paise only,
 * no sign, nothing but digits, an optional comma grouping and at most two decimals; exact for any size (no floating point).
 */
export function rupeesToMinor(text: string): string | null {
  const t = text.trim().replaceAll(",", "");
  const m = /^(\d{1,15})(?:\.(\d{1,2}))?$/.exec(t);
  if (!m) return null;
  const minor = `${m[1]!}${(m[2] ?? "").padEnd(2, "0")}`.replace(/^0+(?=\d)/, "");
  return minor === "0" ? null : minor;
}

/** `2027-04` style label of a pay month, `04/2027`. */
export const monthLabel = (year: number, month: number): string => `${String(month).padStart(2, "0")}/${year}`;
