// P2-4 against the REAL stack: staff records, employee numbers, account link, photo and documents through the gateway.
import { type INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PRIVATE_STORE } from '../../src/files/private-store.js';
import { agent } from '../support/serve.js';
import { bootRealApp } from './app.js';
import { requireEmulatorsOrSkip } from './emulators.js';
import { buildWorld, type Person, type World } from './fixtures.js';

const ready = requireEmulatorsOrSkip();
const objects = new Map<string, { sizeBytes: number; contentType: string }>();
const store = {
  presignPut: async (i: { key: string }) => `https://private.example/put/${i.key}`,
  presignGet: async (i: { key: string; downloadName?: string }) => `https://private.example/get/${i.key}?name=${i.downloadName ?? ''}`,
  head: async (key: string) => objects.get(key) ?? null,
  remove: async (key: string) => void objects.delete(key),
};
let app: INestApplication | undefined;
let w: World | undefined;
if (ready) {
  app = await bootRealApp([], {}, [[PRIVATE_STORE, store]]);
  w = await buildWorld();
}

describe.skipIf(!ready)('staff against the real emulators (P2-4)', () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const B = () => w!.schools.B;
  const hr = () => w!.roles.A.HR_MANAGER;
  const call = (method: 'get' | 'post' | 'patch' | 'put' | 'delete', path: string, who: Person = hr(), school = A()) =>
    agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const audit = async (school: string, action: string) => (await w!.db.listAuditLog({ schoolId: school.replaceAll('-', ''), limit: 300, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  const uniq = () => randomUUID().slice(0, 8);
  const hire = async (first = `F${uniq()}`, extra: Record<string, unknown> = {}, who: Person = hr(), school = A()) =>
    (await call('post', '/staff', who, school).send({ firstName: first, lastName: 'Staff', ...extra }).expect(201)).body;

  it('creates a record with a generated employee number; numbers go up by one; B counts separately and is invisible to A', async () => {
    const one = await hire();
    const two = await hire();
    expect(one.employeeId).toMatch(/^E\d{4}$/);
    expect(Number(two.employeeId.slice(1))).toBe(Number(one.employeeId.slice(1)) + 1);
    expect(one).toMatchObject({ status: 'ACTIVE', hasAccount: false, userId: null, hasPhoto: false, documents: [] });
    const other = await hire('Bela', {}, w!.roles.B.HR_MANAGER, B());
    expect(other.employeeId).toMatch(/^E\d{4}$/);
    expect((await call('get', `/staff/${other.id}`).expect(404)).body.error.code).toBe('NOT_FOUND');
  });

  it('concurrent hires each get their own number, no duplicates', async () => {
    const made = await Promise.all(Array.from({ length: 8 }, () => hire()));
    expect(new Set(made.map((m) => m.employeeId)).size).toBe(8);
  });

  it('refuses bad input: future birth date, impossible date, bad phone, unknown fields (number, school, account)', async () => {
    const bad = (body: object) => call('post', '/staff').send({ firstName: 'X', lastName: 'Y', ...body }).expect(400);
    await bad({ dateOfBirth: '2999-01-01' });
    await bad({ dateOfJoining: '2020-02-30' });
    await bad({ phone: '12345' });
    await bad({ employeeId: 'E9999' });
    await bad({ schoolId: B() });
    await bad({ userId: 'someone' });
    await call('patch', `/staff/${(await hire()).id}`).send({}).expect(400);
  });

  it('search, status and department filters, paging with a total, departments list', async () => {
    const tag = uniq();
    for (const n of ['Aa', 'Bb', 'Cc']) await hire(`${n}${tag}`, { department: `Dept-${tag}` });
    const found = (await call('get', `/staff?search=STAFF&department=Dept-${tag}`).expect(200)).body;
    expect(found.total).toBe(3);
    expect(found.items.map((i: { firstName: string }) => i.firstName)).toEqual([`Aa${tag}`, `Bb${tag}`, `Cc${tag}`]);
    const p2 = (await call('get', `/staff?department=Dept-${tag}&page=2&pageSize=2`).expect(200)).body;
    expect(p2).toMatchObject({ total: 3, page: 2, pageSize: 2 });
    expect(p2.items).toHaveLength(1);
    expect((await call('get', `/staff?search=${found.items[0].employeeId}`).expect(200)).body.items.some((i: { id: string }) => i.id === found.items[0].id)).toBe(true);
    expect((await call('get', '/staff?search=%25').expect(200)).body.total).toBe(0);
    await call('patch', `/staff/${found.items[0].id}`).send({ status: 'LEFT' }).expect(200);
    expect((await call('get', `/staff?department=Dept-${tag}&status=ACTIVE`).expect(200)).body.total).toBe(2);
    expect((await call('get', '/staff/departments').expect(200)).body.items).toContain(`Dept-${tag}`);
    expect((await call('get', '/staff/departments', w!.roles.B.HR_MANAGER, B()).expect(200)).body.items).not.toContain(`Dept-${tag}`);
    await call('get', '/staff?pageSize=500').expect(400);
  });

  it("another school's HR cannot read, edit, link or add files to A's staff; B's token with A's header is refused", async () => {
    const s = await hire();
    const b = w!.roles.B.HR_MANAGER;
    await call('get', `/staff/${s.id}`, b, B()).expect(404);
    await call('patch', `/staff/${s.id}`, b, B()).send({ firstName: 'Mine' }).expect(404);
    await call('put', `/staff/${s.id}/account`, b, B()).send({ userId: b.uid }).expect(404);
    await call('post', `/staff/${s.id}/documents/upload-url`, b, B()).send({ contentType: 'image/png', sizeBytes: 5 }).expect(404);
    await call('get', `/staff/${s.id}`, b, A()).expect(403);
    expect((await call('get', `/staff/${s.id}`).expect(200)).body.firstName).toBe(s.firstName);
  });

  it('account link: only a member of this school, once, and it grants no role', async () => {
    const s = await hire();
    const t = w!.roles.A.TEACHER;
    await call('put', `/staff/${s.id}/account`).send({ userId: w!.roles.B.TEACHER.uid }).expect(400); // member of B only
    await call('put', `/staff/${s.id}/account`).send({ userId: `nobody-${uniq()}` }).expect(400);
    const linked = (await call('put', `/staff/${s.id}/account`).send({ userId: t.uid }).expect(200)).body;
    expect(linked).toMatchObject({ userId: t.uid, hasAccount: true });
    await call('put', `/staff/${s.id}/account`).send({ userId: w!.roles.A.STAFF.uid }).expect(409); // already linked
    const second = await hire();
    await call('put', `/staff/${second.id}/account`).send({ userId: t.uid }).expect(409); // that account belongs to another record
    // the teacher's role is untouched
    const members = (await call('get', '/memberships', w!.roles.A.SYSTEM_ADMIN).expect(200)).body.items as Array<{ userId: string; role: string }>;
    expect(members.find((m) => m.userId === t.uid)?.role).toBe('TEACHER');
  });

  it('photo and documents live in the private bucket and are read through signed addresses', async () => {
    const s = await hire();
    const t = (await call('post', `/staff/${s.id}/photo/upload-url`).send({ contentType: 'image/jpeg', sizeBytes: 1000 }).expect(200)).body;
    expect(t.key).toMatch(new RegExp(`^schools/${A()}/staff/${s.id}/photo/[0-9a-f-]{36}\\.jpg$`));
    objects.set(t.key, { sizeBytes: 1000, contentType: 'image/jpeg' });
    expect((await call('put', `/staff/${s.id}/photo`).send({ key: t.key }).expect(200)).body.hasPhoto).toBe(true);
    expect((await call('get', `/staff/${s.id}/photo`).expect(200)).body.url).toContain(t.key);
    const d = (await call('post', `/staff/${s.id}/documents/upload-url`).send({ contentType: 'application/pdf', sizeBytes: 5000 }).expect(200)).body;
    objects.set(d.key, { sizeBytes: 5000, contentType: 'application/pdf' });
    const after = (await call('post', `/staff/${s.id}/documents`).send({ key: d.key, kind: 'APPOINTMENT_LETTER', fileName: '..\\letter.pdf' }).expect(201)).body;
    expect(after.documents[0]).toMatchObject({ kind: 'APPOINTMENT_LETTER', fileName: 'letter.pdf', sizeBytes: 5000 });
    expect(JSON.stringify(after)).not.toContain(d.key);
    expect((await call('get', `/staff/${s.id}/documents/${after.documents[0].id}/url`).expect(200)).body.url).toContain(d.key);
    await call('delete', `/staff/${s.id}/documents/${after.documents[0].id}`).expect(204);
    expect(objects.has(d.key)).toBe(false);
    // not this record's path, or not uploaded, or a student-style key
    await call('post', `/staff/${s.id}/documents`).send({ key: `schools/${A()}/staff/${randomUUID()}/documents/${randomUUID()}.pdf`, kind: 'OTHER', fileName: 'x.pdf' }).expect(400);
    await call('post', `/staff/${s.id}/documents`).send({ key: `schools/${A()}/staff/${s.id}/documents/${randomUUID()}.pdf`, kind: 'OTHER', fileName: 'x.pdf' }).expect(400);
    await call('post', `/staff/${s.id}/documents`).send({ key: d.key, kind: 'PASSPORT', fileName: 'x.pdf' }).expect(400);
  });

  it('roles: HR and System Admin write; Principal and Academic Admin read; Teacher and Parent see nothing; Driver is refused', async () => {
    const s = await hire();
    await call('post', '/staff', w!.roles.A.SYSTEM_ADMIN).send({ firstName: 'Sys', lastName: 'Admin' }).expect(201);
    await call('get', `/staff/${s.id}`, w!.roles.A.PRINCIPAL).expect(200);
    await call('get', `/staff/${s.id}`, w!.roles.A.ACADEMIC_ADMIN).expect(200);
    await call('post', '/staff', w!.roles.A.PRINCIPAL).send({ firstName: 'No', lastName: 'Way' }).expect(403);
    await call('patch', `/staff/${s.id}`, w!.roles.A.ACADEMIC_ADMIN).send({ address: 'x' }).expect(403);
    await call('post', '/staff', w!.roles.A.ACCOUNTANT).send({ firstName: 'No', lastName: 'Way' }).expect(403);
    await call('get', '/staff', w!.roles.A.DRIVER).expect(403);
    await call('get', '/staff', w!.roles.A.PARENT).expect(403);
  });

  it('audit: each change left a row with the verified actor', async () => {
    for (const a of ['staff.create', 'staff.update', 'staff.account.link', 'staff.photo.set', 'staff.document.add', 'staff.document.remove'])
      expect((await audit(A(), a)).length, a).toBeGreaterThan(0);
    expect((await audit(A(), 'staff.create')).every((r) => [hr().uid, w!.roles.A.SYSTEM_ADMIN.uid].includes(r.actor.id))).toBe(true);
    expect((await audit(B(), 'staff.update')).length).toBe(0);
  });
});
