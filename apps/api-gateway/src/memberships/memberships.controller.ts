import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { Audit } from '../audit/audit.decorators.js';
import { Permission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import { AddMembershipDto, UpdateMembershipDto, UserIdParamDto } from './dto/membership-requests.dto.js';
import type { MembershipDto, MembershipListDto } from './dto/membership.dto.js';
import { MembershipsService } from './memberships.service.js';

/** Who may sign in to the active school and with which role. A school route: `X-School-Id` + the `memberships` grant (System Admin only). */
@Controller('memberships')
export class MembershipsController {
  constructor(private readonly memberships: MembershipsService) {}

  @Permission('memberships', 'read')
  @Get()
  list(@Tenant() tenant: TenantContext): Promise<MembershipListDto> {
    return this.memberships.list(tenant);
  }

  @Permission('memberships', 'create')
  @Audit({ action: 'membership.add', operation: 'AddMembership' })
  @Post()
  add(@Tenant() tenant: TenantContext, @Body() dto: AddMembershipDto): Promise<MembershipDto> {
    return this.memberships.add(tenant, dto);
  }

  @Permission('memberships', 'update')
  @Audit({ action: 'membership.update', operation: 'UpdateMembership' })
  @Patch(':userId')
  update(@Tenant() tenant: TenantContext, @Param() p: UserIdParamDto, @Body() dto: UpdateMembershipDto): Promise<MembershipDto> {
    return this.memberships.update(tenant, p.userId, dto);
  }

  @Permission('memberships', 'delete')
  @Audit({ action: 'membership.remove', operation: 'RemoveMembership' })
  @HttpCode(204)
  @Delete(':userId')
  async remove(@Tenant() tenant: TenantContext, @Param() p: UserIdParamDto): Promise<void> {
    await this.memberships.remove(tenant, p.userId);
  }
}
