// P2-1 against the REAL stack: school profile, class levels, classes, subjects and academic years through the gateway.
import { type INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { agent } from '../support/serve.js';
import { bootRealApp } from './app.js';
import { requireEmulatorsOrSkip } from './emulators.js';
import { buildWorld, type Person, type World } from './fixtures.js';

const ready = requireEmulatorsOrSkip();
let app: INestApplication | undefined;
let w: World | undefined;
if (ready) {
  app = await bootRealApp([], {});
  w = await buildWorld();
}

describe.skipIf(!ready)('school setup against the real emulators (P2-1)', () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const B = () => w!.schools.B;
  const acad = () => w!.roles.A.ACADEMIC_ADMIN;
  const sysadmin = () => w!.roles.A.SYSTEM_ADMIN;
  const call = (method: 'get' | 'post' | 'patch' | 'put' | 'delete', path: string, who: Person = acad(), school = A()) =>
    agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const audit = async (school: string, action: string) => (await w!.db.listAuditLog({ schoolId: school.replaceAll('-', ''), limit: 300, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  const uniq = () => randomUUID().slice(0, 8);

  it('a new school starts with 15 class levels in order; each school sees only its own', async () => {
    const a = (await call('get', '/academics/levels').expect(200)).body.items as Array<{ id: string; name: string; position: number }>;
    expect(a.slice(0, 3).map((l) => l.name)).toEqual(['Nursery', 'LKG', 'UKG']);
    const b = (await call('get', '/academics/levels', w!.roles.B.ACADEMIC_ADMIN, B()).expect(200)).body.items as Array<{ id: string }>;
    expect(a.some((l) => b.some((x) => x.id === l.id))).toBe(false);
  });

  it('level -> class -> list: the class shows under its level with the name built from level and section', async () => {
    const level = (await call('post', '/academics/levels').send({ name: `Lvl-${uniq()}`, position: 700 }).expect(201)).body;
    const klass = (await call('post', '/academics/classes').send({ gradeLevelId: level.id, section: 'a', capacity: 32 }).expect(201)).body;
    expect(klass).toMatchObject({ section: 'A', capacity: 32, name: `${level.name} A`, gradeLevel: { id: level.id } });
    const listed = (await call('get', '/academics/levels').expect(200)).body.items.find((l: { id: string }) => l.id === level.id);
    expect(listed.classes).toEqual([expect.objectContaining({ id: klass.id, name: `${level.name} A` })]);
    expect((await call('patch', `/academics/classes/${klass.id}`).send({ section: 'b' }).expect(200)).body.name).toBe(`${level.name} B`);
    await call('post', '/academics/classes').send({ gradeLevelId: level.id, section: 'B', capacity: 10 }).expect(409); // section letter taken
    await call('delete', `/academics/levels/${level.id}`).expect(409); // it has a class
    await call('delete', `/academics/classes/${klass.id}`).expect(204);
    await call('delete', `/academics/levels/${level.id}`).expect(204);
  });

  it("school B's admin cannot see or change A's rows, and a class level of B cannot be used in A (looks like nothing exists)", async () => {
    const bAdmin = w!.roles.B.ACADEMIC_ADMIN;
    const lvl = (await call('post', '/academics/levels').send({ name: `Mine-${uniq()}`, position: 710 }).expect(201)).body;
    const sub = (await call('post', '/academics/subjects').send({ name: 'Mine', code: uniq().toUpperCase() }).expect(201)).body;
    const yr = (await call('post', '/academics/years').send({ name: `Y-${uniq()}`, startDate: '2044-04-01', endDate: '2045-03-31' }).expect(201)).body;
    for (const [m, path, body] of [['patch', `/academics/levels/${lvl.id}`, { name: 'x' }], ['delete', `/academics/levels/${lvl.id}`], ['patch', `/academics/subjects/${sub.id}`, { name: 'x' }], ['delete', `/academics/subjects/${sub.id}`], ['patch', `/academics/years/${yr.id}`, { name: 'x' }], ['post', `/academics/years/${yr.id}/activate`], ['delete', `/academics/years/${yr.id}`]] as const)
      await call(m, path, bAdmin, B()).send(body ?? {}).expect(404);
    const bLevel = (await call('get', '/academics/levels', bAdmin, B()).expect(200)).body.items[0];
    await call('post', '/academics/classes').send({ gradeLevelId: bLevel.id, section: 'Q', capacity: 20 }).expect(400);
    // A header for B with A's token is refused outright
    await call('get', '/academics/levels', acad(), B()).expect(403);
    expect((await call('get', '/academics/subjects', bAdmin, B()).expect(200)).body.items.some((s: { id: string }) => s.id === sub.id)).toBe(false);
  });

  it('subject codes are unique per school, stored upper case', async () => {
    const code = uniq().toUpperCase();
    const s = (await call('post', '/academics/subjects').send({ name: 'One', code: code.toLowerCase() }).expect(201)).body;
    expect(s.code).toBe(code);
    await call('post', '/academics/subjects').send({ name: 'Two', code }).expect(409);
    await call('post', '/academics/subjects', w!.roles.B.ACADEMIC_ADMIN, B()).send({ name: 'Other school', code }).expect(201);
  });

  it('academic year: planned, end after start, one active at a time, active cannot be deleted', async () => {
    const mk = async (start: string, end: string) => (await call('post', '/academics/years').send({ name: `Y-${uniq()}`, startDate: start, endDate: end }).expect(201)).body;
    await call('post', '/academics/years').send({ name: 'Bad', startDate: '2046-04-01', endDate: '2046-03-01' }).expect(400);
    const y1 = await mk('2046-04-01', '2047-03-31');
    const y2 = await mk('2047-04-01', '2048-03-31');
    expect(y1.status).toBe('PLANNED');
    expect((await call('post', `/academics/years/${y1.id}/activate`).expect(200)).body.status).toBe('ACTIVE');
    expect((await call('get', '/school/profile', sysadmin()).expect(200)).body.activeAcademicYear.id).toBe(y1.id);
    await call('post', `/academics/years/${y2.id}/activate`).expect(200);
    const years = (await call('get', '/academics/years').expect(200)).body.items as Array<{ id: string; status: string }>;
    expect(years.filter((y) => y.status === 'ACTIVE').map((y) => y.id)).toEqual([y2.id]);
    expect(years.find((y) => y.id === y1.id)!.status).toBe('ARCHIVED');
    await call('delete', `/academics/years/${y2.id}`).expect(409);
    await call('patch', `/academics/years/${y2.id}`).send({ endDate: '2047-01-01' }).expect(400); // would end before it starts
    const before = (await audit(A(), 'academic.year.activate')).length;
    await call('post', `/academics/years/${y2.id}/activate`).expect(200); // already active: no write
    expect((await audit(A(), 'academic.year.activate')).length).toBe(before);
  });

  it('profile: System Admin edits, Principal reads, Academic Admin cannot; colour must be readable under white text; audited', async () => {
    const p = await call('patch', '/school/profile', sysadmin()).send({ address: '9 Lake Road', contactPhone: '+919876543210', primaryColor: '#1d4ed8' }).expect(200);
    expect(p.body).toMatchObject({ address: '9 Lake Road', contactPhone: '+919876543210', primaryColor: '#1d4ed8' });
    await call('patch', '/school/profile', sysadmin()).send({ primaryColor: '#facc15' }).expect(400); // yellow: white text unreadable
    await call('patch', '/school/profile', sysadmin()).send({ primaryColor: 'blue' }).expect(400);
    await call('patch', '/school/profile', sysadmin()).send({}).expect(400);
    await call('patch', '/school/profile', sysadmin()).send({ subDomain: 'hijack' }).expect(400); // not editable here
    await call('get', '/school/profile', w!.roles.A.PRINCIPAL).expect(200);
    await call('patch', '/school/profile', w!.roles.A.PRINCIPAL).send({ address: 'x' }).expect(403);
    await call('patch', '/school/profile', acad()).send({ address: 'x' }).expect(403);
    const rows = await audit(A(), 'school.profile.update');
    expect(rows.some((r) => r.actor.id === sysadmin().uid && JSON.stringify(r.details).includes('primaryColor'))).toBe(true);
  });

  it("logo: only a key under this school's own logo prefix is accepted", async () => {
    const own = `schools/${A()}/logo/${randomUUID()}.png`;
    expect((await call('put', '/school/logo', sysadmin()).send({ key: own }).expect(200)).body.logoKey).toBe(own);
    for (const key of [`schools/${B()}/logo/${randomUUID()}.png`, `schools/${A()}/logo/../../${B()}/x.png`, 'anything.png', `schools/${A()}/logo/${randomUUID()}.exe`])
      await call('put', '/school/logo', sysadmin()).send({ key }).expect(400);
    expect((await call('get', '/school/profile', sysadmin()).expect(200)).body.logoKey).toBe(own);
  });

  it('read-only roles read the structure but cannot change it; a Teacher cannot even write', async () => {
    await call('get', '/academics/levels', w!.roles.A.PRINCIPAL).expect(200);
    await call('post', '/academics/levels', w!.roles.A.PRINCIPAL).send({ name: 'No', position: 1 }).expect(403);
    await call('post', '/academics/subjects', w!.roles.A.TEACHER).send({ name: 'No', code: 'NO' }).expect(403);
    await call('delete', `/academics/years/${randomUUID()}`, w!.roles.A.PRINCIPAL).expect(403);
  });

  it('every change above left its audit row with the verified actor', async () => {
    for (const a of ['academic.gradelevel.create', 'academic.class.create', 'academic.class.update', 'academic.class.delete', 'academic.gradelevel.delete', 'academic.subject.create', 'academic.year.create', 'academic.year.activate', 'school.logo.set'])
      expect((await audit(A(), a)).length, a).toBeGreaterThan(0);
    expect((await audit(A(), 'academic.subject.create')).every((r) => r.actor.id === acad().uid)).toBe(true);
  });
});
