import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import type { Scope } from '@oruschools/rbac';
import { markId } from '../attendance/attendance-rules.js';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import { daysFromText } from '../schedule/schedule-rules.js';
import { TeachingScope } from '../teaching/teaching-scope.service.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import type { BalanceDto, BalanceListDto, CreateRequestDto, CreateTypeDto, LeaveRequestDto, LeaveRequestListDto, LeaveTypeDto, LeaveTypeListDto, ListRequestsQueryDto, UpdateTypeDto } from './dto/leave.dto.js';
import { countHalfDays, formatHalfDays, overlaps, parseHalfDays, yearHolding } from './leave-rules.js';

const notFound = () => new ApiException(ErrorCode.NOT_FOUND, 404);
const invalid = (field: string, rule: string) => new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field, rule }]);
const conflict = (field: string, rule: string) => new ApiException(ErrorCode.CONFLICT, 409, [{ field, rule }]);
const kindOf = (e: unknown) => (e as { kind?: string }).kind;
const same = (a: string, b: string) => dashed(a) === dashed(b);
const name = (s: { firstName: string; lastName: string }) => `${s.firstName} ${s.lastName}`;

interface RequestRow {
  id: string; startDate: string; endDate: string; half?: string | null; halfDays: number; reason?: string | null; status: string; decisionNote?: string | null; decidedAt?: string | null; createdAt: string;
  staff: { id: string; employeeId: string; firstName: string; lastName: string; userId?: string | null };
  leaveType: { id: string; name: string; paid: boolean };
  decidedBy?: { id: string; displayName?: string | null; email: string } | null;
}

/**
 * Leave types, yearly allowances and leave requests (P3-6, ADR-0013 decision 7). Employees ask for their own leave; ONLY an active Principal approves or rejects, and
 * the database checks that in the same transaction that takes the days from the balance. Days are counted in half-days.
 */
@Injectable()
export class LeaveService {
  constructor(@Inject(DATABASE) private readonly db: Database, private readonly scope: TeachingScope) {}

  // ---- types
  private typeView(r: { id: string; name: string; paid: boolean; quotaHalfDays: number }): LeaveTypeDto {
    return { id: dashed(r.id), name: r.name, paid: r.paid, quotaDays: formatHalfDays(r.quotaHalfDays) };
  }
  async types(t: TenantContext): Promise<LeaveTypeListDto> {
    return { items: (await this.db.listLeaveTypes({ schoolId: t.schoolId })).data.leaveTypes.map((r) => this.typeView(r)) };
  }
  private async typeOf(t: TenantContext, id: string) {
    const found = (await this.db.listLeaveTypes({ schoolId: t.schoolId })).data.leaveTypes.find((x) => same(x.id, id));
    if (!found) throw notFound();
    return found;
  }
  private quota(text: string | undefined, paid: boolean): number {
    if (!paid) return 0;
    const q = text === undefined ? null : parseHalfDays(text);
    if (q === null || q <= 0) throw invalid('quotaDays', 'paidNeedsAllowance');
    return q;
  }
  async createType(t: TenantContext, dto: CreateTypeDto): Promise<LeaveTypeDto> {
    const quota = this.quota(dto.quotaDays, dto.paid);
    const id = randomUUID();
    try {
      await this.db.createLeaveType({ schoolId: t.schoolId, id, name: dto.name, paid: dto.paid, quotaHalfDays: quota, actorId: t.userId, details: { name: dto.name, paid: dto.paid, quotaDays: formatHalfDays(quota) } });
    } catch (e) {
      if (kindOf(e) === 'CONFLICT') throw conflict('name', 'nameTaken');
      throw e;
    }
    return this.typeView(await this.typeOf(t, id));
  }
  async updateType(t: TenantContext, id: string, dto: UpdateTypeDto): Promise<LeaveTypeDto> {
    if (dto.name === undefined && dto.quotaDays === undefined) throw invalid('name', 'atLeastOneField');
    const before = await this.typeOf(t, id);
    const quota = dto.quotaDays === undefined ? before.quotaHalfDays : this.quota(dto.quotaDays, before.paid);
    try {
      await this.db.updateLeaveType({ schoolId: t.schoolId, id: dashed(id), name: dto.name ?? before.name, quotaHalfDays: quota, actorId: t.userId, details: { was: { name: before.name, quotaDays: formatHalfDays(before.quotaHalfDays) }, now: { name: dto.name ?? before.name, quotaDays: formatHalfDays(quota) } } });
    } catch (e) {
      if (kindOf(e) === 'CONFLICT') throw conflict('name', 'nameTaken');
      throw e;
    }
    return this.typeView(await this.typeOf(t, id));
  }
  async deleteType(t: TenantContext, id: string): Promise<void> {
    const before = await this.typeOf(t, id);
    if (Number((await this.db.countLeaveOfType({ schoolId: t.schoolId, leaveTypeId: dashed(id) })).data.leaveRequests[0]?._count ?? 0) > 0) throw conflict('id', 'typeInUse');
    try {
      await this.db.deleteLeaveType({ schoolId: t.schoolId, id: dashed(id), actorId: t.userId, details: { name: before.name } });
    } catch (e) {
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw conflict('id', 'typeInUse');
      throw e;
    }
  }

  // ---- balances
  private async years(t: TenantContext) {
    return (await this.db.listAcademicYears({ schoolId: t.schoolId })).data.academicYears.map((y) => ({ id: dashed(y.id), startDate: y.startDate, endDate: y.endDate }));
  }
  private async yearOrActive(t: TenantContext, explicit?: string): Promise<string> {
    const id = explicit ?? (await this.scope.activeYearId(t.schoolId));
    if (!id) throw conflict('academicYearId', 'noActiveYear');
    return dashed(id);
  }
  /** The balance row of a paid type for a person and year, made from the type's allowance if it does not exist yet. */
  private async balanceRow(t: TenantContext, staffId: string, type: { id: string; quotaHalfDays: number }, yearId: string) {
    const find = async () => (await this.db.listLeaveBalances({ schoolId: t.schoolId, staffId: dashed(staffId), academicYearId: yearId })).data.leaveBalances.find((b) => same(b.leaveType.id, type.id));
    const have = await find();
    if (have) return have;
    try {
      await this.db.createLeaveBalance({ schoolId: t.schoolId, id: markId(`balance-${yearId}-${dashed(type.id)}`, dashed(staffId)), staffId: dashed(staffId), leaveTypeId: dashed(type.id), academicYearId: yearId, allowedHalfDays: type.quotaHalfDays, actorId: t.userId });
    } catch (e) {
      if (kindOf(e) !== 'CONFLICT') throw e; // made by someone else an instant ago
    }
    const made = await find();
    if (!made) throw notFound();
    return made;
  }

  async balances(t: TenantContext, scope: Scope, staffId?: string, academicYearId?: string): Promise<BalanceListDto> {
    const own = scope === 'own' ? (await this.scope.mine(t)).staff?.id : undefined;
    if (scope === 'own' && (!own || (staffId && !same(staffId, own)))) { if (!own) return { items: [] }; throw notFound(); }
    const who = own ?? staffId;
    const year = await this.yearOrActive(t, academicYearId);
    const rows = (await this.db.listLeaveBalances({ schoolId: t.schoolId, ...(who ? { staffId: dashed(who) } : {}), academicYearId: year })).data.leaveBalances;
    const items: BalanceDto[] = rows.map((b) => ({ staffId: dashed(b.staffId), academicYearId: year, type: { id: dashed(b.leaveType.id), name: b.leaveType.name, paid: b.leaveType.paid }, allowedDays: formatHalfDays(b.allowedHalfDays), remainingDays: formatHalfDays(b.remainingHalfDays), recorded: true }));
    if (who) {
      // types the person has not used yet show the yearly allowance
      for (const ty of (await this.db.listLeaveTypes({ schoolId: t.schoolId })).data.leaveTypes.filter((x) => x.paid))
        if (!items.some((i) => same(i.type.id, ty.id))) items.push({ staffId: dashed(who), academicYearId: year, type: { id: dashed(ty.id), name: ty.name, paid: true }, allowedDays: formatHalfDays(ty.quotaHalfDays), remainingDays: formatHalfDays(ty.quotaHalfDays), recorded: false });
    }
    return { items: items.sort((a, b) => a.type.name.localeCompare(b.type.name)) };
  }

  /** HR sets what one person may take of a paid type in a year. Days already taken stay taken: the allowance cannot go below them. */
  async setBalance(t: TenantContext, staffId: string, typeId: string, allowedDays: string, academicYearId?: string): Promise<BalanceListDto> {
    const allowed = parseHalfDays(allowedDays);
    if (allowed === null) throw invalid('allowedDays', 'wholeOrHalfDays');
    const type = await this.typeOf(t, typeId);
    if (!type.paid) throw invalid('typeId', 'paidTypeOnly');
    if (!(await this.db.getStaffProfile({ schoolId: t.schoolId, id: dashed(staffId) })).data.staffProfiles[0]) throw notFound();
    const year = await this.yearOrActive(t, academicYearId);
    let row;
    try {
      row = await this.balanceRow(t, staffId, type, year);
    } catch (e) {
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw invalid('academicYearId', 'yearOfThisSchool');
      throw e;
    }
    const used = row.allowedHalfDays - row.remainingHalfDays;
    if (allowed < used) throw conflict('allowedDays', 'belowDaysTaken');
    try {
      await this.db.setLeaveBalance({ schoolId: t.schoolId, id: dashed(row.id), expectedRemaining: row.remainingHalfDays, allowedHalfDays: allowed, remainingHalfDays: allowed - used, actorId: t.userId, details: { staffId: dashed(staffId), type: type.name, year, was: formatHalfDays(row.allowedHalfDays), now: formatHalfDays(allowed) } });
    } catch (e) {
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw conflict('allowedDays', 'balanceChanged');
      throw e;
    }
    return this.balances(t, 'school', staffId, year);
  }

  // ---- requests
  private view(r: RequestRow): LeaveRequestDto {
    return {
      id: dashed(r.id), staff: { id: dashed(r.staff.id), employeeId: r.staff.employeeId, name: name(r.staff) }, type: { id: dashed(r.leaveType.id), name: r.leaveType.name, paid: r.leaveType.paid },
      startDate: r.startDate, endDate: r.endDate, half: r.half ?? null, days: formatHalfDays(r.halfDays), reason: r.reason ?? null, status: r.status,
      decision: r.decidedBy ? { by: r.decidedBy.displayName ?? r.decidedBy.email, at: r.decidedAt ?? '', note: r.decisionNote ?? null } : null, createdAt: r.createdAt,
    };
  }
  private async rowOf(t: TenantContext, id: string) {
    const row = (await this.db.getLeaveRequest({ schoolId: t.schoolId, id: dashed(id) })).data.leaveRequests[0];
    if (!row) throw notFound();
    return row as unknown as RequestRow & { leaveType: { quotaHalfDays: number } };
  }

  async list(t: TenantContext, scope: Scope, q: ListRequestsQueryDto): Promise<LeaveRequestListDto> {
    let staffId = q.staffId;
    if (scope === 'own') {
      const mine = (await this.scope.mine(t)).staff?.id;
      if (!mine) return { items: [] };
      if (staffId && !same(staffId, mine)) throw notFound();
      staffId = mine;
    }
    const rows = (await this.db.listLeaveRequests({ schoolId: t.schoolId, ...(staffId ? { staffId: dashed(staffId) } : {}), ...(q.status ? { status: q.status as never } : {}), ...(q.from ? { from: q.from } : {}), ...(q.to ? { to: q.to } : {}) })).data.leaveRequests;
    return { items: (rows as unknown as RequestRow[]).map((r) => this.view(r)) };
  }

  async create(t: TenantContext, dto: CreateRequestDto): Promise<LeaveRequestDto> {
    const staff = (await this.scope.mine(t)).staff;
    if (!staff) throw conflict('staff', 'noStaffRecord'); // the account is not linked to a staff record
    const type = await this.typeOf(t, dto.leaveTypeId).catch(() => { throw invalid('leaveTypeId', 'leaveTypeOfThisSchool'); });
    const working = daysFromText((await this.db.schoolWorkingDays({ schoolId: t.schoolId })).data.school?.workingDays ?? '');
    const counted = countHalfDays(dto.startDate, dto.endDate, dto.half, working);
    if ('problem' in counted) throw invalid(counted.problem === 'notADate' || counted.problem === 'endBeforeStart' || counted.problem === 'rangeTooLong' ? 'endDate' : 'startDate', counted.problem);
    const year = yearHolding(await this.years(t), dto.startDate, dto.endDate);
    if (!year) throw invalid('startDate', 'withinOneAcademicYear');
    const clash = (await this.db.listLeaveRequests({ schoolId: t.schoolId, staffId: dashed(staff.id), from: dto.startDate, to: dto.endDate })).data.leaveRequests
      .some((r) => (r.status === 'PENDING' || r.status === 'APPROVED') && overlaps(r, { startDate: dto.startDate, endDate: dto.endDate, half: dto.half }));
    if (clash) throw conflict('startDate', 'overlapsAnotherRequest');
    if (type.paid) {
      const balance = await this.balanceRow(t, staff.id, type, year.id);
      if (counted.halfDays > balance.remainingHalfDays) throw conflict('endDate', 'overBalance');
    }
    const id = randomUUID();
    try {
      await this.db.createLeaveRequest({
        schoolId: t.schoolId, id, staffId: dashed(staff.id), leaveTypeId: dashed(type.id), startDate: dto.startDate, endDate: dto.endDate, ...(dto.half ? { half: dto.half } : {}), halfDays: counted.halfDays, ...(dto.reason ? { reason: dto.reason } : {}),
        actorId: t.userId, details: { type: type.name, startDate: dto.startDate, endDate: dto.endDate, half: dto.half ?? null, days: formatHalfDays(counted.halfDays) },
      });
    } catch (e) {
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw invalid('leaveTypeId', 'leaveTypeOfThisSchool');
      throw e;
    }
    return this.view(await this.rowOf(t, id));
  }

  async cancel(t: TenantContext, id: string): Promise<LeaveRequestDto> {
    const row = await this.rowOf(t, id);
    const mine = (await this.scope.mine(t)).staff?.id;
    if (!mine || !same(mine, row.staff.id)) throw notFound(); // never reveal another person's request
    if (row.status !== 'PENDING') throw conflict('id', 'notPending');
    try {
      await this.db.cancelLeaveRequest({ schoolId: t.schoolId, id: dashed(id), staffId: dashed(row.staff.id), actorId: t.userId, details: { startDate: row.startDate, endDate: row.endDate } });
    } catch (e) {
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw conflict('id', 'notPending');
      throw e;
    }
    return this.view(await this.rowOf(t, id));
  }

  /** The Principal approves. The database re-checks that the caller is the active Principal, that the request is still pending and, for paid leave, that the balance is still what we read. */
  async approve(t: TenantContext, id: string): Promise<LeaveRequestDto> {
    const row = await this.rowOf(t, id);
    if (row.status !== 'PENDING') throw conflict('id', 'notPending');
    const others = (await this.db.listLeaveRequests({ schoolId: t.schoolId, staffId: dashed(row.staff.id), status: 'APPROVED' as never, from: row.startDate, to: row.endDate })).data.leaveRequests;
    if (others.some((o) => !same(o.id, id) && overlaps(o, row))) throw conflict('id', 'overlapsApprovedLeave');
    const details = { staffId: dashed(row.staff.id), type: row.leaveType.name, paid: row.leaveType.paid, startDate: row.startDate, endDate: row.endDate, days: formatHalfDays(row.halfDays) };
    try {
      if (row.leaveType.paid) {
        const year = yearHolding(await this.years(t), row.startDate, row.endDate);
        if (!year) throw conflict('id', 'outsideAcademicYear');
        const balance = await this.balanceRow(t, row.staff.id, { id: row.leaveType.id, quotaHalfDays: row.leaveType.quotaHalfDays }, year.id);
        if (row.halfDays > balance.remainingHalfDays) throw conflict('id', 'overBalance');
        await this.db.approveLeaveRequest({ schoolId: t.schoolId, id: dashed(id), balanceId: dashed(balance.id), halfDays: row.halfDays, expectedRemaining: balance.remainingHalfDays, newRemaining: balance.remainingHalfDays - row.halfDays, actorId: t.userId, details: { ...details, balanceBefore: formatHalfDays(balance.remainingHalfDays), balanceAfter: formatHalfDays(balance.remainingHalfDays - row.halfDays) } });
      } else {
        await this.db.approveUnpaidLeaveRequest({ schoolId: t.schoolId, id: dashed(id), actorId: t.userId, details });
      }
    } catch (e) {
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw conflict('id', 'changedMeanwhile'); // not pending any more, or the balance moved: read again
      throw e;
    }
    return this.view(await this.rowOf(t, id));
  }

  async reject(t: TenantContext, id: string, note?: string): Promise<LeaveRequestDto> {
    const row = await this.rowOf(t, id);
    if (row.status !== 'PENDING') throw conflict('id', 'notPending');
    try {
      await this.db.rejectLeaveRequest({ schoolId: t.schoolId, id: dashed(id), ...(note ? { note } : {}), actorId: t.userId, details: { staffId: dashed(row.staff.id), startDate: row.startDate, endDate: row.endDate, note: note ?? null } });
    } catch (e) {
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw conflict('id', 'changedMeanwhile');
      throw e;
    }
    return this.view(await this.rowOf(t, id));
  }
}
