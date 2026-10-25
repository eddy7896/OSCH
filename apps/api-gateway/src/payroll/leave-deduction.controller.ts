import { Body, Controller, ForbiddenException, Get, HttpCode, NotFoundException, Param, Post } from '@nestjs/common';
import { Audit } from '../audit/audit.decorators.js';
import { Granted, Permission, type GrantedPermission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import { ApplyDeductionDto, ProposalListDto } from './dto/leave-deduction.dto.js';
import { PayrollIdParamDto } from './dto/payroll.dto.js';
import { LeaveDeductionService } from './leave-deduction.service.js';

/**
 * The payroll proposal for approved unpaid leave (P3-8). School routes: `X-School-Id` + the `payroll` grant. Anyone who may read payroll sees the proposals; HR (who may edit a
 * DRAFT run) applies one, optionally at an edited amount. It becomes an ordinary deduction line, and the Principal still approves the run.
 */
@Controller('payroll')
export class LeaveDeductionController {
  constructor(private readonly deductions: LeaveDeductionService) {}

  @Permission('payroll', 'read')
  @Get('runs/:id/leave-proposals')
  proposals(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: PayrollIdParamDto): Promise<ProposalListDto> {
    if (g.scope !== 'school') throw new NotFoundException();
    return this.deductions.proposals(t, p.id);
  }

  /** Same audit entry as adding any payslip line: the proposal is nothing special once applied. */
  @Permission('payroll', 'update')
  @Audit({ action: 'payroll.payslipline.add', operation: 'AddPayslipLine' })
  @HttpCode(200)
  @Post('payslips/:id/leave-deduction')
  apply(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: PayrollIdParamDto, @Body() dto: ApplyDeductionDto): Promise<ProposalListDto> {
    if (g.scope !== 'school') throw new ForbiddenException();
    return this.deductions.apply(t, p.id, dto);
  }
}
