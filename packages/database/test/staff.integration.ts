// P2-4: staff records, employee numbers, account link, photo and documents against the real emulator.
import { randomUUID } from 'node:crypto';
import { createDatabase, type Database } from '../src/index.js';

const host = process.env.DATA_CONNECT_EMULATOR_HOST;
const bare = (u: string) => u.replaceAll('-', '');
type St = 'ACTIVE' | 'INACTIVE' | 'LEFT';

describe.skipIf(!host)('Staff operations (P2-4)', () => {
  let db: Database;
  const A = randomUUID();
  const B = randomUUID();
  const tag = A.slice(0, 8);
  const hrA = `ha-${tag}`;
  const hrB = `hb-${tag}`;
  const audit = async (s: string, action?: string) => (await db.listAuditLog({ schoolId: s, limit: 300, offset: 0 })).data.auditLogs.filter((a) => !action || a.action === action);
  const filter = (s: string, o: { search?: string; status?: St; department?: string }) => ({ schoolId: s, ...(o.search ? { search: o.search } : {}), ...(o.status ? { status: o.status as never } : {}), ...(o.department ? { department: o.department } : {}) });
  const list = async (s: string, o: { search?: string; status?: St; department?: string } = {}) => (await db.listStaffProfiles({ ...filter(s, o), limit: 100, offset: 0 })).data.staffProfiles;
  const count = async (s: string, o: { search?: string; status?: St; department?: string } = {}) => (await db.countStaffProfiles(filter(s, o))).data.staffProfiles[0]?._count ?? 0;
  const hire = async (s: string, actor: string, first: string, last: string, extra: Record<string, unknown> = {}) => {
    const seq = (await db.staffSeqInfo({ schoolId: s })).data.school!.staffSeq;
    const id = randomUUID();
    await db.createStaff({ schoolId: s, id, expectedSeq: seq, employeeId: `E${String(seq + 1).padStart(4, '0')}`, firstName: first, lastName: last, actorId: actor, ...extra });
    return id;
  };

  beforeAll(async () => {
    db = createDatabase({ projectId: 'demo-oruschools' });
    for (const id of [hrA, hrB]) await db.upsertUser({ id, email: `${id}@example.com` });
    await db.provisionSchool({ id: A, name: 'School A', subDomain: `a-${tag}`, defaultLanguage: 'en', actorId: hrA });
    await db.provisionSchool({ id: B, name: 'School B', subDomain: `b-${tag}`, defaultLanguage: 'en', actorId: hrB });
    await db.createSchoolMember({ schoolId: A, userId: hrA, schoolRole: 'HR_MANAGER' as never });
    await db.createSchoolMember({ schoolId: B, userId: hrB, schoolRole: 'HR_MANAGER' as never });
  });

  it('employee numbers run 1, 2, 3 per school, each school on its own', async () => {
    const s1 = await hire(A, hrA, 'Anita', 'Rao', { department: 'Science', designation: 'Teacher' });
    await hire(A, hrA, 'Bilal', 'Khan', { department: 'Admin' });
    await hire(B, hrB, 'Chitra', 'Iyer');
    const a = await list(A);
    expect(a.map((s) => s.employeeId).sort()).toEqual(['E0001', 'E0002']);
    expect(a.find((s) => bare(s.id) === bare(s1))).toMatchObject({ firstName: 'Anita', department: 'Science', designation: 'Teacher', status: 'ACTIVE', userId: null });
    expect((await list(B)).map((s) => s.employeeId)).toEqual(['E0001']);
  });

  it('a stale number is refused and nothing is written; a non-member actor cannot hire', async () => {
    const before = (await audit(A, 'staff.create')).length;
    await expect(db.createStaff({ schoolId: A, id: randomUUID(), expectedSeq: 0, employeeId: 'E0001', firstName: 'Late', lastName: 'Comer', actorId: hrA })).rejects.toMatchObject({ kind: 'CONFLICT' });
    await expect(db.createStaff({ schoolId: A, id: randomUUID(), expectedSeq: 2, employeeId: 'E0003', firstName: 'X', lastName: 'Y', actorId: hrB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    expect((await list(A)).some((s) => s.firstName === 'Late')).toBe(false);
    expect((await audit(A, 'staff.create')).length).toBe(before);
    expect((await db.staffSeqInfo({ schoolId: A })).data.school?.staffSeq).toBe(2);
  });

  it('search, status and department filters; counts match the list; paging keeps the order', async () => {
    for (const n of ['Cyrus', 'Esha', 'Farid']) await hire(A, hrA, n, 'Pagetest', { department: 'Science' });
    expect((await list(A, { search: '%RAO%' })).map((s) => s.firstName)).toEqual(['Anita']);
    expect((await list(A, { search: '%E0002%' })).map((s) => s.firstName)).toEqual(['Bilal']);
    expect(await count(A, { department: 'Science' })).toBe(4);
    expect(await count(A, { department: 'Science', search: '%page%' })).toBe(3);
    const all = (await list(A)).map((s) => s.id);
    const pages = [0, 2, 4].map(async (offset) => (await db.listStaffProfiles({ schoolId: A, limit: 2, offset })).data.staffProfiles.map((s) => s.id));
    expect((await Promise.all(pages)).flat()).toEqual(all);
    expect((await db.listStaffDepartments({ schoolId: A })).data.staffProfiles.map((s) => s.department)).toEqual(expect.arrayContaining(['Admin', 'Science']));
    expect((await db.listStaffDepartments({ schoolId: B })).data.staffProfiles).toEqual([]);
  });

  it('update changes only what is sent, status filters work, another school cannot edit', async () => {
    const id = await hire(A, hrA, 'Gita', 'Leaver', { phone: '+919876543210' });
    await db.updateStaff({ schoolId: A, id, designation: 'Clerk', status: 'LEFT' as never, actorId: hrA, details: { changed: ['designation', 'status'] } });
    const got = (await db.getStaffProfile({ schoolId: A, id })).data.staffProfiles[0]!;
    expect(got).toMatchObject({ designation: 'Clerk', status: 'LEFT', phone: '+919876543210', firstName: 'Gita' });
    expect((await list(A, { status: 'ACTIVE' })).some((s) => bare(s.id) === bare(id))).toBe(false);
    await expect(db.updateStaff({ schoolId: B, id, firstName: 'Mine', actorId: hrB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    expect((await db.getStaffProfile({ schoolId: B, id })).data.staffProfiles).toEqual([]);
  });

  it('account link: only an account that is a member of this school; one account per record', async () => {
    const id = await hire(A, hrA, 'Hari', 'Linked');
    const other = await hire(A, hrA, 'Ira', 'Other');
    const outsider = `out-${tag}`;
    await db.upsertUser({ id: outsider, email: `${outsider}@example.com` });
    await expect(db.linkStaffAccount({ schoolId: A, id, userId: outsider, actorId: hrA })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // not a member of A
    await expect(db.linkStaffAccount({ schoolId: A, id, userId: hrB, actorId: hrA })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // member of B only
    await db.linkStaffAccount({ schoolId: A, id, userId: hrA, actorId: hrA });
    expect((await db.getStaffProfile({ schoolId: A, id })).data.staffProfiles[0]!.userId).toBe(hrA);
    await expect(db.linkStaffAccount({ schoolId: A, id: other, userId: hrA, actorId: hrA })).rejects.toMatchObject({ kind: 'CONFLICT' });
    await expect(db.linkStaffAccount({ schoolId: B, id, userId: hrB, actorId: hrB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
  });

  it('photo and documents: recorded for the school only, listed, removed', async () => {
    const id = await hire(A, hrA, 'Jai', 'Filed');
    await db.setStaffPhoto({ schoolId: A, id, photoKey: `schools/${A}/staff/${id}/photo/p.png`, actorId: hrA });
    await expect(db.setStaffPhoto({ schoolId: B, id, photoKey: 'x', actorId: hrB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    const d1 = randomUUID();
    const key = `schools/${A}/staff/${id}/documents/${d1}.pdf`;
    await db.addStaffDocument({ schoolId: A, id: d1, staffId: id, kind: 'APPOINTMENT_LETTER' as never, fileKey: key, fileName: 'letter.pdf', contentType: 'application/pdf', sizeBytes: 100, actorId: hrA });
    await expect(db.addStaffDocument({ schoolId: B, id: randomUUID(), staffId: id, kind: 'OTHER' as never, fileKey: 'k', fileName: 'f', contentType: 'image/png', sizeBytes: 1, actorId: hrB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.addStaffDocument({ schoolId: A, id: randomUUID(), staffId: id, kind: 'OTHER' as never, fileKey: key, fileName: 'again', contentType: 'application/pdf', sizeBytes: 1, actorId: hrA })).rejects.toMatchObject({ kind: 'CONFLICT' });
    const got = (await db.getStaffProfile({ schoolId: A, id })).data.staffProfiles[0]!;
    expect(got.photoKey).toContain('/photo/p.png');
    expect(got.documents).toEqual([expect.objectContaining({ fileName: 'letter.pdf', kind: 'APPOINTMENT_LETTER' })]);
    await expect(db.removeStaffDocument({ schoolId: B, id: d1, actorId: hrB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await db.removeStaffDocument({ schoolId: A, id: d1, actorId: hrA });
    expect((await db.getStaffProfile({ schoolId: A, id })).data.staffProfiles[0]!.documents).toEqual([]);
  });

  it('every change left its audit row and refused ones left none', async () => {
    const actions = (await audit(A)).map((r) => r.action);
    for (const a of ['staff.create', 'staff.update', 'staff.account.link', 'staff.photo.set', 'staff.document.add', 'staff.document.remove']) expect(actions, a).toContain(a);
    expect((await audit(A)).filter((r) => r.actor.id === hrB)).toEqual([]);
  });
});
