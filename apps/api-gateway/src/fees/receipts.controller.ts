import { Controller, Get, Header, NotFoundException, Param, Query, StreamableFile } from '@nestjs/common';
import { Strict } from '../common/throttle.guards.js';
import { Granted, Permission, type GrantedPermission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import { IdParamDto } from './dto/fees.dto.js';
import { ListReceiptsQueryDto, ReceiptDto, ReceiptListDto, ReceiptPdfQueryDto } from './dto/invoices.dto.js';
import { ReceiptsService } from './receipts.service.js';

const wideRead = (g: GrantedPermission): void => {
  if (g.scope !== 'school') throw new NotFoundException();
};

/**
 * Fee receipts. School routes: `X-School-Id` + the `finance` read grant. A receipt is created together with its payment (see
 * `POST /fees/invoices/:id/payments`), numbered per academic year; reversing the payment cancels it, it is never deleted.
 */
@Controller('fees')
export class ReceiptsController {
  constructor(private readonly receipts: ReceiptsService) {}

  @Permission('finance', 'read')
  @Get('receipts')
  async list(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Query() q: ListReceiptsQueryDto): Promise<ReceiptListDto> {
    if (g.scope !== 'school') return { items: [], total: 0, page: q.page ?? 1, pageSize: q.pageSize ?? 25, totalAmountMinor: '0' };
    return this.receipts.list(t, q);
  }

  /** Everything the printable receipt page shows. */
  @Permission('finance', 'read')
  @Get('receipts/:id')
  get(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto): Promise<ReceiptDto> {
    wideRead(g);
    return this.receipts.get(t, p.id);
  }

  @Permission('finance', 'read')
  @Get('payments/:id/receipt')
  byPayment(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto): Promise<ReceiptDto> {
    wideRead(g);
    return this.receipts.byPayment(t, p.id);
  }

  /** The receipt as a PDF (A5), to download or print. Labels in the school's language unless `lang` says otherwise. */
  @Permission('finance', 'read')
  @Strict()
  @Header('Cache-Control', 'private, no-store')
  @Get('receipts/:id/pdf')
  async pdf(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto, @Query() q: ReceiptPdfQueryDto): Promise<StreamableFile> {
    wideRead(g);
    const { bytes, fileName } = await this.receipts.pdf(t, p.id, q.lang);
    return new StreamableFile(bytes, { type: 'application/pdf', disposition: `inline; filename="${fileName}"` });
  }
}
