import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import type { MessageAuditEntryDto, MessageAuditPageDto, PersonRefDto, ReportDetailDto, ReportDto, ReportListDto } from './dto/review.dto.js';

type U = { id: string; displayName?: string | null; email: string };
interface ReportRow {
  id: string; note?: string | null; createdAt: string; reviewedAt?: string | null; reviewedBy?: U | null; reportedBy: U;
  message: { id: string; body: string; hiddenAt?: string | null; createdAt: string; sender: U; conversation: { id: string; student: { id: string; firstName: string; lastName: string }; staffUser: U; guardianUser: U } };
}
const notFound = () => new ApiException(ErrorCode.NOT_FOUND, 404);
const kindOf = (e: unknown) => (e as { kind?: string }).kind;
const person = (u: U): PersonRefDto => ({ userId: u.id, name: u.displayName ?? u.email });
const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

/**
 * Looking at messages after the fact (P5-3e, ADR-0018 decisions 2 and 7, guardrails section 3). The Principal reads a reported message with its whole conversation and closes the report;
 * the System Admin reads the trail of every message and class message, and each such read is itself written down. Nothing here edits or deletes a message.
 */
@Injectable()
export class MessageReviewService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  private report(r: ReportRow): ReportDto {
    const c = r.message.conversation;
    return {
      id: dashed(r.id), note: r.note ?? null, reportedAt: r.createdAt, reportedBy: person(r.reportedBy), reviewed: Boolean(r.reviewedAt), reviewedAt: r.reviewedAt ?? null,
      message: { id: dashed(r.message.id), body: r.message.body, hidden: Boolean(r.message.hiddenAt), sentAt: r.message.createdAt, sender: person(r.message.sender), student: { id: dashed(c.student.id), name: `${c.student.firstName} ${c.student.lastName}` }, staff: person(c.staffUser), guardian: person(c.guardianUser) },
    };
  }

  /** Waiting reports first (oldest first, so none is forgotten), then the reviewed ones, newest first. */
  async reports(t: TenantContext): Promise<ReportListDto> {
    const rows = (await this.db.listMessageReports({ schoolId: t.schoolId, limit: 200 })).data.messageReports as unknown as ReportRow[];
    const items = rows.map((r) => this.report(r));
    const waiting = items.filter((x) => !x.reviewed).sort((a, b) => a.reportedAt.localeCompare(b.reportedAt));
    const done = items.filter((x) => x.reviewed).sort((a, b) => (b.reviewedAt ?? '').localeCompare(a.reviewedAt ?? ''));
    return { items: [...waiting, ...done] };
  }

  async one(t: TenantContext, id: string): Promise<ReportDetailDto> {
    const r = (await this.db.getMessageReport({ schoolId: t.schoolId, id: dashed(id) })).data.messageReports[0] as unknown as ReportRow | undefined;
    if (!r) throw notFound();
    const msgs = (await this.db.listMessages({ schoolId: t.schoolId, conversationId: dashed(r.message.conversation.id), limit: 200 })).data.messages;
    const c = r.message.conversation;
    const who = (uid: string): PersonRefDto => person(uid === c.staffUser.id ? c.staffUser : c.guardianUser);
    const conversation = [...msgs]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((m) => ({ id: dashed(m.id), sender: who(m.sender.id), body: m.body, hidden: Boolean(m.hiddenAt), sentAt: m.createdAt, reported: dashed(m.id) === dashed(r.message.id) }));
    return { ...this.report(r), conversation };
  }

  /** Closes the report. The Principal's note goes to the audit trail with the words that were reported. */
  async review(t: TenantContext, id: string, note: string | undefined): Promise<ReportDto> {
    const r = (await this.db.getMessageReport({ schoolId: t.schoolId, id: dashed(id) })).data.messageReports[0] as unknown as ReportRow | undefined;
    if (!r) throw notFound();
    try {
      await this.db.reviewMessageReport({ schoolId: t.schoolId, id: dashed(id), actorId: t.userId, details: { reportId: dashed(id), messageId: dashed(r.message.id), body: r.message.body, note: note ?? null } });
    } catch (e) {
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw new ApiException(ErrorCode.CONFLICT, 409, [{ field: 'report', rule: 'alreadyReviewed' }]);
      throw e;
    }
    const after = (await this.db.getMessageReport({ schoolId: t.schoolId, id: dashed(id) })).data.messageReports[0] as unknown as ReportRow;
    return this.report(after);
  }

  /** One page of the trail of messages, newest first. The read is written down before anything is returned. */
  async audit(t: TenantContext, limit = 50, offset = 0): Promise<MessageAuditPageDto> {
    await this.db.recordMessageAuditRead({ schoolId: t.schoolId, actorId: t.userId, details: { limit, offset } });
    const rows = (await this.db.listMessageAudit({ schoolId: t.schoolId, limit: limit + 1, offset })).data.auditLogs;
    const page = rows.slice(0, limit);
    const detailsOf = (r: (typeof rows)[number]) => (r.details ?? {}) as Record<string, unknown>;
    const convIds = [...new Set(page.map((r) => (r.action === 'message.thread.start' ? str(r.entityId) : str(detailsOf(r).conversationId))).filter((x): x is string => x !== null).map(dashed))];
    const convs = convIds.length ? (await this.db.conversationsByIds({ schoolId: t.schoolId, ids: convIds })).data.conversations : [];
    const byId = new Map(convs.map((c) => [dashed(c.id), c]));
    const items: MessageAuditEntryDto[] = page.map((r) => {
      const d = detailsOf(r);
      const cid = r.action === 'message.thread.start' ? str(r.entityId) : str(d.conversationId);
      const c = cid ? byId.get(dashed(cid)) : undefined;
      let to: string | null = null;
      if (c) {
        const other = r.actor.id === c.staffUser.id ? c.guardianUser : r.actor.id === c.guardianUser.id ? c.staffUser : null;
        to = other ? (other.displayName ?? other.email) : null;
      }
      return {
        id: dashed(r.id), at: r.createdAt, action: r.action, actor: person(r.actor), to,
        student: c ? `${c.student.firstName} ${c.student.lastName}` : null,
        title: str(d.title), body: str(d.body), note: str(d.note),
      };
    });
    return { items, next: rows.length > limit ? offset + limit : null };
  }
}
