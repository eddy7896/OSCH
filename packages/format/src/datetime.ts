/**
 * Business dates are calendar dates with no time zone (`2026-06-24`); they are read and shown as written, never moved by a
 * time zone. English is formatted from fixed tables so every platform prints exactly the same; other languages use the
 * platform's own locale data (and may differ slightly between platforms).
 */
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parts(date: string): { y: number; m: number; d: number; weekday: number } {
  const m = DATE.exec(date);
  if (!m) throw new RangeError('a date is written YYYY-MM-DD');
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const utc = new Date(Date.UTC(y, mo - 1, d));
  if (utc.getUTCFullYear() !== y || utc.getUTCMonth() !== mo - 1 || utc.getUTCDate() !== d) throw new RangeError('not a real date');
  return { y, m: mo, d, weekday: utc.getUTCDay() };
}

const isEnglish = (locale: string) => locale.toLowerCase().startsWith('en');

/** `Tue, 24 Jun`, or `Tue, 24 Jun 2026` with `withYear`. */
export function formatDate(date: string, { locale = 'en-IN', withYear = false }: { locale?: string; withYear?: boolean } = {}): string {
  const p = parts(date);
  if (isEnglish(locale)) return `${DAYS[p.weekday]}, ${p.d} ${MONTHS[p.m - 1]}${withYear ? ` ${p.y}` : ''}`;
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'UTC' }).format(new Date(Date.UTC(p.y, p.m - 1, p.d)));
}

/** `8:45 AM` from `08:45` (24-hour text). */
export function formatTime(time: string, { locale = 'en-IN' }: { locale?: string } = {}): string {
  const m = TIME.exec(time);
  if (!m) throw new RangeError('a time is written HH:mm (24-hour)');
  const hour = Number(m[1]);
  const minute = m[2];
  if (isEnglish(locale)) return `${hour % 12 === 0 ? 12 : hour % 12}:${minute} ${hour < 12 ? 'AM' : 'PM'}`;
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }).format(new Date(Date.UTC(2000, 0, 1, hour, Number(minute))));
}
