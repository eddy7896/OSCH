import { UpdatedSince } from '../../common/updated-since.js';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { DAYS } from '../../schedule/schedule-rules.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class TimetableClassParamDto {
  @IsString() @Matches(UUID) id!: string;
}
export class TimetableStaffParamDto {
  @IsString() @Matches(UUID) staffId!: string;
}
export class TimetableEntryParamDto {
  @IsString() @Matches(UUID) id!: string;
}
export class MineTimetableQueryDto {
  /** Defaults to the active academic year. */
  @IsOptional() @Matches(UUID) academicYearId?: string;
  /** Only lessons added or changed at or after this moment (the `next` of an earlier answer); removed lessons arrive as tombstones. */
  @UpdatedSince() updatedSince?: string;
}
export class TimetableYearQueryDto {
  /** Defaults to the active academic year. */
  @IsOptional() @Matches(UUID) academicYearId?: string;
}
export class SetSlotDto {
  @IsIn([...DAYS]) day!: string;
  @IsString() @Matches(UUID) periodId!: string;
  @IsString() @Matches(UUID) subjectId!: string;
  @IsString() @Matches(UUID) staffId!: string;
  @IsOptional() @Matches(UUID) academicYearId?: string;
}

export class TimetableSubjectDto {
  id!: string;
  name!: string;
  code!: string;
}
export class TimetableStaffDto {
  id!: string;
  employeeId!: string;
  name!: string;
}
export class TimetableClassRefDto {
  id!: string;
  name!: string;
}
export class ClassSlotDto {
  id!: string;
  day!: string;
  periodId!: string;
  subject!: TimetableSubjectDto;
  staff!: TimetableStaffDto;
}
export class ClassTimetableDto {
  academicYearId!: string;
  classId!: string;
  entries!: ClassSlotDto[];
}
export class StaffSlotDto {
  id!: string;
  day!: string;
  periodId!: string;
  class!: TimetableClassRefDto;
  subject!: TimetableSubjectDto;
}
export class StaffTimetableDto {
  academicYearId!: string;
  staffId!: string | null;
  entries!: StaffSlotDto[];
  /** Ask from here next time (the server's clock); null when there is nothing to anchor to yet. */
  next!: string | null;
}
export class LoadByDayDto {
  MON!: number;
  TUE!: number;
  WED!: number;
  THU!: number;
  FRI!: number;
  SAT!: number;
  SUN!: number;
}
export class TeacherLoadDto {
  staff!: TimetableStaffDto;
  total!: number;
  byDay!: LoadByDayDto;
}
export class TimetableLoadDto {
  academicYearId!: string;
  items!: TeacherLoadDto[];
}
