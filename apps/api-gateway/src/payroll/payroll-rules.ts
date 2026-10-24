/** Pure rules of payroll (P2-8). Amounts are bigint paise; nothing here uses a floating-point number. */
export type LineKind = 'EARNING' | 'DEDUCTION';
export interface Line {
  kind: string;
  amountMinor: string | bigint;
}

export interface Totals {
  grossMinor: bigint;
  deductionsMinor: bigint;
  netMinor: bigint;
}

/** Gross = every earning, deductions = every deduction, net = gross minus deductions (it can be negative: that is a mistake to fix before approval). */
export function totalsOf(lines: readonly Line[]): Totals {
  let gross = 0n, deductions = 0n;
  for (const l of lines) {
    const a = BigInt(l.amountMinor);
    if (l.kind === 'EARNING') gross += a;
    else if (l.kind === 'DEDUCTION') deductions += a;
  }
  return { grossMinor: gross, deductionsMinor: deductions, netMinor: gross - deductions };
}

/** Names of the people whose net pay would be negative; a run with any of them cannot be approved. */
export function negativeNet(payslips: ReadonlyArray<{ name: string; lines: readonly Line[] }>): string[] {
  return payslips.filter((p) => totalsOf(p.lines).netMinor < 0n).map((p) => p.name);
}

/** Months are 1 to 12; a run may be made for any month up to the next one (so next month's can be prepared early). */
export function monthAllowed(year: number, month: number, now: Date = new Date()): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12 || year < 2000 || year > 2200) return false;
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return year * 12 + month <= next.getUTCFullYear() * 12 + (next.getUTCMonth() + 1);
}

export const period = (year: number, month: number): string => `${String(month).padStart(2, '0')}/${year}`;
