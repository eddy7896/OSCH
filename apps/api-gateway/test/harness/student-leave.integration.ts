// P5-10 against the REAL stack: a parent asks leave for their child; the class teacher or the Academic admin decides; approval shows as Leave in the class roster (ADR-0016).
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

interface Leave { id: string; student: { id: string; name: string; className: string | null }; startDate: string; endDate: string; half: string | null; reason: string; status: string; decision: { at: string | null; by: string | null; note: string | null } | null }
const lastMonday = (): string => { const d = new Date(Date.now() + 330 * 60_000); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
const today = () => new Date().toISOString().slice(0, 10);
const plus = (n: number) => new Date(Date.parse(`${today()}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

describe.skipIf(!ready)('student leave against the real emulators (P5-10)', { timeout: 240_000 }, () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const B = () => w!.schools.B;
  const acad = () => w!.roles.A.ACADEMIC_ADMIN;
  const teacher = () => w!.roles.A.TEACHER;
  const parent = () => w!.roles.A.PARENT;
  const hr = () => w!.roles.A.HR_MANAGER;
  const call = (method: 'get' | 'post' | 'put' | 'patch' | 'delete', path: string, who: Person = acad(), school = A()) => agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const audit = async (action: string) => (await w!.db.listAuditLog({ schoolId: A().replaceAll('-', ''), limit: 800, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  const uniq = () => randomUUID().slice(0, 6);
  const ask = (studentId: string, over: Record<string, unknown> = {}, who: Person = parent()) => call('post', '/student-leave', who).send({ studentId, clientId: `c-${uniq()}`, startDate: plus(10), endDate: plus(11), reason: 'Family wedding', ...over });
  const notices = async (who: Person, kind: string) => ((await call('get', '/notifications', who).expect(200)).body.items as Array<{ kind: string; title: string; body: string }>).filter((n) => n.kind === kind);

  let cA = '', cB = '';
  let kid = '', kidB = '', other = '';

  const makeClass = async () => {
    const level = ((await call('get', '/academics/levels').expect(200)).body.items as Array<{ id: string; name: string }>).find((l) => l.name === '1');
    return (await call('post', '/academics/classes').send({ gradeLevelId: level!.id, section: `S${uniq()}`.slice(0, 6), capacity: 40 }).expect(201)).body as { id: string };
  };
  const makeStudent = async (classroomId: string, first: string) => (await call('post', '/students').send({ firstName: first, lastName: `L${uniq()}`, classroomId }).expect(201)).body as { id: string };

  beforeAll(async () => {
    const y = (await call('post', '/academics/years').send({ name: `SL-${uniq()}`, startDate: '2090-04-01', endDate: '2091-03-31' }).expect(201)).body;
    await call('post', `/academics/years/${y.id}/activate`).send({}).expect(200);
    cA = (await makeClass()).id;
    cB = (await makeClass()).id; // a class nobody is class teacher of
    kid = (await makeStudent(cA, 'Asha')).id;
    other = (await makeStudent(cA, 'Bilal')).id; // another family's child
    kidB = (await makeStudent(cB, 'Dev')).id;
    const staffT = ((await call('post', '/staff', hr()).send({ firstName: 'Tara', lastName: 'Teach' }).expect(201)).body as { id: string }).id;
    await call('put', `/staff/${staffT}/account`, hr()).send({ userId: teacher().uid }).expect(200);
    await call('put', `/academics/classes/${cA}/teacher`).send({ staffId: staffT }).expect(200);
    await call('post', `/students/${kid}/parent-accounts`).send({ userId: parent().uid, relationship: 'MOTHER' }).expect(201);
    await call('post', `/students/${kidB}/parent-accounts`).send({ userId: parent().uid, relationship: 'MOTHER' }).expect(201);
  }, 120_000);

  it('only a parent asks, only for a linked child; sending the same clientId again is the same request; the class teacher is told, the parent is not', async () => {
    const clientId = `c-${uniq()}`;
    const made = (await ask(kid, { clientId, reason: '  Family wedding  ' }).expect(201)).body as Leave;
    expect(made).toMatchObject({ status: 'PENDING', reason: 'Family wedding', half: null, student: { id: kid, className: expect.any(String) } });
    const again = (await ask(kid, { clientId }).expect(201)).body as Leave;
    expect(again.id).toBe(made.id);
    expect((await call('get', '/student-leave', parent()).expect(200)).body.items.filter((i: Leave) => i.id === made.id)).toHaveLength(1);
    await ask(other).expect(404); // another family's child is "not found"
    await ask(randomUUID()).expect(404);
    for (const p of [acad(), teacher(), hr(), w!.roles.A.PRINCIPAL]) expect([403, 404], 'create').toContain((await ask(kid, {}, p)).status);
    const told = await notices(teacher(), 'studentleave.requested');
    expect(told.some((n) => n.title === 'Leave asked for a student' && n.body.includes('Asha'))).toBe(true);
    expect(await notices(parent(), 'studentleave.requested')).toEqual([]);
    expect((await audit('studentleave.request')).length).toBeGreaterThan(0);
  });

  it('input is checked: dates, length, a half day only for one day, the reason, the client id, and no extra fields', async () => {
    const bad: Array<[string, Record<string, unknown>]> = [
      ['notADate', { startDate: '2026-02-30', endDate: '2026-03-01' }], ['beforeStart', { startDate: plus(5), endDate: plus(4) }], ['tooLong', { startDate: plus(1), endDate: plus(70) }],
      ['tooFarBack', { startDate: plus(-20), endDate: plus(-19) }], ['tooFarAhead', { startDate: plus(400), endDate: plus(401) }], ['singleDayOnly', { startDate: plus(30), endDate: plus(31), half: 'MORNING' }],
    ];
    for (const [rule, over] of bad) expect((await ask(kid, over).expect(400)).body.error.details[0].rule, rule).toBe(rule);
    for (const over of [{ reason: '' }, { reason: 'x'.repeat(301) }, { clientId: 'bad id!' }, { half: 'NOON' }, { startDate: 'tomorrow' }, { extra: 1 }, { schoolId: A() }]) await ask(kid, { startDate: plus(40), endDate: plus(40), ...over }).expect(400);
    expect((await ask(kid, { startDate: plus(41), endDate: plus(41), half: 'AFTERNOON' }).expect(201)).body.half).toBe('AFTERNOON');
  });

  it('two requests for the same child cannot overlap while one is waiting or approved; a cancelled one frees the days', async () => {
    const first = (await ask(kid, { startDate: plus(60), endDate: plus(62) }).expect(201)).body as Leave;
    expect((await ask(kid, { startDate: plus(62), endDate: plus(63) }).expect(409)).body.error.details[0].rule).toBe('overlapsAnotherRequest');
    await ask(kid, { startDate: plus(63), endDate: plus(64) }).expect(201);
    await call('post', `/student-leave/${first.id}/cancel`, parent()).expect(200);
    await ask(kid, { startDate: plus(61), endDate: plus(61) }).expect(201);
  });

  it('who sees what: a parent their own children\'s, the class teacher their class\'s, the Academic admin and the Principal all; others nothing', async () => {
    const mineA = (await ask(kid, { startDate: plus(80), endDate: plus(80) }).expect(201)).body as Leave;
    const mineB = (await ask(kidB, { startDate: plus(80), endDate: plus(80) }).expect(201)).body as Leave;
    const ids = async (p: Person) => ((await call('get', '/student-leave', p).expect(200)).body.items as Leave[]).map((i) => i.id);
    expect(await ids(parent())).toEqual(expect.arrayContaining([mineA.id, mineB.id]));
    const t = await ids(teacher());
    expect(t).toContain(mineA.id);
    expect(t).not.toContain(mineB.id); // nobody is class teacher of that class
    expect(await ids(acad())).toEqual(expect.arrayContaining([mineA.id, mineB.id]));
    expect(await ids(w!.roles.A.PRINCIPAL)).toEqual(expect.arrayContaining([mineA.id, mineB.id]));
    await call('get', `/student-leave/${mineB.id}`, teacher()).expect(404);
    await call('get', `/student-leave/${mineA.id}`, teacher()).expect(200);
    await call('get', `/student-leave/${randomUUID()}`, acad()).expect(404);
    await call('get', '/student-leave/not-an-id', acad()).expect(400);
    for (const p of [hr(), w!.roles.A.BURSAR, w!.roles.A.ACCOUNTANT]) expect([403, 404]).toContain((await call('get', '/student-leave', p)).status);
    expect(((await call('get', '/student-leave?status=APPROVED', parent()).expect(200)).body.items as Leave[]).every((i) => i.status === 'APPROVED')).toBe(true);
    await call('get', '/student-leave?status=NOPE', parent()).expect(400);
  });

  it('the class teacher or the Academic admin decides; the first decision stands; the parent is told in words', async () => {
    const r = (await ask(kid, { startDate: plus(100), endDate: plus(101) }).expect(201)).body as Leave;
    for (const p of [parent(), hr(), w!.roles.A.PRINCIPAL, w!.roles.A.BURSAR]) expect([403, 404], 'decide').toContain((await call('post', `/student-leave/${r.id}/approve`, p).send({})).status);
    const done = (await call('post', `/student-leave/${r.id}/approve`, teacher()).send({}).expect(200)).body as Leave;
    expect(done).toMatchObject({ status: 'APPROVED', decision: { by: expect.any(String), at: expect.any(String), note: null } });
    expect(((await call('post', `/student-leave/${r.id}/approve`, acad()).send({}).expect(200)).body as Leave).status).toBe('APPROVED'); // the same decision again: the same answer
    expect((await call('post', `/student-leave/${r.id}/decline`, acad()).send({ note: 'No' }).expect(409)).body.error.details[0].rule).toBe('alreadyDecided');
    expect((await call('post', `/student-leave/${r.id}/cancel`, parent()).expect(409)).body.error.details[0].rule).toBe('alreadyDecided');
    const approved = await notices(parent(), 'studentleave.approved');
    expect(approved.some((n) => n.title === 'Leave approved' && n.body.includes('Asha'))).toBe(true);

    const d = (await ask(kid, { startDate: plus(110), endDate: plus(110) }).expect(201)).body as Leave;
    const declined = (await call('post', `/student-leave/${d.id}/decline`, acad()).send({ note: 'Exam week' }).expect(200)).body as Leave;
    expect(declined).toMatchObject({ status: 'DECLINED', decision: { note: 'Exam week' } });
    expect((await notices(parent(), 'studentleave.declined')).some((n) => n.title === 'Leave not approved' && n.body.includes('Exam week'))).toBe(true);
    // a class nobody is class teacher of: only the Academic admin decides; the teacher of another class gets "not found"
    const b = (await ask(kidB, { startDate: plus(120), endDate: plus(120) }).expect(201)).body as Leave;
    await call('post', `/student-leave/${b.id}/approve`, teacher()).send({}).expect(404);
    await call('post', `/student-leave/${b.id}/approve`, acad()).send({}).expect(200);
    await call('post', `/student-leave/${randomUUID()}/approve`, acad()).send({}).expect(404);
    await call('post', `/student-leave/${d.id}/approve`, acad()).send({ extra: 1 }).expect(400);
    expect((await audit('studentleave.decide')).length).toBeGreaterThanOrEqual(3);
  });

  it('a parent cancels a waiting request (and only their own); nobody decides a cancelled one', async () => {
    const r = (await ask(kid, { startDate: plus(130), endDate: plus(130) }).expect(201)).body as Leave;
    await call('post', `/student-leave/${r.id}/cancel`, teacher()).expect(404);
    await call('post', `/student-leave/${r.id}/cancel`, acad()).expect(404);
    expect(((await call('post', `/student-leave/${r.id}/cancel`, parent()).expect(200)).body as Leave).status).toBe('CANCELLED');
    expect(((await call('post', `/student-leave/${r.id}/cancel`, parent()).expect(200)).body as Leave).status).toBe('CANCELLED');
    expect((await call('post', `/student-leave/${r.id}/approve`, acad()).send({}).expect(409)).body.error.details[0].rule).toBe('cancelled');
    expect((await audit('studentleave.cancel')).length).toBeGreaterThan(0);
  });

  it('approved leave starts the child as Leave (HALF_DAY for half a day) in the class roster until the day is taken; a taken day, a waiting, a declined and a cancelled request change nothing', async () => {
    const day = plus(140);
    const roster = async (d: string) => ((await call('get', `/attendance/classes/${cA}/days/${d}`).expect(200)).body.students as Array<{ id: string; status: string }>).map((s) => [s.id, s.status]);
    const waiting = (await ask(kid, { startDate: day, endDate: plus(141) }).expect(201)).body as Leave;
    expect(await roster(day)).toEqual([[kid, 'PRESENT'], [other, 'PRESENT']]);
    await call('post', `/student-leave/${waiting.id}/approve`, teacher()).send({}).expect(200);
    expect(await roster(day)).toEqual([[kid, 'LEAVE'], [other, 'PRESENT']]);
    expect((await roster(plus(141)))[0]).toEqual([kid, 'LEAVE']);
    expect((await roster(plus(142)))[0]).toEqual([kid, 'PRESENT']); // outside the dates
    const half = (await ask(kid, { startDate: plus(150), endDate: plus(150), half: 'MORNING' }).expect(201)).body as Leave;
    await call('post', `/student-leave/${half.id}/approve`, acad()).send({}).expect(200);
    expect((await roster(plus(150)))[0]).toEqual([kid, 'HALF_DAY']);
    const no = (await ask(kid, { startDate: plus(160), endDate: plus(160) }).expect(201)).body as Leave;
    await call('post', `/student-leave/${no.id}/decline`, acad()).send({}).expect(200);
    expect((await roster(plus(160)))[0]).toEqual([kid, 'PRESENT']);
    // a day already taken is never changed by a leave request
    const monday = lastMonday();
    await call('put', `/attendance/classes/${cA}/days/${monday}`, teacher()).send({ marks: [], submissionId: randomUUID() }).expect(200);
    if (monday >= plus(-7)) {
      const past = (await ask(kid, { startDate: monday, endDate: monday }).expect(201)).body as Leave;
      await call('post', `/student-leave/${past.id}/approve`, acad()).send({}).expect(200);
      const taken = (await call('get', `/attendance/classes/${cA}/days/${monday}`).expect(200)).body as { submitted: boolean; students: Array<{ id: string; status: string }> };
      expect(taken.submitted).toBe(true);
      expect(taken.students.find((s) => s.id === kid)!.status).toBe('PRESENT');
    }
  });

  it('another school sees none of it and cannot decide it; a parent of another school cannot ask for this school\'s child', async () => {
    const r = (await ask(kid, { startDate: plus(170), endDate: plus(170) }).expect(201)).body as Leave;
    const bAdmin = w!.roles.B.ACADEMIC_ADMIN;
    expect(((await call('get', '/student-leave', bAdmin, B()).expect(200)).body.items as Leave[]).some((i) => i.id === r.id)).toBe(false);
    await call('get', `/student-leave/${r.id}`, bAdmin, B()).expect(404);
    await call('post', `/student-leave/${r.id}/approve`, bAdmin, B()).send({}).expect(404);
    await call('post', '/student-leave', w!.roles.B.PARENT, B()).send({ studentId: kid, clientId: `c-${uniq()}`, startDate: plus(171), endDate: plus(171), reason: 'x' }).expect(404); // this school's child, named from the other school
    await ask(kid, { startDate: plus(172), endDate: plus(172) }, w!.roles.B.PARENT).expect(403); // and not a member here at all
  });
});
