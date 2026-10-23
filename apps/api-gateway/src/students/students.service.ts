import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, DatabaseError, type Database } from '@oruschools/database';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import type {
  CreateGuardianDto, CreateStudentDto, GuardianDto, ListStudentsQueryDto, PlacementDto, PlacementRequestDto, StudentDto, StudentListDto,
  StudentSummaryDto, UpdateGuardianDto, UpdateStudentDto,
} from './dto/students.dto.js';

const notFound = () => new ApiException(ErrorCode.NOT_FOUND, 404);
const invalid = (field: string, rule: string) => new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field, rule }]);
const same = (a: string, b: string) => dashed(a) === b.toLowerCase();
const defined = <T extends object>(o: T): Partial<T> => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
const realDate = (d: string) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d);
const MAX_NUMBER_ATTEMPTS = 12;
const pause = (attempt: number) => new Promise((r) => setTimeout(r, Math.random() * 15 * attempt + 5)); // jitter so racing admissions do not retry in step

/** LIKE pattern for "contains this text": the text is escaped so a typed % or _ matches itself. */
export const likeContains = (text: string): string => `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export type Row = {
  id: string; firstName: string; lastName: string; enrollmentId: string; status: string; gender?: string | null; dateOfBirth?: string | null;
  admissionDate?: string | null; address?: string | null;
  placements: Array<{ academicYear: { id: string; name: string }; classroom: { id: string; name: string } }>;
  photoKey?: string | null;
  documents?: Array<{ id: string; kind: string; fileKey?: string; fileName: string; contentType: string; sizeBytes: number; createdAt: string }>;
  guardians?: Array<{ id: string; name: string; relationship: string; phone?: string | null; email?: string | null; isPrimary: boolean }>;
};
const place = (p: Row['placements'][number]): PlacementDto => ({ academicYear: { id: dashed(p.academicYear.id), name: p.academicYear.name }, classroom: { id: dashed(p.classroom.id), name: p.classroom.name } });
const summary = (r: Row): StudentSummaryDto => ({
  id: dashed(r.id), enrollmentId: r.enrollmentId, firstName: r.firstName, lastName: r.lastName, status: r.status,
  gender: r.gender ?? null, dateOfBirth: r.dateOfBirth ?? null, placement: r.placements[0] ? place(r.placements[0]) : null,
});
const guardian = (g: NonNullable<Row['guardians']>[number]): GuardianDto => ({ id: dashed(g.id), name: g.name, relationship: g.relationship, phone: g.phone ?? null, email: g.email ?? null, isPrimary: g.isPrimary });

/**
 * Students of the active school (P2-2). The school is always the verified one. Enrolment ids are `<prefix><serial, 4 digits>`
 * from a per-school counter; the database refuses a number someone else took (unique key) and the gateway reads again and retries.
 */
@Injectable()
export class StudentsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async list(t: TenantContext, q: ListStudentsQueryDto): Promise<StudentListDto> {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 25;
    const filter = { schoolId: t.schoolId, ...(q.search ? { search: likeContains(q.search) } : {}), ...(q.status ? { status: q.status as never } : {}) };
    const [rows, count] = await Promise.all([
      this.db.listStudents({ ...filter, limit: pageSize, offset: (page - 1) * pageSize }),
      this.db.countStudents(filter),
    ]);
    return { items: (rows.data.students as Row[]).map(summary), total: Number(count.data.students[0]?._count ?? 0), page, pageSize };
  }

  /** The raw student row for the verified school (used by the files service too). */
  async row(t: TenantContext, id: string): Promise<Row> {
    const r = (await this.db.getStudent({ schoolId: t.schoolId, id })).data.students[0];
    if (!r) throw notFound(); // a student of another school looks exactly like one that does not exist
    return r as Row;
  }
  private full(r: Row): StudentDto {
    return { ...summary(r), hasPhoto: !!r.photoKey, documents: (r.documents ?? []).map((d) => ({ id: dashed(d.id), kind: d.kind, fileName: d.fileName, contentType: d.contentType, sizeBytes: d.sizeBytes, createdAt: d.createdAt })), admissionDate: r.admissionDate ?? null, address: r.address ?? null, placements: r.placements.map(place), guardians: (r.guardians ?? []).map(guardian) };
  }
  async get(t: TenantContext, id: string): Promise<StudentDto> {
    return this.full(await this.row(t, id));
  }

  private checkDates(d: { dateOfBirth?: string; admissionDate?: string }): void {
    for (const f of ['dateOfBirth', 'admissionDate'] as const) if (d[f] !== undefined && !realDate(d[f]!)) throw invalid(f, 'realDate');
    if (d.dateOfBirth !== undefined && d.dateOfBirth > new Date().toISOString().slice(0, 10)) throw invalid('dateOfBirth', 'notInTheFuture');
  }
  private async activeYearId(t: TenantContext): Promise<string> {
    const y = (await this.db.getSchoolProfile({ schoolId: t.schoolId })).data.school?.activeAcademicYear;
    if (!y) throw invalid('academicYearId', 'noActiveAcademicYear');
    return dashed(y.id);
  }

  async create(t: TenantContext, dto: CreateStudentDto): Promise<StudentDto> {
    this.checkDates(dto);
    // Resolve the placement first so a bad class or year fails before a number is used.
    const yearId = dto.classroomId ? (dto.academicYearId ?? (await this.activeYearId(t))) : undefined;
    const id = randomUUID();
    for (let attempt = 1; ; attempt++) {
      const school = (await this.db.schoolSeq({ schoolId: t.schoolId })).data.school;
      if (!school) throw notFound();
      const enrollmentId = `${school.enrollmentPrefix}${String(school.studentSeq + 1).padStart(4, '0')}`;
      try {
        await this.db.createStudent({
          schoolId: t.schoolId, id, expectedSeq: school.studentSeq, enrollmentId, actorId: t.userId,
          firstName: dto.firstName, lastName: dto.lastName, dateOfBirth: dto.dateOfBirth, gender: dto.gender as never, admissionDate: dto.admissionDate, address: dto.address,
          details: { enrollmentId },
        });
        break;
      } catch (e) {
        // Someone else took this number a moment ago (the id is generated here, so a clash can only mean that): read again.
        if (e instanceof DatabaseError && e.kind === 'CONFLICT' && attempt < MAX_NUMBER_ATTEMPTS) {
          await pause(attempt);
          continue;
        }
        throw e;
      }
    }
    if (dto.classroomId) await this.db.placeStudent({ schoolId: t.schoolId, studentId: id, academicYearId: yearId!, classroomId: dto.classroomId, actorId: t.userId, details: { classroomId: dto.classroomId, academicYearId: yearId } });
    return this.get(t, id);
  }

  async update(t: TenantContext, id: string, dto: UpdateStudentDto): Promise<StudentDto> {
    const changes = defined(dto);
    if (Object.keys(changes).length === 0) throw invalid('firstName', 'atLeastOneField');
    this.checkDates(dto);
    const before = await this.row(t, id);
    await this.db.updateStudent({ schoolId: t.schoolId, id: dashed(before.id), ...changes, status: dto.status as never, gender: dto.gender as never, actorId: t.userId, details: { enrollmentId: before.enrollmentId, changed: Object.keys(changes) } });
    return this.get(t, id);
  }

  async placeIn(t: TenantContext, id: string, dto: PlacementRequestDto): Promise<StudentDto> {
    const s = await this.row(t, id);
    const yearId = dto.academicYearId ?? (await this.activeYearId(t));
    await this.db.placeStudent({ schoolId: t.schoolId, studentId: dashed(s.id), academicYearId: yearId, classroomId: dto.classroomId, actorId: t.userId, details: { classroomId: dto.classroomId, academicYearId: yearId } });
    return this.get(t, id);
  }
  async move(t: TenantContext, id: string, dto: PlacementRequestDto): Promise<StudentDto> {
    const s = await this.row(t, id);
    const yearId = dto.academicYearId ?? (await this.activeYearId(t));
    if (!s.placements.some((p) => same(p.academicYear.id, yearId))) throw notFound(); // no placement in that year to move
    await this.db.moveStudent({ schoolId: t.schoolId, studentId: dashed(s.id), academicYearId: yearId, classroomId: dto.classroomId, actorId: t.userId, details: { classroomId: dto.classroomId, academicYearId: yearId } });
    return this.get(t, id);
  }

  async addGuardian(t: TenantContext, id: string, dto: CreateGuardianDto): Promise<StudentDto> {
    const s = await this.row(t, id);
    if (!dto.phone && !dto.email) throw invalid('phone', 'phoneOrEmail');
    await this.db.addGuardian({ schoolId: t.schoolId, id: randomUUID(), studentId: dashed(s.id), name: dto.name, relationship: dto.relationship, phone: dto.phone, email: dto.email, isPrimary: dto.isPrimary ?? false, actorId: t.userId, details: { relationship: dto.relationship } });
    return this.get(t, id);
  }
  private async guardianOf(t: TenantContext, id: string, guardianId: string) {
    const g = (await this.row(t, id)).guardians?.find((x) => same(x.id, guardianId));
    if (!g) throw notFound();
    return g;
  }
  async updateGuardian(t: TenantContext, id: string, guardianId: string, dto: UpdateGuardianDto): Promise<StudentDto> {
    const changes = defined(dto);
    if (Object.keys(changes).length === 0) throw invalid('name', 'atLeastOneField');
    const g = await this.guardianOf(t, id, guardianId);
    await this.db.updateGuardian({ schoolId: t.schoolId, id: dashed(g.id), ...changes, actorId: t.userId, details: { changed: Object.keys(changes) } });
    return this.get(t, id);
  }
  async removeGuardian(t: TenantContext, id: string, guardianId: string): Promise<void> {
    const g = await this.guardianOf(t, id, guardianId);
    await this.db.removeGuardian({ schoolId: t.schoolId, id: dashed(g.id), actorId: t.userId, details: { relationship: g.relationship } });
  }
}
