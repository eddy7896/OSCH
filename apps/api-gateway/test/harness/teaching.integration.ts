// P3-2 against the REAL stack: teachers' subjects, class teachers, parent links, and what the own and linked scopes resolve to.
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

describe.skipIf(!ready)('teachers, class teachers, parent links and scopes against the real emulators (P3-2)', { timeout: 120_000 }, () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const B = () => w!.schools.B;
  const acad = () => w!.roles.A.ACADEMIC_ADMIN;
  const hr = () => w!.roles.A.HR_MANAGER;
  const call = (method: 'get' | 'post' | 'put' | 'patch' | 'delete', path: string, who: Person = acad(), school = A()) =>
    agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const audit = async (school: string, action: string) => (await w!.db.listAuditLog({ schoolId: school.replaceAll('-', ''), limit: 500, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  const uniq = () => randomUUID().slice(0, 6);

  let yearId = '';
  const ensureYear = async () => {
    if (yearId) return yearId;
    const y = (await call('post', '/academics/years').send({ name: `TY-${uniq()}`, startDate: '2090-04-01', endDate: '2091-03-31' }).expect(201)).body;
    await call('post', `/academics/years/${y.id}/activate`).send({}).expect(200);
    return (yearId = y.id);
  };
  const makeClass = async (levelName: string, who: Person = acad(), school = A()) => {
    const level = ((await call('get', '/academics/levels', who, school).expect(200)).body.items as Array<{ id: string; name: string }>).find((l) => l.name === levelName);
    return (await call('post', '/academics/classes', who, school).send({ gradeLevelId: level!.id, section: `T${uniq()}`.slice(0, 6), capacity: 40 }).expect(201)).body as { id: string; name: string };
  };
  const makeStaff = async (first = `T${uniq()}`) => (await call('post', '/staff', hr()).send({ firstName: first, lastName: 'Teach' }).expect(201)).body as { id: string; employeeId: string };
  const makeSubject = async () => (await call('post', '/academics/subjects').send({ name: `Sub ${uniq()}`, code: uniq().toUpperCase() }).expect(201)).body as { id: string; name: string; code: string };

  it('subjects a person teaches: add, list, a repeat is refused, remove; only active staff and subjects of this school', async () => {
    const staff = await makeStaff('Sunita'), math = await makeSubject(), sci = await makeSubject();
    const added = (await call('post', `/academics/teachers/${staff.id}/subjects`).send({ subjectId: math.id }).expect(201)).body;
    expect(added).toMatchObject({ staff: { id: staff.id, hasAccount: false }, subjects: [{ id: math.id, code: math.code }], classes: [] });
    await call('post', `/academics/teachers/${staff.id}/subjects`).send({ subjectId: math.id }).expect(409);
    await call('post', `/academics/teachers/${staff.id}/subjects`).send({ subjectId: sci.id }).expect(201);
    const list = (await call('get', '/academics/teachers').expect(200)).body.items as Array<{ staff: { id: string }; subjects: unknown[] }>;
    expect(list.find((t) => t.staff.id === staff.id)!.subjects).toHaveLength(2);
    await call('delete', `/academics/teachers/${staff.id}/subjects/${math.id}`).expect(204);
    await call('delete', `/academics/teachers/${staff.id}/subjects/${math.id}`).expect(404);
    expect((await call('get', '/academics/teachers').expect(200)).body.items.find((t: { staff: { id: string } }) => t.staff.id === staff.id).subjects).toHaveLength(1);
    // bad references
    await call('post', `/academics/teachers/${randomUUID()}/subjects`).send({ subjectId: sci.id }).expect(400); // no such member of staff
    await call('post', `/academics/teachers/${staff.id}/subjects`).send({ subjectId: randomUUID() }).expect(400); // no such subject
    await call('patch', `/staff/${staff.id}`, hr()).send({ status: 'LEFT' }).expect(200);
    await call('delete', `/academics/teachers/${staff.id}/subjects/${sci.id}`).expect(204);
    await call('post', `/academics/teachers/${staff.id}/subjects`).send({ subjectId: math.id }).expect(400); // a member of staff who has left cannot be given subjects
    expect((await audit(A(), 'academic.teachersubject.add')).length).toBeGreaterThanOrEqual(2);
    expect((await audit(A(), 'academic.teachersubject.remove')).length).toBeGreaterThanOrEqual(2);
    // a person who has left is not listed as a teacher
    expect((await call('get', '/academics/teachers').expect(200)).body.items.some((t: { staff: { id: string } }) => t.staff.id === staff.id)).toBe(false);
  });

  it('a class has one class teacher per year: set, change, remove; the year is the active one unless named', async () => {
    await ensureYear();
    const klass = await makeClass('1');
    const t1 = await makeStaff('Asha'), t2 = await makeStaff('Bilal');
    const set1 = (await call('put', `/academics/classes/${klass.id}/teacher`).send({ staffId: t1.id }).expect(200)).body;
    expect(set1).toMatchObject({ class: { id: klass.id }, staff: { id: t1.id } });
    const set2 = (await call('put', `/academics/classes/${klass.id}/teacher`).send({ staffId: t2.id }).expect(200)).body; // change, not a second row
    expect(set2.staff.id).toBe(t2.id);
    const teachers = (await call('get', '/academics/teachers').expect(200)).body.items as Array<{ staff: { id: string }; classes: Array<{ id: string }> }>;
    expect(teachers.find((t) => t.staff.id === t2.id)!.classes.map((c) => c.id)).toEqual([klass.id]);
    expect(teachers.find((t) => t.staff.id === t1.id)).toBeUndefined(); // no subject, no class: not a teacher yet
    await call('delete', `/academics/classes/${klass.id}/teacher`).expect(204);
    await call('delete', `/academics/classes/${klass.id}/teacher`).expect(404);
    await call('put', `/academics/classes/${klass.id}/teacher`).send({}).expect(400);
    await call('put', `/academics/classes/${klass.id}/teacher`).send({ staffId: 'nope' }).expect(400);
    await call('put', `/academics/classes/${randomUUID()}/teacher`).send({ staffId: t1.id }).expect(400); // no such class
    expect((await audit(A(), 'academic.classteacher.set')).length).toBeGreaterThanOrEqual(2);
  });

  it('OWN scope: a teacher sees only the classes they are class teacher of, through the staff record linked to their account', async () => {
    await ensureYear();
    const teacher = w!.roles.A.TEACHER;
    const mine = makeClass('2'), other = makeClass('3');
    const [c2, c3] = [await mine, await other];
    // before any link: nothing is theirs
    expect((await call('get', '/academics/classes', teacher).expect(200)).body.items).toEqual([]);
    expect((await call('get', '/academics/levels', teacher).expect(200)).body.items).toEqual([]);
    expect((await call('get', '/academics/mine', teacher).expect(200)).body).toEqual({ staff: null, subjects: [], classes: [], classTeacherOf: [], children: [] });
    // HR makes the staff record, the System admin... links the teacher's account to it, the Academic admin names them class teacher and gives a subject
    const staff = await makeStaff('Tara');
    await call('put', `/staff/${staff.id}/account`, hr()).send({ userId: teacher.uid }).expect(200);
    expect((await call('get', '/academics/classes', teacher).expect(200)).body.items).toEqual([]); // linked, but no class yet
    await call('put', `/academics/classes/${c2.id}/teacher`).send({ staffId: staff.id }).expect(200);
    const sub = await makeSubject();
    await call('post', `/academics/teachers/${staff.id}/subjects`).send({ subjectId: sub.id }).expect(201);
    const classes = (await call('get', '/academics/classes', teacher).expect(200)).body.items as Array<{ id: string }>;
    expect(classes.map((c) => c.id)).toEqual([c2.id]);
    expect(classes.some((c) => c.id === c3.id)).toBe(false);
    const levels = (await call('get', '/academics/levels', teacher).expect(200)).body.items as Array<{ name: string; classes: Array<{ id: string }> }>;
    expect(levels.map((l) => l.name)).toEqual(['2']);
    expect(levels[0]!.classes.map((c) => c.id)).toEqual([c2.id]);
    const me = (await call('get', '/academics/mine', teacher).expect(200)).body;
    expect(me.staff).toMatchObject({ id: staff.id }); expect(me.subjects.map((s: { id: string }) => s.id)).toEqual([sub.id]); expect(me.classes.map((c: { id: string }) => c.id)).toEqual([c2.id]);
    expect(me.classTeacherOf.map((c: { id: string }) => c.id)).toEqual([c2.id]); // class teacher: the only class whose daily attendance she takes
    // the school-wide view is unchanged for the Academic admin
    expect(((await call('get', '/academics/classes').expect(200)).body.items as unknown[]).length).toBeGreaterThan(2);
    // a teacher cannot see the school's teachers, or change anything
    await call('get', '/academics/teachers', teacher).expect(404);
    await call('post', `/academics/teachers/${staff.id}/subjects`, teacher).send({ subjectId: sub.id }).expect(403);
    await call('put', `/academics/classes/${c3.id}/teacher`, teacher).send({ staffId: staff.id }).expect(403);
  });

  it('LINKED scope: a parent sees the classes of the children linked to their account, and only those', async () => {
    await ensureYear();
    const parent = w!.roles.A.PARENT;
    const c4 = await makeClass('4'), c5 = await makeClass('5');
    const kid = (await call('post', '/students').send({ firstName: 'Kid', lastName: `K${uniq()}`, classroomId: c4.id }).expect(201)).body as { id: string; enrollmentId: string };
    const stranger = (await call('post', '/students').send({ firstName: 'Other', lastName: `O${uniq()}`, classroomId: c5.id }).expect(201)).body as { id: string };
    expect((await call('get', '/academics/classes', parent).expect(200)).body.items).toEqual([]);
    expect((await call('get', '/academics/mine', parent).expect(200)).body.children).toEqual([]);
    const linked = (await call('post', `/students/${kid.id}/parent-accounts`).send({ userId: parent.uid, relationship: 'MOTHER' }).expect(201)).body;
    expect(linked.items).toHaveLength(1);
    expect(linked.items[0]).toMatchObject({ relationship: 'MOTHER', user: { id: parent.uid } });
    await call('post', `/students/${kid.id}/parent-accounts`).send({ userId: parent.uid, relationship: 'FATHER' }).expect(409);
    expect((await call('get', '/academics/classes', parent).expect(200)).body.items.map((c: { id: string }) => c.id)).toEqual([c4.id]);
    const mine = (await call('get', '/academics/mine', parent).expect(200)).body;
    expect(mine.children).toEqual([{ id: kid.id, enrollmentId: kid.enrollmentId, name: expect.stringContaining('Kid'), relationship: 'MOTHER', class: { id: c4.id, name: c4.name } }]);
    expect(JSON.stringify(mine)).not.toContain(stranger.id); // another child of the school is invisible
    await call('delete', `/students/${kid.id}/parent-accounts/${linked.items[0].id}`).expect(204);
    expect((await call('get', '/academics/classes', parent).expect(200)).body.items).toEqual([]);
    await call('delete', `/students/${kid.id}/parent-accounts/${linked.items[0].id}`).expect(404);
    expect((await audit(A(), 'student.parent.link')).length).toBeGreaterThanOrEqual(1);
    expect((await audit(A(), 'student.parent.unlink')).length).toBeGreaterThanOrEqual(1);
  });

  it('only a real, active PARENT account of this school can be linked; a student of another school is not found', async () => {
    const kid = (await call('post', '/students').send({ firstName: 'Kid', lastName: `L${uniq()}` }).expect(201)).body as { id: string };
    for (const who of [w!.roles.A.TEACHER, w!.roles.A.BURSAR, w!.roles.B.PARENT, w!.outsider]) {
      expect((await call('post', `/students/${kid.id}/parent-accounts`).send({ userId: who.uid, relationship: 'MOTHER' })).status, who.email).toBe(400);
    }
    await call('post', `/students/${kid.id}/parent-accounts`).send({ userId: w!.roles.A.PARENT.uid, relationship: 'COUSIN' }).expect(400);
    const foreign = (await call('post', '/students', w!.roles.B.ACADEMIC_ADMIN, B()).send({ firstName: 'Foreign', lastName: 'Kid' }).expect(201)).body as { id: string };
    await call('post', `/students/${foreign.id}/parent-accounts`).send({ userId: w!.roles.A.PARENT.uid, relationship: 'MOTHER' }).expect(404);
    await call('get', `/students/${foreign.id}/parent-accounts`).expect(404);
  });

  it('who may do what, and another school sees none of it', async () => {
    const r = w!.roles.A;
    for (const who of [r.PRINCIPAL, r.ADMISSIONS_OFFICER, r.ACADEMIC_ADMIN]) await call('get', '/academics/teachers', who).expect(200);
    for (const who of [r.BURSAR, r.ACCOUNTANT, r.HR_MANAGER, r.MANAGEMENT]) await call('get', '/academics/teachers', who).expect(403);
    for (const who of [r.PRINCIPAL, r.ADMISSIONS_OFFICER, r.BURSAR]) await call('post', `/academics/teachers/${randomUUID()}/subjects`, who).send({ subjectId: randomUUID() }).expect(403);
    const theirs = (await call('get', '/academics/teachers', w!.roles.B.ACADEMIC_ADMIN, B()).expect(200)).body.items;
    expect(theirs).toEqual([]);
    const staff = await makeStaff('Cross');
    const sub = await makeSubject();
    await call('post', `/academics/teachers/${staff.id}/subjects`, w!.roles.B.ACADEMIC_ADMIN, B()).send({ subjectId: sub.id }).expect(400); // A's staff member and subject do not exist for B
    await call('get', '/academics/mine', w!.roles.B.ACADEMIC_ADMIN, A()).expect(403);
  });
});
