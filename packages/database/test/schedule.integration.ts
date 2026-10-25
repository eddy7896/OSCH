// P3-1: bell schedule and working days against the real emulator.
// Run: npm run test:database
import { randomUUID } from 'node:crypto';
import { createDatabase, DatabaseError, type Database } from '../src/index.js';

const host = process.env.DATA_CONNECT_EMULATOR_HOST;

describe.skipIf(!host)('Bell schedule and working days (P3-1)', () => {
  let db: Database;
  const A = randomUUID();
  const B = randomUUID();
  const tag = A.slice(0, 8);
  const adminA = `ba-${tag}`;
  const adminB = `bb-${tag}`;
  const outsider = `bo-${tag}`;
  const periods = async (s: string) => (await db.listPeriods({ schoolId: s })).data.periods;
  const audit = async (s: string, action: string) => (await db.listAuditLog({ schoolId: s, limit: 200, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  const add = (school: string, actor: string, label: string, startTime: string, endTime: string, isBreak = false) => db.createPeriod({ schoolId: school, id: randomUUID(), label, startTime, endTime, isBreak, actorId: actor, details: { label } });

  beforeAll(async () => {
    db = createDatabase({ projectId: 'demo-oruschools' });
    for (const id of [adminA, adminB, outsider]) await db.upsertUser({ id, email: `${id}@example.com` });
    await db.provisionSchool({ id: A, name: 'School A', subDomain: `ba-${tag}`, defaultLanguage: 'en', actorId: adminA });
    await db.provisionSchool({ id: B, name: 'School B', subDomain: `bb-${tag}`, defaultLanguage: 'en', actorId: adminB });
    await db.createSchoolMember({ schoolId: A, userId: adminA, schoolRole: 'ACADEMIC_ADMIN' as never });
    await db.createSchoolMember({ schoolId: B, userId: adminB, schoolRole: 'ACADEMIC_ADMIN' as never });
  });

  it('a new school works Monday to Saturday and has no periods', async () => {
    expect((await db.schoolWorkingDays({ schoolId: A })).data.school?.workingDays).toBe('MON,TUE,WED,THU,FRI,SAT');
    expect(await periods(A)).toEqual([]);
  });

  it('periods come back in time order whatever order they were made in, with an audit row each', async () => {
    await add(A, adminA, 'Period 2', '09:10', '09:50');
    await add(A, adminA, 'Period 1', '08:30', '09:10');
    await add(A, adminA, 'Break', '09:50', '10:10', true);
    const rows = await periods(A);
    expect(rows.map((p) => [p.label, p.startTime, p.endTime, p.isBreak])).toEqual([['Period 1', '08:30', '09:10', false], ['Period 2', '09:10', '09:50', false], ['Break', '09:50', '10:10', true]]);
    expect((await audit(A, 'academic.period.create')).map((r) => r.actor.id)).toEqual([adminA, adminA, adminA]);
  });

  it('two periods cannot share a label or a start time in one school (database keys), and another school may reuse them', async () => {
    await expect(add(A, adminA, 'Period 1', '11:00', '11:40')).rejects.toBeInstanceOf(DatabaseError);
    await expect(add(A, adminA, 'Other', '08:30', '08:40')).rejects.toBeInstanceOf(DatabaseError);
    expect(await periods(A)).toHaveLength(3);
    await add(B, adminB, 'Period 1', '08:30', '09:10');
    expect(await periods(B)).toHaveLength(1);
  });

  it('only an active member of the school can change its schedule; a refusal writes nothing', async () => {
    const before = (await periods(A)).length;
    await expect(add(A, outsider, 'Sneaky', '15:00', '15:40')).rejects.toBeInstanceOf(DatabaseError);
    await expect(add(A, adminB, 'Cross', '15:00', '15:40')).rejects.toBeInstanceOf(DatabaseError); // an admin of another school
    expect((await periods(A)).length).toBe(before);
    expect((await audit(A, 'academic.period.create')).length).toBe(3);
  });

  it('update changes only the fields given and delete removes the period, each audited; another school\'s period is untouchable', async () => {
    const [first] = await periods(A);
    await db.updatePeriod({ schoolId: A, id: first!.id, label: 'Assembly', endTime: '09:00', actorId: adminA, details: {} });
    expect((await periods(A))[0]).toMatchObject({ label: 'Assembly', startTime: '08:30', endTime: '09:00', isBreak: false });
    const foreign = (await periods(B))[0]!;
    await expect(db.updatePeriod({ schoolId: A, id: foreign.id, label: 'Stolen', actorId: adminA, details: {} })).rejects.toBeInstanceOf(DatabaseError);
    await expect(db.deletePeriod({ schoolId: A, id: foreign.id, actorId: adminA, details: {} })).rejects.toBeInstanceOf(DatabaseError);
    expect((await periods(B))[0]!.label).toBe('Period 1');
    await db.deletePeriod({ schoolId: A, id: first!.id, actorId: adminA, details: {} });
    expect(await periods(A)).toHaveLength(2);
    expect((await audit(A, 'academic.period.update')).length).toBe(1);
    expect((await audit(A, 'academic.period.delete')).length).toBe(1);
  });

  it('working days are stored as given text, audited, and per school', async () => {
    await db.setWorkingDays({ schoolId: A, workingDays: 'MON,TUE,WED,THU,FRI', actorId: adminA, details: { days: 5 } });
    expect((await db.schoolWorkingDays({ schoolId: A })).data.school?.workingDays).toBe('MON,TUE,WED,THU,FRI');
    expect((await db.schoolWorkingDays({ schoolId: B })).data.school?.workingDays).toBe('MON,TUE,WED,THU,FRI,SAT');
    await expect(db.setWorkingDays({ schoolId: A, workingDays: 'MON', actorId: outsider, details: {} })).rejects.toBeInstanceOf(DatabaseError);
    expect((await audit(A, 'academic.workingdays.set')).length).toBe(1);
  });

  it('a starting schedule is laid down in ONE transaction, only on an empty school, with one audit row; twice or after periods exist is refused and changes nothing', async () => {
    const C = randomUUID();
    await db.provisionSchool({ id: C, name: 'School C', subDomain: `bc-${tag}`, defaultLanguage: 'en', actorId: adminA });
    await db.createSchoolMember({ schoolId: C, userId: adminA, schoolRole: 'ACADEMIC_ADMIN' as never });
    await db.applyStandardSchedule({ schoolId: C, actorId: adminA, details: { template: 'STANDARD' } });
    const rows = await periods(C);
    expect(rows).toHaveLength(10);
    expect(rows.filter((p) => !p.isBreak)).toHaveLength(8);
    expect(rows.map((p) => p.startTime)).toEqual([...rows.map((p) => p.startTime)].sort());
    rows.forEach((p, i) => { if (i > 0) expect(p.startTime >= rows[i - 1]!.endTime, `${p.label} overlaps the one before`).toBe(true); expect(p.endTime > p.startTime).toBe(true); });
    expect((await audit(C, 'academic.schedule.template')).length).toBe(1);
    await expect(db.applyShortDaySchedule({ schoolId: C, actorId: adminA, details: {} })).rejects.toBeInstanceOf(DatabaseError);
    expect(await periods(C)).toHaveLength(10);
    expect((await audit(C, 'academic.schedule.template')).length).toBe(1);
    // a school with even one period of its own is refused too
    await expect(db.applyStandardSchedule({ schoolId: A, actorId: adminA, details: {} })).rejects.toBeInstanceOf(DatabaseError);
    expect(await periods(A)).toHaveLength(2);
  });

  it('two starting schedules at the same moment cannot both fill an empty school', async () => {
    const D = randomUUID();
    await db.provisionSchool({ id: D, name: 'School D', subDomain: `bd-${tag}`, defaultLanguage: 'en', actorId: adminA });
    await db.createSchoolMember({ schoolId: D, userId: adminA, schoolRole: 'ACADEMIC_ADMIN' as never });
    const results = await Promise.allSettled([db.applyStandardSchedule({ schoolId: D, actorId: adminA, details: {} }), db.applyShortDaySchedule({ schoolId: D, actorId: adminA, details: {} })]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const n = (await periods(D)).length;
    expect([10, 6]).toContain(n);
  });
});
