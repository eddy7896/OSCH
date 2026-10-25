import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { Audit } from '../audit/audit.decorators.js';
import { Granted, Permission, type GrantedPermission } from '../permission/permission.decorator.js';
import { TeachingScope } from '../teaching/teaching-scope.service.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import { AcademicsService } from './academics.service.js';
import {
  AcademicYearDto, AcademicYearListDto, ClassDto, ClassListDto, CreateAcademicYearDto, CreateClassDto, CreateGradeLevelDto, CreateSubjectDto, GradeLevelDto,
  GradeLevelListDto, IdParamDto, SubjectDto, SubjectListDto, UpdateAcademicYearDto, UpdateClassDto, UpdateGradeLevelDto, UpdateSubjectDto,
} from './dto/academics.dto.js';

/** Class levels, classes, subjects and academic years of the active school. School routes: `X-School-Id` + the `academics` grant (Academic Admin edits; Principal, Admissions and others read). A Teacher (`own`) sees only their classes and a Parent (`linked`) only their children's classes (P3-2). */
@Controller('academics')
export class AcademicsController {
  constructor(private readonly academics: AcademicsService, private readonly scope: TeachingScope) {}

  @Permission('academics', 'read')
  @Get('levels')
  async levels(@Tenant() tenant: TenantContext, @Granted() g: GrantedPermission): Promise<GradeLevelListDto> {
    const items = await this.academics.levels(tenant);
    const visible = await this.scope.visibleClassIds(tenant, g.scope);
    if (!visible) return { items };
    // own and linked scopes see only the classes that are theirs, and the levels those classes belong to
    return { items: items.map((l) => ({ ...l, classes: l.classes.filter((c) => visible.has(c.id)) })).filter((l) => l.classes.length > 0) };
  }

  @Permission('academics', 'create')
  @Audit({ action: 'academic.gradelevel.create', operation: 'CreateGradeLevel' })
  @Post('levels')
  createLevel(@Tenant() tenant: TenantContext, @Body() dto: CreateGradeLevelDto): Promise<GradeLevelDto> {
    return this.academics.createLevel(tenant, dto);
  }

  @Permission('academics', 'update')
  @Audit({ action: 'academic.gradelevel.update', operation: 'UpdateGradeLevel' })
  @Patch('levels/:id')
  updateLevel(@Tenant() tenant: TenantContext, @Param() p: IdParamDto, @Body() dto: UpdateGradeLevelDto): Promise<GradeLevelDto> {
    return this.academics.updateLevel(tenant, p.id, dto);
  }

  @Permission('academics', 'delete')
  @Audit({ action: 'academic.gradelevel.delete', operation: 'DeleteGradeLevel' })
  @HttpCode(204)
  @Delete('levels/:id')
  async deleteLevel(@Tenant() tenant: TenantContext, @Param() p: IdParamDto): Promise<void> {
    await this.academics.deleteLevel(tenant, p.id);
  }

  @Permission('academics', 'read')
  @Get('classes')
  async classes(@Tenant() tenant: TenantContext, @Granted() g: GrantedPermission): Promise<ClassListDto> {
    const items = await this.academics.classes(tenant);
    const visible = await this.scope.visibleClassIds(tenant, g.scope);
    return { items: visible ? items.filter((c) => visible.has(c.id)) : items };
  }

  @Permission('academics', 'create')
  @Audit({ action: 'academic.class.create', operation: 'CreateClassroom' })
  @Post('classes')
  createClass(@Tenant() tenant: TenantContext, @Body() dto: CreateClassDto): Promise<ClassDto> {
    return this.academics.createClass(tenant, dto);
  }

  @Permission('academics', 'update')
  @Audit({ action: 'academic.class.update', operation: 'UpdateClassroom' })
  @Patch('classes/:id')
  updateClass(@Tenant() tenant: TenantContext, @Param() p: IdParamDto, @Body() dto: UpdateClassDto): Promise<ClassDto> {
    return this.academics.updateClass(tenant, p.id, dto);
  }

  @Permission('academics', 'delete')
  @Audit({ action: 'academic.class.delete', operation: 'DeleteClassroom' })
  @HttpCode(204)
  @Delete('classes/:id')
  async deleteClass(@Tenant() tenant: TenantContext, @Param() p: IdParamDto): Promise<void> {
    await this.academics.deleteClass(tenant, p.id);
  }

  @Permission('academics', 'read')
  @Get('subjects')
  async subjects(@Tenant() tenant: TenantContext): Promise<SubjectListDto> {
    return { items: await this.academics.subjects(tenant) };
  }

  @Permission('academics', 'create')
  @Audit({ action: 'academic.subject.create', operation: 'CreateSubject' })
  @Post('subjects')
  createSubject(@Tenant() tenant: TenantContext, @Body() dto: CreateSubjectDto): Promise<SubjectDto> {
    return this.academics.createSubject(tenant, dto);
  }

  @Permission('academics', 'update')
  @Audit({ action: 'academic.subject.update', operation: 'UpdateSubject' })
  @Patch('subjects/:id')
  updateSubject(@Tenant() tenant: TenantContext, @Param() p: IdParamDto, @Body() dto: UpdateSubjectDto): Promise<SubjectDto> {
    return this.academics.updateSubject(tenant, p.id, dto);
  }

  @Permission('academics', 'delete')
  @Audit({ action: 'academic.subject.delete', operation: 'DeleteSubject' })
  @HttpCode(204)
  @Delete('subjects/:id')
  async deleteSubject(@Tenant() tenant: TenantContext, @Param() p: IdParamDto): Promise<void> {
    await this.academics.deleteSubject(tenant, p.id);
  }

  @Permission('academics', 'read')
  @Get('years')
  async years(@Tenant() tenant: TenantContext): Promise<AcademicYearListDto> {
    return { items: await this.academics.years(tenant) };
  }

  @Permission('academics', 'create')
  @Audit({ action: 'academic.year.create', operation: 'CreateAcademicYear' })
  @Post('years')
  createYear(@Tenant() tenant: TenantContext, @Body() dto: CreateAcademicYearDto): Promise<AcademicYearDto> {
    return this.academics.createYear(tenant, dto);
  }

  @Permission('academics', 'update')
  @Audit({ action: 'academic.year.update', operation: 'UpdateAcademicYear' })
  @Patch('years/:id')
  updateYear(@Tenant() tenant: TenantContext, @Param() p: IdParamDto, @Body() dto: UpdateAcademicYearDto): Promise<AcademicYearDto> {
    return this.academics.updateYear(tenant, p.id, dto);
  }

  /** Makes this the school's one active year; the previous one becomes ARCHIVED. */
  @Permission('academics', 'update')
  @Audit({ action: 'academic.year.activate', operation: 'ActivateAcademicYear' })
  @HttpCode(200)
  @Post('years/:id/activate')
  activateYear(@Tenant() tenant: TenantContext, @Param() p: IdParamDto): Promise<AcademicYearDto> {
    return this.academics.activateYear(tenant, p.id);
  }

  @Permission('academics', 'delete')
  @Audit({ action: 'academic.year.delete', operation: 'DeleteAcademicYear' })
  @HttpCode(204)
  @Delete('years/:id')
  async deleteYear(@Tenant() tenant: TenantContext, @Param() p: IdParamDto): Promise<void> {
    await this.academics.deleteYear(tenant, p.id);
  }
}
