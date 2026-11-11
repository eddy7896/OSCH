/**
 * What a parent consents to (P6-5c, documentation/modules/children-data-protection.md). The words of the notice live in packages/i18n (key `privNoticeVersion` holds this number, and a test
 * pins the two together), so raising the version here asks every parent again at their next sign-in.
 */
export const CONSENT_NOTICE_VERSION = 1;

/** The purposes. SCHOOL_USE is required to use the Parent app: school work and the safety of the child. A newsletter, photos or a new third-party tool would each be a new, optional purpose. */
export const CONSENT_PURPOSES = [{ purpose: 'SCHOOL_USE', required: true }] as const;
export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number]['purpose'];
