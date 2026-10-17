import { Body, Controller, Post } from '@nestjs/common';
import { Audit } from '../audit/audit.decorators.js';
import { Strict } from '../common/throttle.guards.js';
import { Permission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import { AccountsService } from './accounts.service.js';
import { CreateStaffAccountDto } from './dto/create-staff-account.dto.js';
import type { StaffAccountDto } from './dto/staff-account.dto.js';

/** Create the account of a staff member or driver. School route: `memberships` grant, System Admin only. */
@Controller('memberships/accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  /**
   * Creates the sign-in account and the membership in one audited step (`membership.add`, `via: account`). Strictly rate
   * limited: an existing address answers 409, so this must not become an account-probing tool.
   */
  @Permission('memberships', 'create')
  @Audit({ action: 'membership.add', operation: 'AddMembership' })
  @Strict()
  @Post()
  create(@Tenant() tenant: TenantContext, @Body() dto: CreateStaffAccountDto): Promise<StaffAccountDto> {
    return this.accounts.create(tenant, dto);
  }
}
