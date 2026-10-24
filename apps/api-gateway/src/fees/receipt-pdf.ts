import { formatMoney } from '@oruschools/format';
import { createPage, directionOfText, familyFor, FONT_DIR, INK } from '../pdf/kit.js';

export { directionOfText, familyFor, FONT_DIR };

/**
 * The fee receipt as a PDF (P2-7c, ADR-0012). The page is drawn cell by cell (see ../pdf/kit.ts). The web page is the primary view; this is the
 * same content. Labels come from the school's language (packages/i18n); names and titles are printed as they were typed.
 */
export interface ReceiptPdfModel {
  number: string;
  /** YYYY-MM-DD, the day the fee was paid. */
  paidOn: string;
  cancelled: boolean;
  school: { name: string; address: string | null; phone: string | null; email: string | null };
  student: { name: string; enrollmentId: string; className: string | null };
  invoiceTitle: string;
  amountMinor: string;
  balanceAfterMinor: string;
  method: string;
  reference: string | null;
  receivedBy: string;
  academicYear: string;
}

const dmy = (iso: string): string => `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}`;
const METHOD_KEY: Record<string, string> = { CASH: 'paymentMethodCash', CHEQUE: 'paymentMethodCheque', BANK_TRANSFER: 'paymentMethodBankTransfer', UPI: 'paymentMethodUpi', OTHER: 'paymentMethodOther' };
const inr = (minor: string) => formatMoney(BigInt(minor), { currency: 'INR', locale: 'en-IN', decimals: 'always' });

export const RECEIPT_WIDTH = 420;
export const RECEIPT_HEIGHT = 595;

/** Draws the receipt (A5 portrait) and returns the PDF bytes. */
export const renderReceiptPdf = (model: ReceiptPdfModel, language: string): Promise<Buffer> => renderReceipt(model, language, 'pdf');

/** The same drawing as PDF (the product) or PNG (for looking at it while developing). */
export async function renderReceipt(model: ReceiptPdfModel, language: string, format: 'pdf' | 'png'): Promise<Buffer> {
  const p = createPage(RECEIPT_WIDTH, RECEIPT_HEIGHT, language);
  const { W, H, M, t, edge, far, rule } = p;

  // header: the school
  edge(model.school.name, 44, 18, { bold: true });
  let y = 62;
  for (const line of [model.school.address, [model.school.phone, model.school.email].filter(Boolean).join('   ')].filter((l): l is string => !!l)) {
    edge(line, y, 10.5, { color: INK.muted });
    y += 15;
  }
  rule(y + 4, INK.text);

  // title, number, date
  y += 34;
  edge(t['receiptTitle'] ?? 'Fee receipt', y, 17, { bold: true });
  y += 26;
  const row = (label: string, value: string, opts: { bold?: boolean; size?: number } = {}) => {
    edge(label, y, 11, { color: INK.muted, maxWidth: 150 });
    far(value, y, opts.size ?? 12.5, { bold: opts.bold, maxWidth: W - 2 * M - 160 });
    y += 24;
  };
  row(t['receiptNumber'] ?? 'Receipt no.', model.number, { bold: true });
  row(t['receiptDate'] ?? 'Date', dmy(model.paidOn));
  rule(y - 8);
  y += 8;
  row(t['receiptStudent'] ?? 'Student', model.student.name, { bold: true });
  row(t['receiptEnrollment'] ?? 'Enrolment no.', model.student.enrollmentId);
  if (model.student.className) row(t['receiptClass'] ?? 'Class', model.student.className);
  row(t['receiptFor'] ?? 'Payment for', model.invoiceTitle);
  rule(y - 8);
  y += 10;

  // the amount
  edge(t['receiptAmountPaid'] ?? 'Amount paid', y + 10, 12, { color: INK.muted, maxWidth: 160 });
  far(inr(model.amountMinor), y + 14, 26, { bold: true, maxWidth: W - 2 * M - 170 });
  y += 48;
  row(t['receiptMethod'] ?? 'Paid by', t[METHOD_KEY[model.method] ?? 'paymentMethodOther'] ?? model.method);
  if (model.reference) row(t['receiptReference'] ?? 'Reference', model.reference);
  row(t['receiptBalance'] ?? 'Balance on this invoice', inr(model.balanceAfterMinor));
  row(t['receiptReceivedBy'] ?? 'Received by', model.receivedBy);

  // footer
  rule(H - 56);
  edge(`${t['receiptFooter'] ?? 'This is a computer-generated receipt.'}   ⁦${model.academicYear}⁩`, H - 36, 9.5, { color: INK.muted, center: true });

  if (model.cancelled) {
    const { ctx, font } = p;
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.globalAlpha = 0.28;
    const word = t['receiptCancelled'] ?? 'CANCELLED';
    font(word, familyFor(word, p.language) === 'OruSans' ? 64 : 46, true);
    ctx.fillStyle = INK.danger;
    ctx.textAlign = 'center';
    ctx.direction = directionOfText(word);
    ctx.fillText(word, 0, 0);
    ctx.restore();
  }
  return p.canvas.toBuffer(format);
}
