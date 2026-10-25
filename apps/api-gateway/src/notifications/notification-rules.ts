/** Pure rules of the in-app inbox (P3-9, ADR-0013 decision 9): which category a notification is in, and how its words are made in the reader's language. */

export const CATEGORIES = ['leave', 'substitution', 'payroll'] as const;
export type Category = (typeof CATEGORIES)[number];

interface KindInfo { category: Category; title: string; body: string }
/** Every kind a database operation writes. The words live in `packages/i18n/messages` under these keys. */
export const KINDS: Readonly<Record<string, KindInfo>> = {
  'leave.requested': { category: 'leave', title: 'notifLeaveRequestedTitle', body: 'notifLeaveRequestedBody' },
  'leave.approved': { category: 'leave', title: 'notifLeaveApprovedTitle', body: 'notifLeaveApprovedBody' },
  'leave.rejected': { category: 'leave', title: 'notifLeaveRejectedTitle', body: 'notifLeaveRejectedBody' },
  'leave.substitution': { category: 'substitution', title: 'notifLeaveSubstitutionTitle', body: 'notifLeaveSubstitutionBody' },
  'leave.payroll': { category: 'payroll', title: 'notifLeavePayrollTitle', body: 'notifLeavePayrollBody' },
  'substitution.assigned': { category: 'substitution', title: 'notifSubstitutionAssignedTitle', body: 'notifSubstitutionAssignedBody' },
  'substitution.cleared': { category: 'substitution', title: 'notifSubstitutionClearedTitle', body: 'notifSubstitutionClearedBody' },
};

export const categoryOf = (kind: string): Category | null => KINDS[kind]?.category ?? null;

const DATE_KEYS = new Set(['date', 'startDate', 'endDate']);
const dmy = (iso: string): string => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}` : iso);

/** Fills `{name}` placeholders from the params (dates as day-month-year). A missing value becomes empty rather than showing the braces. */
export function fill(template: string, params: Record<string, unknown>): string {
  return template.replace(/\{([A-Za-z]+)\}/g, (_m, key: string) => {
    const v = params[key];
    if (v === undefined || v === null) return '';
    const text = String(v);
    return DATE_KEYS.has(key) ? dmy(text) : text;
  }).replace(/\s+([.,])/g, '$1').trim();
}

/** The title and body of a notification in a language; any key a language lacks falls back to English, and an unknown kind to the kind itself. */
export function render(kind: string, params: unknown, messages: Readonly<Record<string, string>>, english: Readonly<Record<string, string>>): { title: string; body: string } {
  const info = KINDS[kind];
  if (!info) return { title: kind, body: '' };
  const p = params && typeof params === 'object' ? (params as Record<string, unknown>) : {};
  const pick = (key: string): string => messages[key] ?? english[key] ?? '';
  return { title: fill(pick(info.title), p), body: fill(pick(info.body), p) };
}
