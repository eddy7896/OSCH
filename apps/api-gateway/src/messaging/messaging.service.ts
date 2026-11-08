import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import { TeachingScope } from '../teaching/teaching-scope.service.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import type { ContactDto, ContactListDto, MessageDto, SendMessageDto, StartThreadDto, ThreadDetailDto, ThreadDto, ThreadListDto } from './dto/messaging.dto.js';

interface ConvRow {
  id: string; lastMessageAt?: string | null; createdAt: string;
  student: { id: string; firstName: string; lastName: string };
  staffUser: { id: string; displayName?: string | null; email: string };
  guardianUser: { id: string; displayName?: string | null; email: string };
  lastSender?: { id: string } | null;
}
interface MsgRow { id: string; clientId: string; body: string; hiddenAt?: string | null; createdAt: string; sender: { id: string } }

/** A sender may hide their own message for this long; the server's clock decides. */
export const MESSAGE_WINDOW_MS = 5 * 60_000;
const notFound = () => new ApiException(ErrorCode.NOT_FOUND, 404);
const forbidden = () => new ApiException(ErrorCode.FORBIDDEN, 403);
const invalid = (field: string, rule: string) => new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field, rule }]);
const kindOf = (e: unknown) => (e as { kind?: string }).kind;

/**
 * One-to-one conversations about a student between one member of staff and one parent account (P5-3b, ADR-0018). Messages are delivered at once at any hour; every message is
 * written to the audit trail with its words. A parent reaches only the teachers of their child's class; a teacher reaches only the parents of students in a class she teaches.
 * Each parent has a private conversation of their own. A sender may hide a message for 5 minutes; either person may report one to the Principal.
 */
@Injectable()
export class MessagingService {
  constructor(@Inject(DATABASE) private readonly db: Database, private readonly scope: TeachingScope) {}

  private isParent(t: TenantContext): boolean {
    return t.schoolRole === 'PARENT';
  }

  /** The class a student is in this year, or null. */
  private async classOf(t: TenantContext, studentId: string): Promise<{ id: string; name: string } | null> {
    const year = await this.scope.activeYearId(t.schoolId);
    if (!year) return null;
    const e = (await this.db.enrollmentsOfStudents({ schoolId: t.schoolId, academicYearId: year, studentIds: [dashed(studentId)] })).data.studentEnrollments[0];
    return e ? { id: dashed(e.classroom.id), name: e.classroom.name } : null;
  }

  /** Who the caller may start a conversation with about this student. */
  async contacts(t: TenantContext, studentId: string): Promise<ContactListDto> {
    const sid = dashed(studentId);
    const mine = await this.scope.mine(t);
    const klass = await this.classOf(t, sid);
    if (this.isParent(t)) {
      if (!mine.children.some((c) => dashed(c.id) === sid) || !klass) throw notFound();
      const year = (await this.scope.activeYearId(t.schoolId))!;
      const [heads, lessons] = await Promise.all([
        this.db.listClassTeachers({ schoolId: t.schoolId, academicYearId: year }),
        this.db.listTimetableForClass({ schoolId: t.schoolId, academicYearId: year, classroomId: klass.id }),
      ]);
      const out = new Map<string, ContactDto>();
      const add = (s: { firstName: string; lastName: string; userId?: string | null; status?: string }, label: string, subject?: string) => {
        if (!s.userId || (s.status && s.status !== 'ACTIVE')) return;
        const c = out.get(s.userId) ?? { userId: s.userId, name: `${s.firstName} ${s.lastName}`, label: 'TEACHER', subjects: [] as string[] };
        if (label === 'CLASS_TEACHER') c.label = 'CLASS_TEACHER';
        if (subject && !c.subjects.includes(subject)) c.subjects.push(subject);
        out.set(s.userId, c);
      };
      for (const h of heads.data.classTeachers) if (dashed(h.classroom.id) === klass.id) add(h.staff as never, 'CLASS_TEACHER');
      for (const l of lessons.data.timetableEntries) add(l.staff as never, 'TEACHER', l.subject.name);
      return { items: [...out.values()].sort((a, b) => (a.label === b.label ? a.name.localeCompare(b.name) : a.label === 'CLASS_TEACHER' ? -1 : 1)) };
    }
    // a teacher: only a class she teaches; the parents linked to that student
    if (!klass || !mine.classes.some((c) => dashed(c.id) === klass.id)) throw notFound();
    const links = (await this.db.parentLinksOfStudent({ schoolId: t.schoolId, studentId: sid })).data.parentLinks;
    return { items: links.map((l) => ({ userId: l.user.id, name: l.user.displayName ?? `Parent (${l.relationship.toLowerCase()})`, label: l.relationship, subjects: [] })) };
  }

  private who(u: { displayName?: string | null; email: string }, fallback: string): string {
    return u.displayName ?? fallback;
  }

  private threadView(c: ConvRow, me: string, readAt: string | undefined): ThreadDto {
    const asStaff = c.staffUser.id === me;
    const other = asStaff ? c.guardianUser : c.staffUser;
    const first = c.student.firstName;
    const lastBy = c.lastSender?.id;
    return {
      id: dashed(c.id),
      student: { id: dashed(c.student.id), name: `${c.student.firstName} ${c.student.lastName}` },
      other: { userId: other.id, kind: asStaff ? 'PARENT' : 'TEACHER', name: this.who(other, asStaff ? `Parent of ${first}` : 'Teacher') },
      lastMessageAt: c.lastMessageAt ?? null,
      unread: Boolean(lastBy && lastBy !== me && c.lastMessageAt && (!readAt || c.lastMessageAt > readAt)),
    };
  }

  async threads(t: TenantContext): Promise<ThreadListDto> {
    const [r, reads] = await Promise.all([this.db.listConversationsOf({ schoolId: t.schoolId, userId: t.userId, limit: 200 }), this.db.conversationReadsOf({ schoolId: t.schoolId, userId: t.userId })]);
    const readAt = new Map(reads.data.conversationReads.map((x) => [dashed(x.conversationId), x.readAt]));
    const rows = [...(r.data.asStaff as unknown as ConvRow[]), ...(r.data.asGuardian as unknown as ConvRow[])];
    const items = rows.map((c) => this.threadView(c, t.userId, readAt.get(dashed(c.id))));
    items.sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''));
    return { items };
  }

  private async conversation(t: TenantContext, id: string): Promise<ConvRow> {
    const c = (await this.db.getConversation({ schoolId: t.schoolId, id: dashed(id) })).data.conversations[0] as unknown as ConvRow | undefined;
    if (!c || (c.staffUser.id !== t.userId && c.guardianUser.id !== t.userId)) throw notFound(); // someone else's conversation looks exactly like one that does not exist
    return c;
  }

  async start(t: TenantContext, dto: StartThreadDto): Promise<ThreadDto> {
    const staffUserId = this.isParent(t) ? dto.otherUserId : t.userId;
    const guardianUserId = this.isParent(t) ? t.userId : dto.otherUserId;
    const allowed = (await this.contacts(t, dto.studentId)).items.some((c) => c.userId === dto.otherUserId);
    if (!allowed) throw this.isParent(t) ? forbidden() : notFound();
    const find = async () => (await this.db.conversationByParties({ schoolId: t.schoolId, studentId: dashed(dto.studentId), staffUserId, guardianUserId })).data.conversations[0] as unknown as ConvRow | undefined;
    let c = await find();
    if (!c) {
      try {
        await this.db.startConversation({ schoolId: t.schoolId, id: randomUUID(), studentId: dashed(dto.studentId), staffUserId, guardianUserId, actorId: t.userId, details: { studentId: dashed(dto.studentId), staffUserId, guardianUserId } });
      } catch (e) {
        if (kindOf(e) !== 'ALREADY_EXISTS' && kindOf(e) !== 'CONFLICT') throw e; // both people started it at once: the other one won
      }
      c = await find();
    }
    return this.threadView(c!, t.userId, undefined);
  }

  private msgView(m: MsgRow, me: string): MessageDto {
    const mine = m.sender.id === me;
    const hidden = Boolean(m.hiddenAt);
    return { id: dashed(m.id), mine, body: hidden ? null : m.body, hidden, canHide: mine && !hidden && Date.now() - Date.parse(m.createdAt) < MESSAGE_WINDOW_MS, createdAt: m.createdAt };
  }

  async thread(t: TenantContext, id: string): Promise<ThreadDetailDto> {
    const c = await this.conversation(t, id);
    const [msgs, reads] = await Promise.all([this.db.listMessages({ schoolId: t.schoolId, conversationId: dashed(id), limit: 200 }), this.db.conversationReadsOf({ schoolId: t.schoolId, userId: t.userId })]);
    const readAt = reads.data.conversationReads.find((x) => dashed(x.conversationId) === dashed(id))?.readAt;
    const messages = [...(msgs.data.messages as unknown as MsgRow[])].reverse().map((m) => this.msgView(m, t.userId));
    return { ...this.threadView(c, t.userId, readAt), messages };
  }

  async send(t: TenantContext, id: string, dto: SendMessageDto): Promise<MessageDto> {
    const c = await this.conversation(t, id);
    const again = (await this.db.messageByClientId({ schoolId: t.schoolId, conversationId: dashed(id), senderId: t.userId, clientId: dto.clientId })).data.messages[0] as unknown as MsgRow | undefined;
    if (again) return this.msgView(again, t.userId);
    const messageId = randomUUID();
    const other = c.staffUser.id === t.userId ? c.guardianUser.id : c.staffUser.id;
    try {
      await this.db.sendMessage({
        schoolId: t.schoolId, id: messageId, conversationId: dashed(id), studentId: dashed(c.student.id), clientId: dto.clientId, body: dto.body, staffUserId: c.staffUser.id, guardianUserId: c.guardianUser.id,
        recipientUserId: other, kind: 'message.received', actorId: t.userId, details: { conversationId: dashed(id), studentId: dashed(c.student.id), to: other, body: dto.body },
      });
    } catch (e) {
      if (kindOf(e) === 'ALREADY_EXISTS' || kindOf(e) === 'CONFLICT') { // the same message arrived twice at once
        const same = (await this.db.messageByClientId({ schoolId: t.schoolId, conversationId: dashed(id), senderId: t.userId, clientId: dto.clientId })).data.messages[0] as unknown as MsgRow | undefined;
        if (same) return this.msgView(same, t.userId);
      }
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw forbidden(); // the parent is no longer linked or the teacher is no longer active
      throw e;
    }
    const m = (await this.db.getMessage({ schoolId: t.schoolId, id: messageId })).data.messages[0] as unknown as MsgRow;
    return this.msgView(m, t.userId);
  }

  async markRead(t: TenantContext, id: string): Promise<void> {
    await this.conversation(t, id);
    await this.db.markConversationRead({ schoolId: t.schoolId, conversationId: dashed(id), actorId: t.userId });
  }

  private async message(t: TenantContext, id: string, messageId: string) {
    await this.conversation(t, id);
    const m = (await this.db.getMessage({ schoolId: t.schoolId, id: dashed(messageId) })).data.messages[0] as unknown as (MsgRow & { conversation: { id: string; staffUser: { id: string }; guardianUser: { id: string } } }) | undefined;
    if (!m || dashed(m.conversation.id) !== dashed(id)) throw notFound();
    return m;
  }

  async hide(t: TenantContext, id: string, messageId: string): Promise<MessageDto> {
    const m = await this.message(t, id, messageId);
    if (m.sender.id !== t.userId) throw notFound(); // only the sender hides their own message
    if (m.hiddenAt) throw new ApiException(ErrorCode.CONFLICT, 409, [{ field: 'message', rule: 'alreadyHidden' }]);
    if (Date.now() - Date.parse(m.createdAt) >= MESSAGE_WINDOW_MS) throw new ApiException(ErrorCode.CONFLICT, 409, [{ field: 'message', rule: 'hideWindowClosed' }]);
    try {
      await this.db.hideMessage({ schoolId: t.schoolId, id: dashed(m.id), windowStart: new Date(Date.now() - MESSAGE_WINDOW_MS).toISOString(), actorId: t.userId, details: { conversationId: dashed(id), body: m.body } });
    } catch (e) {
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw new ApiException(ErrorCode.CONFLICT, 409, [{ field: 'message', rule: 'hideWindowClosed' }]);
      throw e;
    }
    return this.msgView((await this.db.getMessage({ schoolId: t.schoolId, id: dashed(m.id) })).data.messages[0] as unknown as MsgRow, t.userId);
  }

  /** Either person reports a message of the conversation (also one they wrote? no: only the other person's). The Principal is told. */
  async report(t: TenantContext, id: string, messageId: string, note?: string): Promise<void> {
    const m = await this.message(t, id, messageId);
    if (m.sender.id === t.userId) throw invalid('messageId', 'notYourOwn');
    await this.db.reportMessage({
      schoolId: t.schoolId, id: randomUUID(), conversationId: dashed(id), messageId: dashed(m.id), staffUserId: m.conversation.staffUser.id, guardianUserId: m.conversation.guardianUser.id, note: note ?? null, kind: 'message.reported',
      actorId: t.userId, details: { conversationId: dashed(id), messageId: dashed(m.id), body: m.body, note: note ?? null },
    });
  }
}
