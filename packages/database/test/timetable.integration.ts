// P3-3: the timetable and its clash rules in the database itself. Run: npm run test:database
import { randomUUID } from 'node:crypto';
import { createDatabase, DatabaseError, type Database } from '../src/index.js';

const host = process.env.DATA_CONNECT_EMULATOR_HOST;

describe.skipIf(!host)('Timetable (P3-3)', () => {
  let db: Database;
  const A = randomUUID();
  const B = randomUUID();
  const tag = A.slice(0, 8);
  const adminA = `ma-${tag}`, adminB = `mb-${tag}`, outsider = `mo-${tag}`;
  const audit = async (s: string, action: string) => (await db.listAuditLog({ schoolId: s, limit: 300, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  let yearA = '', yearB = '', c1 = '', c2 = '', cB = '', sub1 = '', sub2 = '', subB = '', s1 = '', s2 = '', sB = '', sLeft = '', p1 = '', p2 = '', brk = '', pB = '';

  const staff = async (school: string, actor: string) => {
    const seq = (await db.staffSeqInfo({ schoolId: school })).data.school!.staffSeq;
    const id = randomUUID();
    await db.createStaff({ schoolId: school, id, expectedSeq: seq, employeeId: `E${seq + 1}`, firstName: 'T', lastName: id.slice(0, 4), actorId: actor });
    return id;
  };
  const put = (o: Partial<{ school: string; year: string; klass: string; subject: string; staff: string; day: string; period: string; actor: string }> = {}) =>
    db.createTimetableEntry({ schoolId: o.school ?? A, id: randomUUID(), academicYearId: o.year ?? yearA, classroomId: o.klass ?? c1, subjectId: o.subject ?? sub1, staffId: o.staff ?? s1, day: o.day ?? 'MON', periodId: o.period ?? p1, actorId: o.actor ?? adminA, details: {} });
  const rows = async (school = A, year = yearA) => (await db.listTimetableForYear({ schoolId: school, academicYearId: year })).data.timetableEntries;

  beforeAll(async () => {
    db = createDatabase({ projectId: 'demo-oruschools' });
    for (const id of [adminA, adminB, outsider]) await db.upsertUser({ id, email: `${id}@example.com` });
    await db.provisionSchool({ id: A, name: 'School A', subDomain: `ma-${tag}`, defaultLanguage: 'en', actorId: adminA });
    await db.provisionSchool({ id: B, name: 'School B', subDomain: `mb-${tag}`, defaultLanguage: 'en', actorId: adminB });
    await db.createSchoolMember({ schoolId: A, userId: adminA, schoolRole: 'ACADEMIC_ADMIN' as never });
    await db.createSchoolMember({ schoolId: B, userId: adminB, schoolRole: 'ACADEMIC_ADMIN' as never });
    yearA = randomUUID(); yearB = randomUUID();
    await db.createAcademicYear({ schoolId: A, id: yearA, name: 'Y', startDate: '2090-04-01', endDate: '2091-03-31', actorId: adminA });
    await db.createAcademicYear({ schoolId: B, id: yearB, name: 'Y', startDate: '2090-04-01', endDate: '2091-03-31', actorId: adminB });
    const mkClass = async (school: string, actor: string) => {
      const level = (await db.listGradeLevels({ schoolId: school })).data.gradeLevels[0]!;
      const id = randomUUID();
      await db.createClassroom({ schoolId: school, id, gradeLevelId: level.id, section: id.slice(0, 4), name: `${level.name} ${id.slice(0, 4)}`, capacity: 30, actorId: actor });
      return id;
    };
    [c1, c2, cB] = [await mkClass(A, adminA), await mkClass(A, adminA), await mkClass(B, adminB)];
    [sub1, sub2, subB] = [randomUUID(), randomUUID(), randomUUID()];
    await db.createSubject({ schoolId: A, id: sub1, name: 'Maths', code: 'M', actorId: adminA });
    await db.createSubject({ schoolId: A, id: sub2, name: 'Art', code: 'A', actorId: adminA });
    await db.createSubject({ schoolId: B, id: subB, name: 'Maths', code: 'M', actorId: adminB });
    [s1, s2, sLeft, sB] = [await staff(A, adminA), await staff(A, adminA), await staff(A, adminA), await staff(B, adminB)];
    for (const [school, st, su, actor] of [[A, s1, sub1, adminA], [A, s1, sub2, adminA], [A, s2, sub2, adminA], [A, sLeft, sub1, adminA], [B, sB, subB, adminB]] as const)
      await db.addTeacherSubject({ schoolId: school, id: randomUUID(), staffId: st, subjectId: su, actorId: actor, details: {} });
    await db.updateStaff({ schoolId: A, id: sLeft, status: 'LEFT' as never, actorId: adminA, details: {} });
    [p1, p2, brk, pB] = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    await db.createPeriod({ schoolId: A, id: p1, label: 'One', startTime: '08:00', endTime: '08:40', isBreak: false, actorId: adminA, details: {} });
    await db.createPeriod({ schoolId: A, id: p2, label: 'Two', startTime: '08:40', endTime: '09:20', isBreak: false, actorId: adminA, details: {} });
    await db.createPeriod({ schoolId: A, id: brk, label: 'Break', startTime: '09:20', endTime: '09:40', isBreak: true, actorId: adminA, details: {} });
    await db.createPeriod({ schoolId: B, id: pB, label: 'One', startTime: '08:00', endTime: '08:40', isBreak: false, actorId: adminB, details: {} });
  });

  it('places a lesson, audited, and lists it for the class, the teacher and the year', async () => {
    await put();
    expect(await rows()).toHaveLength(1);
    expect((await db.listTimetableForClass({ schoolId: A, academicYearId: yearA, classroomId: c1 })).data.timetableEntries[0]).toMatchObject({ day: 'MON', subject: { code: 'M' } });
    expect((await db.listTimetableForStaff({ schoolId: A, academicYearId: yearA, staffId: s1 })).data.timetableEntries).toHaveLength(1);
    expect((await db.countTimetableForPeriod({ schoolId: A, periodId: p1 })).data.timetableEntries[0]!._count).toBe(1);
    expect((await audit(A, 'academic.timetable.set')).length).toBe(1);
  });

  it('the unique keys refuse a class twice and a teacher in two classes in one slot, and write nothing', async () => {
    await expect(put({ staff: s2, subject: sub2 })).rejects.toMatchObject({ kind: 'CONFLICT' }); // same class, same slot
    await expect(put({ klass: c2 })).rejects.toMatchObject({ kind: 'CONFLICT' }); // same teacher, same slot
    await put({ klass: c2, staff: s2, subject: sub2 }); // another teacher in the other class: fine
    await put({ day: 'TUE' }); await put({ period: p2 }); // same class and teacher, another day or period: fine
    expect(await rows()).toHaveLength(4);
    expect((await audit(A, 'academic.timetable.set')).length).toBe(4); // refused ones left no audit row
  });

  it('refuses a teacher who does not teach the subject, one who has left, a break, and an unknown class, year, staff or period', async () => {
    const reject = async (o: Parameters<typeof put>[0]) => { const e = await put({ day: 'FRI', period: p2, ...o }).catch((x) => x); expect(e).toBeInstanceOf(DatabaseError); expect((e as DatabaseError).kind).toBe('FORBIDDEN_REFERENCE'); };
    await reject({ klass: c2, staff: s2, subject: sub1 }); // s2 does not teach maths
    await reject({ klass: c2, staff: sLeft });
    await reject({ klass: c2, period: brk });
    await reject({ klass: randomUUID() });
    await reject({ klass: c2, staff: randomUUID() });
    await reject({ klass: c2, period: randomUUID() });
    await reject({ klass: c2, year: randomUUID() });
    expect(await rows()).toHaveLength(4);
  });

  it('never mixes schools: another school\'s class, subject, staff, period, year or actor is refused', async () => {
    await expect(put({ school: B, year: yearB, klass: c1, subject: subB, staff: sB, period: pB, actor: adminB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // A's class
    await expect(put({ school: B, year: yearB, klass: cB, subject: sub1, staff: sB, period: pB, actor: adminB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(put({ school: B, year: yearB, klass: cB, subject: subB, staff: s1, period: pB, actor: adminB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(put({ school: B, year: yearB, klass: cB, subject: subB, staff: sB, period: p1, actor: adminB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(put({ school: B, year: yearA, klass: cB, subject: subB, staff: sB, period: pB, actor: adminB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(put({ klass: c2, day: 'SAT', actor: outsider })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // not a member
    await put({ school: B, year: yearB, klass: cB, subject: subB, staff: sB, period: pB, actor: adminB }); // the same slot in school B is its own
    expect(await rows(B, yearB)).toHaveLength(1);
    expect(await rows()).toHaveLength(4);
  });

  it('replaces a lesson with another teacher/subject (checked), and removes one, audited; another school cannot touch it', async () => {
    const e = (await rows()).find((r) => r.day === 'TUE')!;
    await db.updateTimetableEntry({ schoolId: A, id: e.id, subjectId: sub2, staffId: s1, actorId: adminA, details: {} });
    await expect(db.updateTimetableEntry({ schoolId: A, id: e.id, subjectId: sub1, staffId: s2, actorId: adminA, details: {} })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.updateTimetableEntry({ schoolId: B, id: e.id, subjectId: subB, staffId: sB, actorId: adminB, details: {} })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.deleteTimetableEntry({ schoolId: B, id: e.id, actorId: adminB, details: {} })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    expect((await db.listTimetableForClass({ schoolId: A, academicYearId: yearA, classroomId: c1 })).data.timetableEntries.find((r) => r.day === 'TUE')!.subject.code).toBe('A');
    await db.deleteTimetableEntry({ schoolId: A, id: e.id, actorId: adminA, details: {} });
    expect(await rows()).toHaveLength(3);
    expect((await audit(A, 'academic.timetable.clear')).length).toBe(1);
  });
});
