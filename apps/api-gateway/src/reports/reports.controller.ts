import { Controller, Get, Header, NotFoundException, Query, StreamableFile } from '@nestjs/common';
import { Strict } from '../common/throttle.guards.js';
import { Granted, Permission, type GrantedPermission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import {
  CollectionsExportQueryDto, CollectionsQueryDto, CollectionsReportDto, DuesExportQueryDto, DuesQueryDto, DuesReportDto, PayrollSummaryDto, PayrollSummaryExportQueryDto, PayrollSummaryQueryDto,
} from './dto/reports.dto.js';
import { ReportsService, type ExportFile } from './reports.service.js';

const wide = (g: GrantedPermission): void => {
  if (g.scope !== 'school') throw new NotFoundException();
};
const stream = (f: ExportFile): StreamableFile => new StreamableFile(f.bytes, { type: f.type, disposition: `attachment; filename="${f.fileName}"` });

/**
 * Reports (P2-9). School routes: `X-School-Id` + `reports_finance` (collections, fees outstanding) or `reports_hr` (payroll summary). The JSON routes
 * need `read`, the file routes `export` (a separate grant). Every report is read-only and is calculated from the books when asked, never stored.
 * Management sees the totals of a finance report but not the people in it (the rows are empty, and the file routes refuse).
 */
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /** Money taken in a date window: totals, by payment method and by day, and the payments themselves. */
  @Permission('reports_finance', 'read')
  @Get('finance/collections')
  collections(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Query() q: CollectionsQueryDto): Promise<CollectionsReportDto> {
    wide(g);
    return this.reports.collections(t, q);
  }

  /** The same payments as a CSV (opens in Excel, Hindi and Urdu included) or a PDF. */
  @Permission('reports_finance', 'export')
  @Strict()
  @Header('Cache-Control', 'private, no-store')
  @Get('finance/collections/export')
  async collectionsExport(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Query() q: CollectionsExportQueryDto): Promise<StreamableFile> {
    wide(g);
    return stream(await this.reports.collectionsFile(t, q));
  }

  /** Unpaid invoices that have fallen due, with how long each has been overdue and totals by age. */
  @Permission('reports_finance', 'read')
  @Get('finance/dues')
  dues(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Query() q: DuesQueryDto): Promise<DuesReportDto> {
    wide(g);
    return this.reports.dues(t, q);
  }

  @Permission('reports_finance', 'export')
  @Strict()
  @Header('Cache-Control', 'private, no-store')
  @Get('finance/dues/export')
  async duesExport(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Query() q: DuesExportQueryDto): Promise<StreamableFile> {
    wide(g);
    return stream(await this.reports.duesFile(t, q));
  }

  /** What a year of approved and paid pay runs cost: per month and per department. Totals only, no individual's pay. */
  @Permission('reports_hr', 'read')
  @Get('hr/payroll-summary')
  payroll(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Query() q: PayrollSummaryQueryDto): Promise<PayrollSummaryDto> {
    wide(g);
    return this.reports.payrollSummary(t, q.year);
  }

  @Permission('reports_hr', 'export')
  @Strict()
  @Header('Cache-Control', 'private, no-store')
  @Get('hr/payroll-summary/export')
  async payrollExport(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Query() q: PayrollSummaryExportQueryDto): Promise<StreamableFile> {
    wide(g);
    return stream(await this.reports.payrollSummaryFile(t, q));
  }
}
