import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, MaxLength, Min } from 'class-validator';
import { GENDERS, RELATIONSHIPS } from '../../students/dto/students.dto.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PHONE = /^\+[1-9][0-9]{6,14}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const APPLICATION_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'ADMITTED'] as const;
/** The steps a person may take. ADMITTED is only reached through the admit action. */
export const DECISION_TARGETS = ['UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'] as const;

export class ApplicationIdParamDto {
  @IsString() @Matches(UUID) id!: string;
}

export class ListApplicationsQueryDto {
  /** Matches the child's name, the guardian's name or the application number; case does not matter. */
  @IsOptional() @Transform(trim) @IsString() @Length(1, 80) search?: string;
  @IsOptional() @IsIn(APPLICATION_STATUSES) status?: string;
  @IsOptional() @Matches(UUID) academicYearId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

export class ApplicationSummaryDto {
  id!: string;
  applicationNo!: string;
  status!: string;
  firstName!: string;
  lastName!: string;
  guardianName!: string;
  gradeLevel!: { id: string; name: string };
  academicYear!: { id: string; name: string };
  createdAt!: string;
}
export class ApplicationListDto {
  items!: ApplicationSummaryDto[];
  total!: number;
  page!: number;
  pageSize!: number;
}
export class ApplicationDto extends ApplicationSummaryDto {
  dateOfBirth!: string | null;
  gender!: string | null;
  address!: string | null;
  guardianRelationship!: string;
  guardianPhone!: string | null;
  guardianEmail!: string | null;
  previousSchool!: string | null;
  notes!: string | null;
  decisionNote!: string | null;
  /** Set once admitted: the student created from this application. */
  studentId!: string | null;
}

class ApplicationFields {
  @IsOptional() @Matches(DATE) dateOfBirth?: string;
  @IsOptional() @IsIn(GENDERS) gender?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500) address?: string;
  @IsOptional() @Matches(PHONE) guardianPhone?: string;
  @IsOptional() @Transform(trim) @IsString() @Length(3, 254) @Matches(EMAIL) guardianEmail?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(200) previousSchool?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(1000) notes?: string;
}
export class CreateApplicationDto extends ApplicationFields {
  @Transform(trim) @IsString() @Length(1, 80) firstName!: string;
  @Transform(trim) @IsString() @Length(1, 80) lastName!: string;
  /** The class level applied for. */
  @Matches(UUID) gradeLevelId!: string;
  /** Defaults to the school's active academic year. */
  @IsOptional() @Matches(UUID) academicYearId?: string;
  @Transform(trim) @IsString() @Length(1, 120) guardianName!: string;
  @IsIn(RELATIONSHIPS) guardianRelationship!: string;
}
export class UpdateApplicationDto extends ApplicationFields {
  @IsOptional() @Transform(trim) @IsString() @Length(1, 80) firstName?: string;
  @IsOptional() @Transform(trim) @IsString() @Length(1, 80) lastName?: string;
  @IsOptional() @Matches(UUID) gradeLevelId?: string;
  @IsOptional() @Transform(trim) @IsString() @Length(1, 120) guardianName?: string;
  @IsOptional() @IsIn(RELATIONSHIPS) guardianRelationship?: string;
}
export class DecideApplicationDto {
  @IsIn(DECISION_TARGETS) status!: string;
  /** Shown with the decision (for example why it was rejected). */
  @IsOptional() @Transform(trim) @IsString() @MaxLength(1000) note?: string;
}
export class AdmitApplicationDto {
  /** The class to place the student in; it must be a class of the level applied for. */
  @Matches(UUID) classroomId!: string;
  /** Defaults to today. */
  @IsOptional() @Matches(DATE) admissionDate?: string;
}
export class AdmitResultDto {
  application!: ApplicationDto;
  student!: { id: string; enrollmentId: string };
  /** True when the guardian gave an email: a System Admin can now invite them with the Parent role (admissions cannot grant roles). */
  guardianInvitationPending!: boolean;
}
