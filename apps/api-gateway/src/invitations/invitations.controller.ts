import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Audit } from '../audit/audit.decorators.js';
import { Strict } from '../common/throttle.guards.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/authenticated-user.js';
import { Permission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext, UserScoped } from '../tenant/tenant.decorators.js';
import { AcceptedInvitationDto, CreatedInvitationDto, InvitationDto, InvitationListDto } from './dto/invitation.dto.js';
import { AcceptInvitationDto, CreateInvitationDto, InvitationIdParamDto } from './dto/invitation-requests.dto.js';
import { InvitationsService } from './invitations.service.js';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  /** The school's invitations (never the secret). School route: `memberships` grant, System Admin only. */
  @Permission('memberships', 'read')
  @Get()
  list(@Tenant() tenant: TenantContext): Promise<InvitationListDto> {
    return this.invitations.list(tenant);
  }

  @Permission('memberships', 'create')
  @Audit({ action: 'invitation.create', operation: 'CreateInvitation' })
  @Post()
  create(@Tenant() tenant: TenantContext, @Body() dto: CreateInvitationDto): Promise<CreatedInvitationDto> {
    return this.invitations.create(tenant, dto);
  }

  /**
   * Accept an invitation: any signed-in user holding the secret, whose VERIFIED email is the invited address. No school
   * header: the invitation names the school. Strictly rate limited per user (`THROTTLE_STRICT_LIMIT`, default 10 a minute): the secret is 256 bits, this is defence in depth.
   */
  @UserScoped()
  @Audit({ action: 'invitation.accept', operation: 'AcceptInvitation' })
  @Strict()
  @HttpCode(200)
  @Post('accept')
  accept(@CurrentUser() user: AuthenticatedUser, @Body() dto: AcceptInvitationDto): Promise<AcceptedInvitationDto> {
    return this.invitations.accept(user, dto.token);
  }

  @Permission('memberships', 'update')
  @Audit({ action: 'invitation.revoke', operation: 'RevokeInvitation' })
  @HttpCode(200)
  @Post(':id/revoke')
  revoke(@Tenant() tenant: TenantContext, @Param() p: InvitationIdParamDto): Promise<InvitationDto> {
    return this.invitations.revoke(tenant, p.id);
  }
}
