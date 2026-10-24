import { Body, Controller, ForbiddenException, Get, HttpCode, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { Audit, NoAudit } from '../audit/audit.decorators.js';
import { Strict } from '../common/throttle.guards.js';
import { Granted, Permission, type GrantedPermission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import { IdParamDto, StudentParamDto } from './dto/fees.dto.js';
import {
  CreateInvoiceDto, GenerateInvoicesDto, GenerateResultDto, InvoiceDto, InvoiceListDto, ListInvoicesQueryDto, OutstandingDto, OutstandingQueryDto, PaymentIdParamDto, RecordPaymentDto,
  ReversePaymentDto, StatementDto, StatementQueryDto,
} from './dto/invoices.dto.js';
import { InvoicesService } from './invoices.service.js';

const wide = (g: GrantedPermission): void => {
  if (g.scope !== 'school') throw new ForbiddenException();
};
const wideRead = (g: GrantedPermission): void => {
  if (g.scope !== 'school') throw new NotFoundException();
};
const DRY = 'A dry run only counts what would be billed: it writes nothing, not even an audit row.';

/**
 * Invoices, payments and what is still owed. School routes: `X-School-Id` + the `finance` grant (Bursar full; Accountant reads, creates and
 * records payments but cannot reverse one; Principal reads). Parents seeing their own child's invoices arrives later.
 */
@Controller('fees')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Permission('finance', 'read')
  @Get('invoices')
  async list(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Query() q: ListInvoicesQueryDto): Promise<InvoiceListDto> {
    if (g.scope !== 'school') return { items: [], total: 0, page: q.page ?? 1, pageSize: q.pageSize ?? 25, totals: { count: 0, amountMinor: '0', paidMinor: '0', outstandingMinor: '0' } };
    return this.invoices.list(t, q);
  }

  @Permission('finance', 'read')
  @Get('invoices/:id')
  get(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto): Promise<InvoiceDto> {
    wideRead(g);
    return this.invoices.get(t, p.id);
  }

  /** An invoice for something that is not a fee instalment (a fine, a trip). */
  @Permission('finance', 'create')
  @Audit({ action: 'fees.invoice.create', operation: 'CreateInvoice' })
  @Post('invoices')
  create(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Body() dto: CreateInvoiceDto): Promise<InvoiceDto> {
    wide(g);
    return this.invoices.createManual(t, dto);
  }

  /** Bill the instalments due on or before a date. Safe to repeat: instalments already billed are left alone. */
  @Permission('finance', 'create')
  @Audit({ action: 'fees.invoice.create', operation: 'CreateInstalmentInvoice' })
  @Strict()
  @HttpCode(200)
  @Post('invoices/generate')
  generate(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Body() dto: GenerateInvoicesDto): Promise<GenerateResultDto> {
    wide(g);
    return this.invoices.generate(t, dto);
  }

  @Permission('finance', 'create')
  @NoAudit(DRY)
  @Strict()
  @HttpCode(200)
  @Post('invoices/generate/preview')
  preview(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Body() dto: GenerateInvoicesDto): Promise<GenerateResultDto> {
    wide(g);
    return this.invoices.generate(t, { ...dto, dryRun: true });
  }

  @Permission('finance', 'create')
  @Audit({ action: 'fees.payment.record', operation: 'RecordPayment' })
  @Post('invoices/:id/payments')
  pay(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto, @Body() dto: RecordPaymentDto): Promise<InvoiceDto> {
    wide(g);
    return this.invoices.recordPayment(t, p.id, dto);
  }

  /** Takes a payment back out (a wrong amount or the wrong child). The payment stays on the record, marked reversed. */
  @Permission('finance', 'delete')
  @Audit({ action: 'fees.payment.reverse', operation: 'ReversePayment' })
  @HttpCode(200)
  @Post('payments/:id/reverse')
  reverse(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: PaymentIdParamDto, @Body() dto: ReversePaymentDto): Promise<InvoiceDto> {
    wide(g);
    return this.invoices.reversePayment(t, p.id, dto.reason);
  }

  /** Unpaid money in ageing bands: not yet due, 1 to 30, 31 to 60, 61 to 90 and over 90 days overdue. */
  @Permission('finance', 'read')
  @Get('outstanding')
  async outstanding(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Query() q: OutstandingQueryDto): Promise<OutstandingDto> {
    wideRead(g);
    return this.invoices.outstanding(t, q.asOf);
  }

  @Permission('finance', 'read')
  @Get('students/:studentId/statement')
  statement(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StudentParamDto, @Query() q: StatementQueryDto): Promise<StatementDto> {
    wideRead(g);
    return this.invoices.statement(t, p.studentId, q.academicYearId);
  }
}
