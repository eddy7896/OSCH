// P2-1: school profile, class levels, classes, subjects and academic years against the real emulator.
// Run: npm run test:database
import { randomUUID } from 'node:crypto';
import { createDatabase, type Database } from '../src/index.js';

const host = process.env.DATA_CONNECT_EMULATOR_HOST;
const bare = (u: string) => u.replaceAll('-', '');

describe.skipIf(!host)('School setup operations (P2-1)', () => {
  let db: Database;
  const A = randomUUID();
  const B = randomUUID();
  const tag = A.slice(0, 8);
  const adminA = `sa-${tag}`;
  const adminB = `sb-${tag}`;
  const outsider = `so-${tag}`;
  const audit = async (schoolId: string, action?: string) => (await db.listAuditLog({ schoolId, limit: 200, offset: 0 })).data.auditLogs.filter((a) => !action || a.action === action);
  const levels = async (s: string) => (await db.listGradeLevels({ schoolId: s })).data.gradeLevels;
  const profile = async (s: string) => (await db.getSchoolProfile({ schoolId: s })).data.school!;

  beforeAll(async () => {
    db = createDatabase({ projectId: 'demo-oruschools' });
    for (const id of [adminA, adminB, outsider]) await db.upsertUser({ id, email: `${id}@example.com` });
    await db.provisionSchool({ id: A, name: 'School A', subDomain: `a-${tag}`, defaultLanguage: 'en', actorId: adminA });
    await db.provisionSchool({ id: B, name: 'School B', subDomain: `b-${tag}`, defaultLanguage: 'en', actorId: adminB });
    await db.createSchoolMember({ schoolId: A, userId: adminA, schoolRole: 'ACADEMIC_ADMIN' as never });
    await db.createSchoolMember({ schoolId: B, userId: adminB, schoolRole: 'ACADEMIC_ADMIN' as never });
  });

  describe('default class levels', () => {
    it('a new school starts with Nursery, LKG, UKG and 1 to 12, in that order, and each school has its own', async () => {
      const a = await levels(A);
      expect(a.map((l) => l.name)).toEqual(['Nursery', 'LKG', 'UKG', ...Array.from({ length: 12 }, (_, i) => String(i + 1))]);
      expect(a.map((l) => l.position)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
      expect(new Set([...a, ...(await levels(B))].map((l) => l.id)).size).toBe(30);
    });
  });

  describe('profile and branding', () => {
    it('updates only the fields given, audits it, and reads it back', async () => {
      await db.updateSchoolProfile({ schoolId: A, actorId: adminA, address: '12 Lake Road, Srinagar', primaryColor: '#1d4ed8', details: { fields: ['address', 'primaryColor'] } });
      await db.updateSchoolProfile({ schoolId: A, actorId: adminA, contactPhone: '+911234567890', details: { fields: ['contactPhone'] } });
      expect(await profile(A)).toMatchObject({ name: 'School A', address: '12 Lake Road, Srinagar', primaryColor: '#1d4ed8', contactPhone: '+911234567890', contactEmail: null, logoKey: null });
      expect((await audit(A, 'school.profile.update')).map((r) => r.actor.id)).toEqual([adminA, adminA]);
    });

    it('sets the logo key and audits it', async () => {
      await db.setSchoolLogo({ schoolId: A, actorId: adminA, logoKey: `schools/${A}/logo/x.png`, details: { logo: true } });
      expect((await profile(A)).logoKey).toBe(`schools/${A}/logo/x.png`);
      expect(await audit(A, 'school.logo.set')).toHaveLength(1);
    });

    it("a member of B cannot change A's profile, and nothing is written or audited", async () => {
      const before = (await audit(A)).length;
      await expect(db.updateSchoolProfile({ schoolId: A, actorId: adminB, name: 'Hijacked' })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
      await expect(db.updateSchoolProfile({ schoolId: A, actorId: outsider, name: 'Hijacked' })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
      await expect(db.setSchoolLogo({ schoolId: A, actorId: adminB, logoKey: 'x' })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
      expect((await profile(A)).name).toBe('School A');
      expect((await audit(A)).length).toBe(before);
    });
  });

  describe('class levels', () => {
    const lvl = randomUUID();
    it('creates one, refuses a duplicate name in the same school, allows the same name in another school', async () => {
      await db.createGradeLevel({ schoolId: A, id: lvl, name: 'Pre-nursery', position: 0, actorId: adminA, details: {} });
      await expect(db.createGradeLevel({ schoolId: A, id: randomUUID(), name: 'Pre-nursery', position: 99, actorId: adminA })).rejects.toMatchObject({ kind: 'CONFLICT' });
      await db.createGradeLevel({ schoolId: B, id: randomUUID(), name: 'Pre-nursery', position: 0, actorId: adminB });
      expect((await levels(A))[0]).toMatchObject({ name: 'Pre-nursery', position: 0 });
      expect(await audit(A, 'academic.gradelevel.create')).toHaveLength(1);
    });
    it('renames and moves it; a level of another school cannot be touched', async () => {
      await db.updateGradeLevel({ schoolId: A, id: lvl, name: 'Playgroup', position: 0, actorId: adminA });
      expect((await levels(A)).find((l) => bare(l.id) === bare(lvl))?.name).toBe('Playgroup');
      await expect(db.updateGradeLevel({ schoolId: B, id: lvl, name: 'Taken over', actorId: adminB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
      await expect(db.deleteGradeLevel({ schoolId: B, id: lvl, actorId: adminB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
      expect((await levels(A)).find((l) => bare(l.id) === bare(lvl))?.name).toBe('Playgroup');
    });
    it('cannot be deleted while it has classes, and can be once it has none', async () => {
      const cls = randomUUID();
      await db.createClassroom({ schoolId: A, id: cls, gradeLevelId: lvl, section: 'A', name: 'Playgroup A', capacity: 20, actorId: adminA });
      await expect(db.deleteGradeLevel({ schoolId: A, id: lvl, actorId: adminA })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
      await db.deleteClassroom({ schoolId: A, id: cls, actorId: adminA });
      await db.deleteGradeLevel({ schoolId: A, id: lvl, actorId: adminA });
      expect((await levels(A)).some((l) => bare(l.id) === bare(lvl))).toBe(false);
      expect(await audit(A, 'academic.gradelevel.delete')).toHaveLength(1);
    });
  });

  describe('classes', () => {
    it('creates a class under a level of its own school; another school\'s level is refused', async () => {
      const five = (await levels(A)).find((l) => l.name === '5')!;
      const fiveB = (await levels(B)).find((l) => l.name === '5')!;
      const id = randomUUID();
      await db.createClassroom({ schoolId: A, id, gradeLevelId: five.id, section: 'B', name: '5 B', capacity: 40, actorId: adminA });
      await expect(db.createClassroom({ schoolId: A, id: randomUUID(), gradeLevelId: fiveB.id, section: 'B', name: '5 B', capacity: 40, actorId: adminA })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
      const list = (await db.listClassrooms({ schoolId: A })).data.classrooms;
      expect(list.filter((c) => c.name === '5 B')).toHaveLength(1);
      expect(list.find((c) => c.name === '5 B')).toMatchObject({ section: 'B', capacity: 40, gradeLevel: { name: '5' } });
    });
    it('one section letter per level, and the same letter in another level or school is fine', async () => {
      const five = (await levels(A)).find((l) => l.name === '5')!;
      const six = (await levels(A)).find((l) => l.name === '6')!;
      await expect(db.createClassroom({ schoolId: A, id: randomUUID(), gradeLevelId: five.id, section: 'B', name: '5 B again', capacity: 30, actorId: adminA })).rejects.toMatchObject({ kind: 'CONFLICT' });
      await db.createClassroom({ schoolId: A, id: randomUUID(), gradeLevelId: six.id, section: 'B', name: '6 B', capacity: 30, actorId: adminA });
    });
    it('shows up under its level in the level list, updates, deletes, and cannot be changed from another school', async () => {
      const id = randomUUID();
      const seven = (await levels(A)).find((l) => l.name === '7')!;
      await db.createClassroom({ schoolId: A, id, gradeLevelId: seven.id, section: 'C', name: '7 C', capacity: 25, actorId: adminA });
      expect((await levels(A)).find((l) => l.name === '7')!.classrooms).toEqual([expect.objectContaining({ section: 'C', name: '7 C', capacity: 25 })]);
      await db.updateClassroom({ schoolId: A, id, capacity: 28, actorId: adminA });
      await expect(db.updateClassroom({ schoolId: B, id, capacity: 1, actorId: adminB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
      await expect(db.deleteClassroom({ schoolId: B, id, actorId: adminB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
      expect((await levels(A)).find((l) => l.name === '7')!.classrooms[0]!.capacity).toBe(28);
      await db.deleteClassroom({ schoolId: A, id, actorId: adminA });
      expect((await levels(A)).find((l) => l.name === '7')!.classrooms).toEqual([]);
      for (const action of ['academic.class.create', 'academic.class.update', 'academic.class.delete']) expect((await audit(A, action)).length).toBeGreaterThan(0);
    });
  });

  describe('subjects', () => {
    it('a code is unique within a school only', async () => {
      await db.createSubject({ schoolId: A, id: randomUUID(), name: 'Mathematics', code: 'MATH', actorId: adminA });
      await expect(db.createSubject({ schoolId: A, id: randomUUID(), name: 'Maths again', code: 'MATH', actorId: adminA })).rejects.toMatchObject({ kind: 'CONFLICT' });
      await db.createSubject({ schoolId: B, id: randomUUID(), name: 'Mathematics', code: 'MATH', actorId: adminB });
      expect((await db.listSubjects({ schoolId: A })).data.subjects.map((s) => s.code)).toContain('MATH');
    });
    it('updates and deletes; another school cannot', async () => {
      const id = randomUUID();
      await db.createSubject({ schoolId: A, id, name: 'Art', code: 'ART', actorId: adminA });
      await db.updateSubject({ schoolId: A, id, name: 'Art and Craft', actorId: adminA });
      await expect(db.updateSubject({ schoolId: B, id, name: 'Mine now', actorId: adminB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
      await expect(db.deleteSubject({ schoolId: B, id, actorId: adminB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
      expect((await db.listSubjects({ schoolId: A })).data.subjects.find((s) => s.code === 'ART')?.name).toBe('Art and Craft');
      await db.deleteSubject({ schoolId: A, id, actorId: adminA });
      expect((await db.listSubjects({ schoolId: A })).data.subjects.some((s) => s.code === 'ART')).toBe(false);
    });
  });

  describe('academic years', () => {
    const y1 = randomUUID(), y2 = randomUUID();
    const years = async (s: string) => (await db.listAcademicYears({ schoolId: s })).data.academicYears;
    it('a new year is planned, not active, and the school has no active year yet', async () => {
      await db.createAcademicYear({ schoolId: A, id: y1, name: '2026-2027', startDate: '2026-04-01', endDate: '2027-03-31', actorId: adminA });
      await db.createAcademicYear({ schoolId: A, id: y2, name: '2027-2028', startDate: '2027-04-01', endDate: '2028-03-31', actorId: adminA });
      expect((await years(A)).map((y) => y.status)).toEqual(['PLANNED', 'PLANNED']);
      expect((await profile(A)).activeAcademicYear).toBeNull();
    });
    it('activating one points the school at it; activating another archives the first, so exactly one is active', async () => {
      await db.activateAcademicYear({ schoolId: A, id: y1, actorId: adminA });
      expect((await profile(A)).activeAcademicYear?.name).toBe('2026-2027');
      expect((await years(A)).filter((y) => y.status === 'ACTIVE').map((y) => y.name)).toEqual(['2026-2027']);
      await db.activateAcademicYear({ schoolId: A, id: y2, actorId: adminA });
      expect((await profile(A)).activeAcademicYear?.name).toBe('2027-2028');
      const now = await years(A);
      expect(now.filter((y) => y.status === 'ACTIVE').map((y) => y.name)).toEqual(['2027-2028']);
      expect(now.find((y) => y.name === '2026-2027')?.status).toBe('ARCHIVED');
      expect(await audit(A, 'academic.year.activate')).toHaveLength(2);
    });
    it("another school cannot activate, edit or delete A's year, and A's active year is unchanged", async () => {
      for (const op of [() => db.activateAcademicYear({ schoolId: B, id: y1, actorId: adminB }), () => db.updateAcademicYear({ schoolId: B, id: y1, name: 'x', actorId: adminB }), () => db.deleteAcademicYear({ schoolId: B, id: y1, actorId: adminB })])
        await expect(op()).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
      expect((await profile(A)).activeAcademicYear?.name).toBe('2027-2028');
      expect((await profile(B)).activeAcademicYear).toBeNull();
    });
    it('the active year cannot be deleted; an archived one can; a rename keeps the status', async () => {
      await expect(db.deleteAcademicYear({ schoolId: A, id: y2, actorId: adminA })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
      await db.updateAcademicYear({ schoolId: A, id: y2, name: '2027-28', actorId: adminA });
      expect((await years(A)).find((y) => bare(y.id) === bare(y2))).toMatchObject({ name: '2027-28', status: 'ACTIVE' });
      await db.deleteAcademicYear({ schoolId: A, id: y1, actorId: adminA });
      expect((await years(A)).map((y) => y.name)).toEqual(['2027-28']);
    });
  });

  it('every successful change above left exactly one audit row, and the failed ones none', async () => {
    const actions = (await audit(A)).map((r) => r.action);
    for (const a of ['school.profile.update', 'school.logo.set', 'academic.gradelevel.create', 'academic.gradelevel.update', 'academic.class.create', 'academic.subject.create', 'academic.year.create', 'academic.year.activate', 'academic.year.delete']) expect(actions, a).toContain(a);
    expect(actions.every((a) => /^(platform\.|school\.|academic\.)/.test(a))).toBe(true);
    // no change was ever audited for a request that was refused (the hijack attempts used School B's admin or an outsider)
    expect((await audit(A)).filter((r) => [adminB, outsider].includes(r.actor.id))).toEqual([]);
  });
});
