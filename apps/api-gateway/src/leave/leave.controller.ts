import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { Audit } from '../audit/audit.decorators.js';
import { Granted, Permission, type GrantedPermission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import {
  BalanceListDto, BalanceParamDto, BalancesQueryDto, CreateRequestDto, CreateTypeDto, IdParamDto, LeaveRequestDto, LeaveRequestListDto, LeaveTypeDto, LeaveTypeListDto, ListRequestsQueryDto, RejectDto, SetBalanceDto, UpdateTypeDto,
} from './dto/leave.dto.js';
import { LeaveService } from './leave.service.js';

/**
 * Leave (P3-6). School routes: `X-School-Id` + the `leave` grant. An employee asks for their own leave (own scope); HR keeps the types and allowances and can never approve;
 * the PRINCIPAL alone approves or rejects (and the database checks it again); the Bursar, Academic admin and Principal read.
 */
@Controller('leave')
export class LeaveController {
  constructor(private readonly leave: LeaveService) {}

  /** Types and allowances are the school's: the self-service `create` every employee holds at own scope is for their own requests only. */
  private schoolOnly(g: GrantedPermission): void {
    if (g.scope !== 'school') throw new ForbiddenException();
  }

  @Permission('leave', 'read')
  @Get('types')
  types(@Tenant() t: TenantContext): Promise<LeaveTypeListDto> {
    return this.leave.types(t);
  }

  @Permission('leave', 'create')
  @Audit({ action: 'leave.type.create', operation: 'CreateLeaveType' })
  @Post('types')
  createType(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Body() dto: CreateTypeDto): Promise<LeaveTypeDto> {
    this.schoolOnly(g);
    return this.leave.createType(t, dto);
  }

  @Permission('leave', 'update')
  @Audit({ action: 'leave.type.update', operation: 'UpdateLeaveType' })
  @Patch('types/:id')
  updateType(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto, @Body() dto: UpdateTypeDto): Promise<LeaveTypeDto> {
    this.schoolOnly(g);
    return this.leave.updateType(t, p.id, dto);
  }

  /** No role holds a delete grant on leave (matrix), so removing an unused type is HR's `update`. */
  @Permission('leave', 'update')
  @Audit({ action: 'leave.type.delete', operation: 'DeleteLeaveType' })
  @HttpCode(204)
  @Delete('types/:id')
  async deleteType(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto): Promise<void> {
    this.schoolOnly(g);
    await this.leave.deleteType(t, p.id);
  }

  @Permission('leave', 'read')
  @Get('balances')
  balances(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Query() q: BalancesQueryDto): Promise<BalanceListDto> {
    return this.leave.balances(t, g.scope, q.staffId, q.academicYearId);
  }

  @Permission('leave', 'update')
  @Audit({ action: 'leave.balance.set', operation: 'SetLeaveBalance' })
  @Put('balances/:staffId/:typeId')
  setBalance(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: BalanceParamDto, @Body() dto: SetBalanceDto): Promise<BalanceListDto> {
    this.schoolOnly(g);
    return this.leave.setBalance(t, p.staffId, p.typeId, dto.allowedDays, dto.academicYearId);
  }

  @Permission('leave', 'read')
  @Get('requests')
  requests(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Query() q: ListRequestsQueryDto): Promise<LeaveRequestListDto> {
    return this.leave.list(t, g.scope, q);
  }

  /** Asks for leave for the caller's own staff record. */
  @Permission('leave', 'create')
  @Audit({ action: 'leave.request.create', operation: 'CreateLeaveRequest' })
  @Post('requests')
  create(@Tenant() t: TenantContext, @Body() dto: CreateRequestDto): Promise<LeaveRequestDto> {
    return this.leave.create(t, dto);
  }

  @Permission('leave', 'create')
  @Audit({ action: 'leave.request.cancel', operation: 'CancelLeaveRequest' })
  @HttpCode(200)
  @Post('requests/:id/cancel')
  cancel(@Tenant() t: TenantContext, @Param() p: IdParamDto): Promise<LeaveRequestDto> {
    return this.leave.cancel(t, p.id);
  }

  /** Only the Principal holds `approve`; the database checks it again in the same transaction that takes the days from the balance. */
  @Permission('leave', 'approve')
  @Audit({ action: 'leave.request.approve', operation: 'ApproveLeaveRequest' })
  @HttpCode(200)
  @Post('requests/:id/approve')
  approve(@Tenant() t: TenantContext, @Param() p: IdParamDto): Promise<LeaveRequestDto> {
    return this.leave.approve(t, p.id);
  }

  @Permission('leave', 'approve')
  @Audit({ action: 'leave.request.reject', operation: 'RejectLeaveRequest' })
  @HttpCode(200)
  @Post('requests/:id/reject')
  reject(@Tenant() t: TenantContext, @Param() p: IdParamDto, @Body() dto: RejectDto): Promise<LeaveRequestDto> {
    return this.leave.reject(t, p.id, dto.note);
  }
}
