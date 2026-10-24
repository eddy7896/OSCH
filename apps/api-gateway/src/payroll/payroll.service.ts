import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, DatabaseError, type Database } from '@oruschools/database';
import { LOCALES } from '@oruschools/i18n';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import type {
  AddPayslipLineDto, CreatePayrollRunDto, CreateSalaryLineDto, PayRunDto, PayrollRunDto, PayrollRunListDto, PayrollRunSummaryDto, PayslipDto, SalaryDto, UpdateSalaryLineDto,
} from './dto/payroll.dto.js';
import { monthAllowed, negativeNet, period, totalsOf } from './payroll-rules.js';
import { renderPayslipPdf, type PayslipPdfModel } from './payslip-pdf.js';

const notFound = () => new ApiException(ErrorCode.NOT_FOUND, 404);
const conflict = (field?: string, rule?: string) => new ApiException(ErrorCode.CONFLICT, 409, field && rule ? [{ field, rule }] : undefined);
const invalid = (field: string, rule: string) => new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field, rule }]);
const realDate = (d: string) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d);
const today = () => new Date().toISOString().slice(0, 10);
const LANGUAGES = new Set<string>(LOCALES.map((l) => l.code));
const PAGE = 500;

type Person = { id: string; displayName?: string | null; email: string };
type RunRow = {
  id: string; year: number; month: number; status: string; approvedAt?: string | null; paidOn?: string | null; paymentReference?: string | null;
  preparedBy: Person; approvedBy?: Person | null; paidBy?: Person | null;
};
type StaffRef = { id: string; employeeId: string; firstName: string; lastName: string; department?: string | null; designation?: string | null };
type LineRow = { id: string; kind: string; name: string; amountMinor: string; manual?: boolean };
const person = (p: Person) => ({ id: p.id, name: p.displayName ?? p.email });
const staffName = (s: StaffRef) => `${s.firstName} ${s.lastName}`;
const str = (b: bigint) => String(b);

/**
 * Payroll (P2-8, ADR-0012): salary lines per person, monthly runs DRAFT -> APPROVED (the Principal alone) -> PAID (the Bursar alone), payslips.
 * No statutory calculation. Totals are summed from the lines every time and never stored. Approval and payment are also checked by the database
 * against the actor's role, so a mistake here cannot let the wrong person do either.
 */
@Injectable()
export class PayrollService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  // ---------------------------------------------------------------- salary structure
  private async staffRef(t: TenantContext, staffId: string): Promise<StaffRef> {
    const r = (await this.db.getStaffProfile({ schoolId: t.schoolId, id: staffId })).data.staffProfiles[0];
    if (!r) throw notFound(); // another school's staff member looks exactly like one that does not exist
    return r as unknown as StaffRef;
  }
  async salary(t: TenantContext, staffId: string): Promise<SalaryDto> {
    const s = await this.staffRef(t, staffId);
    const lines = (await this.db.listSalaryLines({ schoolId: t.schoolId, staffId: dashed(s.id) })).data.salaryLines;
    const tot = totalsOf(lines);
    return { staff: { id: dashed(s.id), employeeId: s.employeeId, name: staffName(s) }, lines: lines.map((l) => ({ id: dashed(l.id), kind: l.kind, name: l.name, amountMinor: String(l.amountMinor) })), grossMinor: str(tot.grossMinor), deductionsMinor: str(tot.deductionsMinor), netMinor: str(tot.netMinor) };
  }
  async addSalaryLine(t: TenantContext, staffId: string, dto: CreateSalaryLineDto): Promise<SalaryDto> {
    const s = await this.staffRef(t, staffId);
    try {
      await this.db.addSalaryLine({ schoolId: t.schoolId, id: randomUUID(), staffId: dashed(s.id), kind: dto.kind as never, name: dto.name, amountMinor: dto.amountMinor, actorId: t.userId, details: { employeeId: s.employeeId, kind: dto.kind, name: dto.name, amountMinor: dto.amountMinor } });
    } catch (e) {
      if (e instanceof DatabaseError && e.kind === 'CONFLICT') throw conflict('name', 'alreadyExists'); // that person already has a line with that name
      throw e;
    }
    return this.salary(t, staffId);
  }
  private async salaryLine(t: TenantContext, id: string) {
    const l = (await this.db.salaryLineById({ schoolId: t.schoolId, id })).data.salaryLines[0];
    if (!l) throw notFound();
    return l;
  }
  async updateSalaryLine(t: TenantContext, id: string, dto: UpdateSalaryLineDto): Promise<SalaryDto> {
    if (dto.kind === undefined && dto.name === undefined && dto.amountMinor === undefined) throw invalid('amountMinor', 'atLeastOneField');
    const before = await this.salaryLine(t, id);
    try {
      await this.db.updateSalaryLine({ schoolId: t.schoolId, id: dashed(before.id), ...(dto.kind ? { kind: dto.kind as never } : {}), ...(dto.name ? { name: dto.name } : {}), ...(dto.amountMinor ? { amountMinor: dto.amountMinor } : {}), actorId: t.userId, details: { name: before.name, from: String(before.amountMinor), to: dto.amountMinor } });
    } catch (e) {
      if (e instanceof DatabaseError && e.kind === 'CONFLICT') throw conflict('name', 'alreadyExists');
      throw e;
    }
    return this.salary(t, dashed(before.staff.id));
  }
  async removeSalaryLine(t: TenantContext, id: string): Promise<SalaryDto> {
    const before = await this.salaryLine(t, id);
    await this.db.removeSalaryLine({ schoolId: t.schoolId, id: dashed(before.id), actorId: t.userId, details: { name: before.name, amountMinor: String(before.amountMinor) } });
    return this.salary(t, dashed(before.staff.id));
  }

  // ---------------------------------------------------------------- runs
  private summary(r: RunRow): PayrollRunSummaryDto {
    return {
      id: dashed(r.id), year: r.year, month: r.month, status: r.status, preparedBy: person(r.preparedBy), approvedBy: r.approvedBy ? person(r.approvedBy) : null, approvedAt: r.approvedAt ?? null,
      paidBy: r.paidBy ? person(r.paidBy) : null, paidOn: r.paidOn ?? null, paymentReference: r.paymentReference ?? null,
    };
  }
  async listRuns(t: TenantContext, limit = 24): Promise<PayrollRunListDto> {
    return { items: (await this.db.listPayrollRuns({ schoolId: t.schoolId, limit, offset: 0 })).data.payrollRuns.map((r) => this.summary(r as unknown as RunRow)) };
  }
  private payslipView(p: { id: string; staff: StaffRef; lines: LineRow[] }): PayslipDto {
    const tot = totalsOf(p.lines);
    return {
      id: dashed(p.id), staff: { id: dashed(p.staff.id), employeeId: p.staff.employeeId, name: staffName(p.staff), department: p.staff.department ?? null, designation: p.staff.designation ?? null },
      lines: p.lines.map((l) => ({ id: dashed(l.id), kind: l.kind, name: l.name, amountMinor: String(l.amountMinor), manual: !!l.manual })), grossMinor: str(tot.grossMinor), deductionsMinor: str(tot.deductionsMinor), netMinor: str(tot.netMinor),
    };
  }
  private async runRow(t: TenantContext, id: string) {
    const r = (await this.db.getPayrollRun({ schoolId: t.schoolId, id })).data.payrollRuns[0];
    if (!r) throw notFound(); // another school's run looks exactly like one that does not exist
    return r as unknown as RunRow & { payslips: Array<{ id: string; staff: StaffRef; lines: LineRow[] }> };
  }
  async getRun(t: TenantContext, id: string): Promise<PayrollRunDto> {
    const r = await this.runRow(t, id);
    const slips = r.payslips.map((p) => this.payslipView(p));
    const all = r.payslips.flatMap((p) => p.lines);
    const tot = totalsOf(all);
    return { ...this.summary(r), payslips: slips, totals: { payslips: slips.length, grossMinor: str(tot.grossMinor), deductionsMinor: str(tot.deductionsMinor), netMinor: str(tot.netMinor) } };
  }

  /** Makes the month's DRAFT run with a payslip for every active staff member who has salary lines, copying those lines. All or nothing: if anything fails the draft is removed again. */
  async createRun(t: TenantContext, dto: CreatePayrollRunDto): Promise<PayrollRunDto> {
    if (!monthAllowed(dto.year, dto.month)) throw invalid('month', 'monthNotAllowed');
    const staff: Array<{ id: string; employeeId: string; lines: Array<{ kind: string; name: string; amountMinor: string }> }> = [];
    for (let offset = 0; ; offset += PAGE) {
      const page = (await this.db.staffForPayroll({ schoolId: t.schoolId, limit: PAGE, offset })).data.staffProfiles;
      staff.push(...page.filter((s) => s.lines.length > 0).map((s) => ({ id: dashed(s.id), employeeId: s.employeeId, lines: s.lines.map((l) => ({ kind: l.kind, name: l.name, amountMinor: String(l.amountMinor) })) })));
      if (page.length < PAGE) break;
    }
    if (staff.length === 0) throw invalid('month', 'noSalaryLines'); // nobody has a salary set up yet
    const runId = randomUUID();
    try {
      await this.db.createPayrollRun({ schoolId: t.schoolId, id: runId, year: dto.year, month: dto.month, actorId: t.userId, details: { period: period(dto.year, dto.month), staff: staff.length } });
    } catch (e) {
      if (e instanceof DatabaseError && e.kind === 'CONFLICT') throw conflict('month', 'runAlreadyExists');
      throw e;
    }
    try {
      const queue = [...staff];
      const worker = async () => {
        for (let s = queue.shift(); s; s = queue.shift()) {
          const slip = randomUUID();
          await this.db.createPayslip({ schoolId: t.schoolId, id: slip, runId, staffId: s.id, actorId: t.userId, details: { employeeId: s.employeeId } });
          for (const l of s.lines) await this.db.addPayslipLine({ schoolId: t.schoolId, id: randomUUID(), runId, payslipId: slip, kind: l.kind as never, name: l.name, amountMinor: l.amountMinor, manual: false, actorId: t.userId, details: { employeeId: s.employeeId, name: l.name, amountMinor: l.amountMinor } });
        }
      };
      await Promise.all(Array.from({ length: 6 }, worker));
    } catch (e) {
      await this.db.deletePayrollRun({ schoolId: t.schoolId, id: runId, actorId: t.userId, details: { reason: 'payslips not all created' } }).catch(() => undefined);
      throw e;
    }
    return this.getRun(t, runId);
  }

  async deleteRun(t: TenantContext, id: string): Promise<void> {
    const r = await this.runRow(t, id);
    if (r.status !== 'DRAFT') throw conflict('id', 'notADraft');
    await this.rejectRace(this.db.deletePayrollRun({ schoolId: t.schoolId, id: dashed(r.id), actorId: t.userId, details: { period: period(r.year, r.month), payslips: r.payslips.length } }));
  }

  /** A database refusal after the gateway already checked the same thing means the run changed in between (someone approved it): a conflict, not a tenant violation. */
  private async rejectRace<T>(work: Promise<T>): Promise<T> {
    try {
      return await work;
    } catch (e) {
      if (e instanceof DatabaseError && e.kind === 'FORBIDDEN_REFERENCE') throw conflict('id', 'notADraft');
      throw e;
    }
  }

  async addPayslipLine(t: TenantContext, payslipId: string, dto: AddPayslipLineDto): Promise<PayrollRunDto> {
    const slip = (await this.db.getPayslip({ schoolId: t.schoolId, id: payslipId })).data.payslips[0];
    if (!slip) throw notFound();
    if (slip.run.status !== 'DRAFT') throw conflict('id', 'notADraft');
    await this.rejectRace(this.db.addPayslipLine({ schoolId: t.schoolId, id: randomUUID(), runId: dashed(slip.run.id), payslipId: dashed(slip.id), kind: dto.kind as never, name: dto.name, amountMinor: dto.amountMinor, manual: true, actorId: t.userId, details: { employeeId: slip.staff.employeeId, kind: dto.kind, name: dto.name, amountMinor: dto.amountMinor } }));
    return this.getRun(t, dashed(slip.run.id));
  }
  async removePayslipLine(t: TenantContext, lineId: string): Promise<PayrollRunDto> {
    const l = (await this.db.payslipLine({ schoolId: t.schoolId, id: lineId })).data.payslipLines[0];
    if (!l) throw notFound();
    if (l.run.status !== 'DRAFT') throw conflict('id', 'notADraft');
    await this.rejectRace(this.db.removePayslipLine({ schoolId: t.schoolId, id: dashed(l.id), runId: dashed(l.run.id), actorId: t.userId, details: { name: l.name, amountMinor: String(l.amountMinor) } }));
    return this.getRun(t, dashed(l.run.id));
  }

  async approve(t: TenantContext, id: string): Promise<PayrollRunDto> {
    const r = await this.runRow(t, id);
    if (r.status !== 'DRAFT') throw conflict('id', 'notADraft');
    if (r.payslips.length === 0) throw conflict('id', 'noPayslips');
    const negatives = negativeNet(r.payslips.map((p) => ({ name: staffName(p.staff), lines: p.lines })));
    if (negatives.length > 0) throw new ApiException(ErrorCode.CONFLICT, 409, negatives.slice(0, 20).map((n) => ({ field: n, rule: 'negativeNetPay' }))); // deductions above earnings: fix before approving
    const tot = totalsOf(r.payslips.flatMap((p) => p.lines));
    await this.rejectRace(this.db.approvePayrollRun({ schoolId: t.schoolId, id: dashed(r.id), actorId: t.userId, details: { period: period(r.year, r.month), payslips: r.payslips.length, grossMinor: str(tot.grossMinor), netMinor: str(tot.netMinor) } }));
    return this.getRun(t, id);
  }

  async pay(t: TenantContext, id: string, dto: PayRunDto): Promise<PayrollRunDto> {
    const paidOn = dto.paidOn ?? today();
    if (!realDate(paidOn)) throw invalid('paidOn', 'realDate');
    if (paidOn > today()) throw invalid('paidOn', 'notInTheFuture');
    const r = await this.runRow(t, id);
    if (r.status !== 'APPROVED') throw conflict('id', 'notApproved');
    const tot = totalsOf(r.payslips.flatMap((p) => p.lines));
    try {
      await this.db.markPayrollRunPaid({ schoolId: t.schoolId, id: dashed(r.id), paidOn, ...(dto.reference ? { paymentReference: dto.reference } : {}), actorId: t.userId, details: { period: period(r.year, r.month), netMinor: str(tot.netMinor), paidOn, reference: dto.reference } });
    } catch (e) {
      if (e instanceof DatabaseError && e.kind === 'FORBIDDEN_REFERENCE') throw conflict('id', 'notApproved');
      throw e;
    }
    return this.getRun(t, id);
  }

  // ---------------------------------------------------------------- payslips
  async payslip(t: TenantContext, id: string): Promise<PayslipDto & { run: PayrollRunSummaryDto; period: string }> {
    const p = (await this.db.getPayslip({ schoolId: t.schoolId, id })).data.payslips[0];
    if (!p) throw notFound();
    const run = p.run as unknown as RunRow;
    return { ...this.payslipView({ id: p.id, staff: p.staff as unknown as StaffRef, lines: p.lines as unknown as LineRow[] }), run: this.summary(run), period: period(run.year, run.month) };
  }

  /** The payslip as a PDF. Only an approved or paid run has payslips: a draft is a working paper, not a payslip. */
  async payslipPdf(t: TenantContext, id: string, lang?: string): Promise<{ bytes: Buffer; fileName: string }> {
    if (lang !== undefined && !LANGUAGES.has(lang)) throw invalid('lang', 'knownLanguage');
    const p = await this.payslip(t, id);
    if (p.run.status === 'DRAFT') throw conflict('id', 'draftHasNoPayslip');
    const school = (await this.db.getSchoolProfile({ schoolId: t.schoolId })).data.school;
    if (!school) throw notFound();
    const earnings = p.lines.filter((l) => l.kind === 'EARNING').map((l) => ({ name: l.name, amountMinor: l.amountMinor }));
    const deductions = p.lines.filter((l) => l.kind === 'DEDUCTION').map((l) => ({ name: l.name, amountMinor: l.amountMinor }));
    const model: PayslipPdfModel = {
      school: { name: school.name, address: school.address ?? null, phone: school.contactPhone ?? null, email: school.contactEmail ?? null }, period: p.period,
      employee: { name: p.staff.name, employeeId: p.staff.employeeId, department: p.staff.department, designation: p.staff.designation }, earnings, deductions,
      grossMinor: p.grossMinor, deductionsMinor: p.deductionsMinor, netMinor: p.netMinor, paidOn: p.run.status === 'PAID' ? p.run.paidOn : null,
    };
    return { bytes: await renderPayslipPdf(model, lang ?? school.defaultLanguage), fileName: `payslip-${p.staff.employeeId}-${p.period.replace('/', '-')}.pdf` };
  }
}
