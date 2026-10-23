// P2-3: admission applications, review steps and admitting (student created in the same transaction) against the real emulator.
import { randomUUID } from 'node:crypto';
import { createDatabase, type Database } from '../src/index.js';

const host = process.env.DATA_CONNECT_EMULATOR_HOST;
const bare = (u: string) => u.replaceAll('-', '');
type Status = 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | 'ADMITTED';

describe.skipIf(!host)('Admission operations (P2-3)', () => {
  let db: Database;
  const A = randomUUID();
  const B = randomUUID();
  const tag = A.slice(0, 8);
  const offA = `oa-${tag}`;
  const offB = `ob-${tag}`;
  let yearA: string, levelA: string, roomA: string, yearB: string, levelB: string, roomB: string;
  const audit = async (s: string, action?: string) => (await db.listAuditLog({ schoolId: s, limit: 300, offset: 0 })).data.auditLogs.filter((a) => !action || a.action === action);
  const get = async (s: string, id: string) => (await db.getApplication({ schoolId: s, id })).data.applications[0];
  const apply = async (s: string, actor: string, level: string, year: string, first: string, extra: Record<string, unknown> = {}) => {
    const seq = (await db.applicationSeqInfo({ schoolId: s })).data.school!.applicationSeq;
    const id = randomUUID();
    await db.createApplication({ schoolId: s, id, expectedSeq: seq, applicationNo: `A${String(seq + 1).padStart(4, '0')}`, firstName: first, lastName: 'Applicant', gradeLevelId: level, academicYearId: year, guardianName: 'Meera Applicant', guardianRelationship: 'MOTHER', guardianPhone: '+919876543210', guardianEmail: 'meera@example.com', actorId: actor, ...extra });
    return id;
  };
  const decide = (s: string, actor: string, id: string, from: Status, to: Status, note?: string) => db.decideApplication({ schoolId: s, id, fromStatus: from as never, toStatus: to as never, ...(note ? { decisionNote: note } : {}), actorId: actor });
  const admit = async (s: string, actor: string, id: string, year: string, room: string, extra: Record<string, unknown> = {}) => {
    const info = (await db.applicationSeqInfo({ schoolId: s })).data.school!;
    const studentId = randomUUID();
    await db.admitApplication({ schoolId: s, id, studentId, expectedSeq: info.studentSeq, enrollmentId: `${info.enrollmentPrefix}${String(info.studentSeq + 1).padStart(4, '0')}`, academicYearId: year, classroomId: room, firstName: 'Admitted', lastName: 'Applicant', guardianId: randomUUID(), guardianName: 'Meera Applicant', guardianRelationship: 'MOTHER', guardianPhone: '+919876543210', actorId: actor, ...extra });
    return studentId;
  };

  beforeAll(async () => {
    db = createDatabase({ projectId: 'demo-oruschools' });
    for (const id of [offA, offB]) await db.upsertUser({ id, email: `${id}@example.com` });
    await db.provisionSchool({ id: A, name: 'School A', subDomain: `a-${tag}`, defaultLanguage: 'en', actorId: offA });
    await db.provisionSchool({ id: B, name: 'School B', subDomain: `b-${tag}`, defaultLanguage: 'en', actorId: offB });
    await db.createSchoolMember({ schoolId: A, userId: offA, schoolRole: 'ADMISSIONS_OFFICER' as never });
    await db.createSchoolMember({ schoolId: B, userId: offB, schoolRole: 'ADMISSIONS_OFFICER' as never });
    for (const [s, actor] of [[A, offA], [B, offB]] as const) {
      const year = randomUUID();
      await db.createAcademicYear({ schoolId: s, id: year, name: '2027-2028', startDate: '2027-04-01', endDate: '2028-03-31', actorId: actor });
      const level = (await db.listGradeLevels({ schoolId: s })).data.gradeLevels.find((l) => l.name === '1')!.id;
      const room = randomUUID();
      await db.createClassroom({ schoolId: s, id: room, gradeLevelId: level, section: 'A', name: '1 A', capacity: 30, actorId: actor });
      if (s === A) [yearA, levelA, roomA] = [year, level, room];
      else [yearB, levelB, roomB] = [year, level, room];
    }
  });

  it('application numbers run A0001, A0002 per school; level and year must belong to the school', async () => {
    const a1 = await apply(A, offA, levelA, yearA, 'Anil');
    await apply(A, offA, levelA, yearA, 'Bina');
    await apply(B, offB, levelB, yearB, 'Chetan');
    expect((await get(A, a1))).toMatchObject({ applicationNo: 'A0001', status: 'SUBMITTED', firstName: 'Anil', gradeLevel: { name: '1' }, academicYear: { name: '2027-2028' } });
    expect((await db.listApplications({ schoolId: A, limit: 50, offset: 0 })).data.applications.map((x) => x.applicationNo)).toEqual(['A0002', 'A0001']); // newest first
    expect((await db.listApplications({ schoolId: B, limit: 50, offset: 0 })).data.applications.map((x) => x.applicationNo)).toEqual(['A0001']);
    await expect(apply(A, offA, levelB, yearA, 'X')).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // B's class level
    await expect(apply(A, offA, levelA, yearB, 'X')).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // B's year
  });

  it('a stale number is refused with nothing written; a non-member actor cannot apply', async () => {
    const before = (await audit(A, 'admission.application.create')).length;
    await expect(db.createApplication({ schoolId: A, id: randomUUID(), expectedSeq: 0, applicationNo: 'A0001', firstName: 'Late', lastName: 'X', gradeLevelId: levelA, academicYearId: yearA, guardianName: 'G', guardianRelationship: 'FATHER', actorId: offA })).rejects.toMatchObject({ kind: 'CONFLICT' });
    await expect(db.createApplication({ schoolId: A, id: randomUUID(), expectedSeq: 2, applicationNo: 'A0003', firstName: 'X', lastName: 'Y', gradeLevelId: levelA, academicYearId: yearA, guardianName: 'G', guardianRelationship: 'FATHER', actorId: offB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    expect((await audit(A, 'admission.application.create')).length).toBe(before);
    expect((await db.applicationSeqInfo({ schoolId: A })).data.school?.applicationSeq).toBe(2);
  });

  it('filters: status, year and search (child or guardian name, number); counts match', async () => {
    const id = await apply(A, offA, levelA, yearA, 'Esha', { guardianName: 'Zubair Khan' });
    const list = async (o: { search?: string; status?: Status; academicYearId?: string }) =>
      (await db.listApplications({ schoolId: A, limit: 50, offset: 0, ...(o.search ? { search: o.search } : {}), ...(o.status ? { status: o.status as never } : {}), ...(o.academicYearId ? { academicYearId: o.academicYearId } : {}) })).data.applications;
    expect((await list({ search: '%zubair%' })).map((x) => bare(x.id))).toEqual([bare(id)]);
    expect((await list({ search: '%A0002%' })).map((x) => x.firstName)).toEqual(['Bina']);
    expect((await list({ status: 'ACCEPTED' }))).toEqual([]);
    expect((await list({ academicYearId: yearB }))).toEqual([]); // A has no application for B's year
    expect((await db.countApplications({ schoolId: A, search: '%applicant%' })).data.applications[0]?._count).toBe((await list({ search: '%applicant%' })).length);
  });

  it('review steps move one status to the next; a step from a status the application is no longer in is refused', async () => {
    const id = await apply(A, offA, levelA, yearA, 'Farid');
    await decide(A, offA, id, 'SUBMITTED', 'UNDER_REVIEW');
    await expect(decide(A, offA, id, 'SUBMITTED', 'ACCEPTED')).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // someone moved it already
    await decide(A, offA, id, 'UNDER_REVIEW', 'REJECTED', 'No seat this year');
    expect(await get(A, id)).toMatchObject({ status: 'REJECTED', decisionNote: 'No seat this year' });
    await expect(decide(B, offB, id, 'REJECTED', 'ACCEPTED')).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // not B's
    expect((await get(B, id))).toBeUndefined();
  });

  it('only an open application can be edited; B cannot edit A\'s', async () => {
    const id = await apply(A, offA, levelA, yearA, 'Gita');
    await db.updateApplication({ schoolId: A, id, notes: 'Sibling in class 4', guardianPhone: '+919000000000', actorId: offA, details: { changed: ['notes', 'guardianPhone'] } });
    expect(await get(A, id)).toMatchObject({ notes: 'Sibling in class 4', guardianPhone: '+919000000000', firstName: 'Gita' });
    await expect(db.updateApplication({ schoolId: B, id, notes: 'x', actorId: offB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await decide(A, offA, id, 'SUBMITTED', 'ACCEPTED');
    await expect(db.updateApplication({ schoolId: A, id, notes: 'late edit', actorId: offA })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
  });

  it('admitting creates the student, the placement, the guardian and the new status together; only an ACCEPTED application, once', async () => {
    const id = await apply(A, offA, levelA, yearA, 'Hari');
    await expect(admit(A, offA, id, yearA, roomA)).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // still SUBMITTED
    await decide(A, offA, id, 'SUBMITTED', 'ACCEPTED');
    const studentId = await admit(A, offA, id, yearA, roomA, { admissionDate: '2027-04-05' });
    const app = (await get(A, id))!;
    expect(app).toMatchObject({ status: 'ADMITTED' });
    expect(bare(app.studentId!)).toBe(bare(studentId));
    const s = (await db.getStudent({ schoolId: A, id: studentId })).data.students[0]!;
    expect(s).toMatchObject({ firstName: 'Admitted', status: 'ACTIVE', admissionDate: '2027-04-05' });
    expect(s.placements).toEqual([expect.objectContaining({ classroom: { id: expect.any(String), name: '1 A' }, academicYear: { id: expect.any(String), name: '2027-2028' } })]);
    expect(s.guardians).toEqual([expect.objectContaining({ name: 'Meera Applicant', isPrimary: true, phone: '+919876543210' })]);
    await expect(admit(A, offA, id, yearA, roomA)).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // already admitted
    expect((await audit(A, 'admission.admit')).length).toBe(1);
  });

  it('a refused admit writes nothing: wrong school class, another school, stale student number', async () => {
    const id = await apply(A, offA, levelA, yearA, 'Ira');
    await decide(A, offA, id, 'SUBMITTED', 'ACCEPTED');
    const students = async () => (await db.listStudents({ schoolId: A, limit: 100, offset: 0 })).data.students.length;
    const before = await students();
    await expect(admit(A, offA, id, yearA, roomB)).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // B's class
    await expect(admit(B, offB, id, yearB, roomB)).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // B cannot admit A's application
    await expect(admit(A, offA, id, yearA, roomA, { expectedSeq: 0, enrollmentId: 'S0001' })).rejects.toBeDefined(); // stale student number
    expect(await students()).toBe(before);
    expect(await get(A, id)).toMatchObject({ status: 'ACCEPTED', studentId: null });
    await admit(A, offA, id, yearA, roomA); // and the right call still works afterwards
    expect(await students()).toBe(before + 1);
  });

  it('every step left its audit row; refused ones left none', async () => {
    const actions = (await audit(A)).map((r) => r.action);
    for (const a of ['admission.application.create', 'admission.application.update', 'admission.application.decide', 'admission.admit']) expect(actions, a).toContain(a);
    expect((await audit(A)).filter((r) => r.actor.id === offB)).toEqual([]);
  });
});
