// P5-3c against the REAL stack: one message to the parents of a whole class (ADR-0018): recipients worked out on the server, counts, one notice per parent, read marks, access.
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

interface B { id: string; title: string; body: string; class: { id: string; name: string }; sender: { userId: string; name: string }; students: Array<{ id: string; name: string }> | null; read: boolean | null; stats: { targetStudents: number; reachedStudents: number; unreachable: Array<{ id: string; name: string }>; parents: number; readBy: number } | null }

describe.skipIf(!ready)('class broadcast against the real emulators (P5-3c)', { timeout: 240_000 }, () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const acad = () => w!.roles.A.ACADEMIC_ADMIN;
  const teacher = () => w!.roles.A.TEACHER;
  const parent = () => w!.roles.A.PARENT;
  const hr = () => w!.roles.A.HR_MANAGER;
  const principal = () => w!.roles.A.PRINCIPAL;
  const call = (method: 'get' | 'post' | 'put', path: string, who: Person = acad(), school = A()) => agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const audit = async (action: string) => (await w!.db.listAuditLog({ schoolId: A().replaceAll('-', ''), limit: 800, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  const uniq = () => randomUUID().slice(0, 6);
  const notices = async (who: Person, kind: string) => ((await call('get', '/notifications', who).expect(200)).body.items as Array<{ kind: string; title: string; body: string }>).filter((n) => n.kind === kind);
  let cA = '', cB = '', asha = '', bilal = '', dev = '';

  const makeClass = async () => {
    const level = ((await call('get', '/academics/levels').expect(200)).body.items as Array<{ id: string; name: string }>).find((l) => l.name === '1');
    return (await call('post', '/academics/classes').send({ gradeLevelId: level!.id, section: `S${uniq()}`.slice(0, 6), capacity: 40 }).expect(201)).body as { id: string };
  };
  const student = async (name: string, classroomId: string) => ((await call('post', '/students').send({ firstName: name, lastName: `L${uniq()}`, classroomId }).expect(201)).body as { id: string }).id;
  const send = (who: Person, classId: string, title: string, body: string, clientId = `c-${uniq()}`) => call('post', '/broadcasts', who).send({ classId, clientId, title, body });

  beforeAll(async () => {
    const y = (await call('post', '/academics/years').send({ name: `BC-${uniq()}`, startDate: '2090-04-01', endDate: '2091-03-31' }).expect(201)).body;
    await call('post', `/academics/years/${y.id}/activate`).send({}).expect(200);
    cA = (await makeClass()).id;
    cB = (await makeClass()).id;
    const staffT = ((await call('post', '/staff', hr()).send({ firstName: 'Tara', lastName: 'Teach' }).expect(201)).body as { id: string }).id;
    await call('put', `/staff/${staffT}/account`, hr()).send({ userId: teacher().uid }).expect(200);
    await call('put', `/academics/classes/${cA}/teacher`).send({ staffId: staffT }).expect(200);
    asha = await student('Asha', cA);
    dev = await student('Dev', cA); // the same parent has two children in the class
    bilal = await student('Bilal', cA); // no parent account
    await call('post', `/students/${asha}/parent-accounts`).send({ userId: parent().uid, relationship: 'MOTHER' }).expect(201);
    await call('post', `/students/${dev}/parent-accounts`).send({ userId: parent().uid, relationship: 'MOTHER' }).expect(201);
    await student('Rohan', cB);
  }, 120_000);

  it('the class teacher sends to her class: the recipients are worked out on the server, a parent with two children is reached once, the child with no parent account is named', async () => {
    const r = (await send(teacher(), cA, 'Sports day', 'Sports day is on Friday. Please send a water bottle.', 'one-1').expect(201)).body as B;
    expect(r.stats).toMatchObject({ targetStudents: 3, reachedStudents: 2, parents: 1, readBy: 0 });
    expect(r.stats!.unreachable.map((u) => u.id)).toEqual([bilal]);
    expect(r.sender.userId).toBe(teacher().uid);
    const again = (await send(teacher(), cA, 'Sports day', 'Sports day is on Friday. Please send a water bottle.', 'one-1').expect(201)).body as B;
    expect(again.id).toBe(r.id);
    expect(again.stats).toMatchObject({ reachedStudents: 2, parents: 1 }); // a repeat adds nobody
    const told = await notices(parent(), 'broadcast.posted');
    expect(told.filter((n) => n.body.includes("class has a new message")).length).toBe(1); // once per parent, not once per child
    expect(JSON.stringify(told)).not.toMatch(/Sports|water|Asha|Dev/);
    expect((await audit('broadcast.send')).some((a) => JSON.stringify(a.details ?? '').includes('Sports day is on Friday'))).toBe(true);
  });

  it('the parent reads what was sent to their children\'s class, opens it once for both children, and the sender sees it was read', async () => {
    const sent = (await send(teacher(), cA, 'Holiday', 'School is closed on Monday.').expect(201)).body as B;
    const list = (await call('get', '/broadcasts', parent()).expect(200)).body.items as B[];
    const mine = list.find((x) => x.id === sent.id)!;
    expect(mine.students!.map((s) => s.id).sort()).toEqual([asha, dev].sort());
    expect(mine.read).toBe(false);
    expect((await call('get', `/broadcasts/${sent.id}`, parent()).expect(200)).body).toMatchObject({ title: 'Holiday', stats: null });
    await call('post', `/broadcasts/${sent.id}/read`, parent()).expect(204);
    expect(((await call('get', '/broadcasts', parent()).expect(200)).body.items as B[]).find((x) => x.id === sent.id)!.read).toBe(true);
    expect((await call('get', `/broadcasts/${sent.id}`, teacher()).expect(200)).body.stats).toMatchObject({ parents: 1, readBy: 1 });
  });

  it('who may send and who may see: only her own class; the Principal and the Academic admin any class; parents never send; nobody reads another family\'s class', async () => {
    await send(teacher(), cB, 'Not mine', 'x').expect(404); // not her class
    await send(parent(), cA, 'Hello', 'x').expect(403);
    await send(hr(), cA, 'Hello', 'x').expect(403);
    await send(acad(), cA, 'Hello', '').expect(400);
    const other = (await send(acad(), cB, 'For class B', 'Only for B').expect(201)).body as B;
    const byPrincipal = (await send(principal(), cA, 'From the Principal', 'Welcome back').expect(201)).body as B;
    expect(byPrincipal.stats!.reachedStudents).toBe(2);
    await call('get', `/broadcasts/${other.id}`, parent()).expect(404); // class B: none of their children
    await call('get', `/broadcasts/${other.id}`, teacher()).expect(404); // not hers, not sent by her
    expect(((await call('get', '/broadcasts', parent()).expect(200)).body.items as B[]).map((x) => x.id)).not.toContain(other.id);
    expect(((await call('get', '/broadcasts', teacher()).expect(200)).body.items as B[]).map((x) => x.id)).not.toContain(other.id);
    const all = ((await call('get', '/broadcasts', acad()).expect(200)).body.items as B[]).map((x) => x.id);
    expect(all).toEqual(expect.arrayContaining([other.id, byPrincipal.id]));
    await call('post', `/broadcasts/${other.id}/read`, parent()).expect(404);
    await call('get', `/broadcasts/${byPrincipal.id}`, w!.roles.B.PARENT, w!.schools.B).expect(404);
    await call('get', '/broadcasts', hr()).expect(403);
  });
});
