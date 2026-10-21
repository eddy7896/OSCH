import { Body, Controller, Get, Patch, Put } from '@nestjs/common';
import { Audit } from '../audit/audit.decorators.js';
import { Permission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import { SchoolProfileDto, SetSchoolLogoDto, UpdateSchoolProfileDto } from './dto/school.dto.js';
import { SchoolService } from './school.service.js';

/** The active school's profile and branding. School routes: `X-School-Id` + the `settings` grant (System Admin edits, Principal reads). */
@Controller('school')
export class SchoolController {
  constructor(private readonly school: SchoolService) {}

  @Permission('settings', 'read')
  @Get('profile')
  profile(@Tenant() tenant: TenantContext): Promise<SchoolProfileDto> {
    return this.school.profile(tenant);
  }

  @Permission('settings', 'update')
  @Audit({ action: 'school.profile.update', operation: 'UpdateSchoolProfile' })
  @Patch('profile')
  update(@Tenant() tenant: TenantContext, @Body() dto: UpdateSchoolProfileDto): Promise<SchoolProfileDto> {
    return this.school.update(tenant, dto);
  }

  /** Attach an uploaded file (the `key` from `POST /uploads/school-logo`) as the logo. */
  @Permission('settings', 'update')
  @Audit({ action: 'school.logo.set', operation: 'SetSchoolLogo' })
  @Put('logo')
  setLogo(@Tenant() tenant: TenantContext, @Body() dto: SetSchoolLogoDto): Promise<SchoolProfileDto> {
    return this.school.setLogo(tenant, dto);
  }
}
