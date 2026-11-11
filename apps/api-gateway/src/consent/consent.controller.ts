import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Audit } from '../audit/audit.decorators.js';
import { Permission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import { ConsentExempt } from './consent.decorators.js';
import { ConsentService } from './consent.service.js';
import { type ConsentOverviewDto, type ConsentStatusDto, RecordConsentDto } from './dto/consent.dto.js';

/**
 * Parent consent (P6-5c). A parent reads where they stand and gives or withdraws consent to the privacy notice; these are the only routes a parent can use before consenting. The school's
 * System Admin and Principal see a read-only overview. Every other parent route is refused with CONSENT_REQUIRED until the parent has consented to the current notice (see consent.guard.ts).
 */
@Controller('consent')
export class ConsentController {
  constructor(private readonly consent: ConsentService) {}

  @ConsentExempt()
  @Permission('consent', 'read')
  @Get()
  status(@Tenant() t: TenantContext): Promise<ConsentStatusDto> {
    return this.consent.status(t);
  }

  @ConsentExempt()
  @Permission('consent', 'create')
  @Audit({ action: 'consent.record', operation: 'RecordConsent' })
  @HttpCode(200)
  @Post()
  record(@Tenant() t: TenantContext, @Body() dto: RecordConsentDto): Promise<ConsentStatusDto> {
    return this.consent.record(t, dto);
  }

  @Permission('consent_overview', 'read')
  @Get('overview')
  overview(@Tenant() t: TenantContext): Promise<ConsentOverviewDto> {
    return this.consent.overview(t);
  }
}
