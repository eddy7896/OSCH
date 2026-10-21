import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import type {
  AcademicYearDto, ClassDto, CreateAcademicYearDto, CreateClassDto, CreateGradeLevelDto, CreateSubjectDto, GradeLevelDto, SubjectDto,
  UpdateAcademicYearDto, UpdateClassDto, UpdateGradeLevelDto, UpdateSubjectDto,
} from './dto/academics.dto.js';

const notFound = () => new ApiException(ErrorCode.NOT_FOUND, 404);
const invalid = (field: string, rule: string) => new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field, rule }]);
const conflict = () => new ApiException(ErrorCode.CONFLICT, 409);
const same = (a: string, b: string) => dashed(a) === b.toLowerCase();
const atLeastOne = (dto: object, field: string) => {
  if (Object.values(dto).every((v) => v === undefined)) throw invalid(field, 'atLeastOneField');
};
const defined = <T extends object>(o: T): Partial<T> => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;

/**
 * Class levels, classes (sections), subjects and academic years of the active school (P2-1). Every read and write carries the
 * verified school id; the database re-checks that each row it touches belongs to that school and writes the audit row in the
 * same transaction. Deleting something that is in use is a 409 here, with the database as the backstop.
 */
@Injectable()
export class AcademicsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  // ---- class levels ----
  private async levelRows(schoolId: string) {
    return (await this.db.listGradeLevels({ schoolId })).data.gradeLevels;
  }
  private levelView(r: Awaited<ReturnType<AcademicsService['levelRows']>>[number]): GradeLevelDto {
    return { id: dashed(r.id), name: r.name, position: r.position, classes: r.classrooms.map((c) => ({ id: dashed(c.id), section: c.section, name: c.name, capacity: c.capacity })) };
  }
  async levels(t: TenantContext): Promise<GradeLevelDto[]> {
    return (await this.levelRows(t.schoolId)).map((r) => this.levelView(r));
  }
  private async level(t: TenantContext, id: string) {
    const row = (await this.levelRows(t.schoolId)).find((r) => same(r.id, id));
    if (!row) throw notFound();
    return row;
  }
  async createLevel(t: TenantContext, dto: CreateGradeLevelDto): Promise<GradeLevelDto> {
    const id = randomUUID();
    await this.db.createGradeLevel({ schoolId: t.schoolId, id, name: dto.name, position: dto.position, actorId: t.userId, details: { name: dto.name, position: dto.position } });
    return this.levelView(await this.level(t, id));
  }
  async updateLevel(t: TenantContext, id: string, dto: UpdateGradeLevelDto): Promise<GradeLevelDto> {
    atLeastOne(dto, 'name');
    const before = await this.level(t, id);
    await this.db.updateGradeLevel({ schoolId: t.schoolId, id: dashed(before.id), ...defined(dto), actorId: t.userId, details: { name: before.name, changed: Object.keys(defined(dto)) } });
    return this.levelView(await this.level(t, id));
  }
  async deleteLevel(t: TenantContext, id: string): Promise<void> {
    const before = await this.level(t, id);
    if (before.classrooms.length > 0) throw conflict(); // classes still belong to it
    await this.db.deleteGradeLevel({ schoolId: t.schoolId, id: dashed(before.id), actorId: t.userId, details: { name: before.name } });
  }

  // ---- classes ----
  private async classRows(schoolId: string) {
    return (await this.db.listClassrooms({ schoolId })).data.classrooms;
  }
  private classView(r: Awaited<ReturnType<AcademicsService['classRows']>>[number]): ClassDto {
    return { id: dashed(r.id), name: r.name, section: r.section, capacity: r.capacity, gradeLevel: { id: dashed(r.gradeLevel.id), name: r.gradeLevel.name } };
  }
  async classes(t: TenantContext): Promise<ClassDto[]> {
    return (await this.classRows(t.schoolId)).map((r) => this.classView(r));
  }
  private async klass(t: TenantContext, id: string) {
    const row = (await this.classRows(t.schoolId)).find((r) => same(r.id, id));
    if (!row) throw notFound();
    return row;
  }
  async createClass(t: TenantContext, dto: CreateClassDto): Promise<ClassDto> {
    const level = (await this.levelRows(t.schoolId)).find((r) => same(r.id, dto.gradeLevelId));
    if (!level) throw invalid('gradeLevelId', 'ownClassLevel'); // a level of another school is indistinguishable from one that does not exist
    const id = randomUUID();
    const name = `${level.name} ${dto.section}`;
    await this.db.createClassroom({ schoolId: t.schoolId, id, gradeLevelId: dashed(level.id), section: dto.section, name, capacity: dto.capacity, actorId: t.userId, details: { name, capacity: dto.capacity } });
    return this.classView(await this.klass(t, id));
  }
  async updateClass(t: TenantContext, id: string, dto: UpdateClassDto): Promise<ClassDto> {
    atLeastOne(dto, 'capacity');
    const before = await this.klass(t, id);
    const section = dto.section ?? before.section;
    await this.db.updateClassroom({ schoolId: t.schoolId, id: dashed(before.id), section, name: `${before.gradeLevel.name} ${section}`, ...(dto.capacity === undefined ? {} : { capacity: dto.capacity }), actorId: t.userId, details: { name: before.name, changed: Object.keys(defined(dto)) } });
    return this.classView(await this.klass(t, id));
  }
  async deleteClass(t: TenantContext, id: string): Promise<void> {
    const before = await this.klass(t, id);
    await this.db.deleteClassroom({ schoolId: t.schoolId, id: dashed(before.id), actorId: t.userId, details: { name: before.name } });
  }

  // ---- subjects ----
  private async subjectRows(schoolId: string) {
    return (await this.db.listSubjects({ schoolId })).data.subjects;
  }
  private subjectView = (r: { id: string; name: string; code: string }): SubjectDto => ({ id: dashed(r.id), name: r.name, code: r.code });
  async subjects(t: TenantContext): Promise<SubjectDto[]> {
    return (await this.subjectRows(t.schoolId)).map(this.subjectView);
  }
  private async subject(t: TenantContext, id: string) {
    const row = (await this.subjectRows(t.schoolId)).find((r) => same(r.id, id));
    if (!row) throw notFound();
    return row;
  }
  async createSubject(t: TenantContext, dto: CreateSubjectDto): Promise<SubjectDto> {
    const id = randomUUID();
    await this.db.createSubject({ schoolId: t.schoolId, id, name: dto.name, code: dto.code, actorId: t.userId, details: { name: dto.name, code: dto.code } });
    return this.subjectView(await this.subject(t, id));
  }
  async updateSubject(t: TenantContext, id: string, dto: UpdateSubjectDto): Promise<SubjectDto> {
    atLeastOne(dto, 'name');
    const before = await this.subject(t, id);
    await this.db.updateSubject({ schoolId: t.schoolId, id: dashed(before.id), ...defined(dto), actorId: t.userId, details: { code: before.code, changed: Object.keys(defined(dto)) } });
    return this.subjectView(await this.subject(t, id));
  }
  async deleteSubject(t: TenantContext, id: string): Promise<void> {
    const before = await this.subject(t, id);
    await this.db.deleteSubject({ schoolId: t.schoolId, id: dashed(before.id), actorId: t.userId, details: { name: before.name, code: before.code } });
  }

  // ---- academic years ----
  private async yearRows(schoolId: string) {
    return (await this.db.listAcademicYears({ schoolId })).data.academicYears;
  }
  private yearView = (r: { id: string; name: string; startDate: string; endDate: string; status: string }): AcademicYearDto => ({ id: dashed(r.id), name: r.name, startDate: r.startDate, endDate: r.endDate, status: r.status });
  async years(t: TenantContext): Promise<AcademicYearDto[]> {
    return (await this.yearRows(t.schoolId)).map(this.yearView);
  }
  private async year(t: TenantContext, id: string) {
    const row = (await this.yearRows(t.schoolId)).find((r) => same(r.id, id));
    if (!row) throw notFound();
    return row;
  }
  private static order(start: string, end: string) {
    if (!(end > start)) throw invalid('endDate', 'afterStartDate'); // YYYY-MM-DD strings sort as dates
  }
  async createYear(t: TenantContext, dto: CreateAcademicYearDto): Promise<AcademicYearDto> {
    AcademicsService.order(dto.startDate, dto.endDate);
    const id = randomUUID();
    await this.db.createAcademicYear({ schoolId: t.schoolId, id, name: dto.name, startDate: dto.startDate, endDate: dto.endDate, actorId: t.userId, details: { name: dto.name } });
    return this.yearView(await this.year(t, id));
  }
  async updateYear(t: TenantContext, id: string, dto: UpdateAcademicYearDto): Promise<AcademicYearDto> {
    atLeastOne(dto, 'name');
    const before = await this.year(t, id);
    AcademicsService.order(dto.startDate ?? before.startDate, dto.endDate ?? before.endDate);
    await this.db.updateAcademicYear({ schoolId: t.schoolId, id: dashed(before.id), ...defined(dto), actorId: t.userId, details: { name: before.name, changed: Object.keys(defined(dto)) } });
    return this.yearView(await this.year(t, id));
  }
  /** Makes this the school's one active year; the previous active year becomes ARCHIVED in the same transaction. */
  async activateYear(t: TenantContext, id: string): Promise<AcademicYearDto> {
    const before = await this.year(t, id);
    if (before.status === 'ACTIVE') return this.yearView(before); // already active: no write, no audit row
    await this.db.activateAcademicYear({ schoolId: t.schoolId, id: dashed(before.id), actorId: t.userId, details: { name: before.name, from: before.status } });
    return this.yearView(await this.year(t, id));
  }
  async deleteYear(t: TenantContext, id: string): Promise<void> {
    const before = await this.year(t, id);
    if (before.status === 'ACTIVE') throw conflict(); // the school works in it right now
    await this.db.deleteAcademicYear({ schoolId: t.schoolId, id: dashed(before.id), actorId: t.userId, details: { name: before.name } });
  }
}
