import { Body, Controller, ForbiddenException, Get, HttpCode, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { can } from '@oruschools/rbac';
import { Audit } from '../audit/audit.decorators.js';
import { Granted, Permission, type GrantedPermission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import { AdmissionsService } from './admissions.service.js';
import {
  AdmitApplicationDto, AdmitResultDto, ApplicationDto, ApplicationIdParamDto, ApplicationListDto, CreateApplicationDto, DecideApplicationDto, ListApplicationsQueryDto,
  UpdateApplicationDto,
} from './dto/admissions.dto.js';

const isSchoolWide = (g: GrantedPermission): boolean => g.scope === 'school';
const wide = (g: GrantedPermission): void => {
  if (!isSchoolWide(g)) throw new ForbiddenException();
};

/** Admission applications of the active school. School routes: `X-School-Id` + the `admissions` grant (Academic Admin and Admissions Officer work them; Principal reads). */
@Controller('admissions')
export class AdmissionsController {
  constructor(private readonly admissions: AdmissionsService) {}

  @Permission('admissions', 'read')
  @Get()
  list(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Query() q: ListApplicationsQueryDto): Promise<ApplicationListDto> {
    if (!isSchoolWide(g)) return Promise.resolve({ items: [], total: 0, page: q.page ?? 1, pageSize: q.pageSize ?? 25 });
    return this.admissions.list(t, q);
  }

  @Permission('admissions', 'read')
  @Get(':id')
  get(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: ApplicationIdParamDto): Promise<ApplicationDto> {
    if (!isSchoolWide(g)) throw new NotFoundException();
    return this.admissions.get(t, p.id);
  }

  @Permission('admissions', 'create')
  @Audit({ action: 'admission.application.create', operation: 'CreateApplication' })
  @Post()
  create(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Body() dto: CreateApplicationDto): Promise<ApplicationDto> {
    wide(g);
    return this.admissions.create(t, dto);
  }

  @Permission('admissions', 'update')
  @Audit({ action: 'admission.application.update', operation: 'UpdateApplication' })
  @Patch(':id')
  update(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: ApplicationIdParamDto, @Body() dto: UpdateApplicationDto): Promise<ApplicationDto> {
    wide(g);
    return this.admissions.update(t, p.id, dto);
  }

  /** Move the application to its next review status (under review, accepted, rejected or withdrawn). */
  @Permission('admissions', 'update')
  @Audit({ action: 'admission.application.decide', operation: 'DecideApplication' })
  @HttpCode(200)
  @Post(':id/decision')
  decide(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: ApplicationIdParamDto, @Body() dto: DecideApplicationDto): Promise<ApplicationDto> {
    wide(g);
    return this.admissions.decide(t, p.id, dto);
  }

  /** Admit an accepted application: creates the student, places them in the class and records the guardian, all or nothing. Needs the `students` create grant as well. */
  @Permission('admissions', 'update')
  @Audit({ action: 'admission.admit', operation: 'AdmitApplication' })
  @Post(':id/admit')
  admit(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: ApplicationIdParamDto, @Body() dto: AdmitApplicationDto): Promise<AdmitResultDto> {
    wide(g);
    if (!can({ schoolRole: t.schoolRole }, 'students', 'create')) throw new ForbiddenException();
    return this.admissions.admit(t, p.id, dto);
  }
}
