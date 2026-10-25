import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import { formatHalfDays } from '../leave/leave-rules.js';
import { daysFromText } from '../schedule/schedule-rules.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import type { ApplyDeductionDto, ProposalDto, ProposalListDto } from './dto/leave-deduction.dto.js';
import { deductionMinor, halfDaysInMonth, LEAVE_LINE_NAME, monthBounds, workingDaysInMonth } from './leave-deduction.js';
import { PayrollService } from './payroll.service.js';

const notFound = () => new ApiException(ErrorCode.NOT_FOUND, 404);
const invalid = (field: string, rule: string) => new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field, rule }]);
const conflict = (field: string, rule: string) => new ApiException(ErrorCode.CONFLICT, 409, [{ field, rule }]);

/**
 * The payroll proposal for approved UNPAID leave (P3-8, ADR-0013 decisions 8 and 10). It is worked out from the leave and the payslip every time it is asked for, so it
 * exists the moment the leave is approved. It is only ever a proposal: HR applies it to a DRAFT run as an ordinary deduction line (and may change the amount first).
 * Paid leave raises no proposal. Nothing is applied silently.
 */
@Injectable()
export class LeaveDeductionService {
  constructor(@Inject(DATABASE) private readonly db: Database, private readonly payroll: PayrollService) {}

  async proposals(t: TenantContext, runId: string): Promise<ProposalListDto> {
    const run = await this.payroll.getRun(t, runId); // 404 for a run of another school
    const { first, last } = monthBounds(run.year, run.month);
    const [school, leaves] = await Promise.all([
      this.db.schoolWorkingDays({ schoolId: t.schoolId }),
      this.db.listLeaveRequests({ schoolId: t.schoolId, status: 'APPROVED' as never, from: first, to: last }),
    ]);
    const working = daysFromText(school.data.school?.workingDays ?? '');
    const monthDays = workingDaysInMonth(run.year, run.month, working);
    const unpaid = leaves.data.leaveRequests.filter((l) => !l.leaveType.paid);
    const byStaff = new Map<string, typeof unpaid>();
    for (const l of unpaid) byStaff.set(dashed(l.staff.id), [...(byStaff.get(dashed(l.staff.id)) ?? []), l]);
    const items: ProposalDto[] = [];
    const seen = new Set<string>();
    for (const slip of run.payslips) {
      const mine = byStaff.get(dashed(slip.staff.id));
      if (!mine) continue;
      seen.add(dashed(slip.staff.id));
      const counted = mine.map((l) => ({ l, half: halfDaysInMonth(l, run.year, run.month, working) })).filter((x) => x.half > 0);
      if (counted.length === 0) continue;
      const half = counted.reduce((n, x) => n + x.half, 0);
      const line = slip.lines.find((x) => x.manual && x.kind === 'DEDUCTION' && x.name === LEAVE_LINE_NAME);
      items.push({
        staff: { id: dashed(slip.staff.id), employeeId: slip.staff.employeeId, name: slip.staff.name }, payslipId: dashed(slip.id), monthlyGrossMinor: slip.grossMinor, days: formatHalfDays(half),
        proposedMinor: String(deductionMinor(BigInt(slip.grossMinor), half, monthDays)),
        leaves: counted.map((x) => ({ id: dashed(x.l.id), startDate: x.l.startDate, endDate: x.l.endDate, half: x.l.half ?? null, days: formatHalfDays(x.half) })),
        applied: line ? { lineId: dashed(line.id), amountMinor: line.amountMinor } : null,
      });
    }
    const withoutPayslip = [...byStaff].filter(([id, ls]) => !seen.has(id) && ls.some((l) => halfDaysInMonth(l, run.year, run.month, working) > 0))
      .map(([id, ls]) => ({ id, employeeId: ls[0]!.staff.employeeId, name: `${ls[0]!.staff.firstName} ${ls[0]!.staff.lastName}` }));
    return { run: { id: run.id, year: run.year, month: run.month, status: run.status }, workingDays: monthDays, items: items.sort((a, b) => a.staff.name.localeCompare(b.staff.name)), withoutPayslip };
  }

  /** HR puts the proposal on the payslip as a deduction line, at the proposed amount or an edited one. Only on a DRAFT run, and only once. */
  async apply(t: TenantContext, payslipId: string, dto: ApplyDeductionDto): Promise<ProposalListDto> {
    const slip = (await this.db.getPayslip({ schoolId: t.schoolId, id: dashed(payslipId) })).data.payslips[0];
    if (!slip) throw notFound();
    if (slip.run.status !== 'DRAFT') throw conflict('id', 'notADraft');
    const list = await this.proposals(t, dashed(slip.run.id));
    const item = list.items.find((i) => i.payslipId === dashed(payslipId));
    if (!item) throw conflict('id', 'noUnpaidLeave');
    if (item.applied) throw conflict('id', 'alreadyApplied');
    const amount = BigInt(dto.amountMinor ?? item.proposedMinor);
    if (amount <= 0n) throw conflict('amountMinor', 'nothingToDeduct');
    if (amount > BigInt(item.monthlyGrossMinor)) throw invalid('amountMinor', 'aboveMonthlyGross');
    await this.payroll.addPayslipLine(t, payslipId, { kind: 'DEDUCTION', name: LEAVE_LINE_NAME, amountMinor: String(amount) });
    return this.proposals(t, dashed(slip.run.id));
  }
}
