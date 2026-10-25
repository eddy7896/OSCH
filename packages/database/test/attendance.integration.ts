// P3-4: attendance in the database itself. Run: npm run test:database
import { randomUUID } from 'node:crypto';
import { createDatabase, type Database } from '../src/index.js';

const host = process.env.DATA_CONNECT_EMULATOR_HOST;

describe.skipIf(!host)('Attendance (P3-4)', () => {
  let db: Database;
  const A = randomUUID();
  const B = randomUUID();
  const tag = A.slice(0, 8);
  const adminA = `aa-${tag}`, adminB = `ab-${tag}`, outsider = `ao-${tag}`;
  const audit = async (s: string, action: string) => (await db.listAuditLog({ schoolId: s, limit: 300, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  let yearA = '', yearB = '', c1 = '', c2 = '', cB = '', st1 = '', st2 = '', stOther = '', stB = '', staffA = '', staffB = '';
  const date = '2090-06-04';

  const student = async (school: string, actor: string, classroomId: string, year: string) => {
    const s = (await db.schoolSeq({ schoolId: school })).data.school!;
    const id = randomUUID();
    await db.createStudent({ schoolId: school, id, expectedSeq: s.studentSeq, enrollmentId: `S${s.studentSeq + 1}`, firstName: 'K', lastName: id.slice(0, 4), actorId: actor });
    await db.placeStudent({ schoolId: school, studentId: id, academicYearId: year, classroomId, actorId: actor });
    return id;
  };
  const staff = async (school: string, actor: string) => {
    const seq = (await db.staffSeqInfo({ schoolId: school })).data.school!.staffSeq;
    const id = randomUUID();
    await db.createStaff({ schoolId: school, id, expectedSeq: seq, employeeId: `E${seq + 1}`, firstName: 'T', lastName: id.slice(0, 4), actorId: actor });
    return id;
  };
  const day = async (school: string, classroomId: string, d: string, actor: string) => {
    const id = randomUUID();
    await db.createAttendanceDay({ schoolId: school, id, classroomId, date: d, actorId: actor });
    return id;
  };
  const mark = (o: { school?: string; day: string; student: string; klass?: string; year?: string; status?: string; lockedOk?: boolean[]; actor?: string; id?: string }) =>
    db.saveAttendanceMark({ schoolId: o.school ?? A, id: o.id ?? randomUUID(), dayId: o.day, studentId: o.student, classroomId: o.klass ?? c1, academicYearId: o.year ?? yearA, status: (o.status ?? 'ABSENT') as never, lockedOk: o.lockedOk ?? [false], actorId: o.actor ?? adminA });

  beforeAll(async () => {
    db = createDatabase({ projectId: 'demo-oruschools' });
    for (const id of [adminA, adminB, outsider]) await db.upsertUser({ id, email: `${id}@example.com` });
    await db.provisionSchool({ id: A, name: 'School A', subDomain: `aa-${tag}`, defaultLanguage: 'en', actorId: adminA });
    await db.provisionSchool({ id: B, name: 'School B', subDomain: `ab-${tag}`, defaultLanguage: 'en', actorId: adminB });
    await db.createSchoolMember({ schoolId: A, userId: adminA, schoolRole: 'ACADEMIC_ADMIN' as never });
    await db.createSchoolMember({ schoolId: B, userId: adminB, schoolRole: 'ACADEMIC_ADMIN' as never });
    yearA = randomUUID(); yearB = randomUUID();
    await db.createAcademicYear({ schoolId: A, id: yearA, name: 'Y', startDate: '2090-04-01', endDate: '2091-03-31', actorId: adminA });
    await db.createAcademicYear({ schoolId: B, id: yearB, name: 'Y', startDate: '2090-04-01', endDate: '2091-03-31', actorId: adminB });
    const klass = async (school: string, actor: string) => {
      const level = (await db.listGradeLevels({ schoolId: school })).data.gradeLevels[0]!;
      const id = randomUUID();
      await db.createClassroom({ schoolId: school, id, gradeLevelId: level.id, section: id.slice(0, 4), name: `${level.name} ${id.slice(0, 4)}`, capacity: 30, actorId: actor });
      return id;
    };
    [c1, c2, cB] = [await klass(A, adminA), await klass(A, adminA), await klass(B, adminB)];
    st1 = await student(A, adminA, c1, yearA); st2 = await student(A, adminA, c1, yearA); stOther = await student(A, adminA, c2, yearA); stB = await student(B, adminB, cB, yearB);
    staffA = await staff(A, adminA); staffB = await staff(B, adminB);
  }, 120_000);

  it('one day per class per date (unique key); a second first-submit is refused and writes nothing', async () => {
    const d = await day(A, c1, date, adminA);
    await expect(db.createAttendanceDay({ schoolId: A, id: randomUUID(), classroomId: c1, date, actorId: adminA })).rejects.toMatchObject({ kind: 'CONFLICT' });
    await day(A, c2, date, adminA); // another class, same date: fine
    expect((await db.getAttendanceDay({ schoolId: A, classroomId: c1, date })).data.attendanceDays).toHaveLength(1);
    expect((await db.getAttendanceDay({ schoolId: A, classroomId: c1, date })).data.attendanceDays[0]!.id.replaceAll('-', '')).toBe(d.replaceAll('-', ''));
  });

  it('saving the same mark twice is one row; a changed status updates it; removing deletes it', async () => {
    const d = (await db.getAttendanceDay({ schoolId: A, classroomId: c1, date })).data.attendanceDays[0]!.id;
    const id = randomUUID();
    await mark({ day: d, student: st1, id });
    await mark({ day: d, student: st1, id, status: 'LATE' });
    const marks = (await db.getAttendanceDay({ schoolId: A, classroomId: c1, date })).data.attendanceDays[0]!.marks;
    expect(marks).toHaveLength(1);
    expect(marks[0]!.status).toBe('LATE');
    await db.removeAttendanceMark({ schoolId: A, id, dayId: d, classroomId: c1, lockedOk: [false], actorId: adminA });
    expect((await db.getAttendanceDay({ schoolId: A, classroomId: c1, date })).data.attendanceDays[0]!.marks).toHaveLength(0);
  });

  it('refuses a student who is not in the class, one of another school, an outsider as actor, and another school\'s day', async () => {
    const d = (await db.getAttendanceDay({ schoolId: A, classroomId: c1, date })).data.attendanceDays[0]!.id;
    await expect(mark({ day: d, student: stOther })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // in the other class
    await expect(mark({ day: d, student: stB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(mark({ day: d, student: st1, actor: outsider })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(mark({ school: B, day: d, student: stB, klass: cB, year: yearB, actor: adminB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // A's day, through B
    await expect(mark({ day: randomUUID(), student: st1 })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    expect((await db.getAttendanceDay({ schoolId: A, classroomId: c1, date })).data.attendanceDays[0]!.marks).toHaveLength(0);
  });

  it('finishing a day is the one audited step; a locked day refuses a teacher\'s marks and finish, and allows the correction', async () => {
    const d = (await db.getAttendanceDay({ schoolId: A, classroomId: c1, date })).data.attendanceDays[0]!.id;
    await mark({ day: d, student: st1 });
    await db.finishAttendanceSubmit({ schoolId: A, id: d, submissionId: 'sub-1', locked: false, actorId: adminA, details: {} });
    expect((await audit(A, 'attendance.submit')).length).toBe(1);
    expect((await db.getAttendanceDay({ schoolId: A, classroomId: c1, date })).data.attendanceDays[0]).toMatchObject({ locked: false, submissionId: 'sub-1' });
    await db.lockAttendanceDay({ schoolId: A, id: d, actorId: adminA, details: {} });
    expect((await audit(A, 'attendance.lock')).length).toBe(1);
    await expect(mark({ day: d, student: st2 })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.removeAttendanceMark({ schoolId: A, id: randomUUID(), dayId: d, classroomId: c1, lockedOk: [false], actorId: adminA })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.finishAttendanceSubmit({ schoolId: A, id: d, locked: false, actorId: adminA, details: {} })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await mark({ day: d, student: st2, lockedOk: [false, true] }); // the correction path
    await db.finishAttendanceCorrection({ schoolId: A, id: d, actorId: adminA, details: { changes: [{ studentId: st2, from: 'PRESENT', to: 'ABSENT' }] } });
    const rows = await audit(A, 'attendance.correct');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.details).toMatchObject({ changes: [{ from: 'PRESENT', to: 'ABSENT' }] });
    expect((await db.getAttendanceDay({ schoolId: A, classroomId: c1, date })).data.attendanceDays[0]).toMatchObject({ locked: true, submissionId: null });
    await expect(db.lockAttendanceDay({ schoolId: B, id: d, actorId: adminB, details: {} })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
  });

  it('status labels: one row per status per school, upserted', async () => {
    const id = randomUUID();
    await db.setAttendanceStatusLabel({ schoolId: A, id, status: 'LATE' as never, label: 'Tardy', actorId: adminA, details: {} });
    await db.setAttendanceStatusLabel({ schoolId: A, id, status: 'LATE' as never, label: 'Behind', actorId: adminA, details: {} });
    expect((await db.listAttendanceStatusLabels({ schoolId: A })).data.attendanceStatusLabels).toEqual([{ status: 'LATE', label: 'Behind' }]);
    expect((await db.listAttendanceStatusLabels({ schoolId: B })).data.attendanceStatusLabels).toEqual([]);
    expect((await audit(A, 'attendance.status.label')).length).toBe(2);
  });

  it('staff: one row per member per day; check-out only once there is an open check-in; HR correction audited; schools stay apart', async () => {
    const id = randomUUID();
    await db.checkInStaff({ schoolId: A, id, staffId: staffA, date, actorId: adminA, details: {} });
    await expect(db.checkInStaff({ schoolId: A, id: randomUUID(), staffId: staffA, date, actorId: adminA, details: {} })).rejects.toMatchObject({ kind: 'CONFLICT' });
    await expect(db.checkInStaff({ schoolId: A, id: randomUUID(), staffId: staffB, date, actorId: adminA, details: {} })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await db.checkOutStaff({ schoolId: A, id, actorId: adminA, details: {} });
    await expect(db.checkOutStaff({ schoolId: A, id, actorId: adminA, details: {} })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // already out
    const row = (await db.getStaffAttendance({ schoolId: A, staffId: staffA, date })).data.staffAttendances[0]!;
    expect(row.checkIn).toBeTruthy(); expect(row.checkOut).toBeTruthy();
    await db.correctStaffAttendance({ schoolId: A, id, staffId: staffA, date, checkIn: `${date}T03:00:00Z`, checkOut: `${date}T11:00:00Z`, actorId: adminA, details: { was: {} } });
    expect((await db.staffAttendanceOfStaff({ schoolId: A, staffId: staffA, from: date, to: date })).data.staffAttendances).toHaveLength(1);
    await expect(db.correctStaffAttendance({ schoolId: B, id: randomUUID(), staffId: staffA, date: '2090-06-05', actorId: adminB, details: {} })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    expect((await db.staffAttendanceOn({ schoolId: B, date })).data.staffAttendances).toEqual([]);
    expect((await audit(A, 'attendance.staff.checkin')).length).toBe(1);
    expect((await audit(A, 'attendance.staff.checkout')).length).toBe(1);
    expect((await audit(A, 'attendance.staff.correct')).length).toBe(1);
  });
});
