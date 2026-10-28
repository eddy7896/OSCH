import { UpdatedSince } from '../../common/updated-since.js';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsISO8601, IsNumber, IsOptional, IsString, Length, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
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
export class DaysQueryDto extends RangeQueryDto {
  /** Only days submitted, corrected or locked at or after this moment (the `next` of an earlier answer). */
  @UpdatedSince() updatedSince?: string;
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
  /** Ask from here next time (the server's clock); null when there is nothing to anchor to yet. */
  next!: string | null;
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
export class PositionDto {
  @IsNumber({ allowNaN: false, allowInfinity: false }) @Min(-90) @Max(90) lat!: number;
  @IsNumber({ allowNaN: false, allowInfinity: false }) @Min(-180) @Max(180) lng!: number;
  /** How sure the phone is, in metres. Accepted and ignored: only the stamp and the distance are kept. */
  @IsOptional() @IsNumber({ allowNaN: false, allowInfinity: false }) @Min(0) @Max(100000) accuracyM?: number;
}

/** What a phone may add to a check-in or a check-out. All optional: the day is recorded whatever is sent. */
export class StampDto {
  /** Where the phone is. Never kept: the server keeps only INSIDE, OUTSIDE or UNKNOWN and the distance from the school. */
  @IsOptional() @ValidateNested() @Type(() => PositionDto) position?: PositionDto;
  /** The phone's own time, kept as a note beside the server's time (never used to decide anything). */
  @IsOptional() @IsISO8601({ strict: true }) @MaxLength(40) deviceTime?: string;
  /** Why the person is not at school. Required when the school has a geofence and the person is outside its soft ring or gave no position. */
  @IsOptional() @Transform(trim) @IsString() @Length(1, 300) reason?: string;
}

/** The evidence kept for HR with a check-in or check-out (a phone can fake its position, so this is not proof). */
export class StaffDayDto {
  date!: string;
  checkIn!: string | null;
  checkOut!: string | null;
  /** INSIDE, OUTSIDE or UNKNOWN (also UNKNOWN when the school has no geofence); null before the stamp existed. */
  checkInStamp!: string | null;
  checkInDistanceM!: number | null;
  checkInReason!: string | null;
  /** The phone's own time when it checked in (a note, not the record's time). */
  checkInDeviceTime!: string | null;
  /** Beyond the hard ring: waits for HR to confirm. */
  needsConfirmation!: boolean;
  confirmedAt!: string | null;
  checkOutStamp!: string | null;
  checkOutDistanceM!: number | null;
  checkOutReason!: string | null;
  checkOutDeviceTime!: string | null;
}

export class GeofenceDto {
  /** False until the System Admin sets the school's point; then nobody is asked for a reason. */
  configured!: boolean;
  lat!: number | null;
  lng!: number | null;
  /** The grounds, in metres. */
  radiusM!: number | null;
  /** The feathered margin around the grounds; radius plus margin is the soft ring. */
  marginM!: number;
  /** Fixed: beyond it a check-in waits for HR. */
  hardRingM!: number;
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
  /** For HR: the stamp, distance, reason and the phone's time of this check-in, and whether it waits for confirmation. */
  checkInStamp!: string | null;
  checkInDistanceM!: number | null;
  checkInReason!: string | null;
  checkInDeviceTime!: string | null;
  needsConfirmation!: boolean;
  confirmedAt!: string | null;
  checkOutReason!: string | null;
  /** IN: at work now. OUT: has left for the day. NONE: has not checked in. */
  state!: string;
}
export class StaffPresenceListDto {
  date!: string;
  items!: StaffPresenceDto[];
}
