/** Pure rules for invoices (P2-7b): what state an invoice is in, and how unpaid money is aged. Dates are calendar dates `YYYY-MM-DD`. */

export type EffectiveStatus = 'PAID' | 'OVERDUE' | 'PARTIAL' | 'PENDING';

export interface InvoiceFigures {
  /** The stored status: PENDING or PAID (OVERDUE is never stored). */
  status: string;
  amountMinor: bigint;
  paidMinor: bigint;
  dueDate: string;
}

/** PAID when settled; otherwise OVERDUE when the due date is before today; otherwise PARTIAL when something was paid; otherwise PENDING. */
export function effectiveStatus(i: InvoiceFigures, today: string): EffectiveStatus {
  if (i.status === 'PAID' || i.paidMinor >= i.amountMinor) return 'PAID';
  if (i.dueDate < today) return 'OVERDUE';
  return i.paidMinor > 0n ? 'PARTIAL' : 'PENDING';
}

/** The status to store after a payment (or a reversal) leaves `paid` paid on an invoice of `amount`. */
export const storedStatus = (amount: bigint, paid: bigint): 'PAID' | 'PENDING' => (paid >= amount ? 'PAID' : 'PENDING');

/** `date` plus `days` (negative to go back), in UTC so a time zone can never move a calendar date. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface Band {
  key: 'NOT_DUE' | 'DAYS_1_30' | 'DAYS_31_60' | 'DAYS_61_90' | 'DAYS_OVER_90';
  /** Due dates in the band, inclusive; either end absent means open on that side. */
  from?: string;
  to?: string;
}

/**
 * Ageing bands as of a date: not yet due (due after `asOf`), then 1 to 30, 31 to 60, 61 to 90, and over 90 days past the due date.
 * A date due on `asOf` itself is not overdue yet, so it belongs to "not due".
 */
export function ageingBands(asOf: string): Band[] {
  return [
    { key: 'NOT_DUE', from: addDays(asOf, 0) },
    { key: 'DAYS_1_30', from: addDays(asOf, -30), to: addDays(asOf, -1) },
    { key: 'DAYS_31_60', from: addDays(asOf, -60), to: addDays(asOf, -31) },
    { key: 'DAYS_61_90', from: addDays(asOf, -90), to: addDays(asOf, -61) },
    { key: 'DAYS_OVER_90', to: addDays(asOf, -91) },
  ];
}
