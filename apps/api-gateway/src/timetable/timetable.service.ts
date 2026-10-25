import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import { daysFromText } from '../schedule/schedule-rules.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import { TeachingScope } from '../teaching/teaching-scope.service.js';
import type { ClassTimetableDto, SetSlotDto, StaffTimetableDto, TimetableLoadDto } from './dto/timetable.dto.js';
import { slotProblem, weeklyLoad } from './timetable-rules.js';

const notFound = () => new ApiException(ErrorCode.NOT_FOUND, 404);
const invalid = (field: string, rule: string) => new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field, rule }]);
const conflict = (field: string, rule: string) => new ApiException(ErrorCode.CONFLICT, 409, [{ field, rule }]);
const kindOf = (e: unknown) => (e as { kind?: string }).kind;
const fullName = (s: { firstName: string; lastName: string }) => `${s.firstName} ${s.lastName}`;

/**
 * Who teaches what to which class, when (P3-3, ADR-0013). A slot is a class, a day and a period of the school's bell schedule. A class cannot be
 * in two lessons and a teacher cannot be in two classes in the same slot: refused here with a clear answer, and by unique keys in the database
 * so two requests at the same instant cannot both succeed.
 */
@Injectable()
export class TimetableService {
  constructor(@Inject(DATABASE) private readonly db: Database, private readonly scope: TeachingScope) {}

  private async yearOf(t: TenantContext, explicit?: string): Promise<string> {
    const id = explicit ?? (await this.scope.activeYearId(t.schoolId));
    if (!id) throw conflict('academicYearId', 'noActiveYear');
    return dashed(id);
  }

  async forClass(t: TenantContext, classId: string, academicYearId?: string): Promise<ClassTimetableDto> {
    const year = await this.yearOf(t, academicYearId);
    const rows = (await this.db.listTimetableForClass({ schoolId: t.schoolId, academicYearId: year, classroomId: dashed(classId) })).data.timetableEntries;
    return {
      academicYearId: year, classId: dashed(classId),
      entries: rows.map((r) => ({ id: dashed(r.id), day: r.day, periodId: dashed(r.periodId), subject: { id: dashed(r.subject.id), name: r.subject.name, code: r.subject.code }, staff: { id: dashed(r.staff.id), employeeId: r.staff.employeeId, name: fullName(r.staff) } })),
    };
  }

  async forStaff(t: TenantContext, staffId: string | null, academicYearId?: string): Promise<StaffTimetableDto> {
    const year = await this.yearOf(t, academicYearId);
    if (!staffId) return { academicYearId: year, staffId: null, entries: [] };
    const rows = (await this.db.listTimetableForStaff({ schoolId: t.schoolId, academicYearId: year, staffId: dashed(staffId) })).data.timetableEntries;
    return {
      academicYearId: year, staffId: dashed(staffId),
      entries: rows.map((r) => ({ id: dashed(r.id), day: r.day, periodId: dashed(r.periodId), class: { id: dashed(r.classroom.id), name: r.classroom.name }, subject: { id: dashed(r.subject.id), name: r.subject.name, code: r.subject.code } })),
    };
  }

  /** Lessons per week for each member of staff who has any. */
  async load(t: TenantContext, academicYearId?: string): Promise<TimetableLoadDto> {
    const year = await this.yearOf(t, academicYearId);
    const rows = (await this.db.listTimetableForYear({ schoolId: t.schoolId, academicYearId: year })).data.timetableEntries;
    const load = weeklyLoad(rows.map((r) => ({ staffId: dashed(r.staffId), day: r.day })));
    const staff = new Map(rows.map((r) => [dashed(r.staffId), r.staff]));
    const items = [...load].map(([id, l]) => {
      const s = staff.get(id)!;
      return { staff: { id, employeeId: s.employeeId, name: fullName(s) }, total: l.total, byDay: l.byDay as never };
    });
    return { academicYearId: year, items: items.sort((a, b) => b.total - a.total || a.staff.name.localeCompare(b.staff.name)) };
  }

  /** Puts a lesson in a slot, or replaces the lesson that is there. Refuses a clash with 409 `classBusy` or `teacherBusy`. */
  async setSlot(t: TenantContext, classId: string, dto: SetSlotDto): Promise<ClassTimetableDto> {
    const year = await this.yearOf(t, dto.academicYearId);
    const days = daysFromText((await this.db.schoolWorkingDays({ schoolId: t.schoolId })).data.school?.workingDays ?? '');
    if (!days.includes(dto.day as never)) throw invalid('day', 'notAWorkingDay');
    const teaches = (await this.db.listTeacherSubjects({ schoolId: t.schoolId })).data.teacherSubjects.some((l) => dashed(l.staff.id) === dto.staffId.toLowerCase() && dashed(l.subject.id) === dto.subjectId.toLowerCase());
    if (!teaches) throw invalid('staffId', 'teacherDoesNotTeachSubject');
    const all = (await this.db.listTimetableForYear({ schoolId: t.schoolId, academicYearId: year })).data.timetableEntries.map((r) => ({ id: dashed(r.id), classId: dashed(r.classroomId), staffId: dashed(r.staffId), day: r.day, periodId: dashed(r.periodId) }));
    const want = { classId: dashed(classId), staffId: dashed(dto.staffId), day: dto.day, periodId: dashed(dto.periodId) };
    const existing = all.find((e) => e.classId === want.classId && e.day === want.day && e.periodId === want.periodId);
    const problem = slotProblem(all, want, existing?.id);
    if (problem) throw conflict(problem === 'classBusy' ? 'periodId' : 'staffId', problem);
    const details = { classId: want.classId, day: want.day, periodId: want.periodId, subjectId: dashed(dto.subjectId), staffId: want.staffId };
    try {
      if (existing) await this.db.updateTimetableEntry({ schoolId: t.schoolId, id: existing.id, subjectId: dashed(dto.subjectId), staffId: want.staffId, actorId: t.userId, details: { ...details, replaced: true } });
      else await this.db.createTimetableEntry({ schoolId: t.schoolId, id: randomUUID(), academicYearId: year, classroomId: want.classId, subjectId: dashed(dto.subjectId), staffId: want.staffId, day: want.day, periodId: want.periodId, actorId: t.userId, details });
    } catch (e) {
      // two requests at once: the database's unique keys let only one through; a class, subject, staff member, period or year of another school fails its own checks
      if (kindOf(e) === 'CONFLICT') throw conflict('periodId', 'slotTaken');
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw invalid('periodId', 'teachingPeriodAndStaffOfThisSchool');
      throw e;
    }
    return this.forClass(t, classId, year);
  }

  async clear(t: TenantContext, id: string): Promise<void> {
    const row = (await this.db.getTimetableEntry({ schoolId: t.schoolId, id: dashed(id) })).data.timetableEntries[0];
    if (!row) throw notFound();
    try {
      await this.db.deleteTimetableEntry({ schoolId: t.schoolId, id: dashed(id), classroomId: dashed(row.classroomId), staffId: dashed(row.staffId), actorId: t.userId, details: { entryId: dashed(id) } });
    } catch (e) {
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw notFound();
      throw e;
    }
  }
}
