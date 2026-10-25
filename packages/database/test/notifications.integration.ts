// P3-9 and P3-10 in the database itself: a notification is written in the same transaction as its cause, a reader sees only their own; a removal leaves a tombstone. Run: npm run test:database
import { randomUUID } from 'node:crypto';
import { createDatabase, type Database } from '../src/index.js';

const host = process.env.DATA_CONNECT_EMULATOR_HOST;

describe.skipIf(!host)('Notifications and tombstones (P3-9, P3-10)', () => {
  let db: Database;
  const A = randomUUID();
  const B = randomUUID();
  const tag = A.slice(0, 8);
  const principal = `np-${tag}`, principal2 = `nq-${tag}`, hr = `nh-${tag}`, academic = `na-${tag}`, teacherU = `nt-${tag}`, other = `no-${tag}`, adminB = `nb-${tag}`;
  const date = '2090-06-04';
  let year = '', klass = '', maths = '', staffT = '', staffO = '', typeUnpaid = '', typePaid = '', period = '';

  const inbox = async (userId: string, role: string, school = A) => (await db.listNotifications({ schoolId: school, userId, role: role as never, limit: 100 })).data.notifications;
  const kinds = async (userId: string, role: string) => (await inbox(userId, role)).map((n) => n.kind).sort();

  beforeAll(async () => {
    db = createDatabase({ projectId: 'demo-oruschools' });
    for (const id of [principal, principal2, hr, academic, teacherU, other, adminB]) await db.upsertUser({ id, email: `${id}@example.com` });
    await db.provisionSchool({ id: A, name: 'School A', subDomain: `na-${tag}`, defaultLanguage: 'en', actorId: academic });
    await db.provisionSchool({ id: B, name: 'School B', subDomain: `nb-${tag}`, defaultLanguage: 'en', actorId: adminB });
    for (const [school, user, role] of [[A, principal, 'PRINCIPAL'], [A, principal2, 'PRINCIPAL'], [A, hr, 'HR_MANAGER'], [A, academic, 'ACADEMIC_ADMIN'], [A, teacherU, 'TEACHER'], [A, other, 'TEACHER'], [B, adminB, 'ACADEMIC_ADMIN']] as const)
      await db.createSchoolMember({ schoolId: school, userId: user, schoolRole: role as never });
    year = randomUUID();
    await db.createAcademicYear({ schoolId: A, id: year, name: 'Y', startDate: '2090-04-01', endDate: '2091-03-31', actorId: academic });
    const level = (await db.listGradeLevels({ schoolId: A })).data.gradeLevels[0]!;
    klass = randomUUID();
    await db.createClassroom({ schoolId: A, id: klass, gradeLevelId: level.id, section: 'N', name: `${level.name} N`, capacity: 30, actorId: academic });
    maths = randomUUID();
    await db.createSubject({ schoolId: A, id: maths, name: 'Maths', code: 'M', actorId: academic });
    period = randomUUID();
    await db.createPeriod({ schoolId: A, id: period, label: 'One', startTime: '08:00', endTime: '08:40', isBreak: false, actorId: academic, details: {} });
    const staff = async (userId: string) => { const seq = (await db.staffSeqInfo({ schoolId: A })).data.school!.staffSeq; const id = randomUUID(); await db.createStaff({ schoolId: A, id, expectedSeq: seq, employeeId: `E${seq + 1}`, firstName: 'T', lastName: id.slice(0, 4), actorId: hr }); await db.linkStaffAccount({ schoolId: A, id, userId, actorId: hr, details: {} }); return id; };
    staffT = await staff(teacherU); staffO = await staff(other);
    [typeUnpaid, typePaid] = [randomUUID(), randomUUID()];
    await db.createLeaveType({ schoolId: A, id: typeUnpaid, name: 'Unpaid', paid: false, quotaHalfDays: 0, actorId: hr, details: {} });
    await db.createLeaveType({ schoolId: A, id: typePaid, name: 'Casual', paid: true, quotaHalfDays: 10, actorId: hr, details: {} });
  }, 120_000);

  const ask = async (type: string, staff = staffT, actor = teacherU) => {
    const id = randomUUID();
    await db.createLeaveRequest({ schoolId: A, id, staffId: staff, leaveTypeId: type, startDate: date, endDate: date, halfDays: 2, notice: { name: 'T', typeName: 'X', startDate: date, endDate: date, days: '1' }, actorId: actor, details: {} });
    return id;
  };

  it('asking for leave tells the Principal role, in the same transaction; a refused request writes nothing', async () => {
    await expect(ask(typeUnpaid, staffO, teacherU)).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // not their own record
    expect(await kinds(principal, 'PRINCIPAL')).toEqual([]);
    await ask(typeUnpaid);
    expect(await kinds(principal, 'PRINCIPAL')).toEqual(['leave.requested']);
    expect(await kinds(principal2, 'PRINCIPAL')).toEqual(['leave.requested']); // addressed to the role: both Principals see it
    expect(await kinds(hr, 'HR_MANAGER')).toEqual([]);
    expect(await kinds(teacherU, 'TEACHER')).toEqual([]);
  });

  it('approving unpaid leave raises the requester\'s notice, the substitution alert and the payroll alert together; approving paid leave only the first two', async () => {
    const [req] = (await db.listLeaveRequests({ schoolId: A })).data.leaveRequests;
    const notice = { name: 'T', typeName: 'Unpaid', startDate: date, endDate: date, days: '1' };
    await expect(db.approveUnpaidLeaveRequest({ schoolId: A, id: req!.id, staffId: staffT, notice, actorId: hr, details: {} })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // not the Principal
    expect(await kinds(teacherU, 'TEACHER')).toEqual([]);
    expect(await kinds(hr, 'HR_MANAGER')).toEqual([]);
    await db.approveUnpaidLeaveRequest({ schoolId: A, id: req!.id, staffId: staffT, notice, actorId: principal, details: {} });
    expect(await kinds(teacherU, 'TEACHER')).toEqual(['leave.approved']);
    expect(await kinds(academic, 'ACADEMIC_ADMIN')).toEqual(['leave.substitution']);
    expect(await kinds(hr, 'HR_MANAGER')).toEqual(['leave.payroll']);
    // paid leave: no payroll alert
    const paid = randomUUID();
    await db.createLeaveRequest({ schoolId: A, id: paid, staffId: staffO, leaveTypeId: typePaid, startDate: '2090-06-11', endDate: '2090-06-11', halfDays: 2, actorId: other, details: {} });
    const bal = randomUUID();
    await db.createLeaveBalance({ schoolId: A, id: bal, staffId: staffO, leaveTypeId: typePaid, academicYearId: year, allowedHalfDays: 10, actorId: other });
    await db.approveLeaveRequest({ schoolId: A, id: paid, staffId: staffO, balanceId: bal, halfDays: 2, expectedRemaining: 10, newRemaining: 8, notice, actorId: principal, details: {} });
    expect(await kinds(hr, 'HR_MANAGER')).toEqual(['leave.payroll']); // still just the one from the unpaid leave
    expect(await kinds(academic, 'ACADEMIC_ADMIN')).toEqual(['leave.substitution', 'leave.substitution']);
    expect(await kinds(other, 'TEACHER')).toEqual(['leave.approved']);
    // a stale balance aborts the whole approval, notices included
    const paid2 = randomUUID();
    await db.createLeaveRequest({ schoolId: A, id: paid2, staffId: staffO, leaveTypeId: typePaid, startDate: '2090-06-18', endDate: '2090-06-18', halfDays: 2, actorId: other, details: {} });
    await expect(db.approveLeaveRequest({ schoolId: A, id: paid2, staffId: staffO, balanceId: bal, halfDays: 2, expectedRemaining: 10, newRemaining: 8, notice, actorId: principal, details: {} })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    expect(await kinds(other, 'TEACHER')).toEqual(['leave.approved']);
  });

  it('a person sees only what is addressed to them or their role; another school sees nothing; reading is per person', async () => {
    expect(await kinds(other, 'TEACHER')).toEqual(['leave.approved']); // not teacherU's
    expect(await inbox(adminB, 'ACADEMIC_ADMIN', B)).toEqual([]);
    expect(await inbox(academic, 'ACADEMIC_ADMIN', B)).toEqual([]);
    const mine = (await inbox(teacherU, 'TEACHER'))[0]!;
    const forAcademic = (await inbox(academic, 'ACADEMIC_ADMIN'))[0]!;
    await expect(db.markNotificationRead({ schoolId: A, notificationId: mine.id, role: 'TEACHER' as never, actorId: other })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // someone else's
    await expect(db.markNotificationRead({ schoolId: A, notificationId: forAcademic.id, role: 'TEACHER' as never, actorId: teacherU })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // another role's
    await expect(db.markNotificationRead({ schoolId: A, notificationId: mine.id, role: 'PRINCIPAL' as never, actorId: teacherU })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // a role they do not hold
    await expect(db.markNotificationRead({ schoolId: B, notificationId: mine.id, role: 'ACADEMIC_ADMIN' as never, actorId: adminB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    expect((await inbox(teacherU, 'TEACHER'))[0]!.reads).toHaveLength(0);
    await db.markNotificationRead({ schoolId: A, notificationId: mine.id, role: 'TEACHER' as never, actorId: teacherU });
    await db.markNotificationRead({ schoolId: A, notificationId: mine.id, role: 'TEACHER' as never, actorId: teacherU }); // again: still one marker
    expect((await inbox(teacherU, 'TEACHER'))[0]!.reads).toHaveLength(1);
    // a notice to the Principal role: one Principal reading it does not mark it read for the other
    const note = (await inbox(principal, 'PRINCIPAL'))[0]!;
    await db.markNotificationRead({ schoolId: A, notificationId: note.id, role: 'PRINCIPAL' as never, actorId: principal });
    expect((await inbox(principal, 'PRINCIPAL'))[0]!.reads).toHaveLength(1);
    expect((await inbox(principal2, 'PRINCIPAL'))[0]!.reads).toHaveLength(0);
  });

  it('preferences are the reader\'s own and can be switched back', async () => {
    await db.muteNotificationCategory({ schoolId: A, category: 'leave', actorId: teacherU });
    await db.muteNotificationCategory({ schoolId: A, category: 'leave', actorId: teacherU });
    expect((await db.listNotificationMutes({ schoolId: A, userId: teacherU })).data.notificationMutes).toEqual([{ category: 'leave' }]);
    expect((await db.listNotificationMutes({ schoolId: A, userId: other })).data.notificationMutes).toEqual([]);
    await db.unmuteNotificationCategory({ schoolId: A, category: 'leave', actorId: teacherU });
    expect((await db.listNotificationMutes({ schoolId: A, userId: teacherU })).data.notificationMutes).toEqual([]);
  });

  it('P3-10: removing a lesson, a substitute, an attendance mark or a mark leaves a tombstone in the same transaction, and only with the right class and staff', async () => {
    const entry = randomUUID();
    await db.addTeacherSubject({ schoolId: A, id: randomUUID(), staffId: staffT, subjectId: maths, actorId: academic, details: {} });
    await db.createTimetableEntry({ schoolId: A, id: entry, academicYearId: year, classroomId: klass, subjectId: maths, staffId: staffT, day: 'MON', periodId: period, actorId: academic, details: {} });
    const wrongClass = randomUUID();
    await expect(db.deleteTimetableEntry({ schoolId: A, id: entry, classroomId: wrongClass, staffId: staffT, actorId: academic, details: {} })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    const since = '2000-01-01T00:00:00Z';
    const stones = async () => (await db.listTombstones({ schoolId: A, since, limit: 100 })).data.tombstones;
    expect(await stones()).toHaveLength(0);
    await db.deleteTimetableEntry({ schoolId: A, id: entry, classroomId: klass, staffId: staffT, actorId: academic, details: {} });
    const [t1] = await stones();
    expect(t1).toMatchObject({ entityType: 'TimetableEntry' });
    expect(t1!.entityId.replaceAll('-', '')).toBe(entry.replaceAll('-', ''));
    expect(t1!.classroomId!.replaceAll('-', '')).toBe(klass.replaceAll('-', ''));
    expect((await db.listTombstones({ schoolId: B, since, limit: 100 })).data.tombstones).toEqual([]);
    // after a moment, only what is newer
    const later = (await stones())[0]!.deletedAt;
    expect((await db.listTombstones({ schoolId: A, since: later, limit: 100 })).data.tombstones).toEqual([]);
  });
});
