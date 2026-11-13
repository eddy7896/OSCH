/** Pure rules of the in-app inbox (P3-9, ADR-0013 decision 9): which category a notification is in, and how its words are made in the reader's language. */

export const CATEGORIES = ['leave', 'substitution', 'payroll', 'announcement', 'studentleave', 'resourcecomment', 'message'] as const;
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
  'announcement.posted': { category: 'announcement', title: 'notifAnnouncementPostedTitle', body: 'notifAnnouncementPostedBody' },
  'notice.posted': { category: 'announcement', title: 'notifNoticePostedTitle', body: 'notifNoticePostedBody' },
  'studentleave.requested': { category: 'studentleave', title: 'notifStudentleaveRequestedTitle', body: 'notifStudentleaveRequestedBody' },
  'studentleave.approved': { category: 'studentleave', title: 'notifStudentleaveApprovedTitle', body: 'notifStudentleaveApprovedBody' },
  'studentleave.declined': { category: 'studentleave', title: 'notifStudentleaveDeclinedTitle', body: 'notifStudentleaveDeclinedBody' },
  'resourcecomment.staffposted': { category: 'resourcecomment', title: 'notifResourcecommentStaffpostedTitle', body: 'notifResourcecommentStaffpostedBody' },
  'resourcecomment.parentposted': { category: 'resourcecomment', title: 'notifResourcecommentParentpostedTitle', body: 'notifResourcecommentParentpostedBody' },
  'resourcecomment.hidden': { category: 'resourcecomment', title: 'notifResourcecommentHiddenTitle', body: 'notifResourcecommentHiddenBody' },
  'message.received': { category: 'message', title: 'notifMessageReceivedTitle', body: 'notifMessageReceivedBody' },
  'broadcast.posted': { category: 'message', title: 'notifBroadcastPostedTitle', body: 'notifBroadcastPostedBody' },
  'message.reported': { category: 'message', title: 'notifMessageReportedTitle', body: 'notifMessageReportedBody' },
  'substitution.cleared': { category: 'substitution', title: 'notifSubstitutionClearedTitle', body: 'notifSubstitutionClearedBody' },
};

export const categoryOf = (kind: string): Category | null => KINDS[kind]?.category ?? null;

const DATE_KEYS = new Set(['date', 'startDate', 'endDate']);
const dmy = (iso: string): string => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}` : iso);

/** Left-to-right isolates: a date written inside right-to-left text keeps its digits in order (without them 26-10-2026 reads as 2026-10-26 in Urdu). */
const LRI = '\u2066';
const PDI = '\u2069';
/** A hyphen that does not let a line break inside the date. */
const NB_HYPHEN = '\u2011';

/** Fills `{name}` placeholders from the params (dates as day-month-year, isolated when the text runs right to left). A missing value becomes empty rather than showing the braces. */
export function fill(template: string, params: Record<string, unknown>, rtl = false): string {
  return template.replace(/\{([A-Za-z]+)\}/g, (_m, key: string) => {
    const v = params[key];
    if (v === undefined || v === null) return '';
    const text = String(v);
    return DATE_KEYS.has(key) ? (rtl ? `${LRI}${dmy(text).replaceAll('-', NB_HYPHEN)}${PDI}` : dmy(text)) : text;
  }).replace(/\s+([.,])/g, '$1').trim();
}

/** The title and body of a notification in a language; any key a language lacks falls back to English, and an unknown kind to the kind itself. */
export function render(kind: string, params: unknown, messages: Readonly<Record<string, string>>, english: Readonly<Record<string, string>>, rtl = false): { title: string; body: string } {
  const info = KINDS[kind];
  if (!info) return { title: kind, body: '' };
  const p = params && typeof params === 'object' ? (params as Record<string, unknown>) : {};
  const pick = (key: string): string => messages[key] ?? english[key] ?? '';
  return { title: fill(pick(info.title), p, rtl), body: fill(pick(info.body), p, rtl) };
}

/**
 * The words a VISIBLE push may carry (P6-5d, E-PRIV-5, documentation/modules/children-data-protection.md): the same for every kind and never filled from the notification's params, so no child's name,
 * score or reason can leave through the push provider. Today's pushes are silent and carry only ids (fcm-push-sender.ts); when the apps show an alert, these are its only words.
 */
export function pushWords(messages: Readonly<Record<string, string>>, english: Readonly<Record<string, string>>): { title: string; body: string } {
  const pick = (key: string): string => messages[key] ?? english[key] ?? '';
  return { title: pick('pushTitle'), body: pick('pushBody') };
}
