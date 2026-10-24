import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, DatabaseError, type Database } from '@oruschools/database';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import { netOf, totalDiscount, type ConcessionRule } from './amounts.js';
import type {
  CreateInvoiceDto, GenerateInvoicesDto, GenerateResultDto, InvoiceDto, InvoiceListDto, InvoiceSummaryDto, InvoiceTotalsDto, ListInvoicesQueryDto, OutstandingDto,
  PaymentDto, RecordPaymentDto, StatementDto,
} from './dto/invoices.dto.js';
import { MAX_INVOICES_PER_RUN } from './dto/invoices.dto.js';
import { addDays, ageingBands, effectiveStatus, storedStatus } from './invoice-rules.js';

const notFound = () => new ApiException(ErrorCode.NOT_FOUND, 404);
const conflict = () => new ApiException(ErrorCode.CONFLICT, 409);
const invalid = (field: string, rule: string) => new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field, rule }]);
const realDate = (d: string) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d);
const same = (a: string, b: string) => dashed(a) === b.toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);
const MAX_PAYMENT_ATTEMPTS = 4;
const MAX_STUDENTS_PER_RUN = 500;
const PAGE = 1000;

type InvoiceRow = {
  id: string; title: string; amountMinor: string; paidMinor: string; grossMinor?: string | null; discountMinor?: string | null; dueDate: string; status: string;
  student: { id: string; enrollmentId: string; firstName: string; lastName: string }; academicYear?: { id: string; name: string } | null;
  payments?: Array<{ id: string; amountMinor: string; method: string; reference?: string | null; paidOn: string; reversedAt?: string | null; reversalReason?: string | null; recordedBy: { id: string; displayName?: string | null; email: string } }>;
};

const totals = (count: number, amount: bigint, paid: bigint): InvoiceTotalsDto => ({ count, amountMinor: String(amount), paidMinor: String(paid), outstandingMinor: String(amount - paid) });

/**
 * Invoices and payments (P2-7b). An instalment is billed to a student at most once (a database key, so generating twice is harmless).
 * A payment can never push an invoice past what is due, and two payments cannot both start from the same paid total: the database
 * refuses the second, and the gateway reads again and decides. A payment is never edited or deleted; a mistake is reversed.
 */
@Injectable()
export class InvoicesService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  private async activeYear(t: TenantContext): Promise<{ id: string; name: string }> {
    const y = (await this.db.getSchoolProfile({ schoolId: t.schoolId })).data.school?.activeAcademicYear;
    if (!y) throw invalid('academicYearId', 'noActiveAcademicYear');
    return { id: dashed(y.id), name: y.name };
  }
  private async yearOf(t: TenantContext, id?: string): Promise<{ id: string; name: string }> {
    if (!id) return this.activeYear(t);
    const y = (await this.db.listAcademicYears({ schoolId: t.schoolId })).data.academicYears.find((x) => same(x.id, id));
    if (!y) throw invalid('academicYearId', 'ownAcademicYear');
    return { id: dashed(y.id), name: y.name };
  }

  private summary(r: InvoiceRow, now: string): InvoiceSummaryDto {
    const amount = BigInt(r.amountMinor), paid = BigInt(r.paidMinor);
    return {
      id: dashed(r.id), title: r.title, student: { id: dashed(r.student.id), enrollmentId: r.student.enrollmentId, name: `${r.student.firstName} ${r.student.lastName}` },
      academicYear: r.academicYear ? { id: dashed(r.academicYear.id), name: r.academicYear.name } : null, dueDate: r.dueDate,
      grossMinor: r.grossMinor == null ? null : String(r.grossMinor), discountMinor: r.discountMinor == null ? null : String(r.discountMinor),
      amountMinor: String(amount), paidMinor: String(paid), outstandingMinor: String(amount - paid), status: effectiveStatus({ status: r.status, amountMinor: amount, paidMinor: paid, dueDate: r.dueDate }, now),
    };
  }
  private payment(p: NonNullable<InvoiceRow['payments']>[number]): PaymentDto {
    return { id: dashed(p.id), amountMinor: String(p.amountMinor), method: p.method, reference: p.reference ?? null, paidOn: p.paidOn, reversedAt: p.reversedAt ?? null, reversalReason: p.reversalReason ?? null, recordedBy: { id: p.recordedBy.id, name: p.recordedBy.displayName ?? p.recordedBy.email } };
  }

  // ---------------------------------------------------------------- reading
  private filter(t: TenantContext, q: ListInvoicesQueryDto) {
    const now = today();
    const state = q.state ?? 'ALL';
    // OVERDUE = unpaid with a due date before today; UNPAID = every unpaid one.
    const dueTo = state === 'OVERDUE' ? [q.dueTo, addDays(now, -1)].filter((x): x is string => !!x).sort()[0] : q.dueTo;
    return {
      schoolId: t.schoolId, ...(q.studentId ? { studentId: q.studentId } : {}), ...(q.academicYearId ? { academicYearId: q.academicYearId } : {}),
      ...(state === 'PAID' ? { status: 'PAID' as never } : state === 'UNPAID' || state === 'OVERDUE' ? { status: 'PENDING' as never } : {}),
      ...(dueTo ? { dueOnOrBefore: dueTo } : {}), ...(q.dueFrom ? { dueOnOrAfter: q.dueFrom } : {}),
    };
  }
  async list(t: TenantContext, q: ListInvoicesQueryDto): Promise<InvoiceListDto> {
    const page = q.page ?? 1, pageSize = q.pageSize ?? 25;
    const filter = this.filter(t, q);
    const [rows, count] = await Promise.all([this.db.listInvoices({ ...filter, limit: pageSize, offset: (page - 1) * pageSize }), this.db.countInvoices(filter)]);
    const c = count.data.invoices[0];
    const now = today();
    return {
      items: (rows.data.invoices as unknown as InvoiceRow[]).map((r) => this.summary(r, now)), total: Number(c?._count ?? 0), page, pageSize,
      totals: totals(Number(c?._count ?? 0), BigInt(c?.amountMinor_sum ?? '0'), BigInt(c?.paidMinor_sum ?? '0')),
    };
  }
  private async row(t: TenantContext, id: string): Promise<InvoiceRow> {
    const r = (await this.db.getInvoice({ schoolId: t.schoolId, id })).data.invoices[0];
    if (!r) throw notFound(); // another school's invoice looks exactly like one that does not exist
    return r as unknown as InvoiceRow;
  }
  async get(t: TenantContext, id: string): Promise<InvoiceDto> {
    const r = await this.row(t, id);
    return { ...this.summary(r, today()), payments: (r.payments ?? []).map((p) => this.payment(p)) };
  }
  async statement(t: TenantContext, studentId: string, academicYearId?: string): Promise<StatementDto> {
    const stu = (await this.db.getStudent({ schoolId: t.schoolId, id: studentId })).data.students[0];
    if (!stu) throw notFound();
    const list = await this.list(t, { studentId, ...(academicYearId ? { academicYearId } : {}), page: 1, pageSize: 100 });
    return { student: { id: dashed(stu.id), enrollmentId: stu.enrollmentId, name: `${stu.firstName} ${stu.lastName}` }, invoices: list.items, totals: list.totals };
  }

  /** Unpaid money by how long it has been overdue, as of a date. One exact sum per band, computed in the database. */
  async outstanding(t: TenantContext, asOf?: string): Promise<OutstandingDto> {
    const date = asOf ?? today();
    if (!realDate(date)) throw invalid('asOf', 'realDate');
    const bands = ageingBands(date);
    const rows = await Promise.all(bands.map((b) => this.db.unpaidTotals({ schoolId: t.schoolId, ...(b.to ? { dueOnOrBefore: b.to } : {}), ...(b.from ? { dueOnOrAfter: b.from } : {}) })));
    let count = 0, amount = 0n, paid = 0n;
    const out = bands.map((b, i) => {
      const r = rows[i]!.data.invoices[0];
      const n = Number(r?._count ?? 0), a = BigInt(r?.amountMinor_sum ?? '0'), p = BigInt(r?.paidMinor_sum ?? '0');
      count += n; amount += a; paid += p;
      return { band: b.key, count: n, amountMinor: String(a), paidMinor: String(p), outstandingMinor: String(a - p) };
    });
    return { asOf: date, bands: out, totals: totals(count, amount, paid) };
  }

  // ---------------------------------------------------------------- making invoices
  async createManual(t: TenantContext, dto: CreateInvoiceDto): Promise<InvoiceDto> {
    if (!realDate(dto.dueDate)) throw invalid('dueDate', 'realDate');
    const id = randomUUID();
    try {
      await this.db.createInvoice({ schoolId: t.schoolId, id, studentId: dto.studentId, title: dto.title, amountMinor: dto.amountMinor, dueDate: dto.dueDate, actorId: t.userId, details: { title: dto.title, amountMinor: dto.amountMinor, dueDate: dto.dueDate } });
    } catch (e) {
      if (e instanceof DatabaseError && e.kind === 'FORBIDDEN_REFERENCE') throw invalid('studentId', 'ownStudent');
      throw e;
    }
    return this.get(t, id);
  }

  /**
   * Bills the instalments due on or before a date to the placed students of a year. Idempotent: an instalment a student was already
   * billed for is counted and left alone, so running it again (or after a crash) only fills in what is missing.
   */
  async generate(t: TenantContext, dto: GenerateInvoicesDto): Promise<GenerateResultDto> {
    if (!realDate(dto.dueOnOrBefore)) throw invalid('dueOnOrBefore', 'realDate');
    const year = await this.yearOf(t, dto.academicYearId);
    const dryRun = dto.dryRun === true;

    // Everything the run needs, read once for the whole school.
    const structures = new Map<string, Awaited<ReturnType<Database['listFeeStructures']>>['data']['feeStructures'][number]>();
    for (const s of (await this.db.listFeeStructures({ schoolId: t.schoolId, academicYearId: year.id })).data.feeStructures) structures.set(dashed(s.gradeLevel.id), s);
    const rules = new Map<string, ConcessionRule[]>();
    for (const c of (await this.db.listConcessions({ schoolId: t.schoolId, academicYearId: year.id })).data.concessions) {
      const key = dashed(c.student.id);
      (rules.get(key) ?? rules.set(key, []).get(key)!).push({ kind: c.kind as 'PERCENT' | 'FIXED', basisPoints: c.basisPoints ?? null, amountMinor: c.amountMinor == null ? null : BigInt(c.amountMinor), feeItemId: c.targetItem ? dashed(c.targetItem.id) : null });
    }
    const billed = new Set<string>();
    for (let offset = 0; ; offset += PAGE) {
      const page = (await this.db.invoicedForYear({ schoolId: t.schoolId, academicYearId: year.id, limit: PAGE, offset })).data.invoices;
      for (const i of page) billed.add(`${dashed(i.studentId)}|${dashed(i.instalmentId!)}`);
      if (page.length < PAGE) break;
    }

    // Who: one student, or the placed students of a class / level / year.
    let who: Array<{ studentId: string; gradeLevelId: string }> = [];
    if (dto.studentId) {
      const p = (await this.db.getStudentLevel({ schoolId: t.schoolId, studentId: dto.studentId, academicYearId: year.id })).data.studentEnrollments[0];
      if (!(await this.db.getStudent({ schoolId: t.schoolId, id: dto.studentId })).data.students[0]) throw notFound();
      if (p) who = [{ studentId: dashed(dto.studentId), gradeLevelId: dashed(p.classroom.gradeLevel.id) }];
    } else {
      for (let offset = 0; who.length <= MAX_STUDENTS_PER_RUN; offset += PAGE) {
        const page = (await this.db.placedStudents({ schoolId: t.schoolId, academicYearId: year.id, ...(dto.classroomId ? { classroomId: dto.classroomId } : {}), ...(dto.gradeLevelId ? { gradeLevelId: dto.gradeLevelId } : {}), limit: PAGE, offset })).data.studentEnrollments;
        who.push(...page.map((e) => ({ studentId: dashed(e.studentId), gradeLevelId: dashed(e.classroom.gradeLevelId) })));
        if (page.length < PAGE) break;
      }
    }
    let truncated = false;
    if (who.length > MAX_STUDENTS_PER_RUN) { who = who.slice(0, MAX_STUDENTS_PER_RUN); truncated = true; }

    const plan: Array<{ studentId: string; instalmentId: string; title: string; dueDate: string; gross: bigint; discount: bigint; net: bigint }> = [];
    let alreadyInvoiced = 0, fullyWaived = 0, withoutStructure = 0;
    const names = new Map<string, string>();
    for (const w of who) {
      const s = structures.get(w.gradeLevelId);
      if (!s) { withoutStructure += 1; continue; }
      const own = rules.get(w.studentId) ?? [];
      for (const it of s.items) for (const inst of it.instalments) {
        if (inst.dueDate > dto.dueOnOrBefore) continue;
        if (billed.has(`${w.studentId}|${dashed(inst.id)}`)) { alreadyInvoiced += 1; continue; }
        const gross = BigInt(inst.amountMinor), itemId = dashed(it.id);
        const net = netOf(gross, itemId, own);
        if (net <= 0n) { fullyWaived += 1; continue; }
        plan.push({ studentId: w.studentId, instalmentId: dashed(inst.id), title: inst.label ? `${it.name} - ${inst.label}` : it.name, dueDate: inst.dueDate, gross, discount: totalDiscount(gross, itemId, own), net });
      }
    }
    if (plan.length > MAX_INVOICES_PER_RUN) { plan.length = MAX_INVOICES_PER_RUN; truncated = true; }

    let created = 0;
    if (!dryRun) {
      const queue = [...plan];
      const worker = async () => {
        for (let p = queue.shift(); p; p = queue.shift()) {
          try {
            await this.db.createInstalmentInvoice({ schoolId: t.schoolId, id: randomUUID(), studentId: p.studentId, instalmentId: p.instalmentId, academicYearId: year.id, title: p.title, grossMinor: String(p.gross), discountMinor: String(p.discount), amountMinor: String(p.net), dueDate: p.dueDate, actorId: t.userId, details: { instalmentId: p.instalmentId, amountMinor: String(p.net) } });
            created += 1;
          } catch (e) {
            if (e instanceof DatabaseError && e.kind === 'CONFLICT') alreadyInvoiced += 1; // another run made it a moment ago
            else throw e;
          }
        }
      };
      await Promise.all(Array.from({ length: 6 }, worker));
    } else created = plan.length;

    for (const p of plan.slice(0, 20)) if (!names.has(p.studentId)) names.set(p.studentId, '');
    const sample = [];
    for (const p of plan.slice(0, 10)) {
      if (!names.get(p.studentId)) {
        const s = (await this.db.getStudent({ schoolId: t.schoolId, id: p.studentId })).data.students[0];
        names.set(p.studentId, s ? `${s.enrollmentId} ${s.firstName} ${s.lastName}` : p.studentId);
      }
      sample.push({ student: names.get(p.studentId)!, title: p.title, dueDate: p.dueDate, amountMinor: String(p.net) });
    }
    return { dryRun, academicYear: year, students: who.length, created, alreadyInvoiced, fullyWaived, studentsWithoutStructure: withoutStructure, truncated, sample };
  }

  // ---------------------------------------------------------------- payments
  async recordPayment(t: TenantContext, invoiceId: string, dto: RecordPaymentDto): Promise<InvoiceDto> {
    const paidOn = dto.paidOn ?? today();
    if (!realDate(paidOn)) throw invalid('paidOn', 'realDate');
    if (paidOn > today()) throw invalid('paidOn', 'notInTheFuture');
    const amount = BigInt(dto.amountMinor);
    for (let attempt = 1; ; attempt++) {
      const inv = await this.row(t, invoiceId);
      const due = BigInt(inv.amountMinor), paid = BigInt(inv.paidMinor);
      if (amount > due - paid) throw new ApiException(ErrorCode.CONFLICT, 409, [{ field: 'amountMinor', rule: 'moreThanOutstanding' }]); // never overpay
      const next = paid + amount;
      try {
        await this.db.recordPayment({
          schoolId: t.schoolId, id: randomUUID(), invoiceId: dashed(inv.id), studentId: dashed(inv.student.id), amountMinor: dto.amountMinor, method: dto.method as never,
          ...(dto.reference ? { reference: dto.reference } : {}), paidOn, expectedPaidMinor: String(paid), newPaidMinor: String(next), newStatus: storedStatus(due, next) as never, actorId: t.userId,
          details: { invoice: inv.title, amountMinor: dto.amountMinor, method: dto.method, paidBefore: String(paid), paidAfter: String(next) },
        });
        break;
      } catch (e) {
        // Someone else recorded a payment on this invoice a moment ago: read it again and decide against the new total.
        if (e instanceof DatabaseError && e.kind === 'FORBIDDEN_REFERENCE' && attempt < MAX_PAYMENT_ATTEMPTS) continue;
        if (e instanceof DatabaseError && e.kind === 'FORBIDDEN_REFERENCE') throw conflict();
        throw e;
      }
    }
    return this.get(t, invoiceId);
  }

  async reversePayment(t: TenantContext, paymentId: string, reason: string): Promise<InvoiceDto> {
    for (let attempt = 1; ; attempt++) {
      const p = (await this.db.getPayment({ schoolId: t.schoolId, id: paymentId })).data.payments[0];
      if (!p) throw notFound();
      if (p.reversedAt) throw conflict(); // already reversed
      const due = BigInt(p.invoice.amountMinor), paid = BigInt(p.invoice.paidMinor), amount = BigInt(p.amountMinor);
      const next = paid - amount;
      if (next < 0n) throw conflict(); // cannot happen unless the books were changed by hand
      try {
        await this.db.reversePayment({
          schoolId: t.schoolId, id: dashed(p.id), invoiceId: dashed(p.invoice.id), reason, expectedPaidMinor: String(paid), newPaidMinor: String(next), newStatus: storedStatus(due, next) as never, actorId: t.userId,
          details: { amountMinor: String(amount), reason, paidBefore: String(paid), paidAfter: String(next) },
        });
        return this.get(t, dashed(p.invoice.id));
      } catch (e) {
        if (e instanceof DatabaseError && e.kind === 'FORBIDDEN_REFERENCE' && attempt < MAX_PAYMENT_ATTEMPTS) continue;
        if (e instanceof DatabaseError && e.kind === 'FORBIDDEN_REFERENCE') throw conflict();
        throw e;
      }
    }
  }
}
