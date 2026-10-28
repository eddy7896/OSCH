import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Put, Query } from '@nestjs/common';
import { Audit } from '../audit/audit.decorators.js';
import { Granted, Permission, type GrantedPermission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import { TeachingScope } from '../teaching/teaching-scope.service.js';
import { ClassTimetableDto, SetSlotDto, StaffTimetableDto, TimetableClassParamDto, TimetableEntryParamDto, TimetableLoadDto, TimetableStaffParamDto, TimetableYearQueryDto, MineTimetableQueryDto } from './dto/timetable.dto.js';
import { TimetableService } from './timetable.service.js';

/**
 * The timetable. School routes: `X-School-Id` + the `academics` grant. Everyone with the grant may read the classes in their scope (a teacher the
 * classes they teach, a parent their child's class); only the Academic administrator edits (school scope), and the weekly load is the school's.
 */
@Controller('academics/timetable')
export class TimetableController {
  constructor(private readonly timetable: TimetableService, private readonly scope: TeachingScope) {}

  private async classVisible(t: TenantContext, g: GrantedPermission, classId: string): Promise<void> {
    const visible = await this.scope.visibleClassIds(t, g.scope);
    if (visible && ![...visible].some((v) => v === classId.toLowerCase())) throw new NotFoundException();
  }
  private wide(g: GrantedPermission): void {
    if (g.scope !== 'school') throw new NotFoundException();
  }

  @Permission('academics', 'read')
  @Get('classes/:id')
  async forClass(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: TimetableClassParamDto, @Query() q: TimetableYearQueryDto): Promise<ClassTimetableDto> {
    await this.classVisible(t, g, p.id);
    return this.timetable.forClass(t, p.id, q.academicYearId);
  }

  /** A member of staff's week. School scope: anyone's. Own scope: only the caller's own. */
  @Permission('academics', 'read')
  @Get('teachers/:staffId')
  async forStaff(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: TimetableStaffParamDto, @Query() q: TimetableYearQueryDto): Promise<StaffTimetableDto> {
    if (g.scope !== 'school' && !(g.scope === 'own' && (await this.scope.mine(t)).staff?.id === p.staffId.toLowerCase())) throw new NotFoundException();
    return this.timetable.forStaff(t, p.staffId, q.academicYearId);
  }

  /** The caller's own week (empty for an account with no staff record). */
  @Permission('academics', 'read')
  @Get('mine')
  async mine(@Tenant() t: TenantContext, @Query() q: MineTimetableQueryDto): Promise<StaffTimetableDto> {
    return this.timetable.forStaff(t, (await this.scope.mine(t)).staff?.id ?? null, q.academicYearId, q.updatedSince);
  }

  @Permission('academics', 'read')
  @Get('load')
  async load(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Query() q: TimetableYearQueryDto): Promise<TimetableLoadDto> {
    this.wide(g);
    return this.timetable.load(t, q.academicYearId);
  }

  /** Puts a lesson in a slot of a class, or replaces the one there. 409 `classBusy` / `teacherBusy` on a clash. */
  @Permission('academics', 'update')
  @Audit({ action: 'academic.timetable.set', operation: 'CreateTimetableEntry' })
  @Put('classes/:id/slots')
  async setSlot(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: TimetableClassParamDto, @Body() dto: SetSlotDto): Promise<ClassTimetableDto> {
    this.wide(g);
    return this.timetable.setSlot(t, p.id, dto);
  }

  @Permission('academics', 'delete')
  @Audit({ action: 'academic.timetable.clear', operation: 'DeleteTimetableEntry' })
  @HttpCode(204)
  @Delete('entries/:id')
  async clear(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: TimetableEntryParamDto): Promise<void> {
    this.wide(g);
    await this.timetable.clear(t, p.id);
  }
}
