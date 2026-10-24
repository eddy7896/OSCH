/** Pure rules of the reports (P2-9): date windows, ageing of dues, and sums over payments. Amounts are bigint paise. */
export const MAX_RANGE_DAYS = 366;
/** A report holds its rows in memory (Data Connect has no group-by), so a window with more rows than this is refused: ask for a shorter one. */
export const MAX_ROWS = 20000;

export const realDate = (d: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d);

export const daysBetween = (from: string, to: string): number => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** `null` when the window is fine, else which rule it breaks. Both ends are included, so a one-day window has from = to. */
export function rangeProblem(from: string, to: string): 'realDate' | 'beforeFrom' | 'rangeTooLong' | null {
  if (!realDate(from) || !realDate(to)) return 'realDate';
  if (to < from) return 'beforeFrom';
  return daysBetween(from, to) + 1 > MAX_RANGE_DAYS ? 'rangeTooLong' : null;
}

export type DueBand = 'DUE_TODAY' | 'DAYS_1_30' | 'DAYS_31_60' | 'DAYS_61_90' | 'DAYS_OVER_90';
export const DUE_BANDS: readonly DueBand[] = ['DUE_TODAY', 'DAYS_1_30', 'DAYS_31_60', 'DAYS_61_90', 'DAYS_OVER_90'];

/** The ageing band of an invoice that is `days` past its due date (0 means due on the report date itself, not yet overdue). */
export const bandOf = (days: number): DueBand => (days <= 0 ? 'DUE_TODAY' : days <= 30 ? 'DAYS_1_30' : days <= 60 ? 'DAYS_31_60' : days <= 90 ? 'DAYS_61_90' : 'DAYS_OVER_90');

export interface PaymentFigures {
  paidOn: string;
  method: string;
  amountMinor: string | bigint;
  reversed: boolean;
}

export interface PaymentSummary {
  count: number;
  collectedMinor: bigint;
  reversedMinor: bigint;
  byMethod: Array<{ method: string; count: number; amountMinor: bigint }>;
  byDay: Array<{ date: string; count: number; amountMinor: bigint }>;
}

/** Collected = payments still standing; reversed = payments taken back (shown on their own, never hidden). By method and by day count standing payments only. */
export function summarisePayments(rows: readonly PaymentFigures[]): PaymentSummary {
  let collected = 0n, reversed = 0n, count = 0;
  const method = new Map<string, { count: number; amountMinor: bigint }>();
  const day = new Map<string, { count: number; amountMinor: bigint }>();
  for (const r of rows) {
    const a = BigInt(r.amountMinor);
    if (r.reversed) { reversed += a; continue; }
    collected += a; count++;
    for (const [m, key] of [[method, r.method], [day, r.paidOn]] as const) {
      const e = m.get(key) ?? { count: 0, amountMinor: 0n };
      e.count++; e.amountMinor += a;
      m.set(key, e);
    }
  }
  const sorted = <K extends string>(m: Map<string, { count: number; amountMinor: bigint }>, name: K) => [...m].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => ({ [name]: k, ...v }) as { [P in K]: string } & { count: number; amountMinor: bigint });
  return { count, collectedMinor: collected, reversedMinor: reversed, byMethod: sorted(method, 'method'), byDay: sorted(day, 'date') };
}
