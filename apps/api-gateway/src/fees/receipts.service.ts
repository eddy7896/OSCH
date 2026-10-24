import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { LOCALES } from '@oruschools/i18n';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import type { ListReceiptsQueryDto, ReceiptDto, ReceiptListDto, ReceiptSummaryDto } from './dto/invoices.dto.js';
import { renderReceiptPdf, type ReceiptPdfModel } from './receipt-pdf.js';

const notFound = () => new ApiException(ErrorCode.NOT_FOUND, 404);
const LANGUAGES = new Set<string>(LOCALES.map((l) => l.code));

type Row = {
  id: string; number: string; serial: number; amountMinor: string; balanceAfterMinor: string; cancelledAt?: string | null; cancelReason?: string | null; createdAt: string;
  academicYear: { id: string; name: string }; student: { id: string; enrollmentId: string; firstName: string; lastName: string }; invoice: { id: string; title: string };
  payment: { id: string; method: string; reference?: string | null; paidOn: string; recordedBy: { id: string; displayName?: string | null; email: string } };
};

/** Receipts of the active school (P2-7c): the data for the printable web page, the list, and the PDF. A receipt is made with its payment, never separately. */
@Injectable()
export class ReceiptsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  private summary(r: Row): ReceiptSummaryDto {
    return {
      id: dashed(r.id), number: r.number, paidOn: r.payment.paidOn, issuedAt: r.createdAt, cancelled: !!r.cancelledAt, amountMinor: String(r.amountMinor),
      student: { id: dashed(r.student.id), enrollmentId: r.student.enrollmentId, name: `${r.student.firstName} ${r.student.lastName}` }, invoice: { id: dashed(r.invoice.id), title: r.invoice.title },
    };
  }

  async list(t: TenantContext, q: ListReceiptsQueryDto): Promise<ReceiptListDto> {
    const page = q.page ?? 1, pageSize = q.pageSize ?? 25;
    const filter = { schoolId: t.schoolId, ...(q.studentId ? { studentId: q.studentId } : {}), ...(q.academicYearId ? { academicYearId: q.academicYearId } : {}) };
    const [rows, count] = await Promise.all([this.db.listReceipts({ ...filter, limit: pageSize, offset: (page - 1) * pageSize }), this.db.countReceipts(filter)]);
    const c = count.data.receipts[0];
    return { items: (rows.data.receipts as unknown as Row[]).map((r) => this.summary(r)), total: Number(c?._count ?? 0), page, pageSize, totalAmountMinor: String(c?.amountMinor_sum ?? '0') };
  }

  private async row(t: TenantContext, id: string): Promise<Row> {
    const r = (await this.db.getReceipt({ schoolId: t.schoolId, id })).data.receipts[0];
    if (!r) throw notFound(); // another school's receipt looks exactly like one that does not exist
    return r as unknown as Row;
  }
  async byPayment(t: TenantContext, paymentId: string): Promise<ReceiptDto> {
    const r = (await this.db.getReceiptByPayment({ schoolId: t.schoolId, paymentId })).data.receipts[0];
    if (!r) throw notFound();
    return this.full(t, r as unknown as Row);
  }
  async get(t: TenantContext, id: string): Promise<ReceiptDto> {
    return this.full(t, await this.row(t, id));
  }

  private async full(t: TenantContext, r: Row): Promise<ReceiptDto> {
    const [school, placement] = await Promise.all([
      this.db.getSchoolProfile({ schoolId: t.schoolId }),
      this.db.getStudentLevel({ schoolId: t.schoolId, studentId: dashed(r.student.id), academicYearId: dashed(r.academicYear.id) }),
    ]);
    const s = school.data.school;
    if (!s) throw notFound();
    return {
      ...this.summary(r), cancelReason: r.cancelReason ?? null, academicYear: { id: dashed(r.academicYear.id), name: r.academicYear.name },
      school: { name: s.name, address: s.address ?? null, phone: s.contactPhone ?? null, email: s.contactEmail ?? null, logoKey: s.logoKey ?? null, language: s.defaultLanguage },
      className: placement.data.studentEnrollments[0]?.classroom.name ?? null, method: r.payment.method, reference: r.payment.reference ?? null,
      balanceAfterMinor: String(r.balanceAfterMinor), receivedBy: r.payment.recordedBy.displayName ?? r.payment.recordedBy.email,
    };
  }

  /** The receipt as a PDF, in the school's language unless an explicit `lang` is asked for. Same content and number as the web page. */
  async pdf(t: TenantContext, id: string, lang?: string): Promise<{ bytes: Buffer; fileName: string }> {
    if (lang !== undefined && !LANGUAGES.has(lang)) throw new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field: 'lang', rule: 'knownLanguage' }]);
    const r = await this.get(t, id);
    const model: ReceiptPdfModel = {
      number: r.number, paidOn: r.paidOn, cancelled: r.cancelled, school: { name: r.school.name, address: r.school.address, phone: r.school.phone, email: r.school.email },
      student: { name: r.student.name, enrollmentId: r.student.enrollmentId, className: r.className }, invoiceTitle: r.invoice.title, amountMinor: r.amountMinor,
      balanceAfterMinor: r.balanceAfterMinor, method: r.method, reference: r.reference, receivedBy: r.receivedBy, academicYear: r.academicYear.name,
    };
    return { bytes: await renderReceiptPdf(model, lang ?? r.school.language), fileName: `receipt-${r.number}.pdf` };
  }
}
