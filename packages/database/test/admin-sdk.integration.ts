// P1-2b runtime proof, against the real Data Connect emulator through the Admin SDK (run: npm run test:database).
import { randomUUID } from 'node:crypto';
import { createDatabase, DatabaseError, type Database } from '../src/index.js';

const host = process.env.DATA_CONNECT_EMULATOR_HOST;
describe.skipIf(!host)('Admin SDK against the emulator', () => {
  let db: Database;
  const A = randomUUID();
  const B = randomUUID();
  const tag = A.slice(0, 8);
  let studentId = '';

  beforeAll(async () => {
    db = createDatabase({ projectId: 'demo-oruschools' });
    await db.createSchool({ id: A, name: 'School A', subDomain: `a-${tag}` });
    await db.createSchool({ id: B, name: 'School B', subDomain: `b-${tag}` });
    await db.createStudent({ schoolId: A, firstName: 'Aarav', lastName: 'Mehta', enrollmentId: `E-${tag}`, gradeLevel: '10' });
    studentId = (await db.listStudents({ schoolId: A })).data.students[0]!.id;
  });

  it('runs a NO_ACCESS mutation as admin (the operations are gateway-only, not unusable)', async () => {
    const res = await db.createSchool({ id: randomUUID(), name: 'C', subDomain: `c-${tag}` });
    expect(res.data.school_insert.id).toBeTruthy();
  });

  it('scopes reads by schoolId: B does not see A\'s student', async () => {
    expect((await db.listStudents({ schoolId: A })).data.students).toHaveLength(1);
    expect((await db.listStudents({ schoolId: B })).data.students).toHaveLength(0);
  });

  it('a cross-tenant reference is ABORTED by the database and surfaces as FORBIDDEN_REFERENCE (403)', async () => {
    const err = await db.createInvoice({ schoolId: B, studentId, amountMinor: '100', dueDate: '2030-01-01' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(DatabaseError);
    expect(err).toMatchObject({ kind: 'FORBIDDEN_REFERENCE', httpStatus: 403 });
    expect(String((err as Error).message)).not.toMatch(/student|school/i);
  });

  it('the same invoice in the owning school succeeds', async () => {
    const res = await db.createInvoice({ schoolId: A, studentId, amountMinor: '100', dueDate: '2030-01-01' });
    expect(res.data.invoice_insert.id).toBeTruthy();
  });

  it('maps an invalid enum / uuid to INVALID_ARGUMENT (400) and a duplicate subdomain to CONFLICT (409)', async () => {
    await expect(db.createUser({ id: `u-${tag}`, email: `${tag}@example.com`, globalRole: 'ROOT' as never })).rejects.toMatchObject({ kind: 'INVALID_ARGUMENT', httpStatus: 400 });
    await expect(db.createSchool({ id: 'not-a-uuid', name: 'x', subDomain: `x-${tag}` })).rejects.toMatchObject({ kind: 'INVALID_ARGUMENT' });
    await expect(db.createSchool({ id: randomUUID(), name: 'dup', subDomain: `a-${tag}` })).rejects.toMatchObject({ kind: 'CONFLICT', httpStatus: 409 });
  });
});

describe('Admin SDK with no server', () => {
  it('maps an unreachable emulator to UNAVAILABLE (502)', async () => {
    const saved = process.env.DATA_CONNECT_EMULATOR_HOST;
    process.env.DATA_CONNECT_EMULATOR_HOST = '127.0.0.1:1';
    try {
      const db = createDatabase({ projectId: 'demo-unreachable' });
      await expect(db.listStudents({ schoolId: randomUUID() })).rejects.toMatchObject({ kind: 'UNAVAILABLE', httpStatus: 502 });
    } finally {
      if (saved === undefined) delete process.env.DATA_CONNECT_EMULATOR_HOST;
      else process.env.DATA_CONNECT_EMULATOR_HOST = saved;
    }
  });
});
