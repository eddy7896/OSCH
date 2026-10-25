import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import type { ParentLinkDto, TeacherDto } from './dto/teaching.dto.js';
import { TeachingScope } from './teaching-scope.service.js';

const notFound = () => new ApiException(ErrorCode.NOT_FOUND, 404);
const invalid = (field: string, rule: string) => new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field, rule }]);
const conflict = (field: string, rule: string) => new ApiException(ErrorCode.CONFLICT, 409, [{ field, rule }]);
const same = (a: string, b: string) => dashed(a) === b.toLowerCase();
const name = (s: { firstName: string; lastName: string }) => `${s.firstName} ${s.lastName}`;

/** Which subjects each member of staff teaches, who is class teacher of which class, and the link from a parent's account to a student (P3-2). */
@Injectable()
export class TeachingService {
  constructor(@Inject(DATABASE) private readonly db: Database, private readonly scope: TeachingScope) {}

  /** Staff who teach a subject or are a class teacher this year, with both lists. */
  async teachers(t: TenantContext): Promise<TeacherDto[]> {
    const yearId = await this.scope.activeYearId(t.schoolId);
    const [links, classTeachers] = await Promise.all([this.db.listTeacherSubjects({ schoolId: t.schoolId }), yearId ? this.db.listClassTeachers({ schoolId: t.schoolId, academicYearId: yearId }) : null]);
    const out = new Map<string, TeacherDto>();
    const entry = (s: { id: string; employeeId: string; firstName: string; lastName: string; userId?: string | null }) =>
      out.get(dashed(s.id)) ?? out.set(dashed(s.id), { staff: { id: dashed(s.id), employeeId: s.employeeId, name: name(s), hasAccount: !!s.userId }, subjects: [], classes: [] }).get(dashed(s.id))!;
    for (const l of links.data.teacherSubjects) if (l.staff.status === 'ACTIVE') entry(l.staff).subjects.push({ id: dashed(l.subject.id), name: l.subject.name, code: l.subject.code });
    for (const c of classTeachers?.data.classTeachers ?? []) if (c.staff.status === 'ACTIVE') entry(c.staff).classes.push({ id: dashed(c.classroom.id), name: c.classroom.name });
    return [...out.values()].sort((a, b) => a.staff.name.localeCompare(b.staff.name));
  }

  private async teacher(t: TenantContext, staffId: string): Promise<TeacherDto> {
    const found = (await this.teachers(t)).find((x) => same(x.staff.id, staffId));
    if (found) return found;
    const s = (await this.db.getStaffProfile({ schoolId: t.schoolId, id: dashed(staffId) })).data.staffProfiles[0];
    if (!s) throw notFound();
    return { staff: { id: dashed(s.id), employeeId: s.employeeId, name: name(s), hasAccount: !!s.userId }, subjects: [], classes: [] };
  }

  async addSubject(t: TenantContext, staffId: string, subjectId: string): Promise<TeacherDto> {
    const links = (await this.db.listTeacherSubjects({ schoolId: t.schoolId })).data.teacherSubjects;
    if (links.some((l) => same(l.staff.id, staffId) && same(l.subject.id, subjectId))) throw conflict('subjectId', 'alreadyTeaches');
    try {
      await this.db.addTeacherSubject({ schoolId: t.schoolId, id: randomUUID(), staffId: dashed(staffId), subjectId: dashed(subjectId), actorId: t.userId, details: { staffId: dashed(staffId), subjectId: dashed(subjectId) } });
    } catch (e) {
      // staff who have left, and staff or subjects of another school, fail the database's own checks: one answer for all of them
      if ((e as { kind?: string }).kind === 'FORBIDDEN_REFERENCE') throw invalid('staffId', 'activeStaffAndSubjectOfThisSchool');
      throw e;
    }
    return this.teacher(t, staffId);
  }

  async removeSubject(t: TenantContext, staffId: string, subjectId: string): Promise<void> {
    const link = (await this.db.listTeacherSubjects({ schoolId: t.schoolId })).data.teacherSubjects.find((l) => same(l.staff.id, staffId) && same(l.subject.id, subjectId));
    if (!link) throw notFound();
    await this.db.removeTeacherSubject({ schoolId: t.schoolId, id: dashed(link.id), actorId: t.userId, details: { staffId: dashed(staffId), subjectId: dashed(subjectId) } });
  }

  private async yearOf(t: TenantContext, explicit?: string): Promise<string> {
    const id = explicit ?? (await this.scope.activeYearId(t.schoolId));
    if (!id) throw conflict('academicYearId', 'noActiveYear');
    return dashed(id);
  }

  /** Sets (or changes) the class teacher of a class for a year. */
  async setClassTeacher(t: TenantContext, classId: string, staffId: string, academicYearId?: string): Promise<{ class: { id: string; name: string }; staff: { id: string; employeeId: string; name: string } }> {
    const year = await this.yearOf(t, academicYearId);
    const existing = (await this.db.listClassTeachers({ schoolId: t.schoolId, academicYearId: year })).data.classTeachers.find((c) => same(c.classroom.id, classId));
    try {
      if (existing) await this.db.changeClassTeacher({ schoolId: t.schoolId, id: dashed(existing.id), staffId: dashed(staffId), actorId: t.userId, details: { classId: dashed(classId), staffId: dashed(staffId), was: dashed(existing.staff.id) } });
      else await this.db.assignClassTeacher({ schoolId: t.schoolId, id: randomUUID(), classroomId: dashed(classId), academicYearId: year, staffId: dashed(staffId), actorId: t.userId, details: { classId: dashed(classId), staffId: dashed(staffId) } });
    } catch (e) {
      // a class, staff member or year of another school (or an inactive staff member) fails the database's own checks: one answer for all of them
      if ((e as { kind?: string }).kind === 'FORBIDDEN_REFERENCE' || (e as { kind?: string }).kind === 'NOT_FOUND') throw invalid('staffId', 'activeStaffOfThisSchool');
      throw e;
    }
    const now = (await this.db.listClassTeachers({ schoolId: t.schoolId, academicYearId: year })).data.classTeachers.find((c) => same(c.classroom.id, classId));
    if (!now) throw notFound();
    return { class: { id: dashed(now.classroom.id), name: now.classroom.name }, staff: { id: dashed(now.staff.id), employeeId: now.staff.employeeId, name: name(now.staff) } };
  }

  async removeClassTeacher(t: TenantContext, classId: string, academicYearId?: string): Promise<void> {
    const year = await this.yearOf(t, academicYearId);
    const existing = (await this.db.listClassTeachers({ schoolId: t.schoolId, academicYearId: year })).data.classTeachers.find((c) => same(c.classroom.id, classId));
    if (!existing) throw notFound();
    await this.db.removeClassTeacher({ schoolId: t.schoolId, id: dashed(existing.id), actorId: t.userId, details: { classId: dashed(classId), staffId: dashed(existing.staff.id) } });
  }

  // ---- parent accounts
  async parentLinks(t: TenantContext, studentId: string): Promise<ParentLinkDto[]> {
    const student = (await this.db.getStudent({ schoolId: t.schoolId, id: dashed(studentId) })).data.students[0];
    if (!student) throw notFound();
    return (await this.db.parentLinksOfStudent({ schoolId: t.schoolId, studentId: dashed(studentId) })).data.parentLinks.map((l) => ({ id: dashed(l.id), relationship: l.relationship, user: { id: l.user.id, name: l.user.displayName ?? l.user.email } }));
  }

  async linkParent(t: TenantContext, studentId: string, userId: string, relationship: string): Promise<ParentLinkDto[]> {
    if ((await this.parentLinks(t, studentId)).some((l) => l.user.id === userId)) throw conflict('userId', 'alreadyLinked');
    try {
      await this.db.linkParentAccount({ schoolId: t.schoolId, id: randomUUID(), studentId: dashed(studentId), userId, relationship, actorId: t.userId, details: { studentId: dashed(studentId), userId, relationship } });
    } catch (e) {
      if ((e as { kind?: string }).kind === 'FORBIDDEN_REFERENCE' || (e as { kind?: string }).kind === 'NOT_FOUND') throw invalid('userId', 'activeParentOfThisSchool'); // not a parent here, or not here at all: one answer
      throw e;
    }
    return this.parentLinks(t, studentId);
  }

  async unlinkParent(t: TenantContext, studentId: string, linkId: string): Promise<void> {
    const link = (await this.parentLinks(t, studentId)).find((l) => same(l.id, linkId));
    if (!link) throw notFound();
    await this.db.unlinkParentAccount({ schoolId: t.schoolId, id: dashed(link.id), actorId: t.userId, details: { studentId: dashed(studentId), userId: link.user.id } });
  }
}
