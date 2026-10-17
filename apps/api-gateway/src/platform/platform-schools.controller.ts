import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Audit } from '../audit/audit.decorators.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/authenticated-user.js';
import { Permission } from '../permission/permission.decorator.js';
import { Platform } from '../tenant/tenant.decorators.js';
import { CreateSchoolDto } from './dto/create-school.dto.js';
import { ListSchoolsQueryDto } from './dto/list-schools-query.dto.js';
import type { SchoolDto, SchoolPageDto } from './dto/school.dto.js';
import { SchoolStatusDto } from './dto/school-status.dto.js';
import { UpdateSchoolDto } from './dto/update-school.dto.js';
import { PlatformSchoolsService } from './platform-schools.service.js';

/** Platform administration of schools. SUPER_ADMIN only: `@Platform()` plus the `platform_schools` grant in packages/rbac. */
@Controller('platform/schools')
@Platform()
export class PlatformSchoolsController {
  constructor(private readonly schools: PlatformSchoolsService) {}

  @Permission('platform_schools', 'read')
  @Get()
  list(@Query() q: ListSchoolsQueryDto): Promise<SchoolPageDto> {
    return this.schools.list(q.limit, q.offset);
  }

  @Permission('platform_schools', 'read')
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<SchoolDto> {
    return this.schools.get(id);
  }

  @Permission('platform_schools', 'create')
  @Audit({ action: 'platform.school.create', operation: 'ProvisionSchool' })
  @Post()
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateSchoolDto): Promise<SchoolDto> {
    return this.schools.create(actor, dto);
  }

  @Permission('platform_schools', 'update')
  @Audit({ action: 'school.update', operation: 'UpdateSchool' })
  @Patch(':id')
  update(@CurrentUser() actor: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSchoolDto): Promise<SchoolDto> {
    return this.schools.update(actor, id, dto);
  }

  @Permission('platform_schools', 'update')
  @Audit({ action: 'platform.school.status', operation: 'SetSubscriptionStatus' })
  @HttpCode(200)
  @Post(':id/suspend')
  suspend(@CurrentUser() actor: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SchoolStatusDto): Promise<SchoolDto> {
    return this.schools.setStatus(actor, id, 'SUSPENDED', dto.reason);
  }

  @Permission('platform_schools', 'update')
  @Audit({ action: 'platform.school.status', operation: 'SetSubscriptionStatus' })
  @HttpCode(200)
  @Post(':id/activate')
  activate(@CurrentUser() actor: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SchoolStatusDto): Promise<SchoolDto> {
    return this.schools.setStatus(actor, id, 'ACTIVE', dto.reason);
  }
}
