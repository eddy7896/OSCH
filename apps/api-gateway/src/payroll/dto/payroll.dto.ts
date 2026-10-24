import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';
import { MONEY } from '../../fees/dto/fees.dto.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const LINE_KINDS = ['EARNING', 'DEDUCTION'] as const;

export class PayrollIdParamDto {
  @IsString() @Matches(UUID) id!: string;
}
export class StaffIdParamDto {
  @IsString() @Matches(UUID) staffId!: string;
}

// ---- salary structure ----
export class SalaryLineDto {
  id!: string;
  kind!: string;
  name!: string;
  /** Per month, paise as a string. */
  amountMinor!: string;
}
export class SalaryDto {
  staff!: { id: string; employeeId: string; name: string };
  lines!: SalaryLineDto[];
  grossMinor!: string;
  deductionsMinor!: string;
  netMinor!: string;
}
export class CreateSalaryLineDto {
  @IsIn(LINE_KINDS) kind!: string;
  /** For example Basic pay, House rent allowance, Advance recovery. */
  @Transform(trim) @IsString() @Length(1, 80) name!: string;
  @IsString() @Matches(MONEY) amountMinor!: string;
}
export class UpdateSalaryLineDto {
  @IsOptional() @IsIn(LINE_KINDS) kind?: string;
  @IsOptional() @Transform(trim) @IsString() @Length(1, 80) name?: string;
  @IsOptional() @IsString() @Matches(MONEY) amountMinor?: string;
}

// ---- runs and payslips ----
export class PayslipLineDto {
  id!: string;
  kind!: string;
  name!: string;
  amountMinor!: string;
  /** Added by hand to this run, rather than copied from the salary lines. */
  manual!: boolean;
}
export class PayslipDto {
  id!: string;
  staff!: { id: string; employeeId: string; name: string; department: string | null; designation: string | null };
  lines!: PayslipLineDto[];
  grossMinor!: string;
  deductionsMinor!: string;
  netMinor!: string;
}
export class PersonRefDto {
  id!: string;
  name!: string;
}
export class RunTotalsDto {
  payslips!: number;
  grossMinor!: string;
  deductionsMinor!: string;
  netMinor!: string;
}
export class PayrollRunSummaryDto {
  id!: string;
  year!: number;
  month!: number;
  /** DRAFT, APPROVED (by the Principal) or PAID (by the Bursar). */
  status!: string;
  preparedBy!: PersonRefDto;
  approvedBy!: PersonRefDto | null;
  approvedAt!: string | null;
  paidBy!: PersonRefDto | null;
  paidOn!: string | null;
  paymentReference!: string | null;
}
export class PayrollRunListDto {
  items!: PayrollRunSummaryDto[];
}
export class PayrollRunDto extends PayrollRunSummaryDto {
  totals!: RunTotalsDto;
  payslips!: PayslipDto[];
}
export class CreatePayrollRunDto {
  @IsInt() @Min(2000) @Max(2200) year!: number;
  @IsInt() @Min(1) @Max(12) month!: number;
}
export class ListRunsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}
export class AddPayslipLineDto {
  @IsIn(LINE_KINDS) kind!: string;
  @Transform(trim) @IsString() @Length(1, 80) name!: string;
  @IsString() @Matches(MONEY) amountMinor!: string;
}
export class PayRunDto {
  /** The day the salaries were paid; defaults to today. */
  @IsOptional() @Matches(DATE) paidOn?: string;
  /** Bank batch or transfer reference. */
  @IsOptional() @Transform(trim) @IsString() @Length(1, 80) reference?: string;
}
export class PayslipPdfQueryDto {
  @IsOptional() @IsString() @Matches(/^[a-z]{2,3}$/) lang?: string;
}
