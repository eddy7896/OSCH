import { CONSENT_NOTICE_VERSION } from './consent.constants.js';
import { isCurrent, latestByPurpose } from './consent.service.js';

const row = (given: boolean, v: number, at: string, purpose = 'SCHOOL_USE') => ({ purpose, noticeVersion: v, given, createdAt: at });

describe('parent consent: the latest answer counts', () => {
  it('no answer is not consent', () => expect(isCurrent([])).toBe(false));
  it('consent to the current version is consent', () => expect(isCurrent([row(true, CONSENT_NOTICE_VERSION, '2026-11-01')])).toBe(true));
  it('rows come newest first: a later withdrawal wins over an earlier consent', () => {
    expect(isCurrent([row(false, CONSENT_NOTICE_VERSION, '2026-11-02'), row(true, CONSENT_NOTICE_VERSION, '2026-11-01')])).toBe(false);
    expect(isCurrent([row(true, CONSENT_NOTICE_VERSION, '2026-11-03'), row(false, CONSENT_NOTICE_VERSION, '2026-11-02'), row(true, CONSENT_NOTICE_VERSION, '2026-11-01')])).toBe(true);
  });
  it('consent to another notice version does not count', () => {
    expect(isCurrent([row(true, CONSENT_NOTICE_VERSION - 1, '2026-11-01')])).toBe(false);
    expect(isCurrent([row(true, CONSENT_NOTICE_VERSION + 1, '2026-11-01')])).toBe(false);
  });
  it('keeps the first (newest) row of each purpose', () => {
    const m = latestByPurpose([row(true, 1, '3', 'A'), row(false, 1, '2', 'A'), row(false, 1, '1', 'B')]);
    expect(m.get('A')?.given).toBe(true);
    expect(m.get('B')?.given).toBe(false);
  });
});
