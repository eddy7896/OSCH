import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import { PRIVATE_STORE, type PrivateStore } from '../files/private-store.js';
import { READ_TTL_SECONDS, UPLOAD_TTL_SECONDS, cleanFileName } from '../students/student-files.service.js';
import { TeachingScope } from '../teaching/teaching-scope.service.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import { RESOURCE_TYPES, type AddResourceDto, type FileUploadTicketDto, type ResourceDto, type ResourceListDto, type ResourceUploadRequestDto, type SignedReadDto } from './dto/resources.dto.js';

type Scope = 'school' | 'own' | 'linked';
interface Row {
  id: string; title: string; note?: string | null; fileKey: string; fileName: string; contentType: string; sizeBytes: number; createdAt: string; updatedAt: string;
  classroom: { id: string; name: string }; subject: { id: string; name: string }; uploadedBy: { id: string; displayName?: string | null; email: string };
}

const notFound = () => new ApiException(ErrorCode.NOT_FOUND, 404);
const invalid = (field: string, rule: string) => new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field, rule }]);
const LIMIT = 500;

/**
 * Worksheets and workbooks a teacher shares with the parents of a class (P5-11, ADR-0016). Files live in the PRIVATE bucket under
 * `schools/<school>/resources/<class>/`; a file is read only through a short-lived address after the caller's class has been checked.
 * A resource is shown until its academic year ends.
 */
@Injectable()
export class ResourcesService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(PRIVATE_STORE) private readonly store: PrivateStore | null,
    private readonly scope: TeachingScope,
  ) {}

  private need(): PrivateStore {
    if (!this.store) throw new ApiException(ErrorCode.UPSTREAM_UNAVAILABLE, 503);
    return this.store;
  }

  private view(r: Row): ResourceDto {
    return {
      id: dashed(r.id), title: r.title, note: r.note ?? null, class: { id: dashed(r.classroom.id), name: r.classroom.name }, subject: { id: dashed(r.subject.id), name: r.subject.name },
      fileName: r.fileName, contentType: r.contentType, sizeBytes: r.sizeBytes, uploadedBy: { id: r.uploadedBy.id, name: r.uploadedBy.displayName ?? r.uploadedBy.email },
      createdAt: r.createdAt, updatedAt: r.updatedAt,
    };
  }

  /** The active year while it lasts. After its last day nothing is shown (the files and rows stay, for the audit trail). */
  private async liveYear(t: TenantContext): Promise<string | null> {
    const y = (await this.db.getSchoolProfile({ schoolId: t.schoolId })).data.school?.activeAcademicYear;
    if (!y || (y.endDate && y.endDate < new Date().toISOString().slice(0, 10))) return null;
    return dashed(y.id);
  }

  /** Whether the caller may share for this class and subject: the Academic admin always; a teacher who teaches the subject in the class this year, or is its class teacher. */
  private async mayShare(t: TenantContext, scope: Scope, classId: string, subjectId: string, yearId: string): Promise<void> {
    if (scope === 'school') return;
    if (scope !== 'own') throw new ApiException(ErrorCode.FORBIDDEN, 403);
    if ((await this.scope.classTeacherClassIds(t)).has(classId)) return;
    const staff = (await this.db.staffOfUser({ schoolId: t.schoolId, userId: t.userId })).data.staffProfiles[0];
    const lessons = staff ? (await this.db.listTimetableForStaff({ schoolId: t.schoolId, academicYearId: yearId, staffId: dashed(staff.id) })).data.timetableEntries : [];
    if (!lessons.some((l) => dashed(l.classroom.id) === classId && dashed(l.subject.id) === subjectId)) throw new ApiException(ErrorCode.FORBIDDEN, 403);
  }

  private prefix(t: TenantContext, classId: string) {
    return `schools/${t.schoolId}/resources/${classId}/`;
  }

  async uploadTicket(t: TenantContext, scope: Scope, dto: ResourceUploadRequestDto): Promise<FileUploadTicketDto> {
    const store = this.need();
    const yearId = await this.liveYear(t);
    if (!yearId) throw invalid('classId', 'noActiveYear');
    const classId = dashed(dto.classId);
    await this.mayShare(t, scope, classId, dashed(dto.subjectId), yearId);
    const key = `${this.prefix(t, classId)}${randomUUID()}.${RESOURCE_TYPES[dto.contentType]}`;
    const uploadUrl = await store.presignPut({ key, contentType: dto.contentType, contentLength: dto.sizeBytes, expiresInSeconds: UPLOAD_TTL_SECONDS });
    return { uploadUrl, method: 'PUT', headers: { 'Content-Type': dto.contentType, 'Content-Length': String(dto.sizeBytes) }, key, expiresInSeconds: UPLOAD_TTL_SECONDS };
  }

  async add(t: TenantContext, scope: Scope, dto: AddResourceDto): Promise<ResourceDto> {
    const store = this.need();
    const yearId = await this.liveYear(t);
    if (!yearId) throw invalid('classId', 'noActiveYear');
    const classId = dashed(dto.classId);
    const subjectId = dashed(dto.subjectId);
    await this.mayShare(t, scope, classId, subjectId, yearId);
    if (!new RegExp(`^${this.prefix(t, classId).replaceAll('/', '\\/')}[0-9a-f-]{36}\\.(pdf|jpg|png|doc|docx|ppt|pptx)$`).test(dto.key)) throw invalid('key', 'ownResourcePath');
    // checked again against what was really stored: a lying content type or a larger file is never made visible
    const found = await store.head(dto.key);
    if (!found) throw invalid('key', 'fileNotUploaded');
    if (!(found.contentType in RESOURCE_TYPES)) throw invalid('key', 'fileTypeNotAllowed');
    if (found.sizeBytes < 1) throw invalid('key', 'fileEmpty');
    if (found.sizeBytes > 20 * 1024 * 1024) throw invalid('key', 'fileTooLarge');
    if (!dto.key.endsWith(`.${RESOURCE_TYPES[found.contentType as keyof typeof RESOURCE_TYPES]}`)) throw invalid('key', 'fileTypeNotAllowed');
    const id = randomUUID();
    await this.db.addLearningResource({
      schoolId: t.schoolId, id, classroomId: classId, academicYearId: yearId, subjectId, title: dto.title, note: dto.note || null, fileKey: dto.key, fileName: cleanFileName(dto.fileName),
      contentType: found.contentType, sizeBytes: found.sizeBytes, actorId: t.userId, details: { classId, subjectId, title: dto.title, contentType: found.contentType, sizeBytes: found.sizeBytes },
    });
    return this.one(t, 'school', id);
  }

  private async row(t: TenantContext, id: string): Promise<Row | null> {
    return ((await this.db.getLearningResource({ schoolId: t.schoolId, id: dashed(id) })).data.learningResources[0] as unknown as Row | undefined) ?? null;
  }

  /** The classes the caller may see resources of: all (school), the classes they teach (own), or the classes their linked children are in. */
  private async classes(t: TenantContext, scope: Scope): Promise<Set<string> | null> {
    return this.scope.visibleClassIds(t, scope);
  }

  async list(t: TenantContext, scope: Scope, classId?: string): Promise<ResourceListDto> {
    const yearId = await this.liveYear(t);
    if (!yearId) return { items: [] };
    const allowed = await this.classes(t, scope);
    const wanted = classId ? dashed(classId) : null;
    if (allowed && wanted && !allowed.has(wanted)) return { items: [] };
    const ids = wanted ? [wanted] : allowed ? [...allowed] : null;
    if (ids && ids.length === 0) return { items: [] };
    const rows = ids
      ? (await this.db.listLearningResourcesOfClasses({ schoolId: t.schoolId, academicYearId: yearId, classIds: ids, limit: LIMIT })).data.learningResources
      : (await this.db.listLearningResources({ schoolId: t.schoolId, academicYearId: yearId, limit: LIMIT })).data.learningResources;
    return { items: (rows as unknown as Row[]).map((r) => this.view(r)) };
  }

  private async visible(t: TenantContext, scope: Scope, id: string): Promise<Row> {
    const r = await this.row(t, id);
    if (!r) throw notFound();
    const allowed = await this.classes(t, scope);
    if (allowed && !allowed.has(dashed(r.classroom.id))) throw notFound();
    return r;
  }

  async one(t: TenantContext, scope: Scope, id: string): Promise<ResourceDto> {
    return this.view(await this.visible(t, scope, id));
  }

  async downloadUrl(t: TenantContext, scope: Scope, id: string): Promise<SignedReadDto> {
    const store = this.need();
    if (!(await this.liveYear(t))) throw notFound();
    const r = await this.visible(t, scope, id);
    return { url: await store.presignGet({ key: r.fileKey, expiresInSeconds: READ_TTL_SECONDS, downloadName: r.fileName }), expiresInSeconds: READ_TTL_SECONDS };
  }

  /** The uploader, or the Academic admin (school scope). Anyone else gets "not found". */
  async remove(t: TenantContext, scope: Scope, id: string): Promise<void> {
    const store = this.need();
    const r = await this.row(t, id);
    if (!r || (scope !== 'school' && r.uploadedBy.id !== t.userId)) throw notFound();
    await this.db.removeLearningResource({ schoolId: t.schoolId, id: dashed(r.id), actorId: t.userId, details: { title: r.title, fileName: r.fileName } });
    await store.remove(r.fileKey).catch(() => undefined); // best effort: the row is already hidden
  }
}
