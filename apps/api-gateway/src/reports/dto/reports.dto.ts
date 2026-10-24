import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const EXPORT_FORMATS = ['csv', 'pdf'] as const;

class PagedQueryDto {
  /** Page of the detail rows (the summary is always over everything). */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

export class CollectionsQueryDto extends PagedQueryDto {
  /** First day, inclusive (the date the money was taken, not the day it was recorded). Defaults to the first of this month. */
  @IsOptional() @Matches(DATE) from?: string;
  /** Last day, inclusive. Defaults to today. At most 366 days from `from`. */
  @IsOptional() @Matches(DATE) to?: string;
}
export class CollectionsExportQueryDto {
  @IsOptional() @Matches(DATE) from?: string;
  @IsOptional() @Matches(DATE) to?: string;
  @IsIn(EXPORT_FORMATS) format!: string;
  /** The language of the labels (an explicit choice, never guessed). Defaults to the school's language. */
  @IsOptional() @Matches(/^[a-z]{2,3}$/) lang?: string;
}

export class DuesQueryDto extends PagedQueryDto {
  /** Unpaid invoices due on or before this date; defaults to today. */
  @IsOptional() @Matches(DATE) asOf?: string;
  @IsOptional() @Matches(UUID) academicYearId?: string;
}
export class DuesExportQueryDto {
  @IsOptional() @Matches(DATE) asOf?: string;
  @IsOptional() @Matches(UUID) academicYearId?: string;
  @IsIn(EXPORT_FORMATS) format!: string;
  @IsOptional() @Matches(/^[a-z]{2,3}$/) lang?: string;
}

export class PayrollSummaryQueryDto {
  /** The calendar year of the pay months; defaults to this year. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(2000) @Max(2200) year?: number;
}
export class PayrollSummaryExportQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(2000) @Max(2200) year?: number;
  @IsIn(EXPORT_FORMATS) format!: string;
  @IsOptional() @Matches(/^[a-z]{2,3}$/) lang?: string;
}

// ---- collections
export class CollectionRowDto {
  paymentId!: string;
  paidOn!: string;
  /** Null only for a payment that predates receipts. */
  receiptNumber!: string | null;
  student!: { id: string; enrollmentId: string; name: string };
  invoice!: { id: string; title: string };
  method!: string;
  reference!: string | null;
  amountMinor!: string;
  /** Taken back; a reversed payment is listed but is not in the collected totals. */
  reversed!: boolean;
  recordedBy!: string;
}
export class MethodTotalDto {
  method!: string;
  count!: number;
  amountMinor!: string;
}
export class DayTotalDto {
  date!: string;
  count!: number;
  amountMinor!: string;
}
export class CollectionsReportDto {
  from!: string;
  to!: string;
  /** False when the actor may see the totals but not who paid (Management): `items` is then empty. */
  detail!: boolean;
  /** Standing payments. */
  count!: number;
  collectedMinor!: string;
  reversedMinor!: string;
  byMethod!: MethodTotalDto[];
  byDay!: DayTotalDto[];
  items!: CollectionRowDto[];
  /** Payments in the window, reversed ones included. */
  total!: number;
  page!: number;
  pageSize!: number;
}

// ---- dues
export class DueRowDto {
  invoiceId!: string;
  student!: { id: string; enrollmentId: string; name: string };
  title!: string;
  dueDate!: string;
  amountMinor!: string;
  paidMinor!: string;
  outstandingMinor!: string;
  /** Days past the due date; 0 when it falls due on the report date. */
  daysOverdue!: number;
  /** DUE_TODAY, DAYS_1_30, DAYS_31_60, DAYS_61_90 or DAYS_OVER_90. */
  band!: string;
}
export class DueBandDto {
  band!: string;
  count!: number;
  outstandingMinor!: string;
}
export class DuesReportDto {
  asOf!: string;
  detail!: boolean;
  count!: number;
  amountMinor!: string;
  paidMinor!: string;
  outstandingMinor!: string;
  bands!: DueBandDto[];
  items!: DueRowDto[];
  total!: number;
  page!: number;
  pageSize!: number;
}

// ---- payroll summary
export class PayrollMonthDto {
  runId!: string;
  month!: number;
  /** APPROVED or PAID (a draft is a working paper and is not in the summary). */
  status!: string;
  paidOn!: string | null;
  headcount!: number;
  grossMinor!: string;
  deductionsMinor!: string;
  netMinor!: string;
}
export class DepartmentTotalDto {
  /** Null for people with no department. */
  department!: string | null;
  headcount!: number;
  grossMinor!: string;
  deductionsMinor!: string;
  netMinor!: string;
}
export class PayrollSummaryDto {
  year!: number;
  months!: PayrollMonthDto[];
  byDepartment!: DepartmentTotalDto[];
  grossMinor!: string;
  deductionsMinor!: string;
  netMinor!: string;
}
