import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import { TeachingScope } from '../teaching/teaching-scope.service.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import type { BroadcastDetailDto, BroadcastListDto, CreateBroadcastDto } from './dto/broadcasts.dto.js';

type Scope = 'school' | 'own' | 'linked';
interface BRow { id: string; title: string; body: string; targetCount: number; createdAt: string; classroom: { id: string; name: string }; sender: { id: string; displayName?: string | null; email: string } }

const notFound = () => new ApiException(ErrorCode.NOT_FOUND, 404);
const invalid = (field: string, rule: string) => new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field, rule }]);
const kindOf = (e: unknown) => (e as { kind?: string }).kind;
const CHUNK = 10;

/**
 * One-way messages to the parents of a whole class (P5-3c, ADR-0018). The class teacher sends to her own class; the Principal and the Academic admin to any class. The recipients are the
 * parent accounts linked to the students placed in the class at that moment, worked out here and written down, so a child who moves later neither gains nor loses an old broadcast.
 * A parent cannot reply into it (a private reply is a conversation, `/v1/messages`). The sender sees who was reached, who was not, and how many parents opened it.
 */
@Injectable()
export class BroadcastsService {
  constructor(@Inject(DATABASE) private readonly db: Database, private readonly scope: TeachingScope) {}

  private base(b: BRow) {
    return {
      id: dashed(b.id), title: b.title, body: b.body, class: { id: dashed(b.classroom.id), name: b.classroom.name },
      sender: { userId: b.sender.id, name: b.sender.displayName ?? 'School' }, sentAt: b.createdAt,
    };
  }

  private async row(t: TenantContext, id: string): Promise<BRow | null> {
    return ((await this.db.getBroadcast({ schoolId: t.schoolId, id: dashed(id) })).data.broadcasts[0] as unknown as BRow | undefined) ?? null;
  }

  private async stats(t: TenantContext, b: BRow): Promise<NonNullable<BroadcastDetailDto['stats']>> {
    const year = await this.scope.activeYearId(t.schoolId);
    const rows = (await this.db.broadcastRecipients({ schoolId: t.schoolId, broadcastId: dashed(b.id) })).data.broadcastRecipients;
    const reached = new Set(rows.map((r) => dashed(r.student.id)));
    const parents = new Map<string, boolean>();
    for (const r of rows) parents.set(r.guardianUser.id, (parents.get(r.guardianUser.id) ?? false) || Boolean(r.readAt));
    // the students who had no parent account when it was sent: the class as it was, minus those reached (a class roster read now is the closest record we keep)
    const roster = year ? (await this.db.classRoster({ schoolId: t.schoolId, academicYearId: year, classroomId: dashed(b.classroom.id) })).data.studentEnrollments : [];
    const unreachable = roster.filter((e) => !reached.has(dashed(e.student.id))).map((e) => ({ id: dashed(e.student.id), name: `${e.student.firstName} ${e.student.lastName}` }));
    return { targetStudents: b.targetCount, reachedStudents: reached.size, unreachable, parents: parents.size, readBy: [...parents.values()].filter(Boolean).length };
  }

  async create(t: TenantContext, scope: Scope, dto: CreateBroadcastDto): Promise<BroadcastDetailDto> {
    const classId = dashed(dto.classId);
    if (scope === 'own' && !(await this.scope.classTeacherClassIds(t)).has(classId)) throw notFound(); // not her class: the same answer as for a class that does not exist
    if (scope !== 'own' && scope !== 'school') throw notFound();
    const again = (await this.db.broadcastByClientId({ schoolId: t.schoolId, senderId: t.userId, clientId: dto.clientId })).data.broadcasts[0] as unknown as BRow | undefined;
    if (again) return this.detail(t, scope, again);
    const year = await this.scope.activeYearId(t.schoolId);
    if (!year) throw invalid('classId', 'noActiveYear');
    const roster = (await this.db.classRoster({ schoolId: t.schoolId, academicYearId: year, classroomId: classId })).data.studentEnrollments;
    if (roster.length === 0) throw invalid('classId', 'classHasNoStudents');
    const studentIds = roster.map((e) => dashed(e.student.id));
    const links = (await this.db.parentLinksOfStudents({ schoolId: t.schoolId, studentIds })).data.parentLinks;
    const id = randomUUID();
    try {
      await this.db.createBroadcast({
        schoolId: t.schoolId, id, classroomId: classId, clientId: dto.clientId, title: dto.title, body: dto.body, targetCount: roster.length, actorId: t.userId,
        details: { classId, title: dto.title, body: dto.body, students: roster.length, parentAccounts: new Set(links.map((l) => l.user.id)).size },
      });
    } catch (e) {
      if (kindOf(e) === 'ALREADY_EXISTS' || kindOf(e) === 'CONFLICT') { // the same broadcast arrived twice at once
        const same = (await this.db.broadcastByClientId({ schoolId: t.schoolId, senderId: t.userId, clientId: dto.clientId })).data.broadcasts[0] as unknown as BRow | undefined;
        if (same) return this.detail(t, scope, same);
      }
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw notFound();
      throw e;
    }
    // One row per (student, parent account); the first row of each parent also tells them. Written a few at a time, best effort: whoever is missing shows as not reached.
    const told = new Set<string>();
    const jobs = links.map((l) => {
      const first = !told.has(l.user.id);
      told.add(l.user.id);
      return { studentId: dashed(l.studentId), guardianUserId: l.user.id, first };
    });
    for (let i = 0; i < jobs.length; i += CHUNK) {
      await Promise.all(jobs.slice(i, i + CHUNK).map((j) => {
        const common = { schoolId: t.schoolId, id: randomUUID(), broadcastId: id, studentId: j.studentId, guardianUserId: j.guardianUserId, actorId: t.userId };
        return (j.first ? this.db.addBroadcastRecipientNotify({ ...common, kind: 'broadcast.posted', details: { to: j.guardianUserId } }) : this.db.addBroadcastRecipient(common)).catch(() => undefined);
      }));
    }
    return this.detail(t, scope, (await this.row(t, id))!);
  }

  private async detail(t: TenantContext, scope: Scope, b: BRow): Promise<BroadcastDetailDto> {
    if (scope === 'linked') {
      const mine = (await this.db.broadcastsReceivedBy({ schoolId: t.schoolId, guardianUserId: t.userId, limit: 500 })).data.broadcastRecipients.filter((r) => dashed(r.broadcast.id) === dashed(b.id));
      if (mine.length === 0) throw notFound();
      return { ...this.base(b), students: mine.map((r) => ({ id: dashed(r.student.id), name: `${r.student.firstName} ${r.student.lastName}` })), read: mine.every((r) => Boolean(r.readAt)), stats: null };
    }
    return { ...this.base(b), students: [], read: null, stats: await this.stats(t, b) };
  }

  async list(t: TenantContext, scope: Scope): Promise<BroadcastListDto> {
    if (scope === 'linked') {
      const rows = (await this.db.broadcastsReceivedBy({ schoolId: t.schoolId, guardianUserId: t.userId, limit: 500 })).data.broadcastRecipients;
      const by = new Map<string, BroadcastDetailDto>();
      for (const r of rows) {
        const b = r.broadcast as unknown as BRow;
        const have = by.get(dashed(b.id)) ?? { ...this.base(b), students: [], read: true, stats: null };
        have.students.push({ id: dashed(r.student.id), name: `${r.student.firstName} ${r.student.lastName}` });
        have.read = have.read! && Boolean(r.readAt);
        by.set(dashed(b.id), have);
      }
      return { items: [...by.values()].sort((a, b) => b.sentAt.localeCompare(a.sentAt)) };
    }
    const rows = (await this.db.listBroadcasts({ schoolId: t.schoolId, ...(scope === 'own' ? { senderId: t.userId } : {}), limit: 200 })).data.broadcasts as unknown as BRow[];
    return { items: rows.map((b) => ({ ...this.base(b), students: [], read: null, stats: null })) };
  }

  async get(t: TenantContext, scope: Scope, id: string): Promise<BroadcastDetailDto> {
    const b = await this.row(t, id);
    if (!b) throw notFound();
    if (scope === 'own' && b.sender.id !== t.userId) throw notFound();
    return this.detail(t, scope, b);
  }

  async markRead(t: TenantContext, id: string): Promise<void> {
    try {
      await this.db.markBroadcastRead({ schoolId: t.schoolId, broadcastId: dashed(id), actorId: t.userId });
    } catch (e) {
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw notFound(); // not sent to this parent
      throw e;
    }
  }
}
