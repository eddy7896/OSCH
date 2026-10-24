import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { Audit } from '../audit/audit.decorators.js';
import { Granted, Permission, type GrantedPermission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import {
  ConcessionDto, ConcessionListDto, CreateConcessionDto, CreateItemDto, CreateStructureDto, FeeStructureDto, FeeStructureListDto, IdParamDto, ListConcessionsQueryDto,
  ListStructuresQueryDto, NewInstalmentDto, ScheduleDto, ScheduleQueryDto, StudentParamDto, UpdateInstalmentDto, UpdateItemDto, UpdateStructureDto,
} from './dto/fees.dto.js';
import { FeesService } from './fees.service.js';

/** Fee records are school-wide only; the own/linked scopes (a parent seeing their child's fees) are served later, with invoices. */
const wide = (g: GrantedPermission): void => {
  if (g.scope !== 'school') throw new ForbiddenException();
};
const wideRead = (g: GrantedPermission): void => {
  if (g.scope !== 'school') throw new NotFoundException();
};

/**
 * Fee structures per class level and academic year, their fees and instalments, and student concessions.
 * School routes: `X-School-Id` + the `finance` grant (Bursar full; Accountant reads, creates and updates but cannot delete; Principal reads).
 */
@Controller('fees')
export class FeesController {
  constructor(private readonly fees: FeesService) {}

  @Permission('finance', 'read')
  @Get('structures')
  async structures(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Query() q: ListStructuresQueryDto): Promise<FeeStructureListDto> {
    return { items: g.scope === 'school' ? await this.fees.listStructures(t, q) : [] };
  }

  @Permission('finance', 'read')
  @Get('structures/:id')
  getStructure(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto): Promise<FeeStructureDto> {
    wideRead(g);
    return this.fees.getStructure(t, p.id);
  }

  @Permission('finance', 'create')
  @Audit({ action: 'fees.structure.create', operation: 'CreateFeeStructure' })
  @Post('structures')
  createStructure(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Body() dto: CreateStructureDto): Promise<FeeStructureDto> {
    wide(g);
    return this.fees.createStructure(t, dto);
  }

  @Permission('finance', 'update')
  @Audit({ action: 'fees.structure.update', operation: 'UpdateFeeStructure' })
  @Patch('structures/:id')
  updateStructure(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto, @Body() dto: UpdateStructureDto): Promise<FeeStructureDto> {
    wide(g);
    return this.fees.updateStructure(t, p.id, dto);
  }

  @Permission('finance', 'delete')
  @Audit({ action: 'fees.structure.delete', operation: 'DeleteFeeStructure' })
  @HttpCode(204)
  @Delete('structures/:id')
  async deleteStructure(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto): Promise<void> {
    wide(g);
    await this.fees.deleteStructure(t, p.id);
  }

  /** A fee with all its instalments (one for annual, three for terms, twelve for monthly), created all or nothing. */
  @Permission('finance', 'create')
  @Audit({ action: 'fees.item.create', operation: 'CreateFeeItem' })
  @Post('structures/:id/items')
  createItem(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto, @Body() dto: CreateItemDto): Promise<FeeStructureDto> {
    wide(g);
    return this.fees.createItem(t, p.id, dto);
  }

  @Permission('finance', 'update')
  @Audit({ action: 'fees.item.update', operation: 'UpdateFeeItem' })
  @Patch('items/:id')
  updateItem(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto, @Body() dto: UpdateItemDto): Promise<FeeStructureDto> {
    wide(g);
    return this.fees.updateItem(t, p.id, dto);
  }

  @Permission('finance', 'delete')
  @Audit({ action: 'fees.item.delete', operation: 'DeleteFeeItem' })
  @Delete('items/:id')
  deleteItem(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto): Promise<FeeStructureDto> {
    wide(g);
    return this.fees.deleteItem(t, p.id);
  }

  @Permission('finance', 'create')
  @Audit({ action: 'fees.instalment.add', operation: 'AddFeeInstalment' })
  @Post('items/:id/instalments')
  addInstalment(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto, @Body() dto: NewInstalmentDto): Promise<FeeStructureDto> {
    wide(g);
    return this.fees.addInstalment(t, p.id, dto);
  }

  @Permission('finance', 'update')
  @Audit({ action: 'fees.instalment.update', operation: 'UpdateFeeInstalment' })
  @Patch('instalments/:id')
  updateInstalment(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto, @Body() dto: UpdateInstalmentDto): Promise<FeeStructureDto> {
    wide(g);
    return this.fees.updateInstalment(t, p.id, dto);
  }

  @Permission('finance', 'delete')
  @Audit({ action: 'fees.instalment.delete', operation: 'DeleteFeeInstalment' })
  @Delete('instalments/:id')
  deleteInstalment(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto): Promise<FeeStructureDto> {
    wide(g);
    return this.fees.deleteInstalment(t, p.id);
  }

  @Permission('finance', 'read')
  @Get('concessions')
  async concessions(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Query() q: ListConcessionsQueryDto): Promise<ConcessionListDto> {
    return g.scope === 'school' ? this.fees.listConcessions(t, q) : { items: [] };
  }

  @Permission('finance', 'create')
  @Audit({ action: 'fees.concession.create', operation: 'CreateConcession' })
  @Post('concessions')
  createConcession(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Body() dto: CreateConcessionDto): Promise<ConcessionDto> {
    wide(g);
    return this.fees.createConcession(t, dto);
  }

  @Permission('finance', 'delete')
  @Audit({ action: 'fees.concession.delete', operation: 'DeleteConcession' })
  @HttpCode(204)
  @Delete('concessions/:id')
  async deleteConcession(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto): Promise<void> {
    wide(g);
    await this.fees.deleteConcession(t, p.id);
  }

  /** What one student owes for the year, line by line, with their concessions applied. Reads only; invoices come with P2-7b. */
  @Permission('finance', 'read')
  @Get('students/:studentId/schedule')
  schedule(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StudentParamDto, @Query() q: ScheduleQueryDto): Promise<ScheduleDto> {
    wideRead(g);
    return this.fees.schedule(t, p.studentId, q.academicYearId);
  }
}
