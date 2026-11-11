import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import { CONSENT_NOTICE_VERSION, CONSENT_PURPOSES } from './consent.constants.js';
import type { ConsentOverviewDto, ConsentOverviewParentDto, ConsentStatusDto, RecordConsentDto } from './dto/consent.dto.js';

interface Answer { purpose: string; noticeVersion: number; language?: string; given: boolean; createdAt: string }

/** The latest answer for each purpose, from rows newest first. */
export function latestByPurpose(rows: readonly Answer[]): Map<string, Answer> {
  const out = new Map<string, Answer>();
  for (const r of rows) if (!out.has(r.purpose)) out.set(r.purpose, r);
  return out;
}

/** Whether these answers cover every required purpose for the notice in force. */
export function isCurrent(rows: readonly Answer[]): boolean {
  const latest = latestByPurpose(rows);
  return CONSENT_PURPOSES.every((p) => !p.required || (latest.get(p.purpose)?.given === true && latest.get(p.purpose)?.noticeVersion === CONSENT_NOTICE_VERSION));
}

/** Parent consent (P6-5c). The parent's own answers are read and written for the caller only; the school sees a read-only overview. */
@Injectable()
export class ConsentService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  private async answers(t: TenantContext): Promise<Answer[]> {
    return (await this.db.consentOfUser({ schoolId: t.schoolId, userId: t.userId })).data.consentRecords as unknown as Answer[];
  }

  /** Used by the consent gate on every parent request. */
  async hasCurrent(t: TenantContext): Promise<boolean> {
    return isCurrent(await this.answers(t));
  }

  private statusOf(rows: readonly Answer[]): ConsentStatusDto {
    const latest = latestByPurpose(rows);
    return {
      noticeVersion: CONSENT_NOTICE_VERSION,
      purposes: CONSENT_PURPOSES.map((p) => {
        const a = latest.get(p.purpose);
        return { purpose: p.purpose, required: p.required, given: a?.given === true, noticeVersion: a?.noticeVersion ?? null, recordedAt: a?.createdAt ?? null };
      }),
      current: isCurrent(rows),
    };
  }

  async status(t: TenantContext): Promise<ConsentStatusDto> {
    return this.statusOf(await this.answers(t));
  }

  /** Gives or withdraws consent to every purpose of the notice in force. Each call is a new record; none is ever changed. */
  async record(t: TenantContext, dto: RecordConsentDto): Promise<ConsentStatusDto> {
    if (dto.noticeVersion !== CONSENT_NOTICE_VERSION) throw new ApiException(ErrorCode.CONFLICT, 409, [{ field: 'noticeVersion', rule: 'the notice has changed; read the new one' }]);
    const students = (await this.db.parentLinksOfUser({ schoolId: t.schoolId, userId: t.userId })).data.parentLinks.map((l) => dashed(l.student.id));
    for (const p of CONSENT_PURPOSES) {
      await this.db.recordConsent({
        schoolId: t.schoolId, userId: t.userId, purpose: p.purpose, noticeVersion: CONSENT_NOTICE_VERSION, language: dto.language, given: dto.given, students,
        details: { purpose: p.purpose, noticeVersion: CONSENT_NOTICE_VERSION, language: dto.language, given: dto.given, students: students.length },
      });
    }
    return this.status(t);
  }

  /** Every parent of the school and where they stand, for the access review. Names and counts only; nothing about the children. */
  async overview(t: TenantContext): Promise<ConsentOverviewDto> {
    const data = (await this.db.consentOverview({ schoolId: t.schoolId })).data;
    const byUser = new Map<string, Answer[]>();
    for (const r of data.consentRecords as unknown as (Answer & { userId: string })[]) byUser.set(r.userId, [...(byUser.get(r.userId) ?? []), r]);
    const items: ConsentOverviewParentDto[] = data.parents.map((p) => {
      const rows = byUser.get(p.user.id) ?? [];
      const latest = latestByPurpose(rows).get(CONSENT_PURPOSES[0].purpose);
      const state: ConsentOverviewParentDto['state'] = !latest ? 'NONE' : !latest.given ? 'WITHDRAWN' : latest.noticeVersion === CONSENT_NOTICE_VERSION ? 'CURRENT' : 'OLD_VERSION';
      return { id: p.user.id, name: p.user.displayName ?? p.user.email, state, noticeVersion: latest?.noticeVersion ?? null, language: latest?.language ?? null, recordedAt: latest?.createdAt ?? null };
    });
    items.sort((a, b) => a.name.localeCompare(b.name));
    const n = (s: ConsentOverviewParentDto['state']) => items.filter((i) => i.state === s).length;
    return { noticeVersion: CONSENT_NOTICE_VERSION, counts: { parents: items.length, current: n('CURRENT'), withdrawn: n('WITHDRAWN'), oldVersion: n('OLD_VERSION'), none: n('NONE') }, items };
  }
}
