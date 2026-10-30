import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export const STUDENT_LEAVE_STATUSES = ['PENDING', 'APPROVED', 'DECLINED', 'CANCELLED'] as const;

export class IdParamDto {
  @IsString() @Matches(UUID) id!: string;
}

export class ListStudentLeaveQueryDto {
  @IsOptional() @IsIn([...STUDENT_LEAVE_STATUSES]) status?: string;
}

/** A parent asks leave for their own child. The school and the parent come from the token, never from here. */
export class CreateStudentLeaveDto {
  @IsString() @Matches(UUID) studentId!: string;
  /** The device's own id for the request, so sending it twice is one request. */
  @IsString() @Matches(/^[A-Za-z0-9_-]{1,64}$/) clientId!: string;
  @IsString() @Matches(DATE) startDate!: string;
  @IsString() @Matches(DATE) endDate!: string;
  /** MORNING or AFTERNOON for half a day (then both dates are the same day). */
  @IsOptional() @IsIn(['MORNING', 'AFTERNOON']) half?: string;
  @Transform(trim) @IsString() @Length(1, 300) reason!: string;
}

export class DecideStudentLeaveDto {
  /** Why, for the parent (optional). */
  @IsOptional() @Transform(trim) @IsString() @Length(1, 300) note?: string;
}

export class StudentLeaveDto {
  id!: string;
  student!: { id: string; name: string; enrollmentId: string; className: string | null };
  startDate!: string;
  endDate!: string;
  half!: string | null;
  reason!: string;
  status!: string;
  requestedBy!: { id: string; name: string };
  decision!: { at: string | null; by: string | null; note: string | null } | null;
  createdAt!: string;
  updatedAt!: string;
}

export class StudentLeaveListDto {
  items!: StudentLeaveDto[];
}
