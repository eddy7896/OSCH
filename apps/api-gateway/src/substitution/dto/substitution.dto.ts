import { IsString, Matches, IsOptional } from 'class-validator';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class IdParamDto {
  @IsString() @Matches(UUID) id!: string;
}
export class RangeQueryDto {
  /** Defaults to today. */
  @IsOptional() @Matches(DATE) from?: string;
  /** Defaults to 13 days after `from`; at most 62 days. */
  @IsOptional() @Matches(DATE) to?: string;
}
export class SuggestionsQueryDto {
  @IsString() @Matches(UUID) entryId!: string;
  @Matches(DATE) date!: string;
}
export class AssignDto {
  @IsString() @Matches(UUID) entryId!: string;
  @Matches(DATE) date!: string;
  @IsString() @Matches(UUID) substituteStaffId!: string;
}

export class StaffRefDto {
  id!: string;
  employeeId!: string;
  name!: string;
}
export class PeriodRefDto {
  id!: string;
  label!: string;
  startTime!: string;
  endTime!: string;
}
export class ClassRefDto {
  id!: string;
  name!: string;
}
export class SubjectRefDto {
  id!: string;
  name!: string;
  code!: string;
}
export class SlotDto {
  entryId!: string;
  day!: string;
  period!: PeriodRefDto;
  class!: ClassRefDto;
  subject!: SubjectRefDto;
}
export class CoverDto {
  id!: string;
  substitute!: StaffRefDto;
}
export class NeedDto {
  date!: string;
  leaveRequestId!: string;
  absent!: StaffRefDto;
  slot!: SlotDto;
  /** Null until the Academic admin decides. Nothing is assigned automatically. */
  cover!: CoverDto | null;
}
export class NeedListDto {
  from!: string;
  to!: string;
  items!: NeedDto[];
}
export class CandidateDto {
  staff!: StaffRefDto;
  substitutionsThisMonth!: number;
}
export class SuggestionsDto {
  need!: NeedDto;
  /** Free in that period, not on leave, qualified for the subject; fewest substitutions this month first, then by name. */
  candidates!: CandidateDto[];
}
export class DutyDto {
  id!: string;
  date!: string;
  period!: PeriodRefDto;
  class!: ClassRefDto;
  subject!: SubjectRefDto;
  covering!: StaffRefDto;
}
export class DutyListDto {
  from!: string;
  to!: string;
  items!: DutyDto[];
}
