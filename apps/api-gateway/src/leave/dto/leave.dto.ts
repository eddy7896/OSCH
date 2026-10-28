import { UpdatedSince } from '../../common/updated-since.js';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';
import { HALVES, STATUSES } from '../leave-rules.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAYS = /^\d{1,3}(\.[05])?$/;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class IdParamDto {
  @IsString() @Matches(UUID) id!: string;
}
export class BalanceParamDto {
  @IsString() @Matches(UUID) staffId!: string;
  @IsString() @Matches(UUID) typeId!: string;
}
export class CreateTypeDto {
  @Transform(trim) @IsString() @Length(1, 40) name!: string;
  /** Paid leave takes days from a yearly allowance; unpaid leave takes nothing from it and raises a payroll deduction proposal. */
  @IsBoolean() paid!: boolean;
  /** Days a person may take of a paid type each year, whole or half: `12`, `7.5`. Ignored for unpaid. */
  @IsOptional() @IsString() @Matches(DAYS) quotaDays?: string;
}
export class UpdateTypeDto {
  @IsOptional() @Transform(trim) @IsString() @Length(1, 40) name?: string;
  @IsOptional() @IsString() @Matches(DAYS) quotaDays?: string;
}
export class BalancesQueryDto {
  @IsOptional() @Matches(UUID) staffId?: string;
  @IsOptional() @Matches(UUID) academicYearId?: string;
}
export class SetBalanceDto {
  /** What this person may take of this type in the year (not what is left; the days already taken stay taken). */
  @IsString() @Matches(DAYS) allowedDays!: string;
  @IsOptional() @Matches(UUID) academicYearId?: string;
}
export class CreateRequestDto {
  @IsString() @Matches(UUID) leaveTypeId!: string;
  @Matches(DATE) startDate!: string;
  @Matches(DATE) endDate!: string;
  /** For half a day of leave: the start and end date are then the same day. */
  @IsOptional() @IsIn([...HALVES]) half?: string;
  @IsOptional() @Transform(trim) @IsString() @Length(1, 300) reason?: string;
  /** The device's own id for this request. Sending the same one again returns the first request instead of making another. */
  @IsOptional() @IsString() @Matches(/^[A-Za-z0-9_-]{1,64}$/) clientId?: string;
}
export class ListRequestsQueryDto {
  /** Only requests created or decided at or after this moment (the `next` of an earlier answer). */
  @UpdatedSince() updatedSince?: string;
  @IsOptional() @IsIn([...STATUSES]) status?: string;
  @IsOptional() @Matches(UUID) staffId?: string;
  @IsOptional() @Matches(DATE) from?: string;
  @IsOptional() @Matches(DATE) to?: string;
}
export class RejectDto {
  @IsOptional() @Transform(trim) @IsString() @Length(1, 300) note?: string;
}

export class LeaveTypeDto {
  id!: string;
  name!: string;
  paid!: boolean;
  quotaDays!: string;
}
export class LeaveTypeListDto {
  items!: LeaveTypeDto[];
}
export class StaffRefDto {
  id!: string;
  employeeId!: string;
  name!: string;
}
export class TypeRefDto {
  id!: string;
  name!: string;
  paid!: boolean;
}
export class BalanceDto {
  staffId!: string;
  academicYearId!: string;
  type!: TypeRefDto;
  allowedDays!: string;
  remainingDays!: string;
  /** False while the person has not asked for this type yet: the figures are the type's yearly allowance. */
  recorded!: boolean;
}
export class BalanceListDto {
  items!: BalanceDto[];
}
export class DecisionDto {
  by!: string;
  at!: string;
  note!: string | null;
}
export class LeaveRequestDto {
  id!: string;
  staff!: StaffRefDto;
  type!: TypeRefDto;
  startDate!: string;
  endDate!: string;
  half!: string | null;
  days!: string;
  reason!: string | null;
  status!: string;
  decision!: DecisionDto | null;
  createdAt!: string;
}
export class LeaveRequestListDto {
  items!: LeaveRequestDto[];
  /** Ask from here next time (the server's clock); null when there is nothing to anchor to yet. */
  next!: string | null;
}
