import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { randomUUID } from 'node:crypto';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import { TeachingScope } from '../teaching/teaching-scope.service.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import type { CreateStudentLeaveDto, StudentLeaveDto, StudentLeaveListDto } from './dto/student-leave.dto.js';

type Scope = 'school' | 'own' | 'linked';
interface Row {
  id: string; startDate: string; endDate: string; half?: string | null; reason: string; status: string; decisionNote?: string | null; decidedAt?: string | null; createdAt: string; updatedAt: string;
  student: { id: string; firstName: string; lastName: string; enrollmentId: string; placements: Array<{ classroom: { id: string; name: string } }> };
  requestedBy: { id: string; displayName?: string | null; email: string };
  decidedBy?: { id: string; displayName?: string | null; email: string } | null;
}

const notFound = () => new ApiException(ErrorCode.NOT_FOUND, 404);
const invalid = (field: string, rule: string) => new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field, rule }]);
const conflict = (field: string, rule: string) => new ApiException(ErrorCode.CONFLICT, 409, [{ field, rule }]);
const kindOf = (e: unknown) => (e as { kind?: string }).kind;
const day = (iso: string): number => Date.parse(`${iso}T00:00:00Z`);
const isDate = (iso: string): boolean => !Number.isNaN(day(iso)) && new Date(day(iso)).toISOString().slice(0, 10) === iso;
const today = (): string => new Date().toISOString().slice(0, 10);
const DAY_MS = 86_400_000;

/** A parent's request for leave for their child (P5-10, ADR-0016). The class teacher of the child's class or the Academic admin decides. */
@Injectable()
export class StudentLeaveService {
  constructor(@Inject(DATABASE) private readonly db: Database, private readonly scope: TeachingScope) {}

  private view(r: Row): StudentLeaveDto {
    const who = (u: { displayName?: string | null; email: string }) => u.displayName ?? u.email;
    return {
      id: dashed(r.id),
      student: { id: dashed(r.student.id), name: `${r.student.firstName} ${r.student.lastName}`, enrollmentId: r.student.enrollmentId, className: r.student.placements[0]?.classroom.name ?? null },
      startDate: r.startDate, endDate: r.endDate, half: r.half ?? null, reason: r.reason, status: r.status,
      requestedBy: { id: r.requestedBy.id, name: who(r.requestedBy) },
      decision: r.decidedBy || r.decidedAt ? { at: r.decidedAt ?? null, by: r.decidedBy ? who(r.decidedBy) : null, note: r.decisionNote ?? null } : null,
      createdAt: r.createdAt, updatedAt: r.updatedAt,
    };
  }

  private classOf(r: Row): string | null {
    const c = r.student.placements[0]?.classroom.id;
    return c ? dashed(c) : null;
  }

  private async row(t: TenantContext, id: string): Promise<Row | null> {
    return ((await this.db.getStudentLeave({ schoolId: t.schoolId, id: dashed(id) })).data.studentLeaves[0] as unknown as Row | undefined) ?? null;
  }

  /** What the caller may see of a request: the school any; a class teacher those of their class; a parent those they made for a linked child. A request they may not see is "not found". */
  private async visible(t: TenantContext, scope: Scope, r: Row | null): Promise<Row> {
    if (!r) throw notFound();
    if (scope === 'school') return r;
    if (scope === 'own') {
      const classId = this.classOf(r);
      if (classId && (await this.scope.classTeacherClassIds(t)).has(classId)) return r;
      throw notFound();
    }
    if ((await this.scope.mine(t)).children.some((c) => dashed(c.id) === dashed(r.student.id))) return r;
    throw notFound();
  }

  async one(t: TenantContext, scope: Scope, id: string): Promise<StudentLeaveDto> {
    return this.view(await this.visible(t, scope, await this.row(t, id)));
  }

  async list(t: TenantContext, scope: Scope, status?: string): Promise<StudentLeaveListDto> {
    if (scope === 'school') {
      return { items: ((await this.db.listStudentLeaves({ schoolId: t.schoolId, ...(status ? { status: status as never } : {}), limit: 500 })).data.studentLeaves as unknown as Row[]).map((r) => this.view(r)) };
    }
    if (scope === 'linked') {
      const kids = (await this.scope.mine(t)).children.map((c) => dashed(c.id));
      if (kids.length === 0) return { items: [] };
      const rows = (await this.db.listStudentLeavesOfStudents({ schoolId: t.schoolId, studentIds: kids, limit: 500 })).data.studentLeaves as unknown as Row[];
      return { items: rows.filter((r) => !status || r.status === status).map((r) => this.view(r)) };
    }
    const classes = await this.scope.classTeacherClassIds(t);
    if (classes.size === 0) return { items: [] };
    const rows = (await this.db.listStudentLeaves({ schoolId: t.schoolId, ...(status ? { status: status as never } : {}), limit: 500 })).data.studentLeaves as unknown as Row[];
    return { items: rows.filter((r) => { const c = this.classOf(r); return c !== null && classes.has(c); }).map((r) => this.view(r)) };
  }

  /** Made by a parent for a linked child. Sending the same `clientId` again returns the same request. */
  async create(t: TenantContext, dto: CreateStudentLeaveDto): Promise<StudentLeaveDto> {
    const studentId = dashed(dto.studentId);
    const kid = (await this.scope.mine(t)).children.find((c) => dashed(c.id) === studentId);
    if (!kid) throw notFound(); // a child of another family looks exactly like one that does not exist
    const again = (await this.db.studentLeaveByClientId({ schoolId: t.schoolId, studentId, clientId: dto.clientId })).data.studentLeaves[0];
    if (again) return this.one(t, 'linked', again.id);
    if (!isDate(dto.startDate)) throw invalid('startDate', 'notADate');
    if (!isDate(dto.endDate)) throw invalid('endDate', 'notADate');
    if (day(dto.endDate) < day(dto.startDate)) throw invalid('endDate', 'beforeStart');
    if ((day(dto.endDate) - day(dto.startDate)) / DAY_MS >= 60) throw invalid('endDate', 'tooLong');
    if (day(dto.startDate) < day(today()) - 7 * DAY_MS) throw invalid('startDate', 'tooFarBack');
    if (day(dto.startDate) > day(today()) + 365 * DAY_MS) throw invalid('startDate', 'tooFarAhead');
    if (dto.half && dto.startDate !== dto.endDate) throw invalid('half', 'singleDayOnly');
    const mine = (await this.db.listStudentLeavesOfStudents({ schoolId: t.schoolId, studentIds: [studentId], limit: 500 })).data.studentLeaves as unknown as Row[];
    if (mine.some((r) => (r.status === 'PENDING' || r.status === 'APPROVED') && r.startDate <= dto.endDate && r.endDate >= dto.startDate)) throw conflict('startDate', 'overlapsAnotherRequest');

    const id = randomUUID();
    const notice = { studentName: kid.name, startDate: dto.startDate, endDate: dto.endDate, reason: dto.reason };
    const base = { schoolId: t.schoolId, id, studentId, clientId: dto.clientId, startDate: dto.startDate, endDate: dto.endDate, ...(dto.half ? { half: dto.half } : {}), reason: dto.reason, notice, actorId: t.userId, details: { studentId, startDate: dto.startDate, endDate: dto.endDate, half: dto.half ?? null } };
    const teacher = kid.class ? await this.classTeacherStaffId(t, dashed(kid.class.id)) : null;
    try {
      if (teacher) await this.db.createStudentLeaveNotifyTeacher({ ...base, teacherStaffId: teacher });
      else await this.db.createStudentLeave(base);
    } catch (e) {
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw conflict('startDate', 'overlapsAnotherRequest'); // an overlapping request landed an instant ago
      throw e;
    }
    return this.one(t, 'linked', id);
  }

  private async classTeacherStaffId(t: TenantContext, classId: string): Promise<string | null> {
    const year = await this.scope.activeYearId(t.schoolId);
    if (!year) return null;
    const row = (await this.db.listClassTeachers({ schoolId: t.schoolId, academicYearId: year })).data.classTeachers.find((x) => dashed(x.classroom.id) === classId && x.staff.status === 'ACTIVE');
    return row ? dashed(row.staff.id) : null;
  }

  /** The class teacher of the child's class (own scope) or the Academic admin (school scope) decides. The first decision stands; the same decision again is the same answer. */
  async decide(t: TenantContext, scope: Scope, id: string, approve: boolean, note?: string): Promise<StudentLeaveDto> {
    const r = await this.visible(t, scope, await this.row(t, id));
    const target = approve ? 'APPROVED' : 'DECLINED';
    if (r.status === target) return this.view(r); // a replay
    if (r.status !== 'PENDING') throw conflict('status', r.status === 'CANCELLED' ? 'cancelled' : 'alreadyDecided');
    try {
      await this.db.decideStudentLeave({
        schoolId: t.schoolId, id: dashed(id), status: target as never, ...(note ? { note } : {}), kind: approve ? 'studentleave.approved' : 'studentleave.declined', parentUserId: r.requestedBy.id,
        notice: { studentName: `${r.student.firstName} ${r.student.lastName}`, startDate: r.startDate, endDate: r.endDate, note: note ?? '' }, actorId: t.userId, details: { decision: target },
      });
    } catch (e) {
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw conflict('status', 'alreadyDecided'); // decided an instant ago by the other approver
      throw e;
    }
    return this.one(t, scope, id);
  }

  /** The parent withdraws a request that is still waiting. */
  async cancel(t: TenantContext, id: string): Promise<StudentLeaveDto> {
    const r = await this.visible(t, 'linked', await this.row(t, id));
    if (r.requestedBy.id !== t.userId) throw notFound();
    if (r.status === 'CANCELLED') return this.view(r);
    if (r.status !== 'PENDING') throw conflict('status', 'alreadyDecided');
    try {
      await this.db.cancelStudentLeave({ schoolId: t.schoolId, id: dashed(id), actorId: t.userId, details: {} });
    } catch (e) {
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw conflict('status', 'alreadyDecided');
      throw e;
    }
    return this.one(t, 'linked', id);
  }
}
