// P3-7: substitution in the database itself (E-ACAD-2): every rule is checked again where the row is written. Run: npm run test:database
import { randomUUID } from 'node:crypto';
import { createDatabase, type Database } from '../src/index.js';

const host = process.env.DATA_CONNECT_EMULATOR_HOST;

describe.skipIf(!host)('Substitution (P3-7)', () => {
  let db: Database;
  const A = randomUUID();
  const B = randomUUID();
  const tag = A.slice(0, 8);
  const admin = `sa-${tag}`, adminB = `sb-${tag}`, principal = `sp-${tag}`, accX = `sx-${tag}`, accY = `sy-${tag}`;
  const audit = async (s: string, action: string) => (await db.listAuditLog({ schoolId: s, limit: 300, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  const date = '2090-06-05'; // a Monday
  let year = '', maths = '', art = '', klass = '', klass2 = '', p1 = '', p2 = '', X = '', Y = '', Z = '', W = '', V = '', staffB = '', leaveX = '', entryX1 = '', entryX2 = '', entryW1 = '';

  const staff = async (school: string, actor: string, userId?: string) => {
    const seq = (await db.staffSeqInfo({ schoolId: school })).data.school!.staffSeq;
    const id = randomUUID();
    await db.createStaff({ schoolId: school, id, expectedSeq: seq, employeeId: `E${seq + 1}`, firstName: 'T', lastName: id.slice(0, 4), actorId: actor });
    if (userId) await db.linkStaffAccount({ schoolId: school, id, userId, actorId: actor, details: {} });
    return id;
  };
  const teach = (school: string, st: string, subject: string, actor: string) => db.addTeacherSubject({ schoolId: school, id: randomUUID(), staffId: st, subjectId: subject, actorId: actor, details: {} });
  const lesson = async (c: string, st: string, period: string, subject = maths) => {
    const id = randomUUID();
    await db.createTimetableEntry({ schoolId: A, id, academicYearId: year, classroomId: c, subjectId: subject, staffId: st, day: 'MON', periodId: period, actorId: admin, details: {} });
    return id;
  };
  const cover = (o: { entry?: string; sub?: string; absent?: string; leave?: string; period?: string; subject?: string; day?: string; d?: string; school?: string; actor?: string; id?: string } = {}) =>
    db.setSubstitute({ schoolId: o.school ?? A, id: o.id ?? randomUUID(), timetableEntryId: o.entry ?? entryX1, date: o.d ?? date, day: o.day ?? 'MON', periodId: o.period ?? p1, subjectId: o.subject ?? maths, absentStaffId: o.absent ?? X, leaveRequestId: o.leave ?? leaveX, substituteId: o.sub ?? Y, actorId: o.actor ?? admin, details: {} });
  const rows = async () => (await db.listSubstitutions({ schoolId: A, from: date, to: date })).data.substitutions;

  beforeAll(async () => {
    db = createDatabase({ projectId: 'demo-oruschools' });
    for (const id of [admin, adminB, principal, accX, accY]) await db.upsertUser({ id, email: `${id}@example.com` });
    await db.provisionSchool({ id: A, name: 'School A', subDomain: `sa-${tag}`, defaultLanguage: 'en', actorId: admin });
    await db.provisionSchool({ id: B, name: 'School B', subDomain: `sb-${tag}`, defaultLanguage: 'en', actorId: adminB });
    for (const [school, user, role] of [[A, admin, 'ACADEMIC_ADMIN'], [A, principal, 'PRINCIPAL'], [A, accX, 'TEACHER'], [A, accY, 'TEACHER'], [B, adminB, 'ACADEMIC_ADMIN']] as const) await db.createSchoolMember({ schoolId: school, userId: user, schoolRole: role as never });
    year = randomUUID();
    await db.createAcademicYear({ schoolId: A, id: year, name: 'Y', startDate: '2090-04-01', endDate: '2091-03-31', actorId: admin });
    const mkClass = async () => { const level = (await db.listGradeLevels({ schoolId: A })).data.gradeLevels[0]!; const id = randomUUID(); await db.createClassroom({ schoolId: A, id, gradeLevelId: level.id, section: id.slice(0, 4), name: `${level.name} ${id.slice(0, 4)}`, capacity: 30, actorId: admin }); return id; };
    [klass, klass2] = [await mkClass(), await mkClass()];
    [maths, art] = [randomUUID(), randomUUID()];
    await db.createSubject({ schoolId: A, id: maths, name: 'Maths', code: 'M', actorId: admin });
    await db.createSubject({ schoolId: A, id: art, name: 'Art', code: 'A', actorId: admin });
    [p1, p2] = [randomUUID(), randomUUID()];
    await db.createPeriod({ schoolId: A, id: p1, label: 'One', startTime: '08:00', endTime: '08:40', isBreak: false, actorId: admin, details: {} });
    await db.createPeriod({ schoolId: A, id: p2, label: 'Two', startTime: '08:40', endTime: '09:20', isBreak: false, actorId: admin, details: {} });
    X = await staff(A, admin, accX); Y = await staff(A, admin, accY); Z = await staff(A, admin); W = await staff(A, admin); V = await staff(A, admin); staffB = await staff(B, adminB);
    for (const s of [X, Y, W, V]) await teach(A, s, maths, admin);
    await teach(A, Z, art, admin);
    entryX1 = await lesson(klass, X, p1); entryX2 = await lesson(klass, X, p2); entryW1 = await lesson(klass2, W, p1);
    await db.createSubject({ schoolId: B, id: randomUUID(), name: 'Maths', code: 'M', actorId: adminB });
    const type = randomUUID();
    await db.createLeaveType({ schoolId: A, id: type, name: 'Unpaid', paid: false, quotaHalfDays: 0, actorId: admin, details: {} });
    leaveX = randomUUID();
    await db.createLeaveRequest({ schoolId: A, id: leaveX, staffId: X, leaveTypeId: type, startDate: date, endDate: date, halfDays: 2, actorId: accX, details: {} });
  }, 120_000);

  it('nothing can be assigned for leave that is not APPROVED', async () => {
    await expect(cover()).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    expect(await rows()).toHaveLength(0);
    await db.approveUnpaidLeaveRequest({ schoolId: A, id: leaveX, staffId: X, actorId: principal, details: {} });
  });

  it('refuses a lesson that is not the absent teacher\'s, a wrong period or weekday, a date outside the leave, and a leave of someone else', async () => {
    await expect(cover({ entry: entryW1, period: p1 })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // Wasim's lesson, not Xavier's
    await expect(cover({ period: p2 })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // the entry is in period one
    await expect(cover({ day: 'TUE' })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(cover({ d: '2090-06-11' })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // the leave is one day
    await expect(cover({ absent: W, entry: entryW1 })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // Wasim has no leave
    await expect(cover({ subject: art })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    expect(await rows()).toHaveLength(0);
  });

  it('refuses a substitute who is the absent teacher, not qualified, has a lesson of their own then, is on leave, has left, or is another school\'s', async () => {
    const left = await staff(A, admin); await teach(A, left, maths, admin); await db.updateStaff({ schoolId: A, id: left, status: 'LEFT' as never, actorId: admin, details: {} });
    for (const [sub, why] of [[X, 'the absent teacher'], [Z, 'not qualified'], [W, 'has a lesson of their own'], [left, 'has left'], [staffB, 'another school'], [randomUUID(), 'unknown']] as const)
      await expect(cover({ sub }), why).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    // Victor is on approved leave that day
    const type2 = randomUUID();
    await db.createLeaveType({ schoolId: A, id: type2, name: 'Unpaid 2', paid: false, quotaHalfDays: 0, actorId: admin, details: {} });
    const accV = `sv-${tag}`; await db.upsertUser({ id: accV, email: `${accV}@example.com` }); await db.createSchoolMember({ schoolId: A, userId: accV, schoolRole: 'TEACHER' as never });
    await db.linkStaffAccount({ schoolId: A, id: V, userId: accV, actorId: admin, details: {} });
    const lv = randomUUID();
    await db.createLeaveRequest({ schoolId: A, id: lv, staffId: V, leaveTypeId: type2, startDate: date, endDate: date, halfDays: 2, actorId: accV, details: {} });
    await db.approveUnpaidLeaveRequest({ schoolId: A, id: lv, staffId: V, actorId: principal, details: {} });
    await expect(cover({ sub: V })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(cover({ school: B, actor: adminB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // A's lesson through school B
    await expect(cover({ actor: principal === 'x' ? '' : `nobody-${tag}` })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    expect(await rows()).toHaveLength(0);
  });

  it('assigns, audited; the same lesson and date is one row (changing the substitute replaces it); the unique key stops a substitute being in two places in one period', async () => {
    const id = randomUUID();
    await cover({ id });
    expect(await rows()).toHaveLength(1);
    expect((await audit(A, 'academic.substitution.set')).length).toBe(1);
    const other = await staff(A, admin); await teach(A, other, maths, admin);
    await cover({ id, sub: other }); // the same id: the substitute changes, no second row
    const now = await rows();
    expect(now).toHaveLength(1);
    expect(now[0]!.substitute.id.replaceAll('-', '')).toBe(other.replaceAll('-', ''));
    // Wasim is also away, with a lesson in period one: `other` cannot cover both lessons of one period on one date
    const accW = `sw-${tag}`; await db.upsertUser({ id: accW, email: `${accW}@example.com` }); await db.createSchoolMember({ schoolId: A, userId: accW, schoolRole: 'TEACHER' as never });
    await db.linkStaffAccount({ schoolId: A, id: W, userId: accW, actorId: admin, details: {} });
    const type3 = randomUUID(); await db.createLeaveType({ schoolId: A, id: type3, name: 'Unpaid 3', paid: false, quotaHalfDays: 0, actorId: admin, details: {} });
    const lw = randomUUID();
    await db.createLeaveRequest({ schoolId: A, id: lw, staffId: W, leaveTypeId: type3, startDate: date, endDate: date, halfDays: 2, actorId: accW, details: {} });
    await db.approveUnpaidLeaveRequest({ schoolId: A, id: lw, staffId: W, actorId: principal, details: {} });
    await expect(cover({ entry: entryW1, absent: W, leave: lw, sub: other })).rejects.toMatchObject({ kind: 'CONFLICT' });
    // and the same lesson and date can hold only one substitute, however the id is chosen
    await expect(db.setSubstitute({ schoolId: A, id: randomUUID(), timetableEntryId: entryX1, date, day: 'MON', periodId: p1, subjectId: maths, absentStaffId: X, leaveRequestId: leaveX, substituteId: Y, actorId: admin, details: {} })).rejects.toMatchObject({ kind: 'CONFLICT' });
    await cover({ entry: entryX2, period: p2, sub: other }); // other periods are fine
    expect(await rows()).toHaveLength(2);
  });

  it('clearing is audited and scoped; changing or removing the lesson in the timetable takes its cover with it', async () => {
    const [first, second] = await rows();
    await expect(db.clearSubstitute({ schoolId: B, id: first!.id, substituteId: first!.substitute.id, classroomId: first!.timetableEntry.classroom.id, actorId: adminB, details: {} })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await db.clearSubstitute({ schoolId: A, id: first!.id, substituteId: first!.substitute.id, classroomId: first!.timetableEntry.classroom.id, actorId: admin, details: {} });
    expect((await audit(A, 'academic.substitution.clear')).length).toBe(1);
    expect(await rows()).toHaveLength(1);
    await db.deleteTimetableEntry({ schoolId: A, id: second!.timetableEntryId, classroomId: second!.timetableEntry.classroom.id, staffId: second!.timetableEntry.staffId, actorId: admin, details: {} });
    expect(await rows()).toHaveLength(0);
  });
});
