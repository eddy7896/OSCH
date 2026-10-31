import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { Audit, NoAudit } from '../audit/audit.decorators.js';
import { Strict } from '../common/throttle.guards.js';
import { Granted, Permission, type GrantedPermission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import { AddResourceDto, FileUploadTicketDto, IdParamDto, ListResourcesQueryDto, ResourceUploadRequestDto, SignedReadDto, type ResourceDto, type ResourceListDto } from './dto/resources.dto.js';
import { ResourcesService } from './resources.service.js';

/**
 * Worksheets and workbooks for a class (P5-11, ADR-0016). A teacher adds for a class and subject she teaches and removes her own; the Academic admin may do both for any class;
 * the parents of the class read them (linked scope). Files are in the private bucket and are read through short-lived addresses.
 */
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resources: ResourcesService) {}

  @Permission('learning_resources', 'read')
  @Get()
  list(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Query() q: ListResourcesQueryDto): Promise<ResourceListDto> {
    return this.resources.list(t, g.scope, q.classId);
  }

  @Permission('learning_resources', 'create')
  @NoAudit('Issues a short-lived upload address and changes nothing; adding the resource is a separate, audited step.')
  @Strict()
  @HttpCode(200)
  @Post('uploads')
  ticket(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Body() dto: ResourceUploadRequestDto): Promise<FileUploadTicketDto> {
    return this.resources.uploadTicket(t, g.scope, dto);
  }

  @Permission('learning_resources', 'create')
  @Audit({ action: 'resource.add', operation: 'AddLearningResource' })
  @Post()
  add(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Body() dto: AddResourceDto): Promise<ResourceDto> {
    return this.resources.add(t, g.scope, dto);
  }

  @Permission('learning_resources', 'read')
  @Get(':id')
  one(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto): Promise<ResourceDto> {
    return this.resources.one(t, g.scope, p.id);
  }

  @Permission('learning_resources', 'read')
  @Get(':id/download')
  download(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto): Promise<SignedReadDto> {
    return this.resources.downloadUrl(t, g.scope, p.id);
  }

  @Permission('learning_resources', 'delete')
  @Audit({ action: 'resource.remove', operation: 'RemoveLearningResource' })
  @HttpCode(204)
  @Delete(':id')
  async remove(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto): Promise<void> {
    await this.resources.remove(t, g.scope, p.id);
  }
}
