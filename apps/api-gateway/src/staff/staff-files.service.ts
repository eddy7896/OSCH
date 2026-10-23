import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import { PRIVATE_STORE, type PrivateStore } from '../files/private-store.js';
import { DOCUMENT_TYPES, PHOTO_TYPES, type FileUploadTicketDto, type SignedReadDto } from '../students/dto/students.dto.js';
import { cleanFileName, READ_TTL_SECONDS, UPLOAD_TTL_SECONDS } from '../students/student-files.service.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import { MAX_STAFF_DOCUMENTS, type AddStaffDocumentDto, type StaffDocumentUploadRequestDto, type StaffDto, type StaffPhotoUploadRequestDto, type StaffSetPhotoDto } from './dto/staff.dto.js';
import { StaffService } from './staff.service.js';

const invalid = (field: string, rule: string) => new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field, rule }]);

/** A staff member's photo and documents in the PRIVATE bucket; same rules as students (own path, object must exist, allowed type, signed short-lived reads). */
@Injectable()
export class StaffFilesService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(PRIVATE_STORE) private readonly store: PrivateStore | null,
    private readonly staff: StaffService,
  ) {}

  private need(): PrivateStore {
    if (!this.store) throw new ApiException(ErrorCode.UPSTREAM_UNAVAILABLE, 503);
    return this.store;
  }
  private prefix(t: TenantContext, staffId: string, area: 'photo' | 'documents') {
    return `schools/${t.schoolId}/staff/${staffId}/${area}/`;
  }
  private keyPattern(t: TenantContext, staffId: string, area: 'photo' | 'documents') {
    return new RegExp(`^${this.prefix(t, staffId, area).replaceAll('/', '\\/')}[0-9a-f-]{36}\\.(png|jpg|webp|pdf)$`);
  }
  private async ticket(store: PrivateStore, key: string, contentType: string, sizeBytes: number): Promise<FileUploadTicketDto> {
    const uploadUrl = await store.presignPut({ key, contentType, contentLength: sizeBytes, expiresInSeconds: UPLOAD_TTL_SECONDS });
    return { uploadUrl, method: 'PUT', headers: { 'Content-Type': contentType, 'Content-Length': String(sizeBytes) }, key, expiresInSeconds: UPLOAD_TTL_SECONDS };
  }
  private async verified(store: PrivateStore, key: string, allowed: Record<string, string>) {
    const found = await store.head(key);
    if (!found) throw invalid('key', 'fileNotUploaded');
    if (!(found.contentType in allowed)) throw invalid('key', 'fileTypeNotAllowed');
    return found;
  }

  async photoTicket(t: TenantContext, id: string, dto: StaffPhotoUploadRequestDto): Promise<FileUploadTicketDto> {
    const store = this.need();
    const s = await this.staff.row(t, id);
    return this.ticket(store, `${this.prefix(t, dashed(s.id), 'photo')}${randomUUID()}.${PHOTO_TYPES[dto.contentType]}`, dto.contentType, dto.sizeBytes);
  }
  async documentTicket(t: TenantContext, id: string, dto: StaffDocumentUploadRequestDto): Promise<FileUploadTicketDto> {
    const store = this.need();
    const s = await this.staff.row(t, id);
    if ((s.documents ?? []).length >= MAX_STAFF_DOCUMENTS) throw new ApiException(ErrorCode.CONFLICT, 409);
    return this.ticket(store, `${this.prefix(t, dashed(s.id), 'documents')}${randomUUID()}.${DOCUMENT_TYPES[dto.contentType]}`, dto.contentType, dto.sizeBytes);
  }

  async setPhoto(t: TenantContext, id: string, dto: StaffSetPhotoDto): Promise<StaffDto> {
    const store = this.need();
    const s = await this.staff.row(t, id);
    if (!this.keyPattern(t, dashed(s.id), 'photo').test(dto.key)) throw invalid('key', 'ownPhotoPath');
    await this.verified(store, dto.key, PHOTO_TYPES);
    const old = s.photoKey ?? null;
    await this.db.setStaffPhoto({ schoolId: t.schoolId, id: dashed(s.id), photoKey: dto.key, actorId: t.userId, details: { replaced: old !== null } });
    if (old && old !== dto.key) await store.remove(old).catch(() => undefined);
    return this.staff.get(t, id);
  }

  async addDocument(t: TenantContext, id: string, dto: AddStaffDocumentDto): Promise<StaffDto> {
    const store = this.need();
    const s = await this.staff.row(t, id);
    if ((s.documents ?? []).length >= MAX_STAFF_DOCUMENTS) throw new ApiException(ErrorCode.CONFLICT, 409);
    if (!this.keyPattern(t, dashed(s.id), 'documents').test(dto.key)) throw invalid('key', 'ownDocumentPath');
    const found = await this.verified(store, dto.key, DOCUMENT_TYPES);
    if (found.sizeBytes < 1) throw invalid('key', 'fileEmpty');
    await this.db.addStaffDocument({
      schoolId: t.schoolId, id: randomUUID(), staffId: dashed(s.id), kind: dto.kind as never, fileKey: dto.key, fileName: cleanFileName(dto.fileName),
      contentType: found.contentType, sizeBytes: found.sizeBytes, actorId: t.userId, details: { kind: dto.kind, contentType: found.contentType, sizeBytes: found.sizeBytes },
    });
    return this.staff.get(t, id);
  }

  async removeDocument(t: TenantContext, id: string, documentId: string): Promise<void> {
    const store = this.need();
    const s = await this.staff.row(t, id);
    const doc = (s.documents ?? []).find((d) => dashed(d.id) === documentId.toLowerCase());
    if (!doc) throw new ApiException(ErrorCode.NOT_FOUND, 404);
    await this.db.removeStaffDocument({ schoolId: t.schoolId, id: dashed(doc.id), actorId: t.userId, details: { kind: doc.kind, fileName: doc.fileName } });
    await store.remove(doc.fileKey).catch(() => undefined);
  }

  async photoUrl(t: TenantContext, id: string): Promise<SignedReadDto> {
    const store = this.need();
    const s = await this.staff.row(t, id);
    if (!s.photoKey) throw new ApiException(ErrorCode.NOT_FOUND, 404);
    return { url: await store.presignGet({ key: s.photoKey, expiresInSeconds: READ_TTL_SECONDS }), expiresInSeconds: READ_TTL_SECONDS };
  }
  async documentUrl(t: TenantContext, id: string, documentId: string): Promise<SignedReadDto> {
    const store = this.need();
    const s = await this.staff.row(t, id);
    const doc = (s.documents ?? []).find((d) => dashed(d.id) === documentId.toLowerCase());
    if (!doc) throw new ApiException(ErrorCode.NOT_FOUND, 404);
    return { url: await store.presignGet({ key: doc.fileKey, expiresInSeconds: READ_TTL_SECONDS, downloadName: doc.fileName }), expiresInSeconds: READ_TTL_SECONDS };
  }
}
