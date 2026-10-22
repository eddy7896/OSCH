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
