import { Controller, Get, Query } from '@nestjs/common';
import { Permission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import { TombstoneListDto, TombstoneQueryDto } from './dto/sync.dto.js';
import { SyncService } from './sync.service.js';

/** Removals since a moment, for a device that was offline (P3-10). The `academics` grant is the door; each type is then checked against its own resource. */
@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Permission('academics', 'read')
  @Get('tombstones')
  tombstones(@Tenant() t: TenantContext, @Query() q: TombstoneQueryDto): Promise<TombstoneListDto> {
    return this.sync.tombstones(t, q.since, q.entityType, q.limit);
  }
}
