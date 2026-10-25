import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import type { CreatePeriodDto, PeriodDto, ScheduleDto, UpdatePeriodDto } from './dto/schedule.dto.js';
import { daysFromText, daysText, normalizeDays, numberPeriods, periodProblem, TEMPLATE_OPERATION, type TemplateName } from './schedule-rules.js';

const notFound = () => new ApiException(ErrorCode.NOT_FOUND, 404);
const invalid = (field: string, rule: string) => new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field, rule }]);
const conflict = (field: string, rule: string) => new ApiException(ErrorCode.CONFLICT, 409, [{ field, rule }]);

type Row = { id: string; label: string; startTime: string; endTime: string; isBreak: boolean };

/**
 * The school's bell schedule and working days (P3-1, ADR-0013). Periods are defined once and every class uses them. Overlaps are refused
 * here (the database keeps start times and labels unique); a period the timetable (P3-3) uses cannot be deleted or turned into a break.
 */
@Injectable()
export class ScheduleService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  private async rows(t: TenantContext): Promise<Row[]> {
    return (await this.db.listPeriods({ schoolId: t.schoolId })).data.periods as unknown as Row[];
  }
  private views(rows: Row[]): PeriodDto[] {
    return numberPeriods(rows).map((r) => ({ id: dashed(r.id), label: r.label, startTime: r.startTime, endTime: r.endTime, isBreak: r.isBreak, number: r.number }));
  }

  /** How many timetable lessons use a period; one that is in use cannot be deleted or become a break. */
  private async lessonsIn(t: TenantContext, periodId: string): Promise<number> {
    return Number((await this.db.countTimetableForPeriod({ schoolId: t.schoolId, periodId: dashed(periodId) })).data.timetableEntries[0]?._count ?? 0);
  }

  async schedule(t: TenantContext): Promise<ScheduleDto> {
    const [rows, school] = await Promise.all([this.rows(t), this.db.schoolWorkingDays({ schoolId: t.schoolId })]);
    if (!school.data.school) throw notFound();
    return { workingDays: daysFromText(school.data.school.workingDays), periods: this.views(rows) };
  }

  async setWorkingDays(t: TenantContext, days: string[]): Promise<ScheduleDto> {
    const clean = normalizeDays(days);
    if (!clean) throw invalid('days', 'knownDays');
    await this.db.setWorkingDays({ schoolId: t.schoolId, workingDays: daysText(clean), actorId: t.userId, details: { days: clean } });
    return this.schedule(t);
  }

  async createPeriod(t: TenantContext, dto: CreatePeriodDto): Promise<PeriodDto> {
    const label = dto.label.trim();
    const rule = periodProblem({ label, startTime: dto.startTime, endTime: dto.endTime }, await this.rows(t));
    if (rule) throw conflictOrInvalid(rule);
    const id = randomUUID();
    await this.db.createPeriod({ schoolId: t.schoolId, id, label, startTime: dto.startTime, endTime: dto.endTime, isBreak: dto.isBreak ?? false, actorId: t.userId, details: { label, startTime: dto.startTime, endTime: dto.endTime, isBreak: dto.isBreak ?? false } });
    return this.views(await this.rows(t)).find((p) => p.id === id)!;
  }

  async updatePeriod(t: TenantContext, id: string, dto: UpdatePeriodDto): Promise<PeriodDto> {
    if (Object.values(dto).every((v) => v === undefined)) throw invalid('label', 'atLeastOneField');
    const rows = await this.rows(t);
    const before = rows.find((r) => dashed(r.id) === id.toLowerCase());
    if (!before) throw notFound();
    if (dto.isBreak === true && !before.isBreak && (await this.lessonsIn(t, before.id)) > 0) throw conflict('isBreak', 'periodInUse');
    const next = { label: dto.label?.trim() ?? before.label, startTime: dto.startTime ?? before.startTime, endTime: dto.endTime ?? before.endTime };
    const rule = periodProblem(next, rows.filter((r) => r.id !== before.id));
    if (rule) throw conflictOrInvalid(rule);
    await this.db.updatePeriod({
      schoolId: t.schoolId, id: dashed(before.id), ...(dto.label !== undefined ? { label: next.label } : {}), ...(dto.startTime !== undefined ? { startTime: next.startTime } : {}),
      ...(dto.endTime !== undefined ? { endTime: next.endTime } : {}), ...(dto.isBreak !== undefined ? { isBreak: dto.isBreak } : {}), actorId: t.userId,
      details: { label: before.label, changed: Object.keys(dto).filter((k) => (dto as Record<string, unknown>)[k] !== undefined) },
    });
    return this.views(await this.rows(t)).find((p) => p.id === dashed(before.id))!;
  }

  async deletePeriod(t: TenantContext, id: string): Promise<void> {
    const before = (await this.rows(t)).find((r) => dashed(r.id) === id.toLowerCase());
    if (!before) throw notFound();
    if ((await this.lessonsIn(t, before.id)) > 0) throw conflict('id', 'periodInUse');
    await this.db.deletePeriod({ schoolId: t.schoolId, id: dashed(before.id), actorId: t.userId, details: { label: before.label, startTime: before.startTime, endTime: before.endTime } });
  }

  /** Fills an EMPTY schedule from a starting point in one transaction. A school that already has periods is told so (409): templates never overwrite. */
  async applyTemplate(t: TenantContext, name: TemplateName): Promise<ScheduleDto> {
    if ((await this.rows(t)).length > 0) throw conflict('template', 'scheduleNotEmpty');
    // The database checks emptiness again in the same transaction, so two requests at once cannot both fill it.
    await this.db[TEMPLATE_OPERATION[name]]({ schoolId: t.schoolId, actorId: t.userId, details: { template: name } });
    return this.schedule(t);
  }
}

const conflictOrInvalid = (rule: NonNullable<ReturnType<typeof periodProblem>>) =>
  rule === 'labelTaken' || rule === 'startTaken' || rule === 'overlaps' ? conflict(rule === 'labelTaken' ? 'label' : 'startTime', rule) : invalid(rule === 'timeInvalid' ? 'startTime' : 'endTime', rule);
