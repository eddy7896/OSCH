import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, DatabaseError, type Database } from '@oruschools/database';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import { likeContains } from '../students/students.service.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import type {
  AdmitApplicationDto, AdmitResultDto, ApplicationDto, ApplicationListDto, ApplicationSummaryDto, CreateApplicationDto, DecideApplicationDto, ListApplicationsQueryDto,
  UpdateApplicationDto,
} from './dto/admissions.dto.js';

const notFound = () => new ApiException(ErrorCode.NOT_FOUND, 404);
const conflict = () => new ApiException(ErrorCode.CONFLICT, 409);
const invalid = (field: string, rule: string) => new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field, rule }]);
const defined = <T extends object>(o: T): Partial<T> => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
const realDate = (d: string) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d);
const MAX_NUMBER_ATTEMPTS = 12;
const pause = (attempt: number) => new Promise((r) => setTimeout(r, Math.random() * 15 * attempt + 5));
export const APPLICATION_PREFIX = 'A';

/** Which statuses a person may move an application to, from each status. Nothing leaves REJECTED, WITHDRAWN or ADMITTED. */
export const TRANSITIONS: Record<string, readonly string[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'],
  UNDER_REVIEW: ['ACCEPTED', 'REJECTED', 'WITHDRAWN'],
  ACCEPTED: ['WITHDRAWN'],
  REJECTED: [],
  WITHDRAWN: [],
  ADMITTED: [],
};
export const OPEN_FOR_EDIT = ['SUBMITTED', 'UNDER_REVIEW'];

type Row = {
  id: string; applicationNo: string; status: string; firstName: string; lastName: string; guardianName: string; createdAt: string;
  gradeLevel: { id: string; name: string }; academicYear: { id: string; name: string };
  dateOfBirth?: string | null; gender?: string | null; address?: string | null; guardianRelationship?: string; guardianPhone?: string | null; guardianEmail?: string | null;
  previousSchool?: string | null; notes?: string | null; decisionNote?: string | null; studentId?: string | null;
};
const summary = (r: Row): ApplicationSummaryDto => ({
  id: dashed(r.id), applicationNo: r.applicationNo, status: r.status, firstName: r.firstName, lastName: r.lastName, guardianName: r.guardianName, createdAt: r.createdAt,
  gradeLevel: { id: dashed(r.gradeLevel.id), name: r.gradeLevel.name }, academicYear: { id: dashed(r.academicYear.id), name: r.academicYear.name },
});
const full = (r: Row): ApplicationDto => ({
  ...summary(r), dateOfBirth: r.dateOfBirth ?? null, gender: r.gender ?? null, address: r.address ?? null, guardianRelationship: r.guardianRelationship ?? '',
  guardianPhone: r.guardianPhone ?? null, guardianEmail: r.guardianEmail ?? null, previousSchool: r.previousSchool ?? null, notes: r.notes ?? null,
  decisionNote: r.decisionNote ?? null, studentId: r.studentId ? dashed(r.studentId) : null,
});
/** A database refusal after the gateway already checked the same thing means the data changed in between: a conflict, not a tenant violation. */
const raced = async <T>(work: Promise<T>): Promise<T> => {
  try {
    return await work;
  } catch (e) {
    if (e instanceof DatabaseError && e.kind === 'FORBIDDEN_REFERENCE') throw conflict();
    throw e;
  }
};

/**
 * Admission applications of the active school (P2-3). An ACCEPTED application is admitted in ONE database transaction that creates the
 * student, the class placement and the guardian contact. The gateway never invites the guardian: only a System Admin grants roles (ADR-0007).
 */
@Injectable()
export class AdmissionsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async list(t: TenantContext, q: ListApplicationsQueryDto): Promise<ApplicationListDto> {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 25;
    const filter = { schoolId: t.schoolId, ...(q.search ? { search: likeContains(q.search) } : {}), ...(q.status ? { status: q.status as never } : {}), ...(q.academicYearId ? { academicYearId: q.academicYearId } : {}) };
    const [rows, count] = await Promise.all([this.db.listApplications({ ...filter, limit: pageSize, offset: (page - 1) * pageSize }), this.db.countApplications(filter)]);
    return { items: (rows.data.applications as Row[]).map(summary), total: Number(count.data.applications[0]?._count ?? 0), page, pageSize };
  }

  private async row(t: TenantContext, id: string): Promise<Row> {
    const r = (await this.db.getApplication({ schoolId: t.schoolId, id })).data.applications[0];
    if (!r) throw notFound(); // another school's application looks exactly like one that does not exist
    return r as Row;
  }
  async get(t: TenantContext, id: string): Promise<ApplicationDto> {
    return full(await this.row(t, id));
  }

  private checkDob(dob?: string): void {
    if (dob === undefined) return;
    if (!realDate(dob)) throw invalid('dateOfBirth', 'realDate');
    if (dob > new Date().toISOString().slice(0, 10)) throw invalid('dateOfBirth', 'notInTheFuture');
  }

  async create(t: TenantContext, dto: CreateApplicationDto): Promise<ApplicationDto> {
    this.checkDob(dto.dateOfBirth);
    const yearId = dto.academicYearId ?? (await this.db.getSchoolProfile({ schoolId: t.schoolId })).data.school?.activeAcademicYear?.id;
    if (!yearId) throw invalid('academicYearId', 'noActiveAcademicYear');
    const id = randomUUID();
    for (let attempt = 1; ; attempt++) {
      const seq = (await this.db.applicationSeqInfo({ schoolId: t.schoolId })).data.school?.applicationSeq;
      if (seq === undefined) throw notFound();
      const applicationNo = `${APPLICATION_PREFIX}${String(seq + 1).padStart(4, '0')}`;
      try {
        const { academicYearId: _y, ...rest } = dto;
        await this.db.createApplication({ schoolId: t.schoolId, id, expectedSeq: seq, applicationNo, actorId: t.userId, ...defined({ ...rest, gender: dto.gender as never }), firstName: dto.firstName, lastName: dto.lastName, gradeLevelId: dto.gradeLevelId, guardianName: dto.guardianName, guardianRelationship: dto.guardianRelationship, academicYearId: dashed(yearId), details: { applicationNo } });
        break;
      } catch (e) {
        if (e instanceof DatabaseError && e.kind === 'CONFLICT' && attempt < MAX_NUMBER_ATTEMPTS) {
          await pause(attempt);
          continue;
        }
        if (e instanceof DatabaseError && e.kind === 'FORBIDDEN_REFERENCE') throw invalid('gradeLevelId', 'ownClassLevelAndYear'); // a level or year of another school looks like one that does not exist
        throw e;
      }
    }
    return this.get(t, id);
  }

  async update(t: TenantContext, id: string, dto: UpdateApplicationDto): Promise<ApplicationDto> {
    const changes = defined(dto);
    if (Object.keys(changes).length === 0) throw invalid('firstName', 'atLeastOneField');
    this.checkDob(dto.dateOfBirth);
    const before = await this.row(t, id);
    if (!OPEN_FOR_EDIT.includes(before.status)) throw conflict(); // decided: no more edits
    await raced(this.db.updateApplication({ schoolId: t.schoolId, id: dashed(before.id), ...changes, gender: dto.gender as never, actorId: t.userId, details: { applicationNo: before.applicationNo, changed: Object.keys(changes) } }));
    return this.get(t, id);
  }

  async decide(t: TenantContext, id: string, dto: DecideApplicationDto): Promise<ApplicationDto> {
    const before = await this.row(t, id);
    if (!(TRANSITIONS[before.status] ?? []).includes(dto.status)) throw conflict(); // not a step this application can take from where it is
    await raced(this.db.decideApplication({ schoolId: t.schoolId, id: dashed(before.id), fromStatus: before.status as never, toStatus: dto.status as never, ...(dto.note ? { decisionNote: dto.note } : {}), actorId: t.userId, details: { applicationNo: before.applicationNo, from: before.status, to: dto.status } }));
    return this.get(t, id);
  }

  async admit(t: TenantContext, id: string, dto: AdmitApplicationDto): Promise<AdmitResultDto> {
    const app = await this.row(t, id);
    if (app.status !== 'ACCEPTED') throw conflict();
    if (dto.admissionDate !== undefined && !realDate(dto.admissionDate)) throw invalid('admissionDate', 'realDate');
    // The class must be a class of the level applied for (and of this school: the list is the school's own).
    const room = (await this.db.listClassrooms({ schoolId: t.schoolId })).data.classrooms.find((c) => dashed(c.id) === dto.classroomId.toLowerCase());
    if (!room) throw invalid('classroomId', 'ownClass');
    if (dashed(room.gradeLevel.id) !== dashed(app.gradeLevel.id)) throw invalid('classroomId', 'classOfTheLevelAppliedFor');
    const studentId = randomUUID();
    let enrollmentId = '';
    for (let attempt = 1; ; attempt++) {
      const info = (await this.db.applicationSeqInfo({ schoolId: t.schoolId })).data.school;
      if (!info) throw notFound();
      enrollmentId = `${info.enrollmentPrefix}${String(info.studentSeq + 1).padStart(4, '0')}`;
      try {
        await this.db.admitApplication({
          schoolId: t.schoolId, id: dashed(app.id), studentId, expectedSeq: info.studentSeq, enrollmentId, academicYearId: dashed(app.academicYear.id), classroomId: dashed(room.id),
          firstName: app.firstName, lastName: app.lastName, dateOfBirth: app.dateOfBirth ?? undefined, gender: (app.gender ?? undefined) as never, address: app.address ?? undefined,
          admissionDate: dto.admissionDate ?? new Date().toISOString().slice(0, 10), guardianId: randomUUID(), guardianName: app.guardianName, guardianRelationship: app.guardianRelationship ?? 'GUARDIAN',
          guardianPhone: app.guardianPhone ?? undefined, guardianEmail: app.guardianEmail ?? undefined, actorId: t.userId,
          details: { applicationNo: app.applicationNo, studentId: dashed(studentId), enrollmentId },
        });
        break;
      } catch (e) {
        if (e instanceof DatabaseError && e.kind === 'CONFLICT' && attempt < MAX_NUMBER_ATTEMPTS) {
          await pause(attempt); // another admission took the student number a moment ago
          continue;
        }
        if (e instanceof DatabaseError && e.kind === 'FORBIDDEN_REFERENCE') throw conflict();
        throw e;
      }
    }
    const after = await this.get(t, id);
    return { application: after, student: { id: dashed(studentId), enrollmentId }, guardianInvitationPending: !!after.guardianEmail };
  }
}
