// P2-2 against the REAL stack: students, enrolment numbers, placement, guardians through the gateway.
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

describe.skipIf(!ready)('students against the real emulators (P2-2)', () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const B = () => w!.schools.B;
  const acad = () => w!.roles.A.ACADEMIC_ADMIN;
  const call = (method: 'get' | 'post' | 'patch' | 'delete', path: string, who: Person = acad(), school = A()) =>
    agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const audit = async (school: string, action: string) => (await w!.db.listAuditLog({ schoolId: school.replaceAll('-', ''), limit: 300, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  const uniq = () => randomUUID().slice(0, 8);
  const admit = async (first = `F${uniq()}`, last = 'Student', extra: Record<string, unknown> = {}, who: Person = acad(), school = A()) =>
    (await call('post', '/students', who, school).send({ firstName: first, lastName: last, ...extra }).expect(201)).body;
  const aRoom = async () => (await call('get', '/academics/classes').expect(200)).body.items[0] ?? (await (async () => {
    const lvl = (await call('get', '/academics/levels').expect(200)).body.items[0];
    return (await call('post', '/academics/classes').send({ gradeLevelId: lvl.id, section: uniq().slice(0, 4), capacity: 30 }).expect(201)).body;
  })());
  const newYear = async (n: string) => (await call('post', '/academics/years').send({ name: `${n}-${uniq()}`, startDate: '2060-04-01', endDate: '2061-03-31' }).expect(201)).body;

  it('admits a student with a generated enrolment id; numbers go up by one; a second school counts separately', async () => {
    const one = await admit();
    const two = await admit();
    expect(one.enrollmentId).toMatch(/^S\d{4}$/);
    expect(Number(two.enrollmentId.slice(1))).toBe(Number(one.enrollmentId.slice(1)) + 1);
    expect(one).toMatchObject({ status: 'ACTIVE', placement: null, placements: [], guardians: [] });
    const other = await admit('Bela', 'Other', {}, w!.roles.B.ACADEMIC_ADMIN, B());
    expect(other.enrollmentId).toMatch(/^S\d{4}$/);
    expect((await call('get', `/students/${other.id}`).expect(404)).body.error.code).toBe('NOT_FOUND'); // B's student is invisible to A
  });

  it('concurrent admissions each get their own number (retry on a taken number), no duplicates', async () => {
    const made = await Promise.all(Array.from({ length: 8 }, () => admit()));
    const ids = made.map((m) => m.enrollmentId);
    expect(new Set(ids).size).toBe(8);
  });

  it('admit with a class: placed in the active year', async () => {
    const room = await aRoom();
    const year = await newYear('Active');
    await call('post', `/academics/years/${year.id}/activate`).expect(200);
    const s = await admit('Placed', 'Now', { classroomId: room.id, dateOfBirth: '2015-05-04', gender: 'FEMALE' });
    expect(s.placement).toMatchObject({ academicYear: { id: year.id }, classroom: { id: room.id } });
    expect(s).toMatchObject({ dateOfBirth: '2015-05-04', gender: 'FEMALE' });
  });

  it('refuses bad input: future birth date, impossible date, unknown field, class of another school', async () => {
    await call('post', '/students').send({ firstName: 'X', lastName: 'Y', dateOfBirth: '2999-01-01' }).expect(400);
    await call('post', '/students').send({ firstName: 'X', lastName: 'Y', dateOfBirth: '2015-02-30' }).expect(400);
    await call('post', '/students').send({ firstName: 'X', lastName: 'Y', enrollmentId: 'HACK' }).expect(400); // the number is never chosen by the client
    await call('post', '/students').send({ firstName: 'X', lastName: 'Y', schoolId: B() }).expect(400);
    const bRoom = (await call('get', '/academics/classes', w!.roles.B.ACADEMIC_ADMIN, B()).expect(200)).body.items[0]
      ?? (await call('post', '/academics/classes', w!.roles.B.ACADEMIC_ADMIN, B()).send({ gradeLevelId: (await call('get', '/academics/levels', w!.roles.B.ACADEMIC_ADMIN, B())).body.items[0].id, section: 'Q', capacity: 10 }).expect(201)).body;
    await call('post', '/students').send({ firstName: 'X', lastName: 'Y', classroomId: bRoom.id }).expect(403);
  });

  it('search by name or number, status filter and paging with a total', async () => {
    const tag = uniq();
    for (const n of ['Aa', 'Bb', 'Cc']) await admit(`${n}${tag}`, `Zed${tag}`);
    const found = (await call('get', `/students?search=ZED${tag.toUpperCase()}`).expect(200)).body;
    expect(found.total).toBe(3);
    expect(found.items.map((i: { firstName: string }) => i.firstName)).toEqual([`Aa${tag}`, `Bb${tag}`, `Cc${tag}`]);
    const p2 = (await call('get', `/students?search=zed${tag}&page=2&pageSize=2`).expect(200)).body;
    expect(p2).toMatchObject({ total: 3, page: 2, pageSize: 2 });
    expect(p2.items).toHaveLength(1);
    const byNo = (await call('get', `/students?search=${found.items[0].enrollmentId}`).expect(200)).body;
    expect(byNo.items.some((i: { id: string }) => i.id === found.items[0].id)).toBe(true);
    expect((await call('get', '/students?search=%25').expect(200)).body.total).toBe(0); // a typed % is text, not a wildcard
    await call('patch', `/students/${found.items[0].id}`).send({ status: 'LEFT' }).expect(200);
    expect((await call('get', `/students?search=zed${tag}&status=ACTIVE`).expect(200)).body.total).toBe(2);
    expect((await call('get', `/students?search=zed${tag}&status=LEFT`).expect(200)).body.total).toBe(1);
    await call('get', '/students?pageSize=500').expect(400);
  });

  it("another school's staff cannot read, edit, place or add guardians to A's student", async () => {
    const s = await admit();
    const bAdmin = w!.roles.B.ACADEMIC_ADMIN;
    await call('get', `/students/${s.id}`, bAdmin, B()).expect(404);
    await call('patch', `/students/${s.id}`, bAdmin, B()).send({ firstName: 'Mine' }).expect(404);
    await call('post', `/students/${s.id}/guardians`, bAdmin, B()).send({ name: 'G', relationship: 'OTHER', phone: '+919876543210' }).expect(404);
    await call('post', `/students/${s.id}/placement`, bAdmin, B()).send({ classroomId: randomUUID() }).expect(404);
    await call('get', `/students/${s.id}`, bAdmin, A()).expect(403); // B's token with A's header
    expect((await call('get', `/students/${s.id}`).expect(200)).body.firstName).toBe(s.firstName);
    expect((await call('get', '/students?pageSize=100', bAdmin, B()).expect(200)).body.items.some((i: { id: string }) => i.id === s.id)).toBe(false);
  });

  it('placement: once per year (409), move changes the class, a year without placement cannot be moved', async () => {
    const room = await aRoom();
    const lvl = (await call('get', '/academics/levels').expect(200)).body.items[0];
    const room2 = (await call('post', '/academics/classes').send({ gradeLevelId: lvl.id, section: uniq().slice(0, 4), capacity: 30 }).expect(201)).body;
    const year = await newYear('Place');
    const s = await admit();
    await call('post', `/students/${s.id}/placement`).send({ classroomId: room.id, academicYearId: year.id }).expect(201);
    await call('post', `/students/${s.id}/placement`).send({ classroomId: room2.id, academicYearId: year.id }).expect(409);
    const moved = (await call('patch', `/students/${s.id}/placement`).send({ classroomId: room2.id, academicYearId: year.id }).expect(200)).body;
    expect(moved.placements).toHaveLength(1);
    expect(moved.placement.classroom.id).toBe(room2.id);
    const other = await newYear('Never');
    await call('patch', `/students/${s.id}/placement`).send({ classroomId: room.id, academicYearId: other.id }).expect(404);
  });

  it('guardians: need a phone or email, primary first, update and remove', async () => {
    const s = await admit();
    await call('post', `/students/${s.id}/guardians`).send({ name: 'No contact', relationship: 'MOTHER' }).expect(400);
    await call('post', `/students/${s.id}/guardians`).send({ name: 'Bad phone', relationship: 'MOTHER', phone: '12345' }).expect(400);
    await call('post', `/students/${s.id}/guardians`).send({ name: 'Meera', relationship: 'MOTHER', phone: '+919876543210' }).expect(201);
    const withBoth = (await call('post', `/students/${s.id}/guardians`).send({ name: 'Raj', relationship: 'FATHER', email: 'raj@example.com', isPrimary: true }).expect(201)).body;
    expect(withBoth.guardians.map((g: { name: string }) => g.name)).toEqual(['Raj', 'Meera']);
    const raj = withBoth.guardians[0];
    const upd = (await call('patch', `/students/${s.id}/guardians/${raj.id}`).send({ phone: '+919000000000' }).expect(200)).body;
    expect(upd.guardians[0].phone).toBe('+919000000000');
    await call('delete', `/students/${s.id}/guardians/${raj.id}`).expect(204);
    await call('delete', `/students/${s.id}/guardians/${raj.id}`).expect(404);
    expect((await call('get', `/students/${s.id}`).expect(200)).body.guardians).toHaveLength(1);
  });

  it('roles: Academic Admin and Admissions Officer write, Principal reads, Teacher and Parent get nothing from these routes', async () => {
    const s = await admit();
    await call('post', '/students', w!.roles.A.ADMISSIONS_OFFICER).send({ firstName: 'Adm', lastName: 'Officer' }).expect(201);
    await call('get', `/students/${s.id}`, w!.roles.A.PRINCIPAL).expect(200);
    await call('post', '/students', w!.roles.A.PRINCIPAL).send({ firstName: 'No', lastName: 'Way' }).expect(403);
    await call('patch', `/students/${s.id}`, w!.roles.A.PRINCIPAL).send({ address: 'x' }).expect(403);
    // Own / linked scopes cannot be resolved to students yet: they see nothing, never the whole school.
    expect((await call('get', '/students', w!.roles.A.TEACHER).expect(200)).body).toMatchObject({ items: [], total: 0 });
    await call('get', `/students/${s.id}`, w!.roles.A.PARENT).expect(404);
    await call('get', '/students', w!.roles.A.DRIVER).expect(403);
  });

  it('audit: each change left a row with the verified actor, and refused ones none', async () => {
    for (const a of ['student.create', 'student.update', 'student.place', 'student.move', 'student.guardian.add', 'student.guardian.update', 'student.guardian.remove'])
      expect((await audit(A(), a)).length, a).toBeGreaterThan(0);
    expect((await audit(A(), 'student.create')).every((r) => [acad().uid, w!.roles.A.ADMISSIONS_OFFICER.uid].includes(r.actor.id))).toBe(true);
    expect((await audit(B(), 'student.update')).length).toBe(0);
  });
});
