import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const upper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class IdParamDto {
  @IsString() @Matches(UUID) id!: string;
}

// ---- class levels ----
export class ClassSectionDto {
  id!: string;
  section!: string;
  name!: string;
  capacity!: number;
}
export class GradeLevelDto {
  id!: string;
  name!: string;
  position!: number;
  classes!: ClassSectionDto[];
}
export class GradeLevelListDto {
  items!: GradeLevelDto[];
}
export class CreateGradeLevelDto {
  @Transform(trim) @IsString() @Length(1, 40) name!: string;
  /** Where it sits in the list, 1 first. */
  @IsInt() @Min(0) @Max(1000) position!: number;
}
export class UpdateGradeLevelDto {
  @IsOptional() @Transform(trim) @IsString() @Length(1, 40) name?: string;
  @IsOptional() @IsInt() @Min(0) @Max(1000) position?: number;
}

// ---- classes (one section of a level) ----
export class ClassDto {
  id!: string;
  name!: string;
  section!: string;
  capacity!: number;
  gradeLevel!: { id: string; name: string };
}
export class ClassListDto {
  items!: ClassDto[];
}
export class CreateClassDto {
  @IsString() @Matches(UUID) gradeLevelId!: string;
  /** The section letter or name, for example `A`. Unique within the level. */
  @Transform(upper) @IsString() @Length(1, 10) section!: string;
  @IsInt() @Min(1) @Max(500) capacity!: number;
}
export class UpdateClassDto {
  @IsOptional() @Transform(upper) @IsString() @Length(1, 10) section?: string;
  @IsOptional() @IsInt() @Min(1) @Max(500) capacity?: number;
}

// ---- subjects ----
export class SubjectDto {
  id!: string;
  name!: string;
  code!: string;
}
export class SubjectListDto {
  items!: SubjectDto[];
}
export class CreateSubjectDto {
  @Transform(trim) @IsString() @Length(1, 80) name!: string;
  /** Short unique code, letters and digits (stored upper case). */
  @Transform(upper) @IsString() @Matches(/^[A-Z0-9_-]{1,12}$/) code!: string;
}
export class UpdateSubjectDto {
  @IsOptional() @Transform(trim) @IsString() @Length(1, 80) name?: string;
  @IsOptional() @Transform(upper) @IsString() @Matches(/^[A-Z0-9_-]{1,12}$/) code?: string;
}

// ---- academic years ----
export class AcademicYearDto {
  id!: string;
  name!: string;
  /** YYYY-MM-DD, a calendar date. */
  startDate!: string;
  endDate!: string;
  /** PLANNED, ACTIVE (exactly one per school) or ARCHIVED. */
  status!: string;
}
export class AcademicYearListDto {
  items!: AcademicYearDto[];
}
export class CreateAcademicYearDto {
  @Transform(trim) @IsString() @Length(1, 40) name!: string;
  @Matches(DATE) startDate!: string;
  @Matches(DATE) endDate!: string;
}
export class UpdateAcademicYearDto {
  @IsOptional() @Transform(trim) @IsString() @Length(1, 40) name?: string;
  @IsOptional() @Matches(DATE) startDate?: string;
  @IsOptional() @Matches(DATE) endDate?: string;
}
