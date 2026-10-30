import { Body, Controller, Get, HttpCode, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { Audit } from '../audit/audit.decorators.js';
import { Granted, Permission, type GrantedPermission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import { CreateStudentLeaveDto, DecideStudentLeaveDto, IdParamDto, ListStudentLeaveQueryDto, type StudentLeaveDto, type StudentLeaveListDto } from './dto/student-leave.dto.js';
import { StudentLeaveService } from './student-leave.service.js';

/**
 * A parent's request for leave for their child (P5-10, ADR-0016). School routes: `X-School-Id` + the `student_leave` grant. A parent (linked scope) asks and cancels for their own
 * children and reads their own requests; the class teacher of the child's class (own scope) and the Academic admin (school scope) read and decide; the Principal reads.
 */
@Controller('student-leave')
export class StudentLeaveController {
  constructor(private readonly leave: StudentLeaveService) {}

  @Permission('student_leave', 'read')
  @Get()
  list(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Query() q: ListStudentLeaveQueryDto): Promise<StudentLeaveListDto> {
    return this.leave.list(t, g.scope, q.status);
  }

  @Permission('student_leave', 'read')
  @Get(':id')
  one(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto): Promise<StudentLeaveDto> {
    return this.leave.one(t, g.scope, p.id);
  }

  /** A parent asks leave for a linked child. Only a parent: nobody else's `create` means this. */
  @Permission('student_leave', 'create')
  @Audit({ action: 'studentleave.request', operation: 'CreateStudentLeave' })
  @Post()
  create(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Body() dto: CreateStudentLeaveDto): Promise<StudentLeaveDto> {
    if (g.scope !== 'linked') throw new NotFoundException(); // not the caller's to do: the same answer as for a request that does not exist
    return this.leave.create(t, dto);
  }

  @Permission('student_leave', 'update')
  @Audit({ action: 'studentleave.decide', operation: 'DecideStudentLeave' })
  @HttpCode(200)
  @Post(':id/approve')
  approve(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto, @Body() dto: DecideStudentLeaveDto): Promise<StudentLeaveDto> {
    if (g.scope === 'linked') throw new NotFoundException(); // not the caller's to do: the same answer as for a request that does not exist // a parent's `update` is only cancelling
    return this.leave.decide(t, g.scope, p.id, true, dto.note);
  }

  @Permission('student_leave', 'update')
  @Audit({ action: 'studentleave.decide', operation: 'DecideStudentLeave' })
  @HttpCode(200)
  @Post(':id/decline')
  decline(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto, @Body() dto: DecideStudentLeaveDto): Promise<StudentLeaveDto> {
    if (g.scope === 'linked') throw new NotFoundException(); // not the caller's to do: the same answer as for a request that does not exist
    return this.leave.decide(t, g.scope, p.id, false, dto.note);
  }

  @Permission('student_leave', 'update')
  @Audit({ action: 'studentleave.cancel', operation: 'CancelStudentLeave' })
  @HttpCode(200)
  @Post(':id/cancel')
  cancel(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto): Promise<StudentLeaveDto> {
    if (g.scope !== 'linked') throw new NotFoundException(); // not the caller's to do: the same answer as for a request that does not exist
    return this.leave.cancel(t, p.id);
  }
}
