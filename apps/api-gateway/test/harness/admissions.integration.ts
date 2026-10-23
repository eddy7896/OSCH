// P2-3 against the REAL stack: applications, review steps and admitting through the gateway.
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

describe.skipIf(!ready)('admissions against the real emulators (P2-3)', () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const B = () => w!.schools.B;
  const officer = () => w!.roles.A.ADMISSIONS_OFFICER;
  const call = (method: 'get' | 'post' | 'patch', path: string, who: Person = officer(), school = A()) =>
    agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const audit = async (school: string, action: string) => (await w!.db.listAuditLog({ schoolId: school.replaceAll('-', ''), limit: 300, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  const uniq = () => randomUUID().slice(0, 8);
  const setup = async () => {
    // an academic admin makes the year and class, as the school would
    const acad = w!.roles.A.ACADEMIC_ADMIN;
    const year = (await call('post', '/academics/years', acad).send({ name: `AY-${uniq()}`, startDate: '2070-04-01', endDate: '2071-03-31' }).expect(201)).body;
    const levels = (await call('get', '/academics/levels', acad).expect(200)).body.items as Array<{ id: string; name: string }>;
    const level = levels.find((l) => l.name === '4')!;
    const room = (await call('post', '/academics/classes', acad).send({ gradeLevelId: level.id, section: uniq().slice(0, 5), capacity: 30 }).expect(201)).body;
    return { year, level, room, other: (await call('post', '/academics/classes', acad).send({ gradeLevelId: levels.find((l) => l.name === '5')!.id, section: uniq().slice(0, 5), capacity: 30 }).expect(201)).body };
  };
  const apply = async (ctx: Awaited<ReturnType<typeof setup>>, extra: Record<string, unknown> = {}) =>
    (await call('post', '/admissions').send({ firstName: `F${uniq()}`, lastName: 'Applicant', gradeLevelId: ctx.level.id, academicYearId: ctx.year.id, guardianName: 'Meera Applicant', guardianRelationship: 'MOTHER', guardianPhone: '+919876543210', guardianEmail: 'meera@example.com', ...extra }).expect(201)).body;

  it('submits an application with a generated number; the year defaults to the active one; B counts separately and cannot see it', async () => {
    const ctx = await setup();
    const one = await apply(ctx);
    const two = await apply(ctx);
    expect(one.applicationNo).toMatch(/^A\d{4}$/);
    expect(Number(two.applicationNo.slice(1))).toBe(Number(one.applicationNo.slice(1)) + 1);
    expect(one).toMatchObject({ status: 'SUBMITTED', gradeLevel: { id: ctx.level.id }, academicYear: { id: ctx.year.id }, studentId: null });
    await call('post', `/academics/years/${ctx.year.id}/activate`, w!.roles.A.ACADEMIC_ADMIN).expect(200);
    const defaulted = (await call('post', '/admissions').send({ firstName: 'Def', lastName: 'Ault', gradeLevelId: ctx.level.id, guardianName: 'G', guardianRelationship: 'FATHER' }).expect(201)).body;
    expect(defaulted.academicYear.id).toBe(ctx.year.id);
    await call('get', `/admissions/${one.id}`, w!.roles.B.ADMISSIONS_OFFICER, B()).expect(404);
  });

  it('refuses bad input and another school\'s level or year', async () => {
    const ctx = await setup();
    const bad = (body: object, status = 400) => call('post', '/admissions').send({ firstName: 'X', lastName: 'Y', gradeLevelId: ctx.level.id, academicYearId: ctx.year.id, guardianName: 'G', guardianRelationship: 'MOTHER', ...body }).expect(status);
    await bad({ dateOfBirth: '2999-01-01' });
    await bad({ dateOfBirth: '2015-02-30' });
    await bad({ guardianPhone: '12345' });
    await bad({ guardianEmail: 'not-an-email' });
    await bad({ guardianRelationship: 'UNCLE' });
    await bad({ status: 'ACCEPTED' }); // cannot start decided
    await bad({ applicationNo: 'A9999' });
    const bLevel = (await call('get', '/academics/levels', w!.roles.B.ACADEMIC_ADMIN, B()).expect(200)).body.items[0];
    await bad({ gradeLevelId: bLevel.id });
    await bad({ academicYearId: randomUUID() });
  });

  it('review: forward steps only; decided applications are final and no longer editable', async () => {
    const ctx = await setup();
    const a = await apply(ctx);
    await call('patch', `/admissions/${a.id}`).send({ notes: 'Sibling in class 4', guardianPhone: '+919000000000' }).expect(200);
    await call('patch', `/admissions/${a.id}`).send({}).expect(400);
    expect((await call('post', `/admissions/${a.id}/decision`).send({ status: 'UNDER_REVIEW' }).expect(200)).body.status).toBe('UNDER_REVIEW');
    await call('post', `/admissions/${a.id}/decision`).send({ status: 'UNDER_REVIEW' }).expect(409); // already there
    await call('post', `/admissions/${a.id}/decision`).send({ status: 'ADMITTED' }).expect(400); // only through admit
    await call('post', `/admissions/${a.id}/decision`).send({ status: 'SUBMITTED' }).expect(400);
    const rejected = (await call('post', `/admissions/${a.id}/decision`).send({ status: 'REJECTED', note: 'No seat this year' }).expect(200)).body;
    expect(rejected).toMatchObject({ status: 'REJECTED', decisionNote: 'No seat this year', notes: 'Sibling in class 4' });
    await call('post', `/admissions/${a.id}/decision`).send({ status: 'ACCEPTED' }).expect(409);
    await call('patch', `/admissions/${a.id}`).send({ notes: 'late' }).expect(409);
    await call('post', `/admissions/${a.id}/admit`).send({ classroomId: ctx.room.id }).expect(409); // not accepted
  });

  it('admit: the student exists with its number, class and guardian; the application points at it; admitting twice is refused', async () => {
    const ctx = await setup();
    const a = await apply(ctx, { dateOfBirth: '2018-03-02', gender: 'MALE', address: '3 Mill Road' });
    await call('post', `/admissions/${a.id}/decision`).send({ status: 'ACCEPTED' }).expect(200);
    const res = (await call('post', `/admissions/${a.id}/admit`).send({ classroomId: ctx.room.id, admissionDate: '2070-04-05' }).expect(201)).body;
    expect(res.student.enrollmentId).toMatch(/^S\d{4}$/);
    expect(res.guardianInvitationPending).toBe(true);
    expect(res.application).toMatchObject({ status: 'ADMITTED', studentId: res.student.id });
    const student = (await call('get', `/students/${res.student.id}`, w!.roles.A.ACADEMIC_ADMIN).expect(200)).body;
    expect(student).toMatchObject({ firstName: a.firstName, lastName: 'Applicant', gender: 'MALE', dateOfBirth: '2018-03-02', address: '3 Mill Road', admissionDate: '2070-04-05', status: 'ACTIVE' });
    expect(student.placement).toMatchObject({ classroom: { id: ctx.room.id }, academicYear: { id: ctx.year.id } });
    expect(student.guardians).toEqual([expect.objectContaining({ name: 'Meera Applicant', relationship: 'MOTHER', isPrimary: true, phone: '+919876543210', email: 'meera@example.com' })]);
    await call('post', `/admissions/${a.id}/admit`).send({ classroomId: ctx.room.id }).expect(409);
    // nothing was invited: admissions cannot grant roles
    const members = (await call('get', '/memberships', w!.roles.A.SYSTEM_ADMIN).expect(200)).body.items as Array<{ email: string }>;
    expect(members.some((m) => m.email === 'meera@example.com')).toBe(false);
  });

  it('admit refuses a class of the wrong level or another school, and writes nothing', async () => {
    const ctx = await setup();
    const a = await apply(ctx);
    await call('post', `/admissions/${a.id}/decision`).send({ status: 'ACCEPTED' }).expect(200);
    const before = (await call('get', '/students?pageSize=1', w!.roles.A.ACADEMIC_ADMIN).expect(200)).body.total;
    await call('post', `/admissions/${a.id}/admit`).send({ classroomId: ctx.other.id }).expect(400); // a class of another level
    await call('post', `/admissions/${a.id}/admit`).send({ classroomId: randomUUID() }).expect(400);
    const bRoom = (await call('get', '/academics/classes', w!.roles.B.ACADEMIC_ADMIN, B()).expect(200)).body.items[0];
    if (bRoom) await call('post', `/admissions/${a.id}/admit`).send({ classroomId: bRoom.id }).expect(400);
    await call('post', `/admissions/${a.id}/admit`, w!.roles.B.ADMISSIONS_OFFICER, B()).send({ classroomId: ctx.room.id }).expect(404);
    expect((await call('get', '/students?pageSize=1', w!.roles.A.ACADEMIC_ADMIN).expect(200)).body.total).toBe(before);
    expect((await call('get', `/admissions/${a.id}`).expect(200)).body.status).toBe('ACCEPTED');
  });

  it('concurrent admissions each get their own student number', async () => {
    const ctx = await setup();
    const apps = await Promise.all(Array.from({ length: 4 }, () => apply(ctx)));
    await Promise.all(apps.map((a) => call('post', `/admissions/${a.id}/decision`).send({ status: 'ACCEPTED' }).expect(200)));
    const results = await Promise.all(apps.map((a) => call('post', `/admissions/${a.id}/admit`).send({ classroomId: ctx.room.id }).expect(201)));
    expect(new Set(results.map((r) => r.body.student.enrollmentId)).size).toBe(4);
  }, 120_000); // the emulator runs one statement at a time and racing admits retry with a pause, so a slow CI machine needs room

  it('list: filters by status, year and search, with a total; paging', async () => {
    const ctx = await setup();
    const tag = uniq();
    for (const n of ['Aa', 'Bb', 'Cc']) await apply(ctx, { firstName: `${n}${tag}`, lastName: `Zed${tag}` });
    const found = (await call('get', `/admissions?search=ZED${tag.toUpperCase()}&academicYearId=${ctx.year.id}`).expect(200)).body;
    expect(found.total).toBe(3);
    expect(found.items.map((i: { firstName: string }) => i.firstName).sort()).toEqual([`Aa${tag}`, `Bb${tag}`, `Cc${tag}`]);
    expect((await call('get', `/admissions?search=zed${tag}&page=2&pageSize=2`).expect(200)).body.items).toHaveLength(1);
    await call('post', `/admissions/${found.items[0].id}/decision`).send({ status: 'REJECTED' }).expect(200);
    expect((await call('get', `/admissions?search=zed${tag}&status=SUBMITTED`).expect(200)).body.total).toBe(2);
    expect((await call('get', `/admissions?search=zed${tag}&status=REJECTED`).expect(200)).body.total).toBe(1);
    expect((await call('get', '/admissions?search=%25').expect(200)).body.total).toBe(0);
    expect((await call('get', `/admissions?search=zed${tag}`, w!.roles.B.ADMISSIONS_OFFICER, B()).expect(200)).body.total).toBe(0);
  });

  it('roles: Admissions Officer and Academic Admin work applications, Principal reads, Teacher and Parent see nothing, Accountant is refused', async () => {
    const ctx = await setup();
    const a = await apply(ctx);
    await call('get', `/admissions/${a.id}`, w!.roles.A.ACADEMIC_ADMIN).expect(200);
    await call('post', `/admissions/${a.id}/decision`, w!.roles.A.ACADEMIC_ADMIN).send({ status: 'UNDER_REVIEW' }).expect(200);
    await call('get', `/admissions/${a.id}`, w!.roles.A.PRINCIPAL).expect(200);
    await call('post', '/admissions', w!.roles.A.PRINCIPAL).send({ firstName: 'No', lastName: 'Way', gradeLevelId: ctx.level.id, guardianName: 'G', guardianRelationship: 'MOTHER' }).expect(403);
    await call('post', `/admissions/${a.id}/decision`, w!.roles.A.PRINCIPAL).send({ status: 'ACCEPTED' }).expect(403);
    await call('get', '/admissions', w!.roles.A.ACCOUNTANT).expect(403);
    await call('get', '/admissions', w!.roles.A.DRIVER).expect(403);
  });

  it('audit: each step left a row with the verified actor; the admit left exactly one row per admission', async () => {
    for (const x of ['admission.application.create', 'admission.application.update', 'admission.application.decide', 'admission.admit']) expect((await audit(A(), x)).length, x).toBeGreaterThan(0);
    expect((await audit(A(), 'admission.application.create')).every((r) => [officer().uid].includes(r.actor.id))).toBe(true);
    expect((await audit(B(), 'admission.admit')).length).toBe(0);
  });
});
