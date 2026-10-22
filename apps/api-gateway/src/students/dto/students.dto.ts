import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, MaxLength, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PHONE = /^\+[1-9][0-9]{6,14}$/;
export const GENDERS = ['FEMALE', 'MALE', 'OTHER'] as const;
export const STATUSES = ['ACTIVE', 'INACTIVE', 'LEFT'] as const;
export const RELATIONSHIPS = ['MOTHER', 'FATHER', 'GUARDIAN', 'OTHER'] as const;

export class StudentIdParamDto {
  @IsString() @Matches(UUID) id!: string;
}
export class GuardianParamDto extends StudentIdParamDto {
  @IsString() @Matches(UUID) guardianId!: string;
}

export class ListStudentsQueryDto {
  /** Matches first name, last name or enrolment id; case does not matter. */
  @IsOptional() @Transform(trim) @IsString() @Length(1, 80) search?: string;
  @IsOptional() @IsIn(STATUSES) status?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

export class PlacementDto {
  academicYear!: { id: string; name: string };
  classroom!: { id: string; name: string };
}
export class GuardianDto {
  id!: string;
  name!: string;
  relationship!: string;
  phone!: string | null;
  email!: string | null;
  isPrimary!: boolean;
}
export class StudentSummaryDto {
  id!: string;
  enrollmentId!: string;
  firstName!: string;
  lastName!: string;
  status!: string;
  gender!: string | null;
  dateOfBirth!: string | null;
  /** The most recent class placement, or null if the student has none yet. */
  placement!: PlacementDto | null;
}
export class StudentListDto {
  items!: StudentSummaryDto[];
  total!: number;
  page!: number;
  pageSize!: number;
}
export class StudentDto extends StudentSummaryDto {
  hasPhoto!: boolean;
  documents!: StudentDocumentDto[];
  admissionDate!: string | null;
  address!: string | null;
  placements!: PlacementDto[];
  guardians!: GuardianDto[];
}

export class CreateStudentDto {
  @Transform(trim) @IsString() @Length(1, 80) firstName!: string;
  @Transform(trim) @IsString() @Length(1, 80) lastName!: string;
  @IsOptional() @Matches(DATE) dateOfBirth?: string;
  @IsOptional() @IsIn(GENDERS) gender?: string;
  @IsOptional() @Matches(DATE) admissionDate?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500) address?: string;
  /** Place the student in a class straight away (in the active academic year unless `academicYearId` is given). */
  @IsOptional() @Matches(UUID) classroomId?: string;
  @IsOptional() @Matches(UUID) academicYearId?: string;
}
export class UpdateStudentDto {
  @IsOptional() @Transform(trim) @IsString() @Length(1, 80) firstName?: string;
  @IsOptional() @Transform(trim) @IsString() @Length(1, 80) lastName?: string;
  @IsOptional() @Matches(DATE) dateOfBirth?: string;
  @IsOptional() @IsIn(GENDERS) gender?: string;
  @IsOptional() @Matches(DATE) admissionDate?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsIn(STATUSES) status?: string;
}
export class PlacementRequestDto {
  @Matches(UUID) classroomId!: string;
  /** Defaults to the school's active academic year. */
  @IsOptional() @Matches(UUID) academicYearId?: string;
}

export class CreateGuardianDto {
  @Transform(trim) @IsString() @Length(1, 120) name!: string;
  @IsIn(RELATIONSHIPS) relationship!: string;
  @IsOptional() @Matches(PHONE) phone?: string;
  @IsOptional() @Transform(trim) @IsString() @Length(3, 254) @Matches(/^[^@\s]+@[^@\s]+\.[^@\s]+$/) email?: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
}
export class UpdateGuardianDto {
  @IsOptional() @Transform(trim) @IsString() @Length(1, 120) name?: string;
  @IsOptional() @IsIn(RELATIONSHIPS) relationship?: string;
  @IsOptional() @Matches(PHONE) phone?: string;
  @IsOptional() @Transform(trim) @IsString() @Length(3, 254) @Matches(/^[^@\s]+@[^@\s]+\.[^@\s]+$/) email?: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
}

// ---- photo and documents (private bucket) ----
export const PHOTO_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' } as const;
export const DOCUMENT_TYPES = { ...PHOTO_TYPES, 'application/pdf': 'pdf' } as const;
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENTS_PER_STUDENT = 30;
export const DOCUMENT_KINDS = ['BIRTH_CERTIFICATE', 'TRANSFER_CERTIFICATE', 'REPORT_CARD', 'ID_PROOF', 'MEDICAL', 'OTHER'] as const;

export class DocumentParamDto extends StudentIdParamDto {
  @IsString() @Matches(UUID) documentId!: string;
}
export class PhotoUploadRequestDto {
  @IsIn(Object.keys(PHOTO_TYPES)) contentType!: keyof typeof PHOTO_TYPES;
  /** The exact size in bytes; the upload address accepts a body of exactly this length. */
  @IsInt() @Min(1) @Max(PHOTO_MAX_BYTES) sizeBytes!: number;
}
export class DocumentUploadRequestDto {
  @IsIn(Object.keys(DOCUMENT_TYPES)) contentType!: keyof typeof DOCUMENT_TYPES;
  @IsInt() @Min(1) @Max(DOCUMENT_MAX_BYTES) sizeBytes!: number;
}
export class FileUploadTicketDto {
  uploadUrl!: string;
  method!: 'PUT';
  /** Send these headers exactly with the PUT; they are part of the signature. */
  headers!: Record<string, string>;
  /** Hand this back when attaching the file. It is always under this student's own path. */
  key!: string;
  expiresInSeconds!: number;
}
export class SetPhotoDto {
  @IsString() @MaxLength(300) key!: string;
}
export class AddDocumentDto {
  @IsString() @MaxLength(300) key!: string;
  @IsIn(DOCUMENT_KINDS) kind!: string;
  /** The name to show and to save the file under. */
  @Transform(trim) @IsString() @Length(1, 120) fileName!: string;
}
export class StudentDocumentDto {
  id!: string;
  kind!: string;
  fileName!: string;
  contentType!: string;
  sizeBytes!: number;
  createdAt!: string;
}
export class SignedReadDto {
  /** A short-lived address that serves the file. Do not store or share it. */
  url!: string;
  expiresInSeconds!: number;
}
