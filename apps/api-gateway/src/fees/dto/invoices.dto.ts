import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';
import { MONEY } from './fees.dto.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const PAYMENT_METHODS = ['CASH', 'CHEQUE', 'BANK_TRANSFER', 'UPI', 'OTHER'] as const;
export const INVOICE_STATES = ['ALL', 'UNPAID', 'PAID', 'OVERDUE'] as const;
export const MAX_INVOICES_PER_RUN = 1000;

export class PaymentIdParamDto {
  @IsString() @Matches(UUID) id!: string;
}

export class PaymentReceiptDto {
  id!: string;
  number!: string;
  cancelled!: boolean;
}
export class PaymentDto {
  id!: string;
  amountMinor!: string;
  method!: string;
  reference!: string | null;
  paidOn!: string;
  /** Set when the payment was taken back; it stays on the record. */
  reversedAt!: string | null;
  reversalReason!: string | null;
  recordedBy!: { id: string; name: string };
  /** The receipt made with this payment (every recorded payment has one; it is cancelled if the payment is reversed). */
  receipt!: PaymentReceiptDto | null;
}
export class InvoiceSummaryDto {
  id!: string;
  title!: string;
  student!: { id: string; enrollmentId: string; name: string };
  academicYear!: { id: string; name: string } | null;
  dueDate!: string;
  grossMinor!: string | null;
  discountMinor!: string | null;
  /** Due after concessions, paise as a string. */
  amountMinor!: string;
  paidMinor!: string;
  outstandingMinor!: string;
  /** PAID, OVERDUE (unpaid and past its due date), PARTIAL (part-paid, not yet due) or PENDING. */
  status!: string;
}
export class InvoiceDto extends InvoiceSummaryDto {
  payments!: PaymentDto[];
}
export class InvoiceTotalsDto {
  count!: number;
  amountMinor!: string;
  paidMinor!: string;
  outstandingMinor!: string;
}
export class InvoiceListDto {
  items!: InvoiceSummaryDto[];
  total!: number;
  page!: number;
  pageSize!: number;
  /** Over everything the filter matches, not just this page. */
  totals!: InvoiceTotalsDto;
}

export class ListInvoicesQueryDto {
  @IsOptional() @Matches(UUID) studentId?: string;
  @IsOptional() @Matches(UUID) academicYearId?: string;
  @IsOptional() @IsIn(INVOICE_STATES) state?: string;
  @IsOptional() @Matches(DATE) dueFrom?: string;
  @IsOptional() @Matches(DATE) dueTo?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

export class GenerateInvoicesDto {
  /** Bill every instalment due on or before this date (for example the end of next month). Instalments already billed are left alone. */
  @Matches(DATE) dueOnOrBefore!: string;
  /** Defaults to the active academic year. */
  @IsOptional() @Matches(UUID) academicYearId?: string;
  /** Whose invoices: one student, one class, one class level, or (leave all out) every placed student of the year. */
  @IsOptional() @Matches(UUID) studentId?: string;
  @IsOptional() @Matches(UUID) classroomId?: string;
  @IsOptional() @Matches(UUID) gradeLevelId?: string;
  /** Count what would be made and write nothing. */
  @IsOptional() @IsBoolean() dryRun?: boolean;
}
export class SampleInvoiceDto {
  student!: string;
  title!: string;
  dueDate!: string;
  amountMinor!: string;
}
export class GenerateResultDto {
  dryRun!: boolean;
  academicYear!: { id: string; name: string };
  /** Students looked at. */
  students!: number;
  /** Invoices made (or, in a dry run, that would be made). */
  created!: number;
  /** Instalments that already had an invoice. */
  alreadyInvoiced!: number;
  /** Instalments left out because the student's concessions leave nothing to pay. */
  fullyWaived!: number;
  /** Students whose class level has no fee structure for the year. */
  studentsWithoutStructure!: number;
  /** True when the run stopped at the limit; run it again (it carries on where it left off). */
  truncated!: boolean;
  /** The first few invoices (in a dry run, the first few that would be made). */
  sample!: SampleInvoiceDto[];
}

export class CreateInvoiceDto {
  @Matches(UUID) studentId!: string;
  @Transform(trim) @IsString() @Length(1, 120) title!: string;
  @IsString() @Matches(MONEY) amountMinor!: string;
  @Matches(DATE) dueDate!: string;
}

export class RecordPaymentDto {
  @IsString() @Matches(MONEY) amountMinor!: string;
  @IsIn(PAYMENT_METHODS) method!: string;
  /** Cheque number, bank or UPI reference. */
  @IsOptional() @Transform(trim) @IsString() @Length(1, 80) reference?: string;
  /** Defaults to today. */
  @IsOptional() @Matches(DATE) paidOn?: string;
}
export class ReversePaymentDto {
  @Transform(trim) @IsString() @Length(3, 200) reason!: string;
}

export class OutstandingQueryDto {
  /** The date to age from; defaults to today. */
  @IsOptional() @Matches(DATE) asOf?: string;
}
export class AgeingBandDto {
  /** NOT_DUE, DAYS_1_30, DAYS_31_60, DAYS_61_90 or DAYS_OVER_90. */
  band!: string;
  count!: number;
  amountMinor!: string;
  paidMinor!: string;
  outstandingMinor!: string;
}
export class OutstandingDto {
  asOf!: string;
  bands!: AgeingBandDto[];
  totals!: InvoiceTotalsDto;
}
export class StatementDto {
  student!: { id: string; enrollmentId: string; name: string };
  invoices!: InvoiceSummaryDto[];
  totals!: InvoiceTotalsDto;
}
export class StatementQueryDto {
  @IsOptional() @Matches(UUID) academicYearId?: string;
}

// ---- receipts (P2-7c) ----
export class ListReceiptsQueryDto {
  @IsOptional() @Matches(UUID) studentId?: string;
  @IsOptional() @Matches(UUID) academicYearId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}
export class ReceiptPdfQueryDto {
  /** The language of the labels (an explicit choice, never guessed). Defaults to the school's language. */
  @IsOptional() @IsString() @Matches(/^[a-z]{2,3}$/) lang?: string;
}
export class ReceiptSummaryDto {
  id!: string;
  /** For example `R-2027-2028-00012`. */
  number!: string;
  /** The day the fee was paid. */
  paidOn!: string;
  /** When the receipt was made. */
  issuedAt!: string;
  cancelled!: boolean;
  amountMinor!: string;
  student!: { id: string; enrollmentId: string; name: string };
  invoice!: { id: string; title: string };
}
export class ReceiptListDto {
  items!: ReceiptSummaryDto[];
  total!: number;
  page!: number;
  pageSize!: number;
  /** Over everything the filter matches. */
  totalAmountMinor!: string;
}
export class ReceiptDto extends ReceiptSummaryDto {
  cancelReason!: string | null;
  academicYear!: { id: string; name: string };
  school!: { name: string; address: string | null; phone: string | null; email: string | null; logoKey: string | null; language: string };
  className!: string | null;
  method!: string;
  reference!: string | null;
  /** Still owed on the invoice after this payment. */
  balanceAfterMinor!: string;
  receivedBy!: string;
}
