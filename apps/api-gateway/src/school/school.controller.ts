import { Body, Controller, Delete, Get, HttpCode, Patch, Put } from '@nestjs/common';
import { Audit } from '../audit/audit.decorators.js';
import { Permission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import { SchoolProfileDto, SetGeofenceDto, SetSchoolLogoDto, UpdateSchoolProfileDto } from './dto/school.dto.js';
import type { GeofenceDto } from '../attendance/dto/attendance.dto.js';
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

  /** Sets where the school is: a point, the grounds' radius and the feathered margin (ADR-0014 decision 9). The System Admin only. */
  @Permission('settings', 'update')
  @Audit({ action: 'school.geofence.set', operation: 'SetSchoolGeofence' })
  @Put('geofence')
  setGeofence(@Tenant() tenant: TenantContext, @Body() dto: SetGeofenceDto): Promise<GeofenceDto> {
    return this.school.setGeofence(tenant, dto);
  }

  /** Switches the geofence off: nobody is asked for a reason any more. */
  @Permission('settings', 'update')
  @Audit({ action: 'school.geofence.clear', operation: 'ClearSchoolGeofence' })
  @HttpCode(200)
  @Delete('geofence')
  clearGeofence(@Tenant() tenant: TenantContext): Promise<GeofenceDto> {
    return this.school.clearGeofence(tenant);
  }

  /** Attach an uploaded file (the `key` from `POST /uploads/school-logo`) as the logo. */
  @Permission('settings', 'update')
  @Audit({ action: 'school.logo.set', operation: 'SetSchoolLogo' })
  @Put('logo')
  setLogo(@Tenant() tenant: TenantContext, @Body() dto: SetSchoolLogoDto): Promise<SchoolProfileDto> {
    return this.school.setLogo(tenant, dto);
  }
}
