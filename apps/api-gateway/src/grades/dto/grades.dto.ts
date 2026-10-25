import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Length, Matches, Max, Min, ValidateNested } from 'class-validator';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MARKS = /^\d{1,5}(\.\d)?$/;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class IdParamDto {
  @IsString() @Matches(UUID) id!: string;
}
export class StudentIdParamDto {
  @IsString() @Matches(UUID) studentId!: string;
}
export class TermsQueryDto {
  @IsOptional() @Matches(UUID) academicYearId?: string;
}
export class ExamsQueryDto {
  @IsOptional() @Matches(UUID) termId?: string;
  @IsOptional() @Matches(UUID) classId?: string;
  @IsOptional() @Matches(UUID) subjectId?: string;
}
export class ReportCardQueryDto {
  @Matches(UUID) termId!: string;
  /** The language of the labels on the printed card (an explicit choice, never guessed). Defaults to the school's language. */
  @IsOptional() @Matches(/^[a-z]{2,3}$/) lang?: string;
}

export class CreateTermDto {
  @Transform(trim) @IsString() @Length(1, 40) name!: string;
  /** Defaults to the active academic year. */
  @IsOptional() @Matches(UUID) academicYearId?: string;
}
export class UpdateTermDto {
  @Transform(trim) @IsString() @Length(1, 40) name!: string;
}
export class BandInputDto {
  @Transform(trim) @IsString() @Length(1, 10) label!: string;
  @IsInt() @Min(0) @Max(100) minPercent!: number;
  @IsInt() @Min(0) @Max(100) maxPercent!: number;
}
export class SetBandsDto {
  /** The whole set, replacing the old one: from 0 to 100 with no gap and no overlap. An empty list clears it. */
  @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => BandInputDto) bands!: BandInputDto[];
}
export class CreateExamDto {
  @Matches(UUID) termId!: string;
  @Matches(UUID) classId!: string;
  @Matches(UUID) subjectId!: string;
  @Transform(trim) @IsString() @Length(1, 80) title!: string;
  @Matches(DATE) examDate!: string;
  /** Out of how many marks, at most one decimal: `100`, `37.5`. */
  @IsString() @Matches(MARKS) maxMarks!: string;
}
export class UpdateExamDto {
  @IsOptional() @Transform(trim) @IsString() @Length(1, 80) title?: string;
  @IsOptional() @Matches(DATE) examDate?: string;
  @IsOptional() @IsString() @Matches(MARKS) maxMarks?: string;
}
export class MarkEntryDto {
  @IsString() @Matches(UUID) studentId!: string;
  /** The mark, at most one decimal. Leave out (with `absent` false) to clear a mark. */
  @IsOptional() @IsString() @Matches(MARKS) marks?: string;
  @IsOptional() @IsBoolean() absent?: boolean;
}
export class SaveMarksDto {
  /** Only the students listed are changed. */
  @IsArray() @ArrayMaxSize(1000) @ValidateNested({ each: true }) @Type(() => MarkEntryDto) entries!: MarkEntryDto[];
  /** The client's own id for this submit. Sending the same one again changes nothing. */
  @IsOptional() @IsString() @Matches(/^[A-Za-z0-9_-]{1,64}$/) submissionId?: string;
}

export class TermDto {
  id!: string;
  name!: string;
  academicYearId!: string;
}
export class TermListDto {
  items!: TermDto[];
}
export class BandDto {
  label!: string;
  minPercent!: number;
  maxPercent!: number;
}
export class BandsDto {
  bands!: BandDto[];
  /** The starting set a school is offered; apply it by sending it back. */
  template!: BandDto[];
}
export class RefDto {
  id!: string;
  name!: string;
}
export class SubjectRefDto {
  id!: string;
  name!: string;
  code!: string;
}
export class ExamDto {
  id!: string;
  title!: string;
  examDate!: string;
  term!: RefDto;
  class!: RefDto;
  subject!: SubjectRefDto;
  /** Out of how many marks. */
  maxMarks!: string;
  maxTenths!: number;
}
export class ExamListDto {
  items!: ExamDto[];
}
export class GridRowDto {
  studentId!: string;
  enrollmentId!: string;
  name!: string;
  /** Null until a mark is entered. */
  marks!: string | null;
  marksTenths!: number | null;
  absent!: boolean;
  percent!: string | null;
  grade!: string | null;
}
export class MarksGridDto {
  exam!: ExamDto;
  rows!: GridRowDto[];
}

export class ExamLineDto {
  id!: string;
  title!: string;
  date!: string;
  maxMarks!: string;
  marks!: string | null;
  absent!: boolean;
  percent!: string | null;
  grade!: string | null;
}
export class SubjectLineDto {
  subject!: SubjectRefDto;
  exams!: ExamLineDto[];
  marks!: string;
  maxMarks!: string;
  percent!: string;
  grade!: string | null;
  /** Exams with no mark yet, left out of the totals. */
  pending!: number;
}
export class StudentRefDto {
  id!: string;
  enrollmentId!: string;
  name!: string;
}
export class ReportCardDto {
  student!: StudentRefDto;
  class!: RefDto;
  term!: RefDto;
  academicYearId!: string;
  subjects!: SubjectLineDto[];
  totalMarks!: string;
  totalMaxMarks!: string;
  percent!: string;
  grade!: string | null;
  pending!: number;
}
