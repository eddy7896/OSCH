import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Audit, NoAudit } from '../audit/audit.decorators.js';
import { Granted, Permission, type GrantedPermission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import { BroadcastsService } from './broadcasts.service.js';
import { BroadcastParamDto, CreateBroadcastDto, type BroadcastDetailDto, type BroadcastListDto } from './dto/broadcasts.dto.js';

/**
 * One-way messages to the parents of a class (P5-3c, ADR-0018). School routes: `X-School-Id` + the `broadcasts` grant. The class teacher (own scope, narrowed to her class) and the
 * Principal and Academic admin (school scope) send and read what was sent; a parent (linked scope) reads what was sent to their own children's classes and marks it read.
 */
@Controller('broadcasts')
export class BroadcastsController {
  constructor(private readonly broadcasts: BroadcastsService) {}

  @Permission('broadcasts', 'read')
  @Get()
  list(@Tenant() t: TenantContext, @Granted() g: GrantedPermission): Promise<BroadcastListDto> {
    return this.broadcasts.list(t, g.scope);
  }

  @Permission('broadcasts', 'create')
  @Audit({ action: 'broadcast.send', operation: 'CreateBroadcast' })
  @Post()
  create(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Body() dto: CreateBroadcastDto): Promise<BroadcastDetailDto> {
    return this.broadcasts.create(t, g.scope, dto);
  }

  @Permission('broadcasts', 'read')
  @Get(':id')
  one(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: BroadcastParamDto): Promise<BroadcastDetailDto> {
    return this.broadcasts.get(t, g.scope, p.id);
  }

  @Permission('broadcasts', 'update')
  @NoAudit('Records only that a parent opened a broadcast; it changes no message.')
  @HttpCode(204)
  @Post(':id/read')
  async read(@Tenant() t: TenantContext, @Param() p: BroadcastParamDto): Promise<void> {
    await this.broadcasts.markRead(t, p.id);
  }
}
