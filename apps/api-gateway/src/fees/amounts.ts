import { percentOf } from '@oruschools/format';

/** The discount rules of P2-7a. All amounts are minor units (paise) as bigint; nothing here ever touches a floating-point number. */
export interface ConcessionRule {
  kind: 'PERCENT' | 'FIXED';
  /** 100 = 1%. Required for PERCENT. */
  basisPoints?: number | null;
  /** Required for FIXED. */
  amountMinor?: bigint | null;
  /** The fee item it applies to; null or absent means every item. */
  feeItemId?: string | null;
}

/** What one concession takes off one instalment: a percentage (rounded half away from zero to the paisa) or a fixed amount, never more than the instalment. */
export function discountOf(gross: bigint, rule: ConcessionRule): bigint {
  const raw = rule.kind === 'PERCENT' ? percentOf(gross, rule.basisPoints ?? 0) : (rule.amountMinor ?? 0n);
  return raw < 0n ? 0n : raw > gross ? gross : raw;
}

/**
 * The discount on one instalment of one item: each applicable concession is worked out on the full instalment (so the order they were
 * given in does not matter), the results are added, and the total never exceeds the instalment, so a net amount is never negative.
 */
export function totalDiscount(gross: bigint, itemId: string, rules: readonly ConcessionRule[]): bigint {
  let sum = 0n;
  for (const r of rules) if (!r.feeItemId || r.feeItemId === itemId) sum += discountOf(gross, r);
  return sum > gross ? gross : sum;
}

export const netOf = (gross: bigint, itemId: string, rules: readonly ConcessionRule[]): bigint => gross - totalDiscount(gross, itemId, rules);
