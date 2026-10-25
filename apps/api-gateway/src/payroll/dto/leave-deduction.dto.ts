import { Matches, IsOptional, IsString } from 'class-validator';
import { MONEY } from '../../fees/dto/fees.dto.js';

export class ApplyDeductionDto {
  /** The amount to deduct, in paise. Leave it out to take the proposed amount; send another to edit it. */
  @IsOptional() @IsString() @Matches(MONEY) amountMinor?: string;
}

export class ProposalStaffDto {
  id!: string;
  employeeId!: string;
  name!: string;
}
export class ProposalLeaveDto {
  id!: string;
  startDate!: string;
  endDate!: string;
  half!: string | null;
  /** Days of this leave inside the month, counting only the school's working days. */
  days!: string;
}
export class AppliedLineDto {
  lineId!: string;
  amountMinor!: string;
}
export class ProposalDto {
  staff!: ProposalStaffDto;
  payslipId!: string;
  monthlyGrossMinor!: string;
  /** Unpaid days inside the month, whole or half. */
  days!: string;
  proposedMinor!: string;
  leaves!: ProposalLeaveDto[];
  /** The deduction line HR has put on the payslip, or null while it is only a proposal. */
  applied!: AppliedLineDto | null;
}
export class ProposalRunDto {
  id!: string;
  year!: number;
  month!: number;
  status!: string;
}
export class ProposalListDto {
  run!: ProposalRunDto;
  /** The school's working days in the run's month: the divisor of the daily cut. */
  workingDays!: number;
  items!: ProposalDto[];
  /** People with unpaid leave that month who have no payslip in this run (no salary lines, or they left). */
  withoutPayslip!: ProposalStaffDto[];
}
