import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, Min, ValidateNested } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Money crosses the API as a whole number of paise written as a string (never a float): 1 to 15 digits, no leading zero, more than zero. */
export const MONEY = /^[1-9][0-9]{0,14}$/;
export const MAX_INSTALMENTS = 24;
export const CONCESSION_KINDS = ['PERCENT', 'FIXED'] as const;

export class IdParamDto {
  @IsString() @Matches(UUID) id!: string;
}
export class StudentParamDto {
  @IsString() @Matches(UUID) studentId!: string;
}

// ---- reads ----
export class InstalmentDto {
  id!: string;
  /** 1, 2, 3 ... the order within the fee. */
  sequence!: number;
  label!: string | null;
  /** Paise, as a string. */
  amountMinor!: string;
  dueDate!: string;
}
export class FeeItemDto {
  id!: string;
  name!: string;
  instalments!: InstalmentDto[];
  /** Sum of the instalments, paise as a string. */
  totalMinor!: string;
}
export class FeeStructureDto {
  id!: string;
  name!: string;
  academicYear!: { id: string; name: string };
  gradeLevel!: { id: string; name: string };
  items!: FeeItemDto[];
  /** Everything one student of this level pays in the year, before concessions. */
  totalMinor!: string;
}
export class FeeStructureListDto {
  items!: FeeStructureDto[];
}

// ---- writes ----
export class ListStructuresQueryDto {
  @IsOptional() @Matches(UUID) academicYearId?: string;
  @IsOptional() @Matches(UUID) gradeLevelId?: string;
}
export class CreateStructureDto {
  @Matches(UUID) gradeLevelId!: string;
  /** Defaults to the active academic year. */
  @IsOptional() @Matches(UUID) academicYearId?: string;
  /** Defaults to "<level> fees <year>". */
  @IsOptional() @Transform(trim) @IsString() @Length(1, 80) name?: string;
}
export class UpdateStructureDto {
  @Transform(trim) @IsString() @Length(1, 80) name!: string;
}
export class NewInstalmentDto {
  @IsOptional() @Transform(trim) @IsString() @Length(1, 40) label?: string;
  @IsString() @Matches(MONEY) amountMinor!: string;
  @Matches(DATE) dueDate!: string;
}
export class CreateItemDto {
  @Transform(trim) @IsString() @Length(1, 80) name!: string;
  /** One for an annual fee, three for terms, twelve for monthly. Created with the fee, all or nothing. */
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(MAX_INSTALMENTS) @ValidateNested({ each: true }) @Type(() => NewInstalmentDto) instalments!: NewInstalmentDto[];
}
export class UpdateItemDto {
  @Transform(trim) @IsString() @Length(1, 80) name!: string;
}
export class UpdateInstalmentDto {
  @IsOptional() @Transform(trim) @IsString() @Length(1, 40) label?: string;
  @IsOptional() @IsString() @Matches(MONEY) amountMinor?: string;
  @IsOptional() @Matches(DATE) dueDate?: string;
}

// ---- concessions ----
export class ConcessionDto {
  id!: string;
  name!: string;
  kind!: string;
  /** For PERCENT: 100 = 1%. */
  basisPoints!: number | null;
  /** For FIXED: paise as a string. */
  amountMinor!: string | null;
  student!: { id: string; enrollmentId: string; name: string };
  academicYear!: { id: string; name: string };
  /** Null means every fee of the student's structure. */
  feeItem!: { id: string; name: string } | null;
}
export class ConcessionListDto {
  items!: ConcessionDto[];
}
export class ListConcessionsQueryDto {
  @IsOptional() @Matches(UUID) studentId?: string;
  @IsOptional() @Matches(UUID) academicYearId?: string;
}
export class CreateConcessionDto {
  @Matches(UUID) studentId!: string;
  /** Defaults to the active academic year. */
  @IsOptional() @Matches(UUID) academicYearId?: string;
  /** Leave out for every fee of the student's structure. */
  @IsOptional() @Matches(UUID) feeItemId?: string;
  @Transform(trim) @IsString() @Length(1, 80) name!: string;
  @IsIn(CONCESSION_KINDS) kind!: string;
  /** PERCENT only: 1 to 10000 (100 = 1%, 10000 = the whole fee). */
  @IsOptional() @IsInt() @Min(1) @Max(10_000) basisPoints?: number;
  /** FIXED only: paise off each instalment. */
  @IsOptional() @IsString() @Matches(MONEY) amountMinor?: string;
}

// ---- the schedule of one student ----
export class ScheduleQueryDto {
  @IsOptional() @Matches(UUID) academicYearId?: string;
}
export class ScheduleLineDto {
  feeItem!: { id: string; name: string };
  instalmentId!: string;
  sequence!: number;
  label!: string | null;
  dueDate!: string;
  grossMinor!: string;
  discountMinor!: string;
  netMinor!: string;
}
export class ScheduleDto {
  /** OK, NO_PLACEMENT (the student has no class in that year) or NO_STRUCTURE (their level has no fee structure yet). */
  status!: string;
  student!: { id: string; enrollmentId: string; name: string };
  academicYear!: { id: string; name: string };
  structure!: { id: string; name: string } | null;
  lines!: ScheduleLineDto[];
  grossMinor!: string;
  discountMinor!: string;
  netMinor!: string;
}
