import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, NotFoundException, Param, Patch, Post, Query, StreamableFile } from '@nestjs/common';
import { Audit } from '../audit/audit.decorators.js';
import { Strict } from '../common/throttle.guards.js';
import { Granted, Permission, type GrantedPermission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import {
  AddPayslipLineDto, CreatePayrollRunDto, CreateSalaryLineDto, ListRunsQueryDto, PayRunDto, PayrollIdParamDto, PayrollRunDto, PayrollRunListDto, PayslipDto, PayslipPdfQueryDto, SalaryDto,
  StaffIdParamDto, UpdateSalaryLineDto,
} from './dto/payroll.dto.js';
import { PayrollService } from './payroll.service.js';

const wide = (g: GrantedPermission): void => {
  if (g.scope !== 'school') throw new ForbiddenException();
};
const wideRead = (g: GrantedPermission): void => {
  if (g.scope !== 'school') throw new NotFoundException();
};

/**
 * Payroll. School routes: `X-School-Id` + the `payroll` grant. HR prepares (reads, creates, edits); the PRINCIPAL alone approves; the BURSAR alone pays
 * (the `delete` tier of the grant, which only the Bursar holds); only the Bursar deletes. There is no statutory calculation (ADR-0012).
 */
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  // ---- salary structure (per person)
  @Permission('payroll', 'read')
  @Get('staff/:staffId/salary')
  salary(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StaffIdParamDto): Promise<SalaryDto> {
    wideRead(g);
    return this.payroll.salary(t, p.staffId);
  }

  @Permission('payroll', 'create')
  @Audit({ action: 'payroll.salaryline.add', operation: 'AddSalaryLine' })
  @Post('staff/:staffId/salary-lines')
  addLine(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StaffIdParamDto, @Body() dto: CreateSalaryLineDto): Promise<SalaryDto> {
    wide(g);
    return this.payroll.addSalaryLine(t, p.staffId, dto);
  }

  @Permission('payroll', 'update')
  @Audit({ action: 'payroll.salaryline.update', operation: 'UpdateSalaryLine' })
  @Patch('salary-lines/:id')
  updateLine(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: PayrollIdParamDto, @Body() dto: UpdateSalaryLineDto): Promise<SalaryDto> {
    wide(g);
    return this.payroll.updateSalaryLine(t, p.id, dto);
  }

  @Permission('payroll', 'delete')
  @Audit({ action: 'payroll.salaryline.remove', operation: 'RemoveSalaryLine' })
  @Delete('salary-lines/:id')
  removeLine(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: PayrollIdParamDto): Promise<SalaryDto> {
    wide(g);
    return this.payroll.removeSalaryLine(t, p.id);
  }

  // ---- runs
  @Permission('payroll', 'read')
  @Get('runs')
  async runs(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Query() q: ListRunsQueryDto): Promise<PayrollRunListDto> {
    return g.scope === 'school' ? this.payroll.listRuns(t, q.limit) : { items: [] };
  }

  @Permission('payroll', 'read')
  @Get('runs/:id')
  run(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: PayrollIdParamDto): Promise<PayrollRunDto> {
    wideRead(g);
    return this.payroll.getRun(t, p.id);
  }

  /** Makes the month's draft: a payslip for every active staff member with salary lines, copied from those lines. */
  @Permission('payroll', 'create')
  @Audit({ action: 'payroll.run.create', operation: 'CreatePayrollRun' })
  @Strict()
  @Post('runs')
  createRun(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Body() dto: CreatePayrollRunDto): Promise<PayrollRunDto> {
    wide(g);
    return this.payroll.createRun(t, dto);
  }

  @Permission('payroll', 'delete')
  @Audit({ action: 'payroll.run.delete', operation: 'DeletePayrollRun' })
  @HttpCode(204)
  @Delete('runs/:id')
  async deleteRun(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: PayrollIdParamDto): Promise<void> {
    wide(g);
    await this.payroll.deleteRun(t, p.id);
  }

  /** The Principal approves the draft; after this nothing in the run can change. */
  @Permission('payroll', 'approve')
  @Audit({ action: 'payroll.run.approve', operation: 'ApprovePayrollRun' })
  @HttpCode(200)
  @Post('runs/:id/approve')
  approve(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: PayrollIdParamDto): Promise<PayrollRunDto> {
    wide(g);
    return this.payroll.approve(t, p.id);
  }

  /**
   * The Bursar records that the approved salaries were paid. Paying sits at the `delete` tier of the payroll grant, which only the Bursar holds
   * (guardrails: "preparing is not paying or deleting": HR prepares and edits, cannot pay); the database also checks the actor is the Bursar.
   */
  @Permission('payroll', 'delete')
  @Audit({ action: 'payroll.run.pay', operation: 'MarkPayrollRunPaid' })
  @HttpCode(200)
  @Post('runs/:id/pay')
  pay(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: PayrollIdParamDto, @Body() dto: PayRunDto): Promise<PayrollRunDto> {
    wide(g);
    return this.payroll.pay(t, p.id, dto);
  }

  // ---- lines of a draft payslip
  @Permission('payroll', 'update')
  @Audit({ action: 'payroll.payslipline.add', operation: 'AddPayslipLine' })
  @Post('payslips/:id/lines')
  addPayslipLine(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: PayrollIdParamDto, @Body() dto: AddPayslipLineDto): Promise<PayrollRunDto> {
    wide(g);
    return this.payroll.addPayslipLine(t, p.id, dto);
  }

  @Permission('payroll', 'update')
  @Audit({ action: 'payroll.payslipline.remove', operation: 'RemovePayslipLine' })
  @Delete('payslip-lines/:id')
  removePayslipLine(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: PayrollIdParamDto): Promise<PayrollRunDto> {
    wide(g);
    return this.payroll.removePayslipLine(t, p.id);
  }

  // ---- payslips
  @Permission('payroll', 'read')
  @Get('payslips/:id')
  payslip(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: PayrollIdParamDto): Promise<PayslipDto> {
    wideRead(g);
    return this.payroll.payslip(t, p.id);
  }

  @Permission('payroll', 'read')
  @Strict()
  @Get('payslips/:id/pdf')
  async payslipPdf(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: PayrollIdParamDto, @Query() q: PayslipPdfQueryDto): Promise<StreamableFile> {
    wideRead(g);
    const { bytes, fileName } = await this.payroll.payslipPdf(t, p.id, q.lang);
    return new StreamableFile(bytes, { type: 'application/pdf', disposition: `inline; filename="${fileName}"` });
  }
}
