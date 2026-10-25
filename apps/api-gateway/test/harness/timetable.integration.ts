// P3-3 against the REAL stack: the timetable, its clash rules (E-ACAD-1), the views, and the own and linked scopes it feeds.
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

describe.skipIf(!ready)('timetable against the real emulators (P3-3)', { timeout: 180_000 }, () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const B = () => w!.schools.B;
  const acad = () => w!.roles.A.ACADEMIC_ADMIN;
  const hr = () => w!.roles.A.HR_MANAGER;
  const call = (method: 'get' | 'post' | 'put' | 'patch' | 'delete', path: string, who: Person = acad(), school = A()) =>
    agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const audit = async (action: string) => (await w!.db.listAuditLog({ schoolId: A().replaceAll('-', ''), limit: 500, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  const uniq = () => randomUUID().slice(0, 6);

  let p1 = '', p2 = '', brk = '';
  let math = '', sci = '', art = '';
  let t1 = '', t2 = '';
  let c1 = '', c2 = '';
  const slot = (classId: string, b: object, who: Person = acad(), school = A()) => call('put', `/academics/timetable/classes/${classId}/slots`, who, school).send(b);
  const makeClass = async (levelName: string) => {
    const level = ((await call('get', '/academics/levels').expect(200)).body.items as Array<{ id: string; name: string }>).find((l) => l.name === levelName);
    return (await call('post', '/academics/classes').send({ gradeLevelId: level!.id, section: `T${uniq()}`.slice(0, 6), capacity: 40 }).expect(201)).body as { id: string; name: string };
  };
  const makeStaff = async (first: string) => (await call('post', '/staff', hr()).send({ firstName: first, lastName: 'Teach' }).expect(201)).body as { id: string };
  const makeSubject = async () => (await call('post', '/academics/subjects').send({ name: `Sub ${uniq()}`, code: uniq().toUpperCase() }).expect(201)).body as { id: string };

  beforeAll(async () => {
    const y = (await call('post', '/academics/years').send({ name: `TT-${uniq()}`, startDate: '2090-04-01', endDate: '2091-03-31' }).expect(201)).body;
    await call('post', `/academics/years/${y.id}/activate`).send({}).expect(200);
    const mk = async (label: string, startTime: string, endTime: string, isBreak = false) => (await call('post', '/academics/periods').send({ label, startTime, endTime, isBreak }).expect(201)).body.id as string;
    p1 = await mk('One', '08:00', '08:40'); p2 = await mk('Two', '08:40', '09:20'); brk = await mk('Break', '09:20', '09:40', true);
    [math, sci, art] = [(await makeSubject()).id, (await makeSubject()).id, (await makeSubject()).id];
    [t1, t2] = [(await makeStaff('Asha')).id, (await makeStaff('Bilal')).id];
    for (const [s, sub] of [[t1, math], [t1, sci], [t2, sci], [t2, art]] as const) await call('post', `/academics/teachers/${s}/subjects`).send({ subjectId: sub }).expect(201);
    const yb = (await call('post', '/academics/years', w!.roles.B.ACADEMIC_ADMIN, B()).send({ name: `TB-${uniq()}`, startDate: '2090-04-01', endDate: '2091-03-31' }).expect(201)).body;
    await call('post', `/academics/years/${yb.id}/activate`, w!.roles.B.ACADEMIC_ADMIN, B()).send({}).expect(200);
    [c1, c2] = [(await makeClass('1')).id, (await makeClass('1')).id];
  });

  it('places a lesson, shows it on the class and the teacher, replaces it, and clears it; each change is audited', async () => {
    const put = (await slot(c1, { day: 'MON', periodId: p1, subjectId: math, staffId: t1 }).expect(200)).body;
    expect(put.entries).toHaveLength(1);
    expect(put.entries[0]).toMatchObject({ day: 'MON', periodId: p1, subject: { id: math }, staff: { id: t1 } });
    const staffView = (await call('get', `/academics/timetable/teachers/${t1}`).expect(200)).body;
    expect(staffView.entries).toEqual([expect.objectContaining({ day: 'MON', periodId: p1, class: expect.objectContaining({ id: c1 }), subject: expect.objectContaining({ id: math }) })]);
    // the same slot again with another subject replaces it (no second row)
    const replaced = (await slot(c1, { day: 'MON', periodId: p1, subjectId: sci, staffId: t1 }).expect(200)).body;
    expect(replaced.entries).toHaveLength(1);
    expect(replaced.entries[0].subject.id).toBe(sci);
    const id = replaced.entries[0].id as string;
    await call('delete', `/academics/timetable/entries/${id}`).expect(204);
    await call('delete', `/academics/timetable/entries/${id}`).expect(404);
    expect((await call('get', `/academics/timetable/classes/${c1}`).expect(200)).body.entries).toEqual([]);
    expect((await audit('academic.timetable.set')).length).toBeGreaterThanOrEqual(2);
    expect((await audit('academic.timetable.clear')).length).toBeGreaterThanOrEqual(1);
  });

  it('refuses a clash with the rule named: a class twice in a slot, a teacher in two classes in a slot', async () => {
    await slot(c1, { day: 'TUE', periodId: p1, subjectId: math, staffId: t1 }).expect(200);
    // teacher t1 is already with c1 on TUE period one
    const teacherBusy = await slot(c2, { day: 'TUE', periodId: p1, subjectId: sci, staffId: t1 }).expect(409);
    expect(teacherBusy.body.error.details).toEqual([{ field: 'staffId', rule: 'teacherBusy' }]);
    // another teacher for c2 in the same slot is fine; then a third lesson for c2 is also placed elsewhere
    await slot(c2, { day: 'TUE', periodId: p1, subjectId: art, staffId: t2 }).expect(200);
    // a class cannot get a second lesson by being given to a different teacher... that replaces; but a teacher who is busy elsewhere is refused
    const swap = await slot(c1, { day: 'TUE', periodId: p1, subjectId: sci, staffId: t2 }).expect(409);
    expect(swap.body.error.details).toEqual([{ field: 'staffId', rule: 'teacherBusy' }]);
    // the same teacher in a different period and day is fine
    await slot(c2, { day: 'TUE', periodId: p2, subjectId: sci, staffId: t1 }).expect(200);
    await slot(c2, { day: 'WED', periodId: p1, subjectId: sci, staffId: t1 }).expect(200);
    const load = (await call('get', '/academics/timetable/load').expect(200)).body.items as Array<{ staff: { id: string }; total: number; byDay: Record<string, number> }>;
    expect(load.find((l) => l.staff.id === t1)).toMatchObject({ total: 3, byDay: { TUE: 2, WED: 1, MON: 0 } });
    expect(load.find((l) => l.staff.id === t2)).toMatchObject({ total: 1 });
  });

  it('E-ACAD-1: two requests at the same instant for one slot cannot both succeed', async () => {
    const ca = (await makeClass('2')).id, cb = (await makeClass('2')).id;
    const results = await Promise.all([
      slot(ca, { day: 'THU', periodId: p1, subjectId: sci, staffId: t2 }),
      slot(cb, { day: 'THU', periodId: p1, subjectId: sci, staffId: t2 }),
    ]);
    expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([200, 409]);
    const load = (await call('get', `/academics/timetable/teachers/${t2}`).expect(200)).body.entries as Array<{ day: string; periodId: string }>;
    expect(load.filter((e) => e.day === 'THU' && e.periodId === p1)).toHaveLength(1);
    // the same race for one class and two teachers
    const cc = (await makeClass('2')).id;
    const racers = await Promise.all([
      slot(cc, { day: 'FRI', periodId: p2, subjectId: math, staffId: t1 }),
      slot(cc, { day: 'FRI', periodId: p2, subjectId: sci, staffId: t2 }),
    ]);
    expect(racers.every((r) => r.status === 200 || r.status === 409)).toBe(true);
    expect((await call('get', `/academics/timetable/classes/${cc}`).expect(200)).body.entries.filter((e: { day: string; periodId: string }) => e.day === 'FRI' && e.periodId === p2)).toHaveLength(1);
  });

  it('refuses what cannot be taught: a day the school does not work, a break, a subject the teacher does not teach, strangers', async () => {
    const bad = async (b: object, status: number, rule?: string) => {
      const r = await slot(c2, { day: 'MON', periodId: p2, subjectId: sci, staffId: t2, ...b });
      expect(r.status, JSON.stringify(b)).toBe(status);
      if (rule) expect(r.body.error.details[0].rule).toBe(rule);
    };
    await bad({ day: 'SUN' }, 400, 'notAWorkingDay');
    await bad({ periodId: brk }, 400);
    await bad({ subjectId: math }, 400, 'teacherDoesNotTeachSubject'); // t2 does not teach math
    await bad({ periodId: randomUUID() }, 400);
    await bad({ staffId: randomUUID() }, 400);
    await bad({ day: 'monday' }, 400);
    await bad({ extra: 1 }, 400);
    await slot(randomUUID(), { day: 'MON', periodId: p2, subjectId: sci, staffId: t2 }).expect(400); // no such class
    // another school's class, period or staff do not exist for school B's administrator
    await slot(c2, { day: 'MON', periodId: p2, subjectId: sci, staffId: t2 }, w!.roles.B.ACADEMIC_ADMIN, B()).expect(400);
  });

  it('a period in use cannot be deleted or turned into a break; once its lessons are cleared it can', async () => {
    const extra = (await call('post', '/academics/periods').send({ label: 'Three', startTime: '10:00', endTime: '10:40' }).expect(201)).body.id as string;
    const cd = (await makeClass('3')).id;
    const entry = (await slot(cd, { day: 'MON', periodId: extra, subjectId: art, staffId: t2 }).expect(200)).body.entries[0].id as string;
    expect((await call('delete', `/academics/periods/${extra}`).expect(409)).body.error.details).toEqual([{ field: 'id', rule: 'periodInUse' }]);
    expect((await call('patch', `/academics/periods/${extra}`).send({ isBreak: true }).expect(409)).body.error.details).toEqual([{ field: 'isBreak', rule: 'periodInUse' }]);
    await call('patch', `/academics/periods/${extra}`).send({ endTime: '10:30' }).expect(200); // moving the clock is fine
    await call('delete', `/academics/timetable/entries/${entry}`).expect(204);
    await call('delete', `/academics/periods/${extra}`).expect(204);
  });

  it('OWN scope: a teacher sees the classes in their own timetable, their own week, and nobody else\'s', async () => {
    const teacher = w!.roles.A.TEACHER;
    const staff = await makeStaff('Tara');
    await call('put', `/staff/${staff.id}/account`, hr()).send({ userId: teacher.uid }).expect(200);
    const mine = await makeClass('4'), other = await makeClass('4');
    await call('post', `/academics/teachers/${staff.id}/subjects`).send({ subjectId: art }).expect(201);
    expect((await call('get', '/academics/timetable/mine', teacher).expect(200)).body.entries).toEqual([]);
    await slot(mine.id, { day: 'MON', periodId: p2, subjectId: art, staffId: staff.id }).expect(200);
    await slot(other.id, { day: 'MON', periodId: p1, subjectId: art, staffId: t2 }).expect(200);
    const week = (await call('get', '/academics/timetable/mine', teacher).expect(200)).body;
    expect(week.staffId).toBe(staff.id);
    expect(week.entries.map((e: { class: { id: string } }) => e.class.id)).toEqual([mine.id]);
    expect((await call('get', '/academics/classes', teacher).expect(200)).body.items.map((c: { id: string }) => c.id)).toEqual([mine.id]);
    await call('get', `/academics/timetable/classes/${mine.id}`, teacher).expect(200);
    await call('get', `/academics/timetable/classes/${other.id}`, teacher).expect(404);
    await call('get', `/academics/timetable/teachers/${staff.id}`, teacher).expect(200);
    await call('get', `/academics/timetable/teachers/${t2}`, teacher).expect(404);
    await call('get', '/academics/timetable/load', teacher).expect(404);
    await slot(mine.id, { day: 'TUE', periodId: p2, subjectId: art, staffId: staff.id }, teacher).expect(403);
  });

  it('LINKED scope: a parent sees the timetable of the class their child is in, and no other', async () => {
    const parent = w!.roles.A.PARENT;
    const cp = await makeClass('5'), cq = await makeClass('5');
    await slot(cp.id, { day: 'MON', periodId: p1, subjectId: math, staffId: t1 }).expect(409).catch(() => undefined); // t1 may be busy; the class is what matters
    await slot(cp.id, { day: 'SAT', periodId: p1, subjectId: art, staffId: t2 }).expect(200);
    const kid = (await call('post', '/students').send({ firstName: 'Kid', lastName: `K${uniq()}`, classroomId: cp.id }).expect(201)).body as { id: string };
    await call('get', `/academics/timetable/classes/${cp.id}`, parent).expect(404); // not linked yet
    await call('post', `/students/${kid.id}/parent-accounts`).send({ userId: parent.uid, relationship: 'MOTHER' }).expect(201);
    expect((await call('get', `/academics/timetable/classes/${cp.id}`, parent).expect(200)).body.entries.length).toBeGreaterThan(0);
    await call('get', `/academics/timetable/classes/${cq.id}`, parent).expect(404);
    await call('get', '/academics/timetable/load', parent).expect(404);
    expect((await call('get', '/academics/timetable/mine', parent).expect(200)).body.entries).toEqual([]);
  });

  it('who may do what, and another school sees none of it', async () => {
    const r = w!.roles.A;
    for (const who of [r.PRINCIPAL, r.ADMISSIONS_OFFICER, r.ACADEMIC_ADMIN]) await call('get', `/academics/timetable/classes/${c1}`, who).expect(200);
    for (const who of [r.BURSAR, r.ACCOUNTANT, r.HR_MANAGER, r.MANAGEMENT]) await call('get', `/academics/timetable/classes/${c1}`, who).expect(403);
    for (const who of [r.PRINCIPAL, r.ADMISSIONS_OFFICER, r.BURSAR]) await slot(c1, { day: 'MON', periodId: p1, subjectId: math, staffId: t1 }, who).expect(403);
    expect((await call('get', `/academics/timetable/classes/${c1}`, w!.roles.B.ACADEMIC_ADMIN, B()).expect(200)).body.entries).toEqual([]);
    await call('delete', `/academics/timetable/entries/${randomUUID()}`, w!.roles.B.ACADEMIC_ADMIN, B()).expect(404);
  });
});
