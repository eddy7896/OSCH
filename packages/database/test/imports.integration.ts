// P2-5: the bracket around a bulk import: one batch per file (by hash), finished once, only by its own school.
import { randomUUID } from 'node:crypto';
import { createDatabase, type Database } from '../src/index.js';

const host = process.env.DATA_CONNECT_EMULATOR_HOST;

describe.skipIf(!host)('Import batch operations (P2-5)', () => {
  let db: Database;
  const A = randomUUID();
  const B = randomUUID();
  const tag = A.slice(0, 8);
  const adminA = `ia-${tag}`;
  const adminB = `ib-${tag}`;
  const audit = async (s: string, action: string) => (await db.listAuditLog({ schoolId: s, limit: 100, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  const hash = (n: string) => n.padEnd(64, '0');

  beforeAll(async () => {
    db = createDatabase({ projectId: 'demo-oruschools' });
    for (const id of [adminA, adminB]) await db.upsertUser({ id, email: `${id}@example.com` });
    await db.provisionSchool({ id: A, name: 'School A', subDomain: `a-${tag}`, defaultLanguage: 'en', actorId: adminA });
    await db.provisionSchool({ id: B, name: 'School B', subDomain: `b-${tag}`, defaultLanguage: 'en', actorId: adminB });
    await db.createSchoolMember({ schoolId: A, userId: adminA, schoolRole: 'ACADEMIC_ADMIN' as never });
    await db.createSchoolMember({ schoolId: B, userId: adminB, schoolRole: 'ACADEMIC_ADMIN' as never });
  });

  it('the same file (hash) and kind can start only once per school; another school or kind may use it', async () => {
    const id = randomUUID();
    await db.startImportBatch({ schoolId: A, id, kind: 'students', fileHash: hash('aa'), rowCount: 3, actorId: adminA, details: { rows: 3 } });
    await expect(db.startImportBatch({ schoolId: A, id: randomUUID(), kind: 'students', fileHash: hash('aa'), rowCount: 3, actorId: adminA })).rejects.toMatchObject({ kind: 'CONFLICT' });
    await db.startImportBatch({ schoolId: A, id: randomUUID(), kind: 'staff', fileHash: hash('aa'), rowCount: 3, actorId: adminA });
    await db.startImportBatch({ schoolId: B, id: randomUUID(), kind: 'students', fileHash: hash('aa'), rowCount: 3, actorId: adminB });
    expect((await db.findImportBatch({ schoolId: A, kind: 'students', fileHash: hash('aa') })).data.importBatches[0]).toMatchObject({ status: 'STARTED', rowCount: 3, createdCount: 0 });
    expect((await db.findImportBatch({ schoolId: A, kind: 'guardians', fileHash: hash('aa') })).data.importBatches).toEqual([]);
    expect((await audit(A, 'import.start')).length).toBe(2);
  });

  it('a non-member cannot start one, and a refused start writes nothing', async () => {
    const before = (await audit(A, 'import.start')).length;
    await expect(db.startImportBatch({ schoolId: A, id: randomUUID(), kind: 'students', fileHash: hash('bb'), rowCount: 1, actorId: adminB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    expect((await db.findImportBatch({ schoolId: A, kind: 'students', fileHash: hash('bb') })).data.importBatches).toEqual([]);
    expect((await audit(A, 'import.start')).length).toBe(before);
  });

  it('finishing records the counts once; twice, or from another school, is refused', async () => {
    const id = randomUUID();
    await db.startImportBatch({ schoolId: A, id, kind: 'students', fileHash: hash('cc'), rowCount: 5, actorId: adminA });
    await expect(db.finishImportBatch({ schoolId: B, id, status: 'COMPLETED' as never, createdCount: 5, failedCount: 0, actorId: adminB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await db.finishImportBatch({ schoolId: A, id, status: 'PARTIAL' as never, createdCount: 4, failedCount: 1, actorId: adminA, details: { createdCount: 4 } });
    expect((await db.findImportBatch({ schoolId: A, kind: 'students', fileHash: hash('cc') })).data.importBatches[0]).toMatchObject({ status: 'PARTIAL', createdCount: 4, failedCount: 1 });
    await expect(db.finishImportBatch({ schoolId: A, id, status: 'COMPLETED' as never, createdCount: 5, failedCount: 0, actorId: adminA })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    expect((await audit(A, 'import.finish')).length).toBe(1);
  });

  it('lookup by enrolment id and the identity lists stay inside the school', async () => {
    const seq = (await db.applicationSeqInfo({ schoolId: A })).data.school!.studentSeq;
    const sid = randomUUID();
    await db.createStudent({ schoolId: A, id: sid, expectedSeq: seq, enrollmentId: `S${String(seq + 1).padStart(4, '0')}`, firstName: 'Look', lastName: 'Up', dateOfBirth: '2015-05-05', actorId: adminA });
    const num = `S${String(seq + 1).padStart(4, '0')}`;
    expect((await db.studentsByEnrollmentIds({ schoolId: A, ids: [num, 'S9999'] })).data.students.map((s) => s.enrollmentId)).toEqual([num]);
    expect((await db.studentsByEnrollmentIds({ schoolId: B, ids: [num] })).data.students).toEqual([]);
    expect((await db.studentIdentities({ schoolId: A, limit: 100, offset: 0 })).data.students).toContainEqual({ firstName: 'Look', lastName: 'Up', dateOfBirth: '2015-05-05' });
    expect((await db.studentIdentities({ schoolId: B, limit: 100, offset: 0 })).data.students).toEqual([]);
  });
});
