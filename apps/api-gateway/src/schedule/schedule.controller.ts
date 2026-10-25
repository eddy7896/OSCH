import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { Audit } from '../audit/audit.decorators.js';
import { Permission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import { ApplyTemplateDto, CreatePeriodDto, PeriodDto, PeriodIdParamDto, ScheduleDto, UpdatePeriodDto, WorkingDaysDto } from './dto/schedule.dto.js';
import { ScheduleService } from './schedule.service.js';
import type { TemplateName } from './schedule-rules.js';

/**
 * The school's bell schedule and working days. School routes: `X-School-Id` + the `academics` grant. Reading is open to every scope (it is
 * the school's own structure, not anyone's personal data: a teacher or a parent needs the period times); changing it is the Academic admin's.
 */
@Controller('academics')
export class ScheduleController {
  constructor(private readonly schedule: ScheduleService) {}

  @Permission('academics', 'read')
  @Get('schedule')
  get(@Tenant() t: TenantContext): Promise<ScheduleDto> {
    return this.schedule.schedule(t);
  }

  @Permission('academics', 'update')
  @Audit({ action: 'academic.workingdays.set', operation: 'SetWorkingDays' })
  @Patch('schedule/working-days')
  setWorkingDays(@Tenant() t: TenantContext, @Body() dto: WorkingDaysDto): Promise<ScheduleDto> {
    return this.schedule.setWorkingDays(t, dto.days);
  }

  /** Fills an empty schedule from a starting point (STANDARD or SHORT_DAY); 409 when the school already has periods. */
  @Permission('academics', 'create')
  @Audit({ action: 'academic.schedule.template', operation: 'ApplyStandardSchedule' })
  @HttpCode(201)
  @Post('schedule/template')
  template(@Tenant() t: TenantContext, @Body() dto: ApplyTemplateDto): Promise<ScheduleDto> {
    return this.schedule.applyTemplate(t, dto.template as TemplateName);
  }

  @Permission('academics', 'create')
  @Audit({ action: 'academic.period.create', operation: 'CreatePeriod' })
  @Post('periods')
  create(@Tenant() t: TenantContext, @Body() dto: CreatePeriodDto): Promise<PeriodDto> {
    return this.schedule.createPeriod(t, dto);
  }

  @Permission('academics', 'update')
  @Audit({ action: 'academic.period.update', operation: 'UpdatePeriod' })
  @Patch('periods/:id')
  update(@Tenant() t: TenantContext, @Param() p: PeriodIdParamDto, @Body() dto: UpdatePeriodDto): Promise<PeriodDto> {
    return this.schedule.updatePeriod(t, p.id, dto);
  }

  @Permission('academics', 'delete')
  @Audit({ action: 'academic.period.delete', operation: 'DeletePeriod' })
  @HttpCode(204)
  @Delete('periods/:id')
  async remove(@Tenant() t: TenantContext, @Param() p: PeriodIdParamDto): Promise<void> {
    await this.schedule.deletePeriod(t, p.id);
  }
}
