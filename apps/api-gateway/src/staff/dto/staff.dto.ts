import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, MaxLength, Min } from 'class-validator';
import { DOCUMENT_TYPES, DOCUMENT_MAX_BYTES, GENDERS, PHOTO_MAX_BYTES, PHOTO_TYPES } from '../../students/dto/students.dto.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PHONE = /^\+[1-9][0-9]{6,14}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const STAFF_STATUSES = ['ACTIVE', 'INACTIVE', 'LEFT'] as const;
export const STAFF_DOCUMENT_KINDS = ['APPOINTMENT_LETTER', 'ID_PROOF', 'QUALIFICATION', 'EXPERIENCE', 'MEDICAL', 'OTHER'] as const;
export const MAX_STAFF_DOCUMENTS = 30;

export class StaffIdParamDto {
  @IsString() @Matches(UUID) id!: string;
}
export class StaffDocumentParamDto extends StaffIdParamDto {
  @IsString() @Matches(UUID) documentId!: string;
}

export class ListStaffQueryDto {
  /** Matches first name, last name or employee number; case does not matter. */
  @IsOptional() @Transform(trim) @IsString() @Length(1, 80) search?: string;
  @IsOptional() @IsIn(STAFF_STATUSES) status?: string;
  @IsOptional() @Transform(trim) @IsString() @Length(1, 60) department?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

export class StaffSummaryDto {
  id!: string;
  employeeId!: string;
  firstName!: string;
  lastName!: string;
  department!: string | null;
  designation!: string | null;
  status!: string;
  /** True when the person has a sign-in account linked. */
  hasAccount!: boolean;
}
export class StaffListDto {
  items!: StaffSummaryDto[];
  total!: number;
  page!: number;
  pageSize!: number;
}
export class StaffDepartmentsDto {
  items!: string[];
}
export class StaffDocumentDto {
  id!: string;
  kind!: string;
  fileName!: string;
  contentType!: string;
  sizeBytes!: number;
  createdAt!: string;
}
export class StaffDto extends StaffSummaryDto {
  /** The linked sign-in account (a Firebase uid), or null. */
  userId!: string | null;
  phone!: string | null;
  email!: string | null;
  dateOfBirth!: string | null;
  gender!: string | null;
  dateOfJoining!: string | null;
  address!: string | null;
  emergencyContactName!: string | null;
  emergencyContactPhone!: string | null;
  hasPhoto!: boolean;
  documents!: StaffDocumentDto[];
}

class StaffFields {
  @IsOptional() @Transform(trim) @IsString() @Length(1, 60) department?: string;
  @IsOptional() @Transform(trim) @IsString() @Length(1, 60) designation?: string;
  @IsOptional() @Matches(PHONE) phone?: string;
  @IsOptional() @Transform(trim) @IsString() @Length(3, 254) @Matches(EMAIL) email?: string;
  @IsOptional() @Matches(DATE) dateOfBirth?: string;
  @IsOptional() @IsIn(GENDERS) gender?: string;
  @IsOptional() @Matches(DATE) dateOfJoining?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500) address?: string;
  @IsOptional() @Transform(trim) @IsString() @Length(1, 120) emergencyContactName?: string;
  @IsOptional() @Matches(PHONE) emergencyContactPhone?: string;
}
export class CreateStaffDto extends StaffFields {
  @Transform(trim) @IsString() @Length(1, 80) firstName!: string;
  @Transform(trim) @IsString() @Length(1, 80) lastName!: string;
}
export class UpdateStaffDto extends StaffFields {
  @IsOptional() @Transform(trim) @IsString() @Length(1, 80) firstName?: string;
  @IsOptional() @Transform(trim) @IsString() @Length(1, 80) lastName?: string;
  @IsOptional() @IsIn(STAFF_STATUSES) status?: string;
}
export class LinkStaffAccountDto {
  /** The Firebase uid of an account that is already a member of this school. Roles are granted separately by the System Admin. */
  @IsString() @Length(1, 128) @Matches(/^[A-Za-z0-9_-]+$/) userId!: string;
}

// ---- photo and documents (private bucket; same rules as students) ----
export class StaffPhotoUploadRequestDto {
  @IsIn(Object.keys(PHOTO_TYPES)) contentType!: keyof typeof PHOTO_TYPES;
  @IsInt() @Min(1) @Max(PHOTO_MAX_BYTES) sizeBytes!: number;
}
export class StaffDocumentUploadRequestDto {
  @IsIn(Object.keys(DOCUMENT_TYPES)) contentType!: keyof typeof DOCUMENT_TYPES;
  @IsInt() @Min(1) @Max(DOCUMENT_MAX_BYTES) sizeBytes!: number;
}
export class StaffSetPhotoDto {
  @IsString() @MaxLength(300) key!: string;
}
export class AddStaffDocumentDto {
  @IsString() @MaxLength(300) key!: string;
  @IsIn(STAFF_DOCUMENT_KINDS) kind!: string;
  @Transform(trim) @IsString() @Length(1, 120) fileName!: string;
}
