import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { LOCALES, getMessages, matchLanguageTag } from '@oruschools/i18n';
import { authorize } from '@oruschools/rbac';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import { period, totalsOf } from '../payroll/payroll-rules.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import type {
  CollectionRowDto, CollectionsReportDto, DepartmentTotalDto, DueBandDto, DueRowDto, DuesReportDto, PayrollMonthDto, PayrollSummaryDto,
} from './dto/reports.dto.js';
import { DUE_BANDS, MAX_ROWS, bandOf, daysBetween, rangeProblem, realDate, summarisePayments, type DueBand } from './report-rules.js';
import { toCsv, type Column, type ReportTable } from './table.js';
import { renderTablePdf } from './table-pdf.js';

const today = () => new Date().toISOString().slice(0, 10);
const LANGUAGES = new Set<string>(LOCALES.map((l) => l.code));
const PAGE = 500;
const invalid = (field: string, rule: string) => new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field, rule }]);
const dmy = (iso: string): string => `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}`;
const METHOD_KEY: Record<string, string> = { CASH: 'paymentMethodCash', CHEQUE: 'paymentMethodCheque', BANK_TRANSFER: 'paymentMethodBankTransfer', UPI: 'paymentMethodUpi', OTHER: 'paymentMethodOther' };

type Person = { id: string; displayName?: string | null; email: string };
type PaymentRow = {
  id: string; amountMinor: string; method: string; reference?: string | null; paidOn: string; reversedAt?: string | null;
  student: { id: string; enrollmentId: string; firstName: string; lastName: string }; invoice: { id: string; title: string }; recordedBy: Person; receipt?: { number: string } | null;
};
type DueRow = { id: string; title: string; amountMinor: string; paidMinor: string; dueDate: string; student: { id: string; enrollmentId: string; firstName: string; lastName: string } };

export type ExportFormat = 'csv' | 'pdf';
export interface ExportFile { bytes: Buffer; fileName: string; type: string }

/**
 * Finance and payroll reports (P2-9). Data Connect has no group-by, so each report reads its rows (paged, capped at MAX_ROWS) and adds them up here in
 * bigint paise. The JSON, the CSV and the PDF of a report are made from the same rows, so they cannot disagree. Management may see the totals of a
 * finance report but not who paid or who owes (the role matrix gives it reports only, not `finance`), so the rows are left out for it.
 */
@Injectable()
export class ReportsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  private canSeeRows(t: TenantContext): boolean {
    const d = authorize({ schoolRole: t.schoolRole }, 'finance', 'read');
    return d.allowed && d.scope === 'school';
  }

  /** Detail rows are for roles that hold `finance`; an export is nothing but detail rows. */
  private requireRows(t: TenantContext): void {
    if (!this.canSeeRows(t)) throw new ForbiddenException();
  }

  private async language(t: TenantContext, lang?: string): Promise<{ school: string; code: string; label: (key: string, fallback: string) => string }> {
    if (lang !== undefined && !LANGUAGES.has(lang)) throw invalid('lang', 'knownLanguage');
    const s = (await this.db.getSchoolProfile({ schoolId: t.schoolId })).data.school;
    const code = matchLanguageTag(lang ?? s?.defaultLanguage ?? 'en') ?? 'en';
    const msgs = getMessages(code), en = getMessages('en');
    return { school: s?.name ?? '', code, label: (key, fallback) => msgs[key] ?? en[key] ?? fallback };
  }

  private async file(table: ReportTable, code: string, format: ExportFormat, base: string): Promise<ExportFile> {
    if (format === 'csv') return { bytes: Buffer.from(toCsv(table), 'utf8'), fileName: `${base}.csv`, type: 'text/csv; charset=utf-8' };
    return { bytes: await renderTablePdf(table, code), fileName: `${base}.pdf`, type: 'application/pdf' };
  }

  // ---------------------------------------------------------------- collections (the day book)
  private window(from?: string, to?: string): { from: string; to: string } {
    const end = to ?? today();
    const start = from ?? `${end.slice(0, 8)}01`;
    const problem = rangeProblem(start, end);
    if (problem) throw invalid(problem === 'realDate' ? 'from' : problem === 'beforeFrom' ? 'to' : 'from', problem);
    return { from: start, to: end };
  }

  private async paymentsIn(t: TenantContext, from: string, to: string): Promise<PaymentRow[]> {
    const n = Number((await this.db.countPaymentsInRange({ schoolId: t.schoolId, from, to })).data.payments[0]?._count ?? 0);
    if (n > MAX_ROWS) throw invalid('to', 'tooManyRows');
    const out: PaymentRow[] = [];
    for (let offset = 0; offset < n; offset += PAGE) out.push(...((await this.db.paymentsInRange({ schoolId: t.schoolId, from, to, limit: PAGE, offset })).data.payments as unknown as PaymentRow[]));
    return out;
  }

  private collectionRow(r: PaymentRow): CollectionRowDto {
    return {
      paymentId: dashed(r.id), paidOn: r.paidOn, receiptNumber: r.receipt?.number ?? null, student: { id: dashed(r.student.id), enrollmentId: r.student.enrollmentId, name: `${r.student.firstName} ${r.student.lastName}` },
      invoice: { id: dashed(r.invoice.id), title: r.invoice.title }, method: r.method, reference: r.reference ?? null, amountMinor: String(r.amountMinor), reversed: !!r.reversedAt, recordedBy: r.recordedBy.displayName ?? r.recordedBy.email,
    };
  }

  async collections(t: TenantContext, q: { from?: string; to?: string; page?: number; pageSize?: number }): Promise<CollectionsReportDto> {
    const { from, to } = this.window(q.from, q.to);
    const rows = await this.paymentsIn(t, from, to);
    const sum = summarisePayments(rows.map((r) => ({ paidOn: r.paidOn, method: r.method, amountMinor: r.amountMinor, reversed: !!r.reversedAt })));
    const page = q.page ?? 1, pageSize = q.pageSize ?? 25, detail = this.canSeeRows(t);
    return {
      from, to, detail, count: sum.count, collectedMinor: String(sum.collectedMinor), reversedMinor: String(sum.reversedMinor),
      byMethod: sum.byMethod.map((m) => ({ method: m.method, count: m.count, amountMinor: String(m.amountMinor) })), byDay: sum.byDay.map((d) => ({ date: d.date, count: d.count, amountMinor: String(d.amountMinor) })),
      items: detail ? rows.slice((page - 1) * pageSize, page * pageSize).map((r) => this.collectionRow(r)) : [], total: rows.length, page, pageSize,
    };
  }

  async collectionsFile(t: TenantContext, q: { from?: string; to?: string; format: string; lang?: string }): Promise<ExportFile> {
    this.requireRows(t);
    const { from, to } = this.window(q.from, q.to);
    const [lng, rows] = await Promise.all([this.language(t, q.lang), this.paymentsIn(t, from, to)]);
    const l = lng.label;
    const columns: Column[] = [
      { key: 'date', label: l('receiptDate', 'Date'), kind: 'date', weight: 1.1 }, { key: 'receipt', label: l('receiptNumber', 'Receipt no.'), kind: 'text', weight: 1.5 },
      { key: 'student', label: l('receiptStudent', 'Student'), kind: 'text', weight: 2.1 }, { key: 'enrolment', label: l('receiptEnrollment', 'Enrolment no.'), kind: 'text', weight: 1.3 },
      { key: 'for', label: l('receiptFor', 'Payment for'), kind: 'text', weight: 2 }, { key: 'method', label: l('receiptMethod', 'Paid by'), kind: 'text', weight: 1.2 },
      { key: 'reference', label: l('receiptReference', 'Reference'), kind: 'text', weight: 1.4 }, { key: 'amount', label: l('receiptAmountPaid', 'Amount paid'), kind: 'money', weight: 1.4 },
      { key: 'status', label: l('reportStatus', 'Status'), kind: 'text', weight: 1.1 },
    ];
    const sum = summarisePayments(rows.map((r) => ({ paidOn: r.paidOn, method: r.method, amountMinor: r.amountMinor, reversed: !!r.reversedAt })));
    const table: ReportTable = {
      title: l('reportCollectionsTitle', 'Fee collections'), subtitle: [lng.school, `${dmy(from)} – ${dmy(to)}`], columns,
      rows: rows.map((r) => [r.paidOn, r.receipt?.number ?? '', `${r.student.firstName} ${r.student.lastName}`, r.student.enrollmentId, r.invoice.title, l(METHOD_KEY[r.method] ?? '', r.method), r.reference ?? '', String(r.amountMinor), r.reversedAt ? l('reportReversed', 'Reversed') : '']),
      totals: [['', '', '', '', '', '', l('reportTotal', 'Total'), String(sum.collectedMinor), '']],
    };
    return this.file(table, lng.code, q.format as ExportFormat, `collections-${from}_${to}`);
  }

  // ---------------------------------------------------------------- dues
  private async duesIn(t: TenantContext, asOf: string, academicYearId?: string): Promise<DueRow[]> {
    const filter = { schoolId: t.schoolId, dueOnOrBefore: asOf, ...(academicYearId ? { academicYearId } : {}) };
    const n = Number((await this.db.countDuesInvoices(filter)).data.invoices[0]?._count ?? 0);
    if (n > MAX_ROWS) throw invalid('asOf', 'tooManyRows');
    const out: DueRow[] = [];
    for (let offset = 0; offset < n; offset += PAGE) out.push(...((await this.db.duesInvoices({ ...filter, limit: PAGE, offset })).data.invoices as unknown as DueRow[]));
    return out;
  }

  private dueRow(r: DueRow, asOf: string): DueRowDto {
    const days = Math.max(0, daysBetween(r.dueDate, asOf));
    const outstanding = BigInt(r.amountMinor) - BigInt(r.paidMinor);
    return {
      invoiceId: dashed(r.id), student: { id: dashed(r.student.id), enrollmentId: r.student.enrollmentId, name: `${r.student.firstName} ${r.student.lastName}` }, title: r.title, dueDate: r.dueDate,
      amountMinor: String(r.amountMinor), paidMinor: String(r.paidMinor), outstandingMinor: String(outstanding), daysOverdue: days, band: bandOf(days),
    };
  }

  private asOf(asOf?: string): string {
    const d = asOf ?? today();
    if (!realDate(d)) throw invalid('asOf', 'realDate');
    return d;
  }

  async dues(t: TenantContext, q: { asOf?: string; academicYearId?: string; page?: number; pageSize?: number }): Promise<DuesReportDto> {
    const asOf = this.asOf(q.asOf);
    const all = (await this.duesIn(t, asOf, q.academicYearId)).map((r) => this.dueRow(r, asOf)).filter((r) => BigInt(r.outstandingMinor) > 0n);
    let amount = 0n, paid = 0n;
    const bands = new Map<DueBand, { count: number; outstanding: bigint }>(DUE_BANDS.map((b) => [b, { count: 0, outstanding: 0n }]));
    for (const r of all) {
      amount += BigInt(r.amountMinor); paid += BigInt(r.paidMinor);
      const b = bands.get(r.band as DueBand)!;
      b.count++; b.outstanding += BigInt(r.outstandingMinor);
    }
    const page = q.page ?? 1, pageSize = q.pageSize ?? 25, detail = this.canSeeRows(t);
    const out: DueBandDto[] = DUE_BANDS.map((b) => ({ band: b, count: bands.get(b)!.count, outstandingMinor: String(bands.get(b)!.outstanding) }));
    return { asOf, detail, count: all.length, amountMinor: String(amount), paidMinor: String(paid), outstandingMinor: String(amount - paid), bands: out, items: detail ? all.slice((page - 1) * pageSize, page * pageSize) : [], total: all.length, page, pageSize };
  }

  async duesFile(t: TenantContext, q: { asOf?: string; academicYearId?: string; format: string; lang?: string }): Promise<ExportFile> {
    this.requireRows(t);
    const asOf = this.asOf(q.asOf);
    const [lng, raw] = await Promise.all([this.language(t, q.lang), this.duesIn(t, asOf, q.academicYearId)]);
    const l = lng.label;
    const rows = raw.map((r) => this.dueRow(r, asOf)).filter((r) => BigInt(r.outstandingMinor) > 0n);
    let amount = 0n, paid = 0n;
    for (const r of rows) { amount += BigInt(r.amountMinor); paid += BigInt(r.paidMinor); }
    const columns: Column[] = [
      { key: 'student', label: l('receiptStudent', 'Student'), kind: 'text', weight: 2.2 }, { key: 'enrolment', label: l('receiptEnrollment', 'Enrolment no.'), kind: 'text', weight: 1.4 },
      { key: 'invoice', label: l('receiptFor', 'Payment for'), kind: 'text', weight: 2.2 }, { key: 'due', label: l('reportDueDate', 'Due date'), kind: 'date', weight: 1.2 },
      { key: 'amount', label: l('reportAmountDue', 'Amount due'), kind: 'money', weight: 1.4 }, { key: 'paid', label: l('receiptAmountPaid', 'Amount paid'), kind: 'money', weight: 1.4 },
      { key: 'outstanding', label: l('reportOutstanding', 'Outstanding'), kind: 'money', weight: 1.4 }, { key: 'days', label: l('reportDaysOverdue', 'Days overdue'), kind: 'count', weight: 1.1 },
    ];
    const table: ReportTable = {
      title: l('reportDuesTitle', 'Fees outstanding'), subtitle: [lng.school, `${l('reportAsOf', 'As of')} ${dmy(asOf)}`], columns,
      rows: rows.map((r) => [r.student.name, r.student.enrollmentId, r.title, r.dueDate, r.amountMinor, r.paidMinor, r.outstandingMinor, String(r.daysOverdue)]),
      totals: [['', '', '', l('reportTotal', 'Total'), String(amount), String(paid), String(amount - paid), '']],
    };
    return this.file(table, lng.code, q.format as ExportFormat, `fees-outstanding-${asOf}`);
  }

  // ---------------------------------------------------------------- payroll summary
  async payrollSummary(t: TenantContext, yearArg?: number): Promise<PayrollSummaryDto> {
    const year = yearArg ?? new Date().getUTCFullYear();
    const runs: Array<{ id: string; month: number; status: string; paidOn?: string | null }> = [];
    for (let offset = 0; ; offset += 100) {
      const page = (await this.db.listPayrollRuns({ schoolId: t.schoolId, limit: 100, offset })).data.payrollRuns;
      for (const r of page) if (r.year === year && r.status !== 'DRAFT') runs.push({ id: r.id, month: r.month, status: r.status, paidOn: r.paidOn });
      if (page.length < 100 || (page.at(-1)?.year ?? year) < year) break; // newest year first
    }
    runs.sort((a, b) => a.month - b.month);
    const details = await Promise.all(runs.map(async (r) => (await this.db.getPayrollRun({ schoolId: t.schoolId, id: dashed(r.id) })).data.payrollRuns[0]!));
    const months: PayrollMonthDto[] = [];
    const dept = new Map<string, { department: string | null; staff: Set<string>; gross: bigint; deductions: bigint }>();
    let gross = 0n, deductions = 0n;
    runs.forEach((r, i) => {
      let g = 0n, d = 0n;
      for (const p of details[i]!.payslips) {
        const tot = totalsOf(p.lines);
        g += tot.grossMinor; d += tot.deductionsMinor;
        const name = p.staff.department?.trim() || null;
        const e = dept.get(name ?? '') ?? dept.set(name ?? '', { department: name, staff: new Set(), gross: 0n, deductions: 0n }).get(name ?? '')!;
        e.staff.add(p.staff.id); e.gross += tot.grossMinor; e.deductions += tot.deductionsMinor;
      }
      gross += g; deductions += d;
      months.push({ runId: dashed(r.id), month: r.month, status: r.status, paidOn: r.paidOn ?? null, headcount: details[i]!.payslips.length, grossMinor: String(g), deductionsMinor: String(d), netMinor: String(g - d) });
    });
    const byDepartment: DepartmentTotalDto[] = [...dept.values()].sort((a, b) => (a.department ?? '￿').localeCompare(b.department ?? '￿')).map((e) => ({ department: e.department, headcount: e.staff.size, grossMinor: String(e.gross), deductionsMinor: String(e.deductions), netMinor: String(e.gross - e.deductions) }));
    return { year, months, byDepartment, grossMinor: String(gross), deductionsMinor: String(deductions), netMinor: String(gross - deductions) };
  }

  async payrollSummaryFile(t: TenantContext, q: { year?: number; format: string; lang?: string }): Promise<ExportFile> {
    const [lng, s] = await Promise.all([this.language(t, q.lang), this.payrollSummary(t, q.year)]);
    const l = lng.label;
    const columns: Column[] = [
      { key: 'month', label: l('reportMonth', 'Month'), kind: 'text', weight: 1.2 }, { key: 'status', label: l('reportStatus', 'Status'), kind: 'text', weight: 1.3 },
      { key: 'paidOn', label: l('payslipPaidOn', 'Paid on'), kind: 'date', weight: 1.2 }, { key: 'staff', label: l('reportHeadcount', 'Staff'), kind: 'count', weight: 0.9 },
      { key: 'gross', label: l('payslipGross', 'Gross pay'), kind: 'money', weight: 1.5 }, { key: 'deductions', label: l('payslipTotalDeductions', 'Total deductions'), kind: 'money', weight: 1.5 },
      { key: 'net', label: l('payslipNetPay', 'Net pay'), kind: 'money', weight: 1.5 },
    ];
    const table: ReportTable = {
      title: l('reportPayrollTitle', 'Payroll summary'), subtitle: [lng.school, `${l('reportYear', 'Year')} ${s.year}`], columns,
      rows: s.months.map((m) => [period(s.year, m.month), m.status === 'PAID' ? l('reportPaid', 'Paid') : l('reportApproved', 'Approved'), m.paidOn ?? '', String(m.headcount), m.grossMinor, m.deductionsMinor, m.netMinor]),
      totals: [[l('reportTotal', 'Total'), '', '', '', s.grossMinor, s.deductionsMinor, s.netMinor]],
    };
    return this.file(table, lng.code, q.format as ExportFormat, `payroll-summary-${s.year}`);
  }
}
