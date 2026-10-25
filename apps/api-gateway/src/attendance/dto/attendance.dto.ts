import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsOptional, IsString, Length, Matches, ValidateNested } from 'class-validator';
import { STATUSES } from '../attendance-rules.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ClassDayParamDto {
  @IsString() @Matches(UUID) id!: string;
  @IsString() @Matches(DATE) date!: string;
}
export class StudentParamDto {
  @IsString() @Matches(UUID) id!: string;
}
export class RangeQueryDto {
  @IsOptional() @Matches(DATE) from?: string;
  @IsOptional() @Matches(DATE) to?: string;
}
export class DateQueryDto {
  @IsOptional() @Matches(DATE) date?: string;
}
export class StatusParamDto {
  @IsIn([...STATUSES]) status!: string;
}
export class StatusLabelDto {
  @Transform(trim) @IsString() @Length(1, 30) label!: string;
}
export class StaffDayParamDto {
  @IsString() @Matches(UUID) staffId!: string;
  @IsString() @Matches(DATE) date!: string;
}
export class CorrectStaffDayDto {
  /** ISO 8601 date and time; null clears it. */
  @IsOptional() @IsString() @Length(20, 40) checkIn?: string | null;
  @IsOptional() @IsString() @Length(20, 40) checkOut?: string | null;
}

export class MarkInputDto {
  @IsString() @Matches(UUID) studentId!: string;
  @IsIn([...STATUSES]) status!: string;
  @IsOptional() @Transform(trim) @IsString() @Length(1, 200) note?: string;
}
export class SubmitDayDto {
  /** The exceptions: every student of the class who is not listed is present. */
  @IsArray() @ArrayMaxSize(1000) @ValidateNested({ each: true }) @Type(() => MarkInputDto) marks!: MarkInputDto[];
  /** Finish the day: after this only the Academic admin can change it. */
  @IsOptional() @IsBoolean() lock?: boolean;
  /** The client's own id for this submit. Sending the same one again changes nothing. */
  @IsOptional() @IsString() @Matches(/^[A-Za-z0-9_-]{1,64}$/) submissionId?: string;
}

export class StatusDto {
  status!: string;
  label!: string;
  isDefault!: boolean;
}
export class StatusListDto {
  items!: StatusDto[];
}
export class RosterEntryDto {
  id!: string;
  enrollmentId!: string;
  name!: string;
  status!: string;
  note!: string | null;
}
export class StatusCountsDto {
  PRESENT!: number;
  ABSENT!: number;
  LATE!: number;
  LEAVE!: number;
  MEDICAL!: number;
  HALF_DAY!: number;
  EXCUSED!: number;
}
export class ClassDayDto {
  classId!: string;
  date!: string;
  /** False until the class teacher submits; the roster then shows everyone present. */
  submitted!: boolean;
  locked!: boolean;
  submittedBy!: string | null;
  submittedAt!: string | null;
  counts!: StatusCountsDto;
  students!: RosterEntryDto[];
}
export class DaySummaryDto {
  date!: string;
  locked!: boolean;
  counts!: StatusCountsDto;
}
export class DayListDto {
  items!: DaySummaryDto[];
}
export class MissingClassDto {
  id!: string;
  name!: string;
}
export class MissingDto {
  date!: string;
  /** Classes with no attendance submitted on a working day. Empty when the date is not a working day. */
  items!: MissingClassDto[];
}
export class StudentMarkDto {
  date!: string;
  status!: string;
  note!: string | null;
}
export class StudentAttendanceDto {
  studentId!: string;
  from!: string;
  to!: string;
  /** Days the class's attendance was taken in the range. */
  daysTaken!: number;
  counts!: StatusCountsDto;
  marks!: StudentMarkDto[];
}
export class StaffDayDto {
  date!: string;
  checkIn!: string | null;
  checkOut!: string | null;
}
export class StaffDayListDto {
  items!: StaffDayDto[];
}
export class StaffStaffDto {
  id!: string;
  employeeId!: string;
  name!: string;
}
export class StaffPresenceDto {
  staff!: StaffStaffDto;
  checkIn!: string | null;
  checkOut!: string | null;
  /** IN: at work now. OUT: has left for the day. NONE: has not checked in. */
  state!: string;
}
export class StaffPresenceListDto {
  date!: string;
  items!: StaffPresenceDto[];
}
