import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { addDays, markId, today, weekday } from '../attendance/attendance-rules.js';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import { yearHolding } from '../leave/leave-rules.js';
import { daysFromText } from '../schedule/schedule-rules.js';
import { TeachingScope } from '../teaching/teaching-scope.service.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import { isDate } from '../attendance/attendance-rules.js';
import type { AssignDto, DutyListDto, NeedDto, NeedListDto, StaffRefDto, SuggestionsDto } from './dto/substitution.dto.js';
import { suggest, uncovered, whyNot, type CandidateFact, type PeriodFact, type SlotFact, type World } from './substitution-rules.js';

const notFound = () => new ApiException(ErrorCode.NOT_FOUND, 404);
const invalid = (field: string, rule: string) => new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field, rule }]);
const conflict = (field: string, rule: string) => new ApiException(ErrorCode.CONFLICT, 409, [{ field, rule }]);
const kindOf = (e: unknown) => (e as { kind?: string }).kind;
const MAX_DAYS = 62;
const nameOf = (s: { firstName: string; lastName: string }) => `${s.firstName} ${s.lastName}`;
const ref = (s: { id: string; employeeId: string; firstName: string; lastName: string }): StaffRefDto => ({ id: dashed(s.id), employeeId: s.employeeId, name: nameOf(s) });

interface Lesson {
  id: string; day: string; periodId: string; classroomId: string; staffId: string; subjectId: string;
  staff: { id: string; employeeId: string; firstName: string; lastName: string; status: string };
  classroom: { id: string; name: string }; subject: { id: string; name: string; code: string };
}

/**
 * The substitution board (P3-7, ADR-0013 decisions 4 and 6). A need is DERIVED: an approved leave over the absent teacher's timetable on a working day. The Academic admin
 * confirms or chooses the substitute from the people who are free and qualified; nothing is assigned automatically. The database checks the same rules again on save.
 */
@Injectable()
export class SubstitutionService {
  constructor(@Inject(DATABASE) private readonly db: Database, private readonly scope: TeachingScope) {}

  private range(from?: string, to?: string): [string, string] {
    const f = from ?? today();
    const e = to ?? addDays(f, 13);
    if (!isDate(f)) throw invalid('from', 'notADate');
    if (!isDate(e)) throw invalid('to', 'notADate');
    if (e < f) throw invalid('to', 'beforeFrom');
    if (addDays(f, MAX_DAYS) < e) throw invalid('to', 'rangeTooLong');
    return [f, e];
  }

  private async setting(t: TenantContext) {
    const [periods, school, years] = await Promise.all([this.db.listPeriods({ schoolId: t.schoolId }), this.db.schoolWorkingDays({ schoolId: t.schoolId }), this.db.listAcademicYears({ schoolId: t.schoolId })]);
    return {
      periods: (periods.data.periods as unknown as Array<PeriodFact & { label: string }>).map((p) => ({ ...p, id: dashed(p.id) })),
      working: daysFromText(school.data.school?.workingDays ?? ''),
      // the active year first: years may overlap, and the active one is the one whose timetable is in use
      years: [...years.data.academicYears].sort((a, b) => Number(b.status === 'ACTIVE') - Number(a.status === 'ACTIVE')).map((y) => ({ id: dashed(y.id), startDate: y.startDate, endDate: y.endDate })),
    };
  }
  private async lessons(t: TenantContext, yearId: string): Promise<Lesson[]> {
    return (await this.db.listTimetableForYear({ schoolId: t.schoolId, academicYearId: yearId })).data.timetableEntries as unknown as Lesson[];
  }

  /** The needs between two dates: for each approved leave and each working day it covers, the absent teacher's lessons that the leave leaves uncovered. */
  async needs(t: TenantContext, from?: string, to?: string): Promise<NeedListDto> {
    const [f, e] = this.range(from, to);
    const [s, leaves, subs] = await Promise.all([
      this.setting(t),
      this.db.listLeaveRequests({ schoolId: t.schoolId, status: 'APPROVED' as never, from: f, to: e }),
      this.db.listSubstitutions({ schoolId: t.schoolId, from: f, to: e }),
    ]);
    const cover = new Map(subs.data.substitutions.map((x) => [`${dashed(x.timetableEntryId)}|${x.date}`, x]));
    const cache = new Map<string, Lesson[]>();
    const items: NeedDto[] = [];
    for (let d = f; d <= e; d = addDays(d, 1)) {
      const day = weekday(d);
      if (!s.working.includes(day)) continue;
      const year = yearHolding(s.years, d, d);
      if (!year) continue;
      if (!cache.has(year.id)) cache.set(year.id, await this.lessons(t, year.id));
      const lessons = cache.get(year.id)!;
      for (const leave of leaves.data.leaveRequests.filter((l) => l.startDate <= d && d <= l.endDate)) {
        const ids = new Set(uncovered(lessons.map((l) => ({ id: l.id, staffId: dashed(l.staffId), day: l.day, periodId: dashed(l.periodId) })), { id: leave.id, staffId: dashed(leave.staff.id), startDate: leave.startDate, endDate: leave.endDate, half: leave.half }, day, s.periods));
        for (const l of lessons.filter((x) => ids.has(x.id))) {
          const p = s.periods.find((x) => dashed(x.id) === dashed(l.periodId))!;
          const c = cover.get(`${dashed(l.id)}|${d}`);
          items.push({
            date: d, leaveRequestId: dashed(leave.id), absent: ref(l.staff),
            slot: { entryId: dashed(l.id), day: l.day, period: { id: dashed(p.id), label: p.label, startTime: p.startTime, endTime: p.endTime }, class: { id: dashed(l.classroom.id), name: l.classroom.name }, subject: { id: dashed(l.subject.id), name: l.subject.name, code: l.subject.code } },
            cover: c ? { id: dashed(c.id), substitute: ref(c.substitute) } : null,
          });
        }
      }
    }
    items.sort((a, b) => a.date.localeCompare(b.date) || a.slot.period.startTime.localeCompare(b.slot.period.startTime) || a.slot.class.name.localeCompare(b.slot.class.name));
    return { from: f, to: e, items };
  }

  private async needFor(t: TenantContext, entryId: string, date: string): Promise<NeedDto> {
    if (!isDate(date)) throw invalid('date', 'notADate');
    const need = (await this.needs(t, date, date)).items.find((n) => dashed(n.slot.entryId) === dashed(entryId));
    if (!need) throw conflict('entryId', 'noLeaveCoversThatLesson');
    return need;
  }

  /** Everything the rules need to judge a candidate on one date. */
  private async worldFor(t: TenantContext, date: string, ignoreEntryId?: string) {
    const s = await this.setting(t);
    const year = yearHolding(s.years, date, date);
    const monthStart = `${date.slice(0, 8)}01`, monthEnd = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0)).toISOString().slice(0, 10);
    const [lessons, leaves, subsOnDate, subsMonth, staff, teaches] = await Promise.all([
      year ? this.lessons(t, year.id) : [],
      this.db.listLeaveRequests({ schoolId: t.schoolId, status: 'APPROVED' as never, from: date, to: date }),
      this.db.listSubstitutions({ schoolId: t.schoolId, from: date, to: date }),
      this.db.listSubstitutions({ schoolId: t.schoolId, from: monthStart, to: monthEnd }),
      this.db.listStaffProfiles({ schoolId: t.schoolId, status: 'ACTIVE' as never, limit: 1000, offset: 0 }),
      this.db.listTeacherSubjects({ schoolId: t.schoolId }),
    ]);
    const subjectsOf = new Map<string, string[]>();
    for (const x of teaches.data.teacherSubjects) subjectsOf.set(dashed(x.staff.id), [...(subjectsOf.get(dashed(x.staff.id)) ?? []), dashed(x.subject.id)]);
    const candidates: CandidateFact[] = staff.data.staffProfiles.map((p) => ({ staffId: dashed(p.id), name: nameOf(p), subjectIds: subjectsOf.get(dashed(p.id)) ?? [] }));
    const world: World = {
      periods: s.periods,
      lessons: lessons.map((l) => ({ staffId: dashed(l.staffId), day: l.day, periodId: dashed(l.periodId) })),
      leaves: leaves.data.leaveRequests.map((l) => ({ id: dashed(l.id), staffId: dashed(l.staff.id), startDate: l.startDate, endDate: l.endDate, half: l.half })),
      // the lesson being decided may already have a substitute: changing it must not count that person as busy with it
      substitutions: subsOnDate.data.substitutions.filter((x) => dashed(x.timetableEntryId) !== dashed(ignoreEntryId ?? '')).map((x) => ({ substituteId: dashed(x.substitute.id), date: x.date, periodId: dashed(x.periodId) })),
    };
    const monthCounts = new Map<string, number>();
    for (const x of subsMonth.data.substitutions) monthCounts.set(dashed(x.substitute.id), (monthCounts.get(dashed(x.substitute.id)) ?? 0) + 1);
    return { world, candidates, monthCounts, staff: staff.data.staffProfiles };
  }

  async suggestions(t: TenantContext, entryId: string, date: string): Promise<SuggestionsDto> {
    const need = await this.needFor(t, entryId, date);
    const { world, candidates, monthCounts, staff } = await this.worldFor(t, date, entryId);
    const slot = await this.slotFact(t, need);
    const list = suggest(candidates, slot, date, world, monthCounts);
    return { need, candidates: list.map((c) => ({ staff: ref(staff.find((p) => dashed(p.id) === c.staffId)!), substitutionsThisMonth: c.substitutionsThisMonth })) };
  }
  private async slotFact(t: TenantContext, need: NeedDto): Promise<SlotFact> {
    return { day: need.slot.day, periodId: dashed(need.slot.period.id), subjectId: dashed(need.slot.subject.id), staffId: dashed(need.absent.id) };
  }

  /** Confirms or changes the substitute for one lesson on one date. Refused with the reason when the person cannot cover it. */
  async assign(t: TenantContext, dto: AssignDto): Promise<NeedDto> {
    const need = await this.needFor(t, dto.entryId, dto.date);
    const { world, candidates } = await this.worldFor(t, dto.date, dto.entryId);
    const cand = candidates.find((c) => c.staffId === dashed(dto.substituteStaffId));
    if (!cand) throw invalid('substituteStaffId', 'activeStaffOfThisSchool');
    const slot = await this.slotFact(t, need);
    const why = whyNot(cand, slot, dto.date, world);
    if (why) throw conflict('substituteStaffId', why);
    const id = markId(`substitution-${dto.date}`, dashed(dto.entryId));
    try {
      await this.db.setSubstitute({
        schoolId: t.schoolId, id, timetableEntryId: dashed(dto.entryId), date: dto.date, day: slot.day, periodId: slot.periodId, subjectId: slot.subjectId, absentStaffId: slot.staffId, leaveRequestId: dashed(need.leaveRequestId), substituteId: cand.staffId,
        actorId: t.userId, details: { date: dto.date, entryId: dashed(dto.entryId), absentStaffId: slot.staffId, substituteStaffId: cand.staffId, class: need.slot.class.name, subject: need.slot.subject.name, period: need.slot.period.label, was: need.cover?.substitute.id ?? null },
      });
    } catch (e) {
      if (kindOf(e) === 'CONFLICT') throw conflict('substituteStaffId', 'alreadySubstituting'); // two requests at once: the unique key let only one through
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw conflict('substituteStaffId', 'changedMeanwhile');
      throw e;
    }
    return (await this.needFor(t, dto.entryId, dto.date));
  }

  async clear(t: TenantContext, id: string): Promise<void> {
    try {
      await this.db.clearSubstitute({ schoolId: t.schoolId, id: dashed(id), actorId: t.userId, details: { substitutionId: dashed(id) } });
    } catch (e) {
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw notFound();
      throw e;
    }
  }

  /** The caller's own cover duties. */
  async mine(t: TenantContext, from?: string, to?: string): Promise<DutyListDto> {
    const [f, e] = this.range(from, to);
    const staff = (await this.scope.mine(t)).staff;
    if (!staff) return { from: f, to: e, items: [] };
    const [rows, s] = await Promise.all([this.db.listSubstitutions({ schoolId: t.schoolId, from: f, to: e, substituteId: dashed(staff.id) }), this.setting(t)]);
    const absentIds = new Set(rows.data.substitutions.map((x) => dashed(x.timetableEntry.staffId)));
    const staffList = absentIds.size ? (await this.db.listStaffProfiles({ schoolId: t.schoolId, limit: 1000, offset: 0 })).data.staffProfiles : [];
    return {
      from: f, to: e,
      items: rows.data.substitutions.map((x) => {
        const p = s.periods.find((y) => dashed(y.id) === dashed(x.periodId))!;
        const away = staffList.find((y) => dashed(y.id) === dashed(x.timetableEntry.staffId))!;
        return { id: dashed(x.id), date: x.date, period: { id: dashed(p.id), label: p.label, startTime: p.startTime, endTime: p.endTime }, class: { id: dashed(x.timetableEntry.classroom.id), name: x.timetableEntry.classroom.name }, subject: { id: dashed(x.timetableEntry.subject.id), name: x.timetableEntry.subject.name, code: x.timetableEntry.subject.code }, covering: ref(away) };
      }),
    };
  }
}
