import { Body, Controller, ForbiddenException, Get, HttpCode, NotFoundException, Param, Post, Put, Query } from '@nestjs/common';
import { Audit } from '../audit/audit.decorators.js';
import { Granted, Permission, type GrantedPermission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import { today } from './attendance-rules.js';
import { TeachingScope } from '../teaching/teaching-scope.service.js';
import { AttendanceService } from './attendance.service.js';
import {
  ClassDayDto, ClassDayParamDto, CorrectStaffDayDto, DateQueryDto, DayListDto, MissingDto, RangeQueryDto, StaffDayDto, StaffDayListDto, StaffDayParamDto, StaffPresenceListDto,
  StatusLabelDto, StatusListDto, StatusParamDto, StudentAttendanceDto, StudentParamDto, SubmitDayDto, DaysQueryDto } from './dto/attendance.dto.js';

/**
 * Student attendance, once a day per class (P3-4). School routes: `X-School-Id` + the `attendance` grant. The Academic admin has the school; a Teacher only the
 * classes they are class teacher of; the Principal reads. A parent reads their own children's record and nothing else.
 */
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService, private readonly scope: TeachingScope) {}

  /** The class must be one the caller may take attendance for: any at school scope, the class teacher's own at own scope, none at linked scope. */
  private async mayUse(t: TenantContext, g: GrantedPermission, classId: string): Promise<void> {
    if (g.scope === 'school') return;
    if (g.scope === 'own' && (await this.scope.classTeacherClassIds(t)).has(classId.toLowerCase())) return;
    throw new NotFoundException();
  }
  private schoolOnly(g: GrantedPermission): void {
    if (g.scope !== 'school') throw new NotFoundException();
  }

  @Permission('attendance', 'read')
  @Get('statuses')
  statuses(@Tenant() t: TenantContext): Promise<StatusListDto> {
    return this.attendance.statuses(t);
  }

  /** Renames one of the seven statuses. The meaning and colour never change. */
  @Permission('attendance', 'update')
  @Audit({ action: 'attendance.status.label', operation: 'SetAttendanceStatusLabel' })
  @Put('statuses/:status')
  setLabel(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StatusParamDto, @Body() dto: StatusLabelDto): Promise<StatusListDto> {
    if (g.scope !== 'school') throw new ForbiddenException();
    return this.attendance.setLabel(t, p.status, dto.label);
  }

  @Permission('attendance', 'read')
  @Get('missing')
  missing(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Query() q: DateQueryDto): Promise<MissingDto> {
    this.schoolOnly(g);
    return this.attendance.missing(t, q.date ?? today());
  }

  @Permission('attendance', 'read')
  @Get('classes/:id/days')
  async days(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StudentParamDto, @Query() q: DaysQueryDto): Promise<DayListDto> {
    await this.mayUse(t, g, p.id);
    return this.attendance.days(t, p.id, q.from, q.to, q.updatedSince);
  }

  @Permission('attendance', 'read')
  @Get('classes/:id/days/:date')
  async day(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: ClassDayParamDto): Promise<ClassDayDto> {
    await this.mayUse(t, g, p.id);
    return this.attendance.classDay(t, p.id, p.date);
  }

  /** Takes or edits the day: list the exceptions, everyone else is present. A locked day is refused (409 `dayLocked`). */
  @Permission('attendance', 'create')
  @Audit({ action: 'attendance.submit', operation: 'FinishAttendanceSubmit' })
  @Put('classes/:id/days/:date')
  async submit(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: ClassDayParamDto, @Body() dto: SubmitDayDto): Promise<ClassDayDto> {
    await this.mayUse(t, g, p.id);
    return this.attendance.submit(t, p.id, p.date, dto);
  }

  @Permission('attendance', 'update')
  @Audit({ action: 'attendance.lock', operation: 'LockAttendanceDay' })
  @HttpCode(200)
  @Post('classes/:id/days/:date/lock')
  async lock(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: ClassDayParamDto): Promise<ClassDayDto> {
    await this.mayUse(t, g, p.id);
    return this.attendance.lock(t, p.id, p.date);
  }

  /** The Academic admin's change to a day that is locked or already done; the audit row holds each old and new value. */
  @Permission('attendance', 'update')
  @Audit({ action: 'attendance.correct', operation: 'FinishAttendanceCorrection' })
  @Put('classes/:id/days/:date/correction')
  correct(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: ClassDayParamDto, @Body() dto: SubmitDayDto): Promise<ClassDayDto> {
    if (g.scope !== 'school') throw new ForbiddenException();
    return this.attendance.submit(t, p.id, p.date, dto, true);
  }

  @Permission('attendance', 'read')
  @Get('students/:id')
  student(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StudentParamDto, @Query() q: RangeQueryDto): Promise<StudentAttendanceDto> {
    return this.attendance.student(t, g.scope, p.id, q.from, q.to);
  }
}

/** Staff check-in and check-out (self-service) and HR's oversight. School routes: `X-School-Id` + the `staff_attendance` grant. */
@Controller('attendance/staff')
export class StaffAttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Permission('staff_attendance', 'create')
  @Audit({ action: 'attendance.staff.checkin', operation: 'CheckInStaff' })
  @HttpCode(200)
  @Post('check-in')
  checkIn(@Tenant() t: TenantContext): Promise<StaffDayDto> {
    return this.attendance.checkIn(t);
  }

  @Permission('staff_attendance', 'create')
  @Audit({ action: 'attendance.staff.checkout', operation: 'CheckOutStaff' })
  @HttpCode(200)
  @Post('check-out')
  checkOut(@Tenant() t: TenantContext): Promise<StaffDayDto> {
    return this.attendance.checkOut(t);
  }

  @Permission('staff_attendance', 'read')
  @Get('mine')
  mine(@Tenant() t: TenantContext, @Query() q: RangeQueryDto): Promise<StaffDayListDto> {
    return this.attendance.myDays(t, q.from, q.to);
  }

  @Permission('staff_attendance', 'read')
  @Get()
  presence(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Query() q: DateQueryDto): Promise<StaffPresenceListDto> {
    if (g.scope !== 'school') throw new NotFoundException();
    return this.attendance.presence(t, q.date);
  }

  @Permission('staff_attendance', 'update')
  @Audit({ action: 'attendance.staff.correct', operation: 'CorrectStaffAttendance' })
  @Put(':staffId/days/:date')
  correct(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StaffDayParamDto, @Body() dto: CorrectStaffDayDto): Promise<StaffDayDto> {
    if (g.scope !== 'school') throw new ForbiddenException();
    return this.attendance.correctStaffDay(t, p.staffId, p.date, dto);
  }
}
