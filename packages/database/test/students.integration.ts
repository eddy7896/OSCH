// P2-2: students, enrolment numbers, class placement and guardians against the real emulator.
import { randomUUID } from 'node:crypto';
import { createDatabase, type Database } from '../src/index.js';

const host = process.env.DATA_CONNECT_EMULATOR_HOST;
const bare = (u: string) => u.replaceAll('-', '');

describe.skipIf(!host)('Student operations (P2-2)', () => {
  let db: Database;
  const A = randomUUID();
  const B = randomUUID();
  const tag = A.slice(0, 8);
  const adminA = `ta-${tag}`;
  const adminB = `tb-${tag}`;
  let year: string;
  let roomA: string;
  const audit = async (s: string, action?: string) => (await db.listAuditLog({ schoolId: s, limit: 300, offset: 0 })).data.auditLogs.filter((a) => !action || a.action === action);
  const list = async (s: string, o: { search?: string | undefined; status?: 'ACTIVE' | 'INACTIVE' | 'LEFT' | undefined } = {}) =>
    (await db.listStudents({ schoolId: s, limit: 100, offset: 0, ...(o.search ? { search: o.search } : {}), ...(o.status ? { status: o.status as never } : {}) })).data.students;
  const count = async (s: string, o: { search?: string | undefined; status?: 'ACTIVE' | 'INACTIVE' | 'LEFT' | undefined } = {}) =>
    (await db.countStudents({ schoolId: s, ...(o.search ? { search: o.search } : {}), ...(o.status ? { status: o.status as never } : {}) })).data.students[0]?._count ?? 0;
  /** What the gateway does: read the counter, build the number, create. */
  const admit = async (s: string, actor: string, first: string, last: string, extra: Record<string, unknown> = {}) => {
    const { school } = (await db.schoolSeq({ schoolId: s })).data;
    const id = randomUUID();
    await db.createStudent({ schoolId: s, id, expectedSeq: school!.studentSeq, enrollmentId: `${school!.enrollmentPrefix}${String(school!.studentSeq + 1).padStart(4, '0')}`, firstName: first, lastName: last, actorId: actor, ...extra });
    return id;
  };

  beforeAll(async () => {
    db = createDatabase({ projectId: 'demo-oruschools' });
    for (const id of [adminA, adminB]) await db.upsertUser({ id, email: `${id}@example.com` });
    await db.provisionSchool({ id: A, name: 'School A', subDomain: `a-${tag}`, defaultLanguage: 'en', actorId: adminA });
    await db.provisionSchool({ id: B, name: 'School B', subDomain: `b-${tag}`, defaultLanguage: 'en', actorId: adminB });
    await db.createSchoolMember({ schoolId: A, userId: adminA, schoolRole: 'ACADEMIC_ADMIN' as never });
    await db.createSchoolMember({ schoolId: B, userId: adminB, schoolRole: 'ACADEMIC_ADMIN' as never });
    year = randomUUID();
    await db.createAcademicYear({ schoolId: A, id: year, name: '2026-2027', startDate: '2026-04-01', endDate: '2027-03-31', actorId: adminA });
    const level = (await db.listGradeLevels({ schoolId: A })).data.gradeLevels.find((l) => l.name === '5')!;
    roomA = randomUUID();
    await db.createClassroom({ schoolId: A, id: roomA, gradeLevelId: level.id, section: 'A', name: '5 A', capacity: 40, actorId: adminA });
  });

  it('numbers run 1, 2, 3 per school, each school counting on its own', async () => {
    const s1 = await admit(A, adminA, 'Aarav', 'Mehta');
    await admit(A, adminA, 'Diya', 'Nair');
    await admit(B, adminB, 'Bela', 'Shah');
    const a = await list(A);
    expect(a.map((s) => s.serial).sort()).toEqual([1, 2]);
    expect(a.find((s) => bare(s.id) === bare(s1))?.enrollmentId).toBe('S0001');
    expect((await list(B)).map((s) => s.enrollmentId)).toEqual(['S0001']); // same text, different school: allowed
  });

  it('a number someone else already took is refused and nothing is written (the gateway reads again and retries)', async () => {
    const before = (await audit(A, 'student.create')).length;
    // The stale number also names an enrolment id that exists, so the unique key reports it as CONFLICT; the gateway treats CONFLICT
    // from this operation as "number taken": it reads the counter again and retries.
    await expect(db.createStudent({ schoolId: A, id: randomUUID(), expectedSeq: 0, enrollmentId: 'S0001', firstName: 'Late', lastName: 'Comer', actorId: adminA })).rejects.toMatchObject({ kind: 'CONFLICT' });
    expect((await list(A)).some((s) => s.firstName === 'Late')).toBe(false);
    expect((await audit(A, 'student.create')).length).toBe(before);
    expect((await db.schoolSeq({ schoolId: A })).data.school?.studentSeq).toBe(2);
  });

  it('an actor who is not a member of the school cannot admit; the counter stays put', async () => {
    await expect(db.createStudent({ schoolId: A, id: randomUUID(), expectedSeq: 2, enrollmentId: 'S0003', firstName: 'X', lastName: 'Y', actorId: adminB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    expect((await db.schoolSeq({ schoolId: A })).data.school?.studentSeq).toBe(2);
  });

  it('search is by name or enrolment id, ignores case, and counts match the list', async () => {
    expect((await list(A, { search: '%mehta%' })).map((s) => s.firstName)).toEqual(['Aarav']);
    expect((await list(A, { search: '%S0002%' })).map((s) => s.firstName)).toEqual(['Diya']);
    expect(await list(A, { search: '%zzz%' })).toEqual([]);
    expect(await count(A, { search: '%a%' })).toBe((await list(A, { search: '%a%' })).length);
    expect(await count(A)).toBe(2);
    expect(await count(B)).toBe(1);
  });

  it('paging returns the rest in the same order', async () => {
    for (const n of ['Cyrus', 'Esha', 'Farid']) await admit(A, adminA, n, 'Pagetest');
    const all = (await list(A)).map((s) => s.id);
    const p1 = (await db.listStudents({ schoolId: A, limit: 2, offset: 0 })).data.students.map((s) => s.id);
    const p2 = (await db.listStudents({ schoolId: A, limit: 2, offset: 2 })).data.students.map((s) => s.id);
    const p3 = (await db.listStudents({ schoolId: A, limit: 2, offset: 4 })).data.students.map((s) => s.id);
    expect([...p1, ...p2, ...p3]).toEqual(all);
  });

  it('status filter and update: LEFT students drop out of the ACTIVE list; another school cannot edit', async () => {
    const id = await admit(A, adminA, 'Gita', 'Leaver');
    await db.updateStudent({ schoolId: A, id, status: 'LEFT' as never, actorId: adminA, details: { status: 'LEFT' } });
    expect((await list(A, { status: 'ACTIVE' })).some((s) => bare(s.id) === bare(id))).toBe(false);
    expect((await list(A, { status: 'LEFT' })).map((s) => s.firstName)).toEqual(['Gita']);
    await expect(db.updateStudent({ schoolId: B, id, firstName: 'Mine', actorId: adminB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    expect((await db.getStudent({ schoolId: A, id })).data.students[0]?.firstName).toBe('Gita');
    expect((await db.getStudent({ schoolId: B, id })).data.students).toEqual([]); // not visible from B at all
    expect(await audit(A, 'student.update')).toHaveLength(1);
  });

  it('a student is placed once per year, can be moved, and only into this school\'s year and class', async () => {
    const id = await admit(A, adminA, 'Hari', 'Placed');
    await db.placeStudent({ schoolId: A, studentId: id, academicYearId: year, classroomId: roomA, actorId: adminA });
    await expect(db.placeStudent({ schoolId: A, studentId: id, academicYearId: year, classroomId: roomA, actorId: adminA })).rejects.toMatchObject({ kind: 'CONFLICT' });
    const levelB = (await db.listGradeLevels({ schoolId: B })).data.gradeLevels[0]!;
    const roomB = randomUUID();
    await db.createClassroom({ schoolId: B, id: roomB, gradeLevelId: levelB.id, section: 'A', name: 'B room', capacity: 10, actorId: adminB });
    await expect(db.moveStudent({ schoolId: A, studentId: id, academicYearId: year, classroomId: roomB, actorId: adminA })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    const room2 = randomUUID();
    const level = (await db.listGradeLevels({ schoolId: A })).data.gradeLevels.find((l) => l.name === '5')!;
    await db.createClassroom({ schoolId: A, id: room2, gradeLevelId: level.id, section: 'B', name: '5 B', capacity: 40, actorId: adminA });
    await db.moveStudent({ schoolId: A, studentId: id, academicYearId: year, classroomId: room2, actorId: adminA });
    const s = (await db.getStudent({ schoolId: A, id })).data.students[0]!;
    expect(s.placements).toHaveLength(1);
    expect(s.placements[0]).toMatchObject({ classroom: { name: '5 B' }, academicYear: { name: '2026-2027' } });
    const row = (await list(A)).find((x) => bare(x.id) === bare(id))!;
    expect(row.placements[0]?.classroom.name).toBe('5 B');
    // B cannot place A's (not yet placed) student, even into B's own class
    const fresh = await admit(A, adminA, 'Jai', 'Unplaced');
    const yearB = randomUUID();
    await db.createAcademicYear({ schoolId: B, id: yearB, name: '2026-2027', startDate: '2026-04-01', endDate: '2027-03-31', actorId: adminB });
    await expect(db.placeStudent({ schoolId: B, studentId: fresh, academicYearId: yearB, classroomId: roomB, actorId: adminB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    expect((await db.getStudent({ schoolId: A, id: fresh })).data.students[0]!.placements).toEqual([]);
  });

  it('guardians: added, primary first, updated, removed; never across schools', async () => {
    const id = await admit(A, adminA, 'Ira', 'Guarded');
    const g1 = randomUUID(), g2 = randomUUID();
    await db.addGuardian({ schoolId: A, id: g1, studentId: id, name: 'Meera', relationship: 'MOTHER', phone: '+919876543210', isPrimary: false, actorId: adminA });
    await db.addGuardian({ schoolId: A, id: g2, studentId: id, name: 'Raj', relationship: 'FATHER', email: 'raj@example.com', isPrimary: true, actorId: adminA });
    expect((await db.getStudent({ schoolId: A, id })).data.students[0]!.guardians.map((g) => g.name)).toEqual(['Raj', 'Meera']);
    await db.updateGuardian({ schoolId: A, id: g1, phone: '+919000000000', actorId: adminA });
    await expect(db.updateGuardian({ schoolId: B, id: g1, name: 'Hijack', actorId: adminB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.removeGuardian({ schoolId: B, id: g1, actorId: adminB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.addGuardian({ schoolId: B, id: randomUUID(), studentId: id, name: 'X', relationship: 'OTHER', isPrimary: false, actorId: adminB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await db.removeGuardian({ schoolId: A, id: g2, actorId: adminA });
    const left = (await db.getStudent({ schoolId: A, id })).data.students[0]!.guardians;
    expect(left).toEqual([expect.objectContaining({ name: 'Meera', phone: '+919000000000' })]);
  });

  it('every change left its audit row and refused ones left none', async () => {
    const actions = (await audit(A)).map((r) => r.action);
    for (const a of ['student.create', 'student.update', 'student.place', 'student.move', 'student.guardian.add', 'student.guardian.update', 'student.guardian.remove']) expect(actions, a).toContain(a);
    expect((await audit(A)).filter((r) => r.actor.id === adminB)).toEqual([]);
  });
});
