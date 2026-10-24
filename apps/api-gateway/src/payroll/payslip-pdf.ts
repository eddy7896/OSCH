import { formatMoney } from '@oruschools/format';
import { createPage, INK } from '../pdf/kit.js';

/** The payslip as a PDF (P2-8): the same page kit as the fee receipt, labels in the school's language. Only approved or paid runs have payslips. */
export interface PayslipPdfModel {
  school: { name: string; address: string | null; phone: string | null; email: string | null };
  /** `MM/YYYY`. */
  period: string;
  employee: { name: string; employeeId: string; department: string | null; designation: string | null };
  earnings: Array<{ name: string; amountMinor: string }>;
  deductions: Array<{ name: string; amountMinor: string }>;
  grossMinor: string;
  deductionsMinor: string;
  netMinor: string;
  /** YYYY-MM-DD when the run has been paid, else null. */
  paidOn: string | null;
}

const inr = (minor: string) => formatMoney(BigInt(minor), { currency: 'INR', locale: 'en-IN', decimals: 'always' });
const dmy = (iso: string): string => `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}`;
export const PAYSLIP_WIDTH = 420;
export const PAYSLIP_HEIGHT = 595;
/** More lines than fit are summed into one last line (a payslip with 25 lines is a mistake, but the page must never overflow). */
export const MAX_LINES_PER_SECTION = 9;

export function squeeze(lines: Array<{ name: string; amountMinor: string }>, otherName: string): Array<{ name: string; amountMinor: string }> {
  if (lines.length <= MAX_LINES_PER_SECTION) return lines;
  const head = lines.slice(0, MAX_LINES_PER_SECTION - 1);
  const rest = lines.slice(MAX_LINES_PER_SECTION - 1).reduce((t, l) => t + BigInt(l.amountMinor), 0n);
  return [...head, { name: `${otherName} (${lines.length - head.length})`, amountMinor: String(rest) }];
}

export const renderPayslipPdf = (model: PayslipPdfModel, language: string): Promise<Buffer> => renderPayslip(model, language, 'pdf');

export async function renderPayslip(model: PayslipPdfModel, language: string, format: 'pdf' | 'png'): Promise<Buffer> {
  const p = createPage(PAYSLIP_WIDTH, PAYSLIP_HEIGHT, language);
  const { W, H, M, t, edge, far, rule } = p;
  edge(model.school.name, 44, 18, { bold: true });
  let y = 62;
  for (const line of [model.school.address, [model.school.phone, model.school.email].filter(Boolean).join('   ')].filter((l): l is string => !!l)) {
    edge(line, y, 10.5, { color: INK.muted });
    y += 15;
  }
  rule(y + 4, INK.text);
  y += 34;
  edge(t['payslipTitle'] ?? 'Payslip', y, 17, { bold: true });
  y += 26;
  const row = (label: string, value: string, bold = false) => {
    edge(label, y, 11, { color: INK.muted, maxWidth: 150 });
    far(value, y, 12.5, { bold, maxWidth: W - 2 * M - 160 });
    y += 22;
  };
  row(t['payslipPeriod'] ?? 'Pay period', model.period, true);
  row(t['payslipEmployee'] ?? 'Employee', model.employee.name, true);
  row(t['payslipEmployeeId'] ?? 'Employee no.', model.employee.employeeId);
  if (model.employee.department) row(t['payslipDepartment'] ?? 'Department', model.employee.department);
  if (model.employee.designation) row(t['payslipDesignation'] ?? 'Designation', model.employee.designation);
  rule(y - 8);
  y += 8;

  const section = (title: string, lines: Array<{ name: string; amountMinor: string }>) => {
    edge(title, y, 11.5, { bold: true });
    y += 20;
    for (const l of squeeze(lines, '…')) {
      edge(l.name, y, 11.5, { maxWidth: 220 });
      far(inr(l.amountMinor), y, 11.5, { maxWidth: 140 });
      y += 18;
    }
    if (lines.length === 0) {
      edge('—', y, 11.5, { color: INK.muted });
      y += 18;
    }
    y += 6;
  };
  section(t['payslipEarnings'] ?? 'Earnings', model.earnings);
  section(t['payslipDeductions'] ?? 'Deductions', model.deductions);
  rule(y - 6);
  y += 14;
  row(t['payslipGross'] ?? 'Gross pay', inr(model.grossMinor));
  row(t['payslipTotalDeductions'] ?? 'Total deductions', inr(model.deductionsMinor));
  edge(t['payslipNetPay'] ?? 'Net pay', y + 8, 12.5, { bold: true, maxWidth: 150 });
  far(inr(model.netMinor), y + 12, 22, { bold: true, maxWidth: W - 2 * M - 160 });
  y += 36;
  if (model.paidOn) row(t['payslipPaidOn'] ?? 'Paid on', dmy(model.paidOn));
  rule(H - 56);
  edge(t['payslipFooter'] ?? 'This is a computer-generated payslip.', H - 36, 9.5, { color: INK.muted, center: true });
  return p.canvas.toBuffer(format);
}
