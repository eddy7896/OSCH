import { nextCursor } from '../common/updated-since.js';
import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import type { Scope } from '@oruschools/rbac';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import { daysFromText } from '../schedule/schedule-rules.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import { TeachingScope } from '../teaching/teaching-scope.service.js';
import { DEFAULT_MARGIN_M, HARD_RING_M, judge, type Geofence } from './geofence.js';
import { addDays, countStatuses, DEFAULT_LABELS, diffMarks, isDate, markId, staffDayId, STATUSES, today, weekday, type Existing, type Status, type Wanted } from './attendance-rules.js';
import type {
  ClassDayDto, CorrectStaffDayDto, DayListDto, MissingDto, StaffDayDto, StaffDayListDto, StaffPresenceListDto, StatusListDto, StudentAttendanceDto, SubmitDayDto, GeofenceDto, StampDto } from './dto/attendance.dto.js';

const notFound = () => new ApiException(ErrorCode.NOT_FOUND, 404);
const invalid = (field: string, rule: string) => new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field, rule }]);
const conflict = (field: string, rule: string) => new ApiException(ErrorCode.CONFLICT, 409, [{ field, rule }]);
const kindOf = (e: unknown) => (e as { kind?: string }).kind;
const same = (a: string, b: string) => dashed(a) === b.toLowerCase();
const MAX_RANGE_DAYS = 366;
const BATCH = 20;

/**
 * Attendance (P3-4, ADR-0013): once a day per class, by the class teacher, with the fixed seven statuses; only the exceptions are stored. Staff check in and out.
 * A submit makes the day if it is new, writes the marks, then finishes the day in one audited step; a replay of the same submit changes nothing.
 */
/** A day of a member of staff as the database gives it. */
interface StaffRow {
  date: string; checkIn?: string | null; checkOut?: string | null; checkInStamp?: string | null; checkInDistanceM?: number | null; checkInReason?: string | null; checkInDeviceTime?: string | null;
  needsConfirm?: boolean | null; confirmedAt?: string | null; checkOutStamp?: string | null; checkOutDistanceM?: number | null; checkOutReason?: string | null; checkOutDeviceTime?: string | null;
}

@Injectable()
export class AttendanceService {
  constructor(@Inject(DATABASE) private readonly db: Database, private readonly scope: TeachingScope) {}

  // ---- helpers
  private async yearOf(t: TenantContext): Promise<string> {
    const id = await this.scope.activeYearId(t.schoolId);
    if (!id) throw conflict('academicYearId', 'noActiveYear');
    return dashed(id);
  }
  private checkDate(date: string, allowFuture = false): void {
    if (!isDate(date)) throw invalid('date', 'notADate');
    if (!allowFuture && date > today()) throw invalid('date', 'futureDate');
  }
  private async workingDays(t: TenantContext): Promise<string[]> {
    return daysFromText((await this.db.schoolWorkingDays({ schoolId: t.schoolId })).data.school?.workingDays ?? '');
  }
  private async roster(t: TenantContext, classId: string, year: string) {
    const rows = (await this.db.classRoster({ schoolId: t.schoolId, academicYearId: year, classroomId: dashed(classId) })).data.studentEnrollments;
    return new Map(rows.map((r) => [dashed(r.student.id), { id: dashed(r.student.id), enrollmentId: r.student.enrollmentId, name: `${r.student.firstName} ${r.student.lastName}` }]));
  }
  private async dayOf(t: TenantContext, classId: string, date: string) {
    return (await this.db.getAttendanceDay({ schoolId: t.schoolId, classroomId: dashed(classId), date })).data.attendanceDays[0] ?? null;
  }
  private async requireClass(t: TenantContext, classId: string): Promise<void> {
    const found = (await this.db.listGradeLevels({ schoolId: t.schoolId })).data.gradeLevels.some((l) => l.classrooms.some((c) => same(c.id, classId)));
    if (!found) throw notFound();
  }

  // ---- statuses
  async statuses(t: TenantContext): Promise<StatusListDto> {
    const set = new Map((await this.db.listAttendanceStatusLabels({ schoolId: t.schoolId })).data.attendanceStatusLabels.map((l) => [l.status as string, l.label]));
    return { items: STATUSES.map((s) => ({ status: s, label: set.get(s) ?? DEFAULT_LABELS[s], isDefault: !set.has(s) })) };
  }
  async setLabel(t: TenantContext, status: string, label: string): Promise<StatusListDto> {
    await this.db.setAttendanceStatusLabel({ schoolId: t.schoolId, id: markId(`label-${t.schoolId}`, status), status: status as never, label, actorId: t.userId, details: { status, label } });
    return this.statuses(t);
  }

  // ---- class days
  async classDay(t: TenantContext, classId: string, date: string): Promise<ClassDayDto> {
    this.checkDate(date, true);
    await this.requireClass(t, classId);
    const year = await this.yearOf(t);
    const [roster, day] = await Promise.all([this.roster(t, classId, year), this.dayOf(t, classId, date)]);
    const marks = new Map((day?.marks ?? []).map((m) => [dashed(m.student.id), m]));
    // Until the day is taken, a child whose parent's leave request was approved starts as Leave (HALF_DAY for half a day): the teacher sees it and may change it (ADR-0016).
    const away = new Map<string, string>();
    if (!day && roster.size > 0) {
      const rows = (await this.db.approvedStudentLeaveOn({ schoolId: t.schoolId, studentIds: [...roster.keys()], date })).data.studentLeaves;
      for (const r of rows) away.set(dashed(r.studentId), r.half ? 'HALF_DAY' : 'LEAVE');
    }
    return {
      classId: dashed(classId), date, submitted: !!day, locked: day?.locked ?? false,
      submittedBy: day ? day.submittedBy.displayName ?? day.submittedBy.email : null, submittedAt: day?.submittedAt ?? null,
      counts: countStatuses([...marks.values()].filter((m) => roster.has(dashed(m.student.id))), roster.size),
      students: [...roster.values()].map((s) => ({ ...s, status: marks.get(s.id)?.status ?? (away.get(s.id) ?? 'PRESENT'), note: marks.get(s.id)?.note ?? null })),
    };
  }

  /** Takes (or edits) a class's attendance for a date. `correction` is the Academic admin's change to a day that is locked or already done: audited with old and new values. */
  async submit(t: TenantContext, classId: string, date: string, dto: SubmitDayDto, correction = false): Promise<ClassDayDto> {
    this.checkDate(date);
    if (!(await this.workingDays(t)).includes(weekday(date))) throw invalid('date', 'notAWorkingDay');
    await this.requireClass(t, classId);
    const year = await this.yearOf(t);
    const roster = await this.roster(t, classId, year);
    const wanted = new Map<string, Wanted>();
    for (const m of dto.marks) {
      const sid = dashed(m.studentId);
      if (!roster.has(sid)) throw invalid('marks', 'studentNotInClass');
      if (wanted.has(sid)) throw invalid('marks', 'duplicateStudent');
      wanted.set(sid, { status: m.status as Status, note: m.note ?? null });
    }
    let day = await this.dayOf(t, classId, date);
    if (correction && !day) throw notFound();
    if (!correction && day?.locked) throw conflict('date', 'dayLocked');
    if (!correction && day && dto.submissionId && day.submissionId === dto.submissionId) return this.classDay(t, classId, date); // a replay: nothing to do
    if (!day) {
      try {
        await this.db.createAttendanceDay({ schoolId: t.schoolId, id: randomUUID(), classroomId: dashed(classId), date, actorId: t.userId });
      } catch (e) {
        if (kindOf(e) !== 'CONFLICT') throw e; // someone else made the day an instant ago: carry on as an edit of it
      }
      day = await this.dayOf(t, classId, date);
      if (!day) throw conflict('date', 'dayChanged');
      if (!correction && day.locked) throw conflict('date', 'dayLocked');
    }
    const dayId = dashed(day.id);
    const existing = new Map<string, Existing>(day.marks.map((m) => [dashed(m.student.id), { id: dashed(m.id), status: m.status as Status, note: m.note ?? null }]));
    const { save, remove } = diffMarks(existing, wanted);
    const lockedOk = correction ? [false, true] : [false];
    const jobs: Array<() => Promise<unknown>> = [
      ...save.map(([sid, w]) => () => this.db.saveAttendanceMark({ schoolId: t.schoolId, id: markId(dayId, sid), dayId, studentId: sid, classroomId: dashed(classId), academicYearId: year, status: w.status as never, ...(w.note ? { note: w.note } : {}), lockedOk, actorId: t.userId })),
      ...remove.map(([, id]) => () => this.db.removeAttendanceMark({ schoolId: t.schoolId, id, dayId, classroomId: dashed(classId), lockedOk, actorId: t.userId })),
    ];
    try {
      for (let i = 0; i < jobs.length; i += BATCH) await Promise.all(jobs.slice(i, i + BATCH).map((j) => j()));
      if (correction) {
        const changes = [...save.map(([sid, w]) => ({ studentId: sid, from: existing.get(sid)?.status ?? 'PRESENT', to: w.status, note: w.note })), ...remove.map(([sid]) => ({ studentId: sid, from: existing.get(sid)!.status, to: 'PRESENT' }))];
        await this.db.finishAttendanceCorrection({ schoolId: t.schoolId, id: dayId, actorId: t.userId, details: { classId: dashed(classId), date, wasLocked: day.locked, changes } });
      } else {
        await this.db.finishAttendanceSubmit({ schoolId: t.schoolId, id: dayId, ...(dto.submissionId ? { submissionId: dto.submissionId } : {}), locked: dto.lock ?? false, actorId: t.userId, details: { classId: dashed(classId), date, exceptions: wanted.size - [...wanted.values()].filter((w) => w.status === 'PRESENT').length, locked: dto.lock ?? false } });
      }
    } catch (e) {
      // the day was locked while we were writing, or a student left the class: the database refused the write
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw conflict('date', 'dayChanged');
      throw e;
    }
    return this.classDay(t, classId, date);
  }

  async lock(t: TenantContext, classId: string, date: string): Promise<ClassDayDto> {
    this.checkDate(date);
    const day = await this.dayOf(t, classId, date);
    if (!day) throw notFound();
    if (!day.locked) await this.db.lockAttendanceDay({ schoolId: t.schoolId, id: dashed(day.id), actorId: t.userId, details: { classId: dashed(classId), date } });
    return this.classDay(t, classId, date);
  }

  async days(t: TenantContext, classId: string, from?: string, to?: string, updatedSince?: string): Promise<DayListDto> {
    const [f, e] = this.range(from, to);
    await this.requireClass(t, classId);
    const [roster, rows] = await Promise.all([this.roster(t, classId, await this.yearOf(t)), this.db.listAttendanceDays({ schoolId: t.schoolId, classroomId: dashed(classId), from: f, to: e, ...(updatedSince ? { updatedSince } : {}) })]);
    return { items: rows.data.attendanceDays.map((d) => ({ date: d.date, locked: d.locked, counts: countStatuses(d.marks, roster.size) })), next: nextCursor(rows.data.attendanceDays, updatedSince) };
  }

  /** Classes that have not submitted on a date (a working day). */
  async missing(t: TenantContext, date: string): Promise<MissingDto> {
    this.checkDate(date);
    if (!(await this.workingDays(t)).includes(weekday(date))) return { date, items: [] };
    const [levels, done] = await Promise.all([this.db.listGradeLevels({ schoolId: t.schoolId }), this.db.attendanceDaysOn({ schoolId: t.schoolId, date })]);
    const taken = new Set(done.data.attendanceDays.map((d) => dashed(d.classroomId)));
    return { date, items: levels.data.gradeLevels.flatMap((l) => l.classrooms).filter((c) => !taken.has(dashed(c.id))).map((c) => ({ id: dashed(c.id), name: c.name })) };
  }

  private range(from?: string, to?: string): [string, string] {
    const e = to ?? today();
    const f = from ?? addDays(e, -29);
    if (!isDate(e)) throw invalid('to', 'notADate');
    if (!isDate(f)) throw invalid('from', 'notADate');
    if (f > e) throw invalid('from', 'afterTo');
    if (addDays(f, MAX_RANGE_DAYS) < e) throw invalid('from', 'rangeTooLong');
    return [f, e];
  }

  // ---- one student
  /** A student's record over a range. `scope` decides who may ask: the school, the class teacher of the student's class, or a parent linked to the student. */
  async student(t: TenantContext, scope: Scope, studentId: string, from?: string, to?: string): Promise<StudentAttendanceDto> {
    const [f, e] = this.range(from, to);
    const stu = (await this.db.getStudent({ schoolId: t.schoolId, id: dashed(studentId) })).data.students[0];
    if (!stu) throw notFound();
    const year = await this.yearOf(t);
    const classId = (await this.db.enrollmentsOfStudents({ schoolId: t.schoolId, academicYearId: year, studentIds: [dashed(studentId)] })).data.studentEnrollments[0]?.classroom.id;
    if (scope === 'own' && !(classId && (await this.scope.classTeacherClassIds(t)).has(dashed(classId)))) throw notFound();
    if (scope === 'linked' && !(await this.scope.mine(t)).children.some((c) => same(c.id, studentId))) throw notFound();
    const [marks, days] = await Promise.all([
      this.db.attendanceOfStudent({ schoolId: t.schoolId, studentId: dashed(studentId), from: f, to: e }),
      classId ? this.db.daysOfClass({ schoolId: t.schoolId, classroomId: dashed(classId), from: f, to: e }) : null,
    ]);
    const rows = marks.data.attendanceMarks.map((m) => ({ date: m.day.date, status: m.status as string, note: m.note ?? null })).sort((a, b) => a.date.localeCompare(b.date));
    const daysTaken = days?.data.attendanceDays.length ?? 0;
    return { studentId: dashed(studentId), from: f, to: e, daysTaken, counts: countStatuses(rows, daysTaken), marks: rows };
  }

  // ---- staff
  private day(r: StaffRow): StaffDayDto {
    return {
      date: r.date, checkIn: r.checkIn ?? null, checkOut: r.checkOut ?? null,
      checkInStamp: r.checkInStamp ?? null, checkInDistanceM: r.checkInDistanceM ?? null, checkInReason: r.checkInReason ?? null, checkInDeviceTime: r.checkInDeviceTime ?? null,
      needsConfirmation: !!r.needsConfirm && !r.confirmedAt, confirmedAt: r.confirmedAt ?? null,
      checkOutStamp: r.checkOutStamp ?? null, checkOutDistanceM: r.checkOutDistanceM ?? null, checkOutReason: r.checkOutReason ?? null, checkOutDeviceTime: r.checkOutDeviceTime ?? null,
    };
  }

  /** The school's point, radius and margin, or null when none is set. */
  private async fence(t: TenantContext): Promise<Geofence | null> {
    const s = (await this.db.getSchoolGeofence({ schoolId: t.schoolId })).data.school;
    if (!s || s.geoLatMicro == null || s.geoLngMicro == null || s.geoRadiusM == null) return null;
    return { lat: s.geoLatMicro / 1e6, lng: s.geoLngMicro / 1e6, radiusM: s.geoRadiusM, marginM: s.geoMarginM ?? DEFAULT_MARGIN_M };
  }

  async geofence(t: TenantContext): Promise<GeofenceDto> {
    const f = await this.fence(t);
    return { configured: !!f, lat: f?.lat ?? null, lng: f?.lng ?? null, radiusM: f?.radiusM ?? null, marginM: f?.marginM ?? DEFAULT_MARGIN_M, hardRingM: HARD_RING_M };
  }

  /** Judges where a phone is and refuses only when a reason is missing that the rules require (never because of where the person is). */
  private async stamp(t: TenantContext, dto: StampDto | undefined): Promise<{ stamp: string; distanceM: number | null; reason: string | null; deviceTime: string | null; needsConfirm: boolean }> {
    const verdict = judge(await this.fence(t), dto?.position ? { lat: dto.position.lat, lng: dto.position.lng } : null);
    const reason = dto?.reason?.trim() || null;
    if (verdict.reasonRequired && !reason) throw invalid('reason', 'reasonRequired');
    return { stamp: verdict.stamp, distanceM: verdict.distanceM, reason, deviceTime: dto?.deviceTime ? new Date(dto.deviceTime).toISOString() : null, needsConfirm: verdict.needsConfirm };
  }
  private async myStaffId(t: TenantContext): Promise<string> {
    const staff = (await this.scope.mine(t)).staff;
    if (!staff) throw conflict('staff', 'noStaffRecord'); // the account is not linked to a staff record yet
    return staff.id;
  }
  private async staffDay(t: TenantContext, staffId: string, date: string) {
    return (await this.db.getStaffAttendance({ schoolId: t.schoolId, staffId: dashed(staffId), date })).data.staffAttendances[0] ?? null;
  }

  async checkIn(t: TenantContext, dto?: StampDto): Promise<StaffDayDto> {
    const [staffId, date] = [await this.myStaffId(t), today()];
    const have = await this.staffDay(t, staffId, date);
    if (have?.checkIn) return this.day(have); // already in: the same answer, whatever a repeat sends (the first stamp stands)
    const s = await this.stamp(t, dto);
    try {
      await this.db.checkInStaff({ schoolId: t.schoolId, id: randomUUID(), staffId, date, stamp: s.stamp, ...(s.distanceM !== null ? { distanceM: s.distanceM } : {}), ...(s.reason ? { reason: s.reason } : {}), ...(s.deviceTime ? { deviceTime: s.deviceTime } : {}), needsConfirm: s.needsConfirm, actorId: t.userId, details: { date, stamp: s.stamp, distanceM: s.distanceM, needsConfirm: s.needsConfirm } });
    } catch (e) {
      if (kindOf(e) !== 'CONFLICT') throw e;
    }
    return this.day((await this.staffDay(t, staffId, date))!);
  }

  async checkOut(t: TenantContext, dto?: StampDto): Promise<StaffDayDto> {
    const [staffId, date] = [await this.myStaffId(t), today()];
    const have = await this.staffDay(t, staffId, date);
    if (!have?.checkIn) throw conflict('checkIn', 'notCheckedIn');
    if (have.checkOut) return this.day(have);
    const s = await this.stamp(t, dto);
    try {
      await this.db.checkOutStaff({ schoolId: t.schoolId, id: dashed(have.id), stamp: s.stamp, ...(s.distanceM !== null ? { distanceM: s.distanceM } : {}), ...(s.reason ? { reason: s.reason } : {}), ...(s.deviceTime ? { deviceTime: s.deviceTime } : {}), actorId: t.userId, details: { date, stamp: s.stamp, distanceM: s.distanceM } });
    } catch (e) {
      if (kindOf(e) !== 'FORBIDDEN_REFERENCE') throw e; // already out an instant ago
    }
    return this.day((await this.staffDay(t, staffId, date))!);
  }

  async myDays(t: TenantContext, from?: string, to?: string): Promise<StaffDayListDto> {
    const [f, e] = this.range(from, to);
    const staff = (await this.scope.mine(t)).staff;
    if (!staff) return { items: [] };
    return { items: (await this.db.staffAttendanceOfStaff({ schoolId: t.schoolId, staffId: staff.id, from: f, to: e })).data.staffAttendances.map((r) => this.day(r)) };
  }

  /** Every active member of staff on a date: at work, gone for the day, or not in. */
  async presence(t: TenantContext, date?: string): Promise<StaffPresenceListDto> {
    const d = date ?? today();
    this.checkDate(d, true);
    const [staff, rows] = await Promise.all([this.db.listStaffProfiles({ schoolId: t.schoolId, status: 'ACTIVE' as never, limit: 1000, offset: 0 }), this.db.staffAttendanceOn({ schoolId: t.schoolId, date: d })]);
    const by = new Map(rows.data.staffAttendances.map((r) => [dashed(r.staffId), r]));
    return {
      date: d,
      items: staff.data.staffProfiles.map((s) => {
        const r = by.get(dashed(s.id));
        return { staff: { id: dashed(s.id), employeeId: s.employeeId, name: `${s.firstName} ${s.lastName}` }, checkIn: r?.checkIn ?? null, checkOut: r?.checkOut ?? null, checkInStamp: r?.checkInStamp ?? null, checkInDistanceM: r?.checkInDistanceM ?? null, checkInReason: r?.checkInReason ?? null, checkInDeviceTime: r?.checkInDeviceTime ?? null, needsConfirmation: !!r?.needsConfirm && !r.confirmedAt, confirmedAt: r?.confirmedAt ?? null, checkOutReason: r?.checkOutReason ?? null, state: !r?.checkIn ? 'NONE' : r.checkOut ? 'OUT' : 'IN' };
      }),
    };
  }

  /** HR confirms a check-in that was beyond the hard ring. A day that needs no confirmation, or has been confirmed, is a 409. */
  async confirmStaffDay(t: TenantContext, staffId: string, date: string): Promise<StaffDayDto> {
    this.checkDate(date);
    const have = await this.staffDay(t, staffId, date);
    if (!have) throw notFound();
    if (have.needsConfirm && have.confirmedAt) return this.day(have); // already confirmed: the same answer
    if (!have.needsConfirm) throw conflict('date', 'nothingToConfirm');
    try {
      await this.db.confirmStaffCheckIn({ schoolId: t.schoolId, id: dashed(have.id), actorId: t.userId, details: { staffId: dashed(staffId), date, stamp: have.checkInStamp ?? null, distanceM: have.checkInDistanceM ?? null, reason: have.checkInReason ?? null } });
    } catch (e) {
      if (kindOf(e) !== 'FORBIDDEN_REFERENCE') throw e; // confirmed an instant ago by someone else
    }
    return this.day((await this.staffDay(t, staffId, date))!);
  }

  /** HR's correction of a member of staff's day, audited with the old values. */
  async correctStaffDay(t: TenantContext, staffId: string, date: string, dto: CorrectStaffDayDto): Promise<StaffDayDto> {
    this.checkDate(date);
    if (dto.checkIn === undefined && dto.checkOut === undefined) throw invalid('checkIn', 'atLeastOneField');
    for (const [field, v] of [['checkIn', dto.checkIn], ['checkOut', dto.checkOut]] as const) if (v && Number.isNaN(Date.parse(v))) throw invalid(field, 'notATimestamp');
    const have = await this.staffDay(t, staffId, date);
    const checkIn = dto.checkIn === undefined ? have?.checkIn ?? null : dto.checkIn;
    const checkOut = dto.checkOut === undefined ? have?.checkOut ?? null : dto.checkOut;
    if (checkOut && !checkIn) throw invalid('checkOut', 'needsCheckIn');
    if (checkIn && checkOut && Date.parse(checkOut) < Date.parse(checkIn)) throw invalid('checkOut', 'beforeCheckIn');
    try {
      await this.db.correctStaffAttendance({
        schoolId: t.schoolId, id: have ? dashed(have.id) : staffDayId(dashed(staffId), date), staffId: dashed(staffId), date, ...(checkIn ? { checkIn } : {}), ...(checkOut ? { checkOut } : {}),
        actorId: t.userId, details: { staffId: dashed(staffId), date, was: { checkIn: have?.checkIn ?? null, checkOut: have?.checkOut ?? null }, now: { checkIn, checkOut } },
      });
    } catch (e) {
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw notFound();
      throw e;
    }
    return this.day((await this.staffDay(t, staffId, date))!);
  }
}
