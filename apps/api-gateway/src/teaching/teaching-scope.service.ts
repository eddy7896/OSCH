import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import type { Scope } from '@oruschools/rbac';
import { dashed } from '../common/uuid.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import type { ChildDto, MineDto } from './dto/teaching.dto.js';

/**
 * What a caller's `own` and `linked` grants resolve to (P3-2, ADR-0013 decision 5). A teacher's own classes are the classes they are class
 * teacher of in the active year, through the staff record linked to their account (later also the classes in their timetable); a parent's
 * linked classes are the classes their linked children are in. Nobody is guessed: no link means nothing visible.
 */
@Injectable()
export class TeachingScope {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async activeYearId(schoolId: string): Promise<string | null> {
    const y = (await this.db.getSchoolProfile({ schoolId })).data.school?.activeAcademicYear;
    return y ? dashed(y.id) : null;
  }

  private async staffOf(t: TenantContext) {
    return (await this.db.staffOfUser({ schoolId: t.schoolId, userId: t.userId })).data.staffProfiles[0] ?? null;
  }

  private async children(t: TenantContext, yearId: string | null): Promise<ChildDto[]> {
    const links = (await this.db.parentLinksOfUser({ schoolId: t.schoolId, userId: t.userId })).data.parentLinks;
    if (links.length === 0) return [];
    const enrol = yearId ? (await this.db.enrollmentsOfStudents({ schoolId: t.schoolId, academicYearId: yearId, studentIds: links.map((l) => dashed(l.student.id)) })).data.studentEnrollments : [];
    const classOf = new Map(enrol.map((e) => [dashed(e.studentId), { id: dashed(e.classroom.id), name: e.classroom.name }]));
    return links.map((l) => ({ id: dashed(l.student.id), enrollmentId: l.student.enrollmentId, name: `${l.student.firstName} ${l.student.lastName}`, relationship: l.relationship, class: classOf.get(dashed(l.student.id)) ?? null }));
  }

  /** Everything the caller is, teaching-wise. Empty for a person with no staff link and no linked child. */
  async mine(t: TenantContext): Promise<MineDto> {
    const yearId = await this.activeYearId(t.schoolId);
    const staff = await this.staffOf(t);
    const [subjects, classTeachers, children] = await Promise.all([
      staff ? this.db.listTeacherSubjects({ schoolId: t.schoolId }) : null,
      staff && yearId ? this.db.listClassTeachers({ schoolId: t.schoolId, academicYearId: yearId }) : null,
      this.children(t, yearId),
    ]);
    return {
      staff: staff ? { id: dashed(staff.id), employeeId: staff.employeeId, name: `${staff.firstName} ${staff.lastName}` } : null,
      subjects: (subjects?.data.teacherSubjects ?? []).filter((x) => staff && dashed(x.staff.id) === dashed(staff.id)).map((x) => ({ id: dashed(x.subject.id), name: x.subject.name, code: x.subject.code })),
      classes: (classTeachers?.data.classTeachers ?? []).filter((x) => staff && dashed(x.staff.id) === dashed(staff.id)).map((x) => ({ id: dashed(x.classroom.id), name: x.classroom.name })),
      children,
    };
  }

  /** The class ids a caller may see under `scope`: `null` means all of them (school scope). */
  async visibleClassIds(t: TenantContext, scope: Scope): Promise<Set<string> | null> {
    if (scope === 'school') return null;
    const m = await this.mine(t);
    return new Set(scope === 'own' ? m.classes.map((c) => c.id) : m.children.flatMap((c) => (c.class ? [c.class.id] : [])));
  }
}
