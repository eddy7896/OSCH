// P2-7a: fee structures, fees, instalments and concessions against the real emulator.
import { randomUUID } from 'node:crypto';
import { createDatabase, type Database } from '../src/index.js';

const host = process.env.DATA_CONNECT_EMULATOR_HOST;
const bare = (u: string) => u.replaceAll('-', '');

describe.skipIf(!host)('Fee operations (P2-7a)', () => {
  let db: Database;
  const A = randomUUID();
  const B = randomUUID();
  const tag = A.slice(0, 8);
  const bursarA = `fa-${tag}`;
  const bursarB = `fb-${tag}`;
  let yearA: string, yearB: string, levelA: string, level2A: string, levelB: string, studentA: string, studentB: string;
  const audit = async (s: string, action?: string) => (await db.listAuditLog({ schoolId: s, limit: 300, offset: 0 })).data.auditLogs.filter((a) => !action || a.action === action);
  const structures = async (s: string, o: { academicYearId?: string; gradeLevelId?: string } = {}) => (await db.listFeeStructures({ schoolId: s, ...o })).data.feeStructures;
  const structure = async (actor: string, school: string, year: string, level: string, name = 'Fees') => {
    const id = randomUUID();
    await db.createFeeStructure({ schoolId: school, id, academicYearId: year, gradeLevelId: level, name, actorId: actor });
    return id;
  };
  const item = async (actor: string, school: string, structureId: string, name: string) => {
    const id = randomUUID();
    await db.createFeeItem({ schoolId: school, id, structureId, name, actorId: actor });
    return id;
  };
  const inst = async (actor: string, school: string, itemId: string, sequence: number, amountMinor: string, dueDate = '2027-04-10') => {
    const id = randomUUID();
    await db.addFeeInstalment({ schoolId: school, id, itemId, sequence, amountMinor, dueDate, label: `#${sequence}`, actorId: actor });
    return id;
  };

  beforeAll(async () => {
    db = createDatabase({ projectId: 'demo-oruschools' });
    for (const id of [bursarA, bursarB]) await db.upsertUser({ id, email: `${id}@example.com` });
    await db.provisionSchool({ id: A, name: 'School A', subDomain: `a-${tag}`, defaultLanguage: 'en', actorId: bursarA });
    await db.provisionSchool({ id: B, name: 'School B', subDomain: `b-${tag}`, defaultLanguage: 'en', actorId: bursarB });
    await db.createSchoolMember({ schoolId: A, userId: bursarA, schoolRole: 'BURSAR' as never });
    await db.createSchoolMember({ schoolId: B, userId: bursarB, schoolRole: 'BURSAR' as never });
    yearA = randomUUID(); yearB = randomUUID();
    await db.createAcademicYear({ schoolId: A, id: yearA, name: '2027-2028', startDate: '2027-04-01', endDate: '2028-03-31', actorId: bursarA });
    await db.createAcademicYear({ schoolId: B, id: yearB, name: '2027-2028', startDate: '2027-04-01', endDate: '2028-03-31', actorId: bursarB });
    const lv = async (s: string, n: string) => (await db.listGradeLevels({ schoolId: s })).data.gradeLevels.find((l) => l.name === n)!.id;
    levelA = await lv(A, '1'); level2A = await lv(A, '2'); levelB = await lv(B, '1');
    for (const [s, actor] of [[A, bursarA], [B, bursarB]] as const) {
      const seq = (await db.applicationSeqInfo({ schoolId: s })).data.school!.studentSeq;
      const id = randomUUID();
      await db.createStudent({ schoolId: s, id, expectedSeq: seq, enrollmentId: `S${String(seq + 1).padStart(4, '0')}`, firstName: 'Fee', lastName: 'Payer', actorId: actor });
      if (s === A) studentA = id; else studentB = id;
    }
  });

  it('one structure per class level and year; the level and year must be the school\'s own', async () => {
    const s1 = await structure(bursarA, A, yearA, levelA, 'Class 1 fees');
    expect((await structures(A, { gradeLevelId: levelA })).map((s) => bare(s.id))).toEqual([bare(s1)]);
    await expect(structure(bursarA, A, yearA, levelA, 'Again')).rejects.toMatchObject({ kind: 'CONFLICT' });
    await structure(bursarA, A, yearA, level2A, 'Class 2 fees'); // another level: fine
    await structure(bursarB, B, yearB, levelB, 'B class 1'); // the same level name in another school: fine
    await expect(structure(bursarA, A, yearB, levelA, 'x')).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // B's year
    await expect(structure(bursarA, A, yearA, levelB, 'x')).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // B's level
    expect((await structures(B)).map((s) => s.name)).toEqual(['B class 1']);
    expect((await audit(A, 'fees.structure.create')).length).toBe(2);
  });

  it('fees and instalments: ordered, exact in paise, unique per sequence and per name; nested read in one query', async () => {
    const s = (await structures(A, { gradeLevelId: levelA }))[0]!.id;
    const tuition = await item(bursarA, A, s, 'Tuition');
    await expect(item(bursarA, A, s, 'Tuition')).rejects.toMatchObject({ kind: 'CONFLICT' });
    await inst(bursarA, A, tuition, 1, '12500000', '2027-04-10');
    await inst(bursarA, A, tuition, 2, '12500000', '2027-07-10');
    await expect(inst(bursarA, A, tuition, 2, '1', '2027-08-10')).rejects.toMatchObject({ kind: 'CONFLICT' });
    const transport = await item(bursarA, A, s, 'Transport');
    await inst(bursarA, A, transport, 1, '123456789012345', '2027-04-10'); // 15 digits: exact, no rounding
    const got = (await structures(A, { gradeLevelId: levelA }))[0]!;
    expect(got.items.map((i) => i.name)).toEqual(['Tuition', 'Transport']);
    expect(got.items[0]!.instalments.map((i) => [i.sequence, i.amountMinor, i.dueDate])).toEqual([[1, '12500000', '2027-04-10'], [2, '12500000', '2027-07-10']]);
    expect(got.items[1]!.instalments[0]!.amountMinor).toBe('123456789012345');
  });

  it('nothing in another school can be touched: items, instalments and structures refuse it and write nothing', async () => {
    const s = (await structures(A, { gradeLevelId: levelA }))[0]!;
    const tuition = s.items[0]!;
    const before = (await audit(A)).length;
    await expect(item(bursarB, B, s.id, 'Hijack')).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(inst(bursarB, B, tuition.id, 9, '1')).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.updateFeeInstalment({ schoolId: B, id: tuition.instalments[0]!.id, amountMinor: '1', actorId: bursarB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.deleteFeeInstalment({ schoolId: B, id: tuition.instalments[0]!.id, actorId: bursarB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.updateFeeItem({ schoolId: B, id: tuition.id, name: 'Mine', actorId: bursarB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.deleteFeeItem({ schoolId: B, id: tuition.id, actorId: bursarB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.updateFeeStructure({ schoolId: B, id: s.id, name: 'Mine', actorId: bursarB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.deleteFeeStructure({ schoolId: B, id: s.id, actorId: bursarB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    expect((await db.getFeeStructure({ schoolId: B, id: s.id })).data.feeStructures).toEqual([]);
    expect((await db.getFeeItem({ schoolId: B, id: tuition.id })).data.feeItems).toEqual([]);
    expect((await db.getFeeInstalment({ schoolId: B, id: tuition.instalments[0]!.id })).data.feeInstalments).toEqual([]);
    expect((await structures(A, { gradeLevelId: levelA }))[0]!.items[0]!.instalments).toHaveLength(2);
    expect((await audit(A)).length).toBe(before);
  });

  it('update and delete: only what is sent changes; deleting a fee takes its instalments with it', async () => {
    const s = (await structures(A, { gradeLevelId: levelA }))[0]!;
    const tuition = s.items[0]!;
    await db.updateFeeInstalment({ schoolId: A, id: tuition.instalments[1]!.id, amountMinor: '13000000', actorId: bursarA });
    const upd = (await db.getFeeInstalment({ schoolId: A, id: tuition.instalments[1]!.id })).data.feeInstalments[0]!;
    expect(upd).toMatchObject({ amountMinor: '13000000', dueDate: '2027-07-10', label: '#2', sequence: 2 });
    const transport = s.items[1]!;
    await db.deleteFeeItem({ schoolId: A, id: transport.id, actorId: bursarA });
    expect((await db.getFeeInstalment({ schoolId: A, id: transport.instalments[0]!.id })).data.feeInstalments).toEqual([]);
    expect((await structures(A, { gradeLevelId: levelA }))[0]!.items.map((i) => i.name)).toEqual(['Tuition']);
  });

  it('concessions: percent or fixed, for the whole structure or one fee; student, year and fee must be the school\'s own', async () => {
    const s = (await structures(A, { gradeLevelId: levelA }))[0]!;
    const tuition = s.items[0]!.id;
    await db.createConcession({ schoolId: A, id: randomUUID(), studentId: studentA, academicYearId: yearA, name: 'Sibling', kind: 'PERCENT' as never, basisPoints: 1000, actorId: bursarA });
    await db.createItemConcession({ schoolId: A, id: randomUUID(), studentId: studentA, academicYearId: yearA, feeItemId: tuition, name: 'Staff child', kind: 'FIXED' as never, amountMinor: '500000', actorId: bursarA });
    await expect(db.createConcession({ schoolId: A, id: randomUUID(), studentId: studentB, academicYearId: yearA, name: 'x', kind: 'PERCENT' as never, basisPoints: 100, actorId: bursarA })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.createConcession({ schoolId: A, id: randomUUID(), studentId: studentA, academicYearId: yearB, name: 'x', kind: 'PERCENT' as never, basisPoints: 100, actorId: bursarA })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    const bTuition = await item(bursarB, B, await structure(bursarB, B, yearB, (await db.listGradeLevels({ schoolId: B })).data.gradeLevels.find((l) => l.name === '2')!.id), 'Tuition');
    await expect(db.createItemConcession({ schoolId: A, id: randomUUID(), studentId: studentA, academicYearId: yearA, feeItemId: bTuition, name: 'x', kind: 'FIXED' as never, amountMinor: '1', actorId: bursarA })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    const list = (await db.listConcessions({ schoolId: A, studentId: studentA })).data.concessions;
    expect(list.map((c) => [c.name, c.kind, c.basisPoints, c.amountMinor, c.feeItem?.name ?? null])).toEqual([['Sibling', 'PERCENT', 1000, null, null], ['Staff child', 'FIXED', null, '500000', 'Tuition']]);
    expect((await db.listConcessions({ schoolId: B })).data.concessions).toEqual([]);
    await expect(db.deleteConcession({ schoolId: B, id: list[0]!.id, actorId: bursarB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await db.deleteConcession({ schoolId: A, id: list[0]!.id, actorId: bursarA });
    expect((await db.listConcessions({ schoolId: A, studentId: studentA })).data.concessions).toHaveLength(1);
  });

  it('the level a student is placed in decides their structure', async () => {
    const room = randomUUID();
    await db.createClassroom({ schoolId: A, id: room, gradeLevelId: levelA, section: 'A', name: '1 A', capacity: 30, actorId: bursarA });
    expect((await db.getStudentLevel({ schoolId: A, studentId: studentA, academicYearId: yearA })).data.studentEnrollments).toEqual([]);
    await db.placeStudent({ schoolId: A, studentId: studentA, academicYearId: yearA, classroomId: room, actorId: bursarA });
    const p = (await db.getStudentLevel({ schoolId: A, studentId: studentA, academicYearId: yearA })).data.studentEnrollments[0]!;
    expect(bare(p.classroom.gradeLevel.id)).toBe(bare(levelA));
    expect((await db.getStudentLevel({ schoolId: B, studentId: studentA, academicYearId: yearA })).data.studentEnrollments).toEqual([]);
  });

  it('every change left its audit row; refused ones left none', async () => {
    const actions = (await audit(A)).map((r) => r.action);
    for (const a of ['fees.structure.create', 'fees.item.create', 'fees.instalment.add', 'fees.instalment.update', 'fees.item.delete', 'fees.concession.create', 'fees.concession.delete']) expect(actions, a).toContain(a);
    expect((await audit(A)).filter((r) => r.actor.id === bursarB)).toEqual([]);
  });
});
