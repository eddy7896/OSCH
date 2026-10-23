import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import { PRIVATE_STORE, type PrivateStore } from '../files/private-store.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import {
  DOCUMENT_TYPES, MAX_DOCUMENTS_PER_STUDENT, PHOTO_TYPES, type AddDocumentDto, type DocumentUploadRequestDto, type FileUploadTicketDto,
  type PhotoUploadRequestDto, type SetPhotoDto, type SignedReadDto, type StudentDto,
} from './dto/students.dto.js';
import { StudentsService } from './students.service.js';

export const UPLOAD_TTL_SECONDS = 300;
export const READ_TTL_SECONDS = 300;
const invalid = (field: string, rule: string) => new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field, rule }]);

/** A file name safe to show and to save under: no path parts or control characters, at most 120 characters. */
export const cleanFileName = (raw: string): string => {
  const base = raw.split(/[\\/]/).pop() ?? '';
  // eslint-disable-next-line no-control-regex
  return base.replace(/[\u0000-\u001f"<>:|?*]/g, '_').trim().slice(0, 120) || 'file';
};

/**
 * A student's photo and documents in the PRIVATE bucket. Keys are built from the verified school and the student (never from the
 * request); attaching a file checks that the key is this student's own path and that the object really exists with an allowed type.
 */
@Injectable()
export class StudentFilesService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(PRIVATE_STORE) private readonly store: PrivateStore | null,
    private readonly students: StudentsService,
  ) {}

  private need(): PrivateStore {
    if (!this.store) throw new ApiException(ErrorCode.UPSTREAM_UNAVAILABLE, 503); // private storage is not configured on this deployment
    return this.store;
  }
  private prefix(t: TenantContext, studentId: string, area: 'photo' | 'documents') {
    return `schools/${t.schoolId}/students/${studentId}/${area}/`;
  }
  private keyPattern(t: TenantContext, studentId: string, area: 'photo' | 'documents') {
    return new RegExp(`^${this.prefix(t, studentId, area).replaceAll('/', '\\/')}[0-9a-f-]{36}\\.(png|jpg|webp|pdf)$`);
  }

  async photoTicket(t: TenantContext, id: string, dto: PhotoUploadRequestDto): Promise<FileUploadTicketDto> {
    const store = this.need();
    const s = await this.students.row(t, id);
    return this.ticket(store, `${this.prefix(t, dashed(s.id), 'photo')}${randomUUID()}.${PHOTO_TYPES[dto.contentType]}`, dto.contentType, dto.sizeBytes);
  }
  async documentTicket(t: TenantContext, id: string, dto: DocumentUploadRequestDto): Promise<FileUploadTicketDto> {
    const store = this.need();
    const s = await this.students.row(t, id);
    if ((s.documents ?? []).length >= MAX_DOCUMENTS_PER_STUDENT) throw new ApiException(ErrorCode.CONFLICT, 409);
    return this.ticket(store, `${this.prefix(t, dashed(s.id), 'documents')}${randomUUID()}.${DOCUMENT_TYPES[dto.contentType]}`, dto.contentType, dto.sizeBytes);
  }
  private async ticket(store: PrivateStore, key: string, contentType: string, sizeBytes: number): Promise<FileUploadTicketDto> {
    const uploadUrl = await store.presignPut({ key, contentType, contentLength: sizeBytes, expiresInSeconds: UPLOAD_TTL_SECONDS });
    return { uploadUrl, method: 'PUT', headers: { 'Content-Type': contentType, 'Content-Length': String(sizeBytes) }, key, expiresInSeconds: UPLOAD_TTL_SECONDS };
  }

  /** The uploaded object must exist; its stored type must be allowed for this use. */
  private async verified(store: PrivateStore, key: string, allowed: Record<string, string>) {
    const found = await store.head(key);
    if (!found) throw invalid('key', 'fileNotUploaded');
    if (!(found.contentType in allowed)) throw invalid('key', 'fileTypeNotAllowed');
    return found;
  }

  async setPhoto(t: TenantContext, id: string, dto: SetPhotoDto): Promise<StudentDto> {
    const store = this.need();
    const s = await this.students.row(t, id);
    if (!this.keyPattern(t, dashed(s.id), 'photo').test(dto.key)) throw invalid('key', 'ownPhotoPath');
    await this.verified(store, dto.key, PHOTO_TYPES);
    const old = s.photoKey ?? null;
    await this.db.setStudentPhoto({ schoolId: t.schoolId, studentId: dashed(s.id), photoKey: dto.key, actorId: t.userId, details: { replaced: old !== null } });
    if (old && old !== dto.key) await store.remove(old).catch(() => undefined); // best effort: an orphan costs a few KB, a failure must not undo the change
    return this.students.get(t, id);
  }

  async addDocument(t: TenantContext, id: string, dto: AddDocumentDto): Promise<StudentDto> {
    const store = this.need();
    const s = await this.students.row(t, id);
    if ((s.documents ?? []).length >= MAX_DOCUMENTS_PER_STUDENT) throw new ApiException(ErrorCode.CONFLICT, 409);
    if (!this.keyPattern(t, dashed(s.id), 'documents').test(dto.key)) throw invalid('key', 'ownDocumentPath');
    const found = await this.verified(store, dto.key, DOCUMENT_TYPES);
    if (found.sizeBytes < 1) throw invalid('key', 'fileEmpty');
    await this.db.addStudentDocument({
      schoolId: t.schoolId, id: randomUUID(), studentId: dashed(s.id), kind: dto.kind as never, fileKey: dto.key, fileName: cleanFileName(dto.fileName),
      contentType: found.contentType, sizeBytes: found.sizeBytes, actorId: t.userId, details: { kind: dto.kind, contentType: found.contentType, sizeBytes: found.sizeBytes },
    });
    return this.students.get(t, id);
  }

  async removeDocument(t: TenantContext, id: string, documentId: string): Promise<void> {
    const store = this.need();
    const s = await this.students.row(t, id);
    const doc = (s.documents ?? []).find((d) => dashed(d.id) === documentId.toLowerCase());
    if (!doc) throw new ApiException(ErrorCode.NOT_FOUND, 404);
    await this.db.removeStudentDocument({ schoolId: t.schoolId, id: dashed(doc.id), actorId: t.userId, details: { kind: doc.kind, fileName: doc.fileName } });
    if (doc.fileKey) await store.remove(doc.fileKey).catch(() => undefined);
  }

  async photoUrl(t: TenantContext, id: string): Promise<SignedReadDto> {
    const store = this.need();
    const s = await this.students.row(t, id);
    if (!s.photoKey) throw new ApiException(ErrorCode.NOT_FOUND, 404);
    return { url: await store.presignGet({ key: s.photoKey, expiresInSeconds: READ_TTL_SECONDS }), expiresInSeconds: READ_TTL_SECONDS };
  }
  async documentUrl(t: TenantContext, id: string, documentId: string): Promise<SignedReadDto> {
    const store = this.need();
    const s = await this.students.row(t, id);
    const doc = (s.documents ?? []).find((d) => dashed(d.id) === documentId.toLowerCase());
    if (!doc?.fileKey) throw new ApiException(ErrorCode.NOT_FOUND, 404);
    return { url: await store.presignGet({ key: doc.fileKey, expiresInSeconds: READ_TTL_SECONDS, downloadName: doc.fileName }), expiresInSeconds: READ_TTL_SECONDS };
  }
}
