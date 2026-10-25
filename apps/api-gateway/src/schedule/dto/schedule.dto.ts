import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';
import { DAYS, TEMPLATES } from '../schedule-rules.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class PeriodIdParamDto {
  @IsString() @Matches(UUID) id!: string;
}

export class PeriodDto {
  id!: string;
  label!: string;
  /** `HH:MM`, 24 hour. */
  startTime!: string;
  endTime!: string;
  /** A break or lunch: nothing is taught in it. */
  isBreak!: boolean;
  /** Teaching periods are numbered 1, 2, 3 ... in time order; null for a break. */
  number!: number | null;
}
export class ScheduleDto {
  /** The days the school works, in week order (`MON` .. `SUN`). */
  workingDays!: string[];
  /** In time order. */
  periods!: PeriodDto[];
}

export class WorkingDaysDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(7) @IsIn([...DAYS], { each: true }) days!: string[];
}
export class CreatePeriodDto {
  @Transform(trim) @IsString() @Length(1, 40) label!: string;
  @Matches(HHMM) startTime!: string;
  @Matches(HHMM) endTime!: string;
  @IsOptional() @IsBoolean() isBreak?: boolean;
}
export class UpdatePeriodDto {
  @IsOptional() @Transform(trim) @IsString() @Length(1, 40) label?: string;
  @IsOptional() @Matches(HHMM) startTime?: string;
  @IsOptional() @Matches(HHMM) endTime?: string;
  @IsOptional() @IsBoolean() isBreak?: boolean;
}
export class ApplyTemplateDto {
  /** STANDARD (8 periods, a short break and lunch) or SHORT_DAY (5 periods and a break). Only when the school has no periods yet. */
  @IsIn([...TEMPLATES]) template!: string;
}
