import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import { TeachingScope } from '../teaching/teaching-scope.service.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import type { EditNoticeDto, NoticeAudience, NoticeCategory, NoticeDto, NoticeListDto, PostNoticeDto, ReachDto } from './dto/noticeboard.dto.js';

type Scope = 'school' | 'own' | 'linked';
interface Row {
  id: string; title: string; body: string; category: NoticeCategory; audience: NoticeAudience | 'STAFF'; pinned: boolean; publishAt?: string | null; expiresAt?: string | null;
  createdAt: string; updatedAt: string; withdrawnAt?: string | null; author: { id: string; displayName?: string | null; email: string };
  gradeLevel?: { id: string; name: string } | null; classroom?: { id: string; name: string; gradeLevel: { id: string } } | null;
}
const notFound = () => new ApiException(ErrorCode.NOT_FOUND, 404);
const forbidden = () => new ApiException(ErrorCode.FORBIDDEN, 403);
const invalid = (field: string, rule: string) => new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field, rule }]);
const kindOf = (e: unknown) => (e as { kind?: string }).kind;
const CHUNK = 10;

/** The only category the Bursar and the transport manager may post in (ADR-0018 decision 5); null means any. */
const ownCategory = (role: string): NoticeCategory | null => (role === 'BURSAR' ? 'FEES' : role === 'TRANSPORT_MANAGER' ? 'TRANSPORT' : null);

/**
 * The parents' notice board (P5-8a, ADR-0018 decisions 5 and 8): announcements whose audience is all parents, a grade or a class. The Principal and the Academic admin post in any category;
 * the Bursar only Fees and the transport manager only Transport. A parent reads the live posts meant for them (all parents, or the grade or class of a linked child); expired and not-yet-visible
 * posts are not shown to parents. Parents are told by a notice, one each (a parent with two children in the class is told once), written after the post and best effort.
 */
@Injectable()
export class NoticeBoardService {
  constructor(@Inject(DATABASE) private readonly db: Database, private readonly scope: TeachingScope) {}

  private state(r: Row, now: number): NoticeDto['state'] {
    if (r.withdrawnAt) return 'WITHDRAWN';
    if (r.publishAt && Date.parse(r.publishAt) > now) return 'SCHEDULED';
    if (r.expiresAt && Date.parse(r.expiresAt) <= now) return 'EXPIRED';
    return 'LIVE';
  }

  private view(r: Row, told: number | null = null): NoticeDto {
    const withdrawn = Boolean(r.withdrawnAt);
    return {
      id: dashed(r.id), title: withdrawn ? '' : r.title, body: withdrawn ? '' : r.body, category: r.category, audience: r.audience as NoticeAudience, pinned: r.pinned,
      publishAt: r.publishAt ?? null, expiresAt: r.expiresAt ?? null, target: r.classroom?.name ?? r.gradeLevel?.name ?? null,
      author: { id: r.author.id, name: r.author.displayName ?? r.author.email }, createdAt: r.createdAt, updatedAt: r.updatedAt, withdrawn, state: this.state(r, Date.now()), told,
    };
  }

  private async row(t: TenantContext, id: string): Promise<Row | null> {
    return ((await this.db.getNotice({ schoolId: t.schoolId, id: dashed(id) })).data.announcements[0] as unknown as Row | undefined) ?? null;
  }

  /** The grade of every class, for deciding what a parent's children are in. */
  private async classGrades(t: TenantContext): Promise<Map<string, string>> {
    return new Map((await this.db.listClassrooms({ schoolId: t.schoolId })).data.classrooms.map((c) => [dashed(c.id), dashed(c.gradeLevel.id)]));
  }

  async list(t: TenantContext, scope: Scope): Promise<NoticeListDto> {
    const rows = (await this.db.listNotices({ schoolId: t.schoolId })).data.announcements as unknown as Row[];
    const now = Date.now();
    let mine = rows;
    if (scope === 'linked') {
      const kids = (await this.scope.mine(t)).children;
      const classes = new Set(kids.flatMap((c) => (c.class ? [dashed(c.class.id)] : [])));
      const grades = new Map(await this.classGrades(t));
      const myGrades = new Set([...classes].flatMap((c) => (grades.get(c) ? [grades.get(c)!] : [])));
      mine = rows.filter((r) => !r.withdrawnAt && this.state(r, now) === 'LIVE' && (r.audience === 'ALL_PARENTS' || (r.audience === 'CLASS' && r.classroom && classes.has(dashed(r.classroom.id))) || (r.audience === 'GRADE' && r.gradeLevel && myGrades.has(dashed(r.gradeLevel.id)))));
    } else if (scope === 'own') {
      const cat = ownCategory(t.schoolRole);
      mine = rows.filter((r) => r.category === cat);
    }
    const items = mine.map((r) => this.view(r)).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt));
    return { items };
  }

  async one(t: TenantContext, scope: Scope, id: string): Promise<NoticeDto> {
    const r = await this.row(t, id);
    if (!r) throw notFound();
    if (scope === 'linked') {
      const seen = (await this.list(t, 'linked')).items.find((x) => x.id === dashed(r.id));
      if (!seen) throw notFound();
      return seen;
    }
    if (scope === 'own' && r.category !== ownCategory(t.schoolRole)) throw notFound();
    return this.view(r);
  }

  /** The parent accounts (and the students they are linked to) an audience reaches. */
  private async recipients(t: TenantContext, audience: NoticeAudience, gradeLevelId?: string, classId?: string): Promise<{ users: Map<string, string[]> }> {
    const users = new Map<string, string[]>();
    const add = (userId: string, studentId: string) => users.set(userId, [...(users.get(userId) ?? []), dashed(studentId)]);
    if (audience === 'ALL_PARENTS') {
      for (const l of (await this.db.listParentLinks({ schoolId: t.schoolId })).data.parentLinks) add(l.user.id, l.studentId);
      return { users };
    }
    const year = await this.scope.activeYearId(t.schoolId);
    if (!year) return { users };
    const classes = audience === 'CLASS' ? [dashed(classId!)] : [...(await this.classGrades(t))].filter(([, g]) => g === dashed(gradeLevelId!)).map(([c]) => c);
    const students: string[] = [];
    for (const c of classes) students.push(...(await this.db.classRoster({ schoolId: t.schoolId, academicYearId: year, classroomId: c })).data.studentEnrollments.map((e) => dashed(e.student.id)));
    if (students.length === 0) return { users };
    for (const l of (await this.db.parentLinksOfStudents({ schoolId: t.schoolId, studentIds: students })).data.parentLinks) add(l.user.id, l.studentId);
    return { users };
  }

  async reach(t: TenantContext, audience: NoticeAudience, gradeLevelId?: string, classId?: string): Promise<ReachDto> {
    await this.checkTarget(t, audience, gradeLevelId, classId);
    const { users } = await this.recipients(t, audience, gradeLevelId, classId);
    return { parents: users.size, students: new Set([...users.values()].flat()).size };
  }

  private async checkTarget(t: TenantContext, audience: NoticeAudience, gradeLevelId?: string, classId?: string): Promise<void> {
    if (audience === 'GRADE') {
      if (!gradeLevelId) throw invalid('gradeLevelId', 'required');
      if (![...(await this.classGrades(t)).values()].includes(dashed(gradeLevelId))) throw invalid('gradeLevelId', 'notFound');
    } else if (audience === 'CLASS') {
      if (!classId) throw invalid('classId', 'required');
      if (!(await this.classGrades(t)).has(dashed(classId))) throw invalid('classId', 'notFound');
    }
  }

  private checkCategory(t: TenantContext, category: NoticeCategory): void {
    const only = ownCategory(t.schoolRole);
    if (only && category !== only) throw forbidden();
  }

  private checkTimes(publishAt?: string, expiresAt?: string): void {
    if (publishAt && expiresAt && Date.parse(expiresAt) <= Date.parse(publishAt)) throw invalid('expiresAt', 'beforePublishAt');
    if (expiresAt && Date.parse(expiresAt) <= Date.now()) throw invalid('expiresAt', 'inThePast');
  }

  async post(t: TenantContext, dto: PostNoticeDto): Promise<NoticeDto> {
    this.checkCategory(t, dto.category);
    this.checkTimes(dto.publishAt, dto.expiresAt);
    if (dto.audience !== 'GRADE' && dto.gradeLevelId) throw invalid('gradeLevelId', 'notForThisAudience');
    if (dto.audience !== 'CLASS' && dto.classId) throw invalid('classId', 'notForThisAudience');
    await this.checkTarget(t, dto.audience, dto.gradeLevelId, dto.classId);
    const id = randomUUID();
    const { users } = await this.recipients(t, dto.audience, dto.gradeLevelId, dto.classId);
    await this.db.postNotice({
      schoolId: t.schoolId, id, title: dto.title, body: dto.body, audience: dto.audience as never, category: dto.category as never, pinned: dto.pinned ?? false,
      ...(dto.publishAt ? { publishAt: dto.publishAt } : {}), ...(dto.expiresAt ? { expiresAt: dto.expiresAt } : {}),
      ...(dto.gradeLevelId ? { gradeLevelId: dashed(dto.gradeLevelId) } : {}), ...(dto.classId ? { classroomId: dashed(dto.classId) } : {}),
      actorId: t.userId, details: { title: dto.title, category: dto.category, audience: dto.audience, gradeLevelId: dto.gradeLevelId ?? null, classId: dto.classId ?? null, parentAccounts: users.size },
    });
    // Tell the parents now only if it is visible now; a scheduled post tells nobody (no scheduler yet).
    let told = 0;
    if (!dto.publishAt || Date.parse(dto.publishAt) <= Date.now()) {
      const ids = [...users.keys()];
      for (let i = 0; i < ids.length; i += CHUNK) {
        const results = await Promise.all(ids.slice(i, i + CHUNK).map((uid) => this.db.notifyNoticeParent({ schoolId: t.schoolId, announcementId: id, recipientUserId: uid, params: { title: dto.title }, actorId: t.userId, details: { to: uid } }).then(() => 1, () => 0)));
        told += results.reduce<number>((a, b) => a + b, 0);
      }
    }
    return this.view((await this.row(t, id))!, told);
  }

  async edit(t: TenantContext, id: string, dto: EditNoticeDto): Promise<NoticeDto> {
    const have = await this.row(t, id);
    if (!have || (ownCategory(t.schoolRole) && have.category !== ownCategory(t.schoolRole))) throw notFound();
    this.checkCategory(t, dto.category);
    this.checkTimes(dto.publishAt, dto.expiresAt);
    try {
      await this.db.editNotice({
        schoolId: t.schoolId, id: dashed(id), title: dto.title, body: dto.body, category: dto.category as never, pinned: dto.pinned,
        ...(dto.publishAt ? { publishAt: dto.publishAt } : {}), ...(dto.expiresAt ? { expiresAt: dto.expiresAt } : {}), actorId: t.userId, details: { title: dto.title, category: dto.category, pinned: dto.pinned },
      });
    } catch (e) {
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw notFound(); // withdrawn
      throw e;
    }
    return this.view((await this.row(t, id))!);
  }

  async withdraw(t: TenantContext, id: string): Promise<NoticeDto> {
    const have = await this.row(t, id);
    if (!have || (ownCategory(t.schoolRole) && have.category !== ownCategory(t.schoolRole))) throw notFound();
    if (have.withdrawnAt) return this.view(have);
    try {
      await this.db.withdrawAnnouncement({ schoolId: t.schoolId, id: dashed(id), actorId: t.userId, details: {} });
    } catch (e) {
      if (kindOf(e) !== 'FORBIDDEN_REFERENCE') throw e;
    }
    return this.view((await this.row(t, id))!);
  }
}
