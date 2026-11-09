// P5-3b against the REAL stack: a private conversation per parent and teacher about one student (ADR-0018): who may talk to whom, delivery at any hour, hiding, reporting, audit.
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

interface Thread { id: string; student: { id: string; name: string }; other: { userId: string; kind: string; name: string }; lastMessageAt: string | null; unread: boolean; messages?: Array<{ id: string; mine: boolean; body: string | null; hidden: boolean; canHide: boolean }> }

describe.skipIf(!ready)('messaging against the real emulators (P5-3b)', { timeout: 240_000 }, () => {
  afterAll(async () => { vi.restoreAllMocks(); await app?.close(); });
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
  let cA = '', cB = '', kid = '', kidOther = '', kidInB = '';

  const makeClass = async () => {
    const level = ((await call('get', '/academics/levels').expect(200)).body.items as Array<{ id: string; name: string }>).find((l) => l.name === '1');
    return (await call('post', '/academics/classes').send({ gradeLevelId: level!.id, section: `S${uniq()}`.slice(0, 6), capacity: 40 }).expect(201)).body as { id: string };
  };
  const student = async (name: string, classroomId: string) => ((await call('post', '/students').send({ firstName: name, lastName: `L${uniq()}`, classroomId }).expect(201)).body as { id: string }).id;
  const start = async (who: Person, studentId: string, other: string) => (await call('post', '/messages/threads', who).send({ studentId, otherUserId: other }).expect(200)).body as Thread;
  const say = (thread: string, who: Person, body: string, clientId = `c-${uniq()}`) => call('post', `/messages/threads/${thread}/messages`, who).send({ clientId, body });
  const open = async (thread: string, who: Person) => (await call('get', `/messages/threads/${thread}`, who).expect(200)).body as Thread;

  beforeAll(async () => {
    const y = (await call('post', '/academics/years').send({ name: `MS-${uniq()}`, startDate: '2090-04-01', endDate: '2091-03-31' }).expect(201)).body;
    await call('post', `/academics/years/${y.id}/activate`).send({}).expect(200);
    cA = (await makeClass()).id;
    cB = (await makeClass()).id; // a class the teacher has nothing to do with
    const staffT = ((await call('post', '/staff', hr()).send({ firstName: 'Tara', lastName: 'Teach' }).expect(201)).body as { id: string }).id;
    await call('put', `/staff/${staffT}/account`, hr()).send({ userId: teacher().uid }).expect(200);
    await call('put', `/academics/classes/${cA}/teacher`).send({ staffId: staffT }).expect(200);
    kid = await student('Asha', cA);
    kidOther = await student('Bilal', cA); // not the parent's child
    kidInB = await student('Dev', cB);
    await call('post', `/students/${kid}/parent-accounts`).send({ userId: parent().uid, relationship: 'MOTHER' }).expect(201);
    await call('post', `/students/${kidInB}/parent-accounts`).send({ userId: parent().uid, relationship: 'MOTHER' }).expect(201);
  }, 120_000);

  it('contacts: a parent sees the class teacher of their child; a teacher sees the parents of a student in her class; nobody else\'s', async () => {
    const p = (await call('get', `/messages/contacts?studentId=${kid}`, parent()).expect(200)).body.items as Array<{ userId: string; label: string }>;
    expect(p.map((c) => c.userId)).toEqual([teacher().uid]);
    expect(p[0]!.label).toBe('CLASS_TEACHER');
    const tt = (await call('get', `/messages/contacts?studentId=${kid}`, teacher()).expect(200)).body.items as Array<{ userId: string; label: string }>;
    expect(tt.map((c) => c.userId)).toEqual([parent().uid]);
    expect(tt[0]!.label).toBe('MOTHER');
    await call('get', `/messages/contacts?studentId=${kidOther}`, parent()).expect(404); // not their child
    await call('get', `/messages/contacts?studentId=${kidInB}`, teacher()).expect(404); // not a class she teaches
    expect((await call('get', `/messages/contacts?studentId=${kidInB}`, parent()).expect(200)).body.items).toEqual([]); // her child's class has no teacher with an account
    await call('get', `/messages/contacts?studentId=${kid}`, hr()).expect(403);
  });

  it('starting a conversation: only with a real contact; starting twice, or from the other side, is the same conversation', async () => {
    await call('post', '/messages/threads', parent()).send({ studentId: kid, otherUserId: hr().uid }).expect(403); // not a teacher of the class
    await call('post', '/messages/threads', parent()).send({ studentId: kidOther, otherUserId: teacher().uid }).expect(404);
    await call('post', '/messages/threads', teacher()).send({ studentId: kidInB, otherUserId: parent().uid }).expect(404);
    const t1 = await start(parent(), kid, teacher().uid);
    expect(t1).toMatchObject({ student: { id: kid }, other: { userId: teacher().uid, kind: 'TEACHER' }, unread: false });
    const again = await start(parent(), kid, teacher().uid);
    const fromTeacher = await start(teacher(), kid, parent().uid);
    expect(again.id).toBe(t1.id);
    expect(fromTeacher.id).toBe(t1.id);
    expect(fromTeacher.other.kind).toBe('PARENT');
    expect((await audit('message.thread.start')).length).toBeGreaterThan(0);
  });

  it('a message is delivered at once at any hour and sent twice is one; the other person is told without names; unread clears when opened', async () => {
    const t = await start(parent(), kid, teacher().uid);
    const first = (await say(t.id, parent(), 'Asha has a cough, may she skip games?', 'same-1').expect(201)).body;
    const dup = (await say(t.id, parent(), 'Asha has a cough, may she skip games?', 'same-1').expect(201)).body;
    expect(dup.id).toBe(first.id);
    expect(first).toMatchObject({ mine: true, canHide: true });
    await say(t.id, parent(), '   ').expect(400);
    await say(t.id, parent(), 'x'.repeat(1001)).expect(400);
    const told = await notices(teacher(), 'message.received');
    expect(told.length).toBeGreaterThan(0);
    expect(JSON.stringify(told)).not.toMatch(/Asha|cough|Parent/); // nothing about the child or the words reaches a notice
    expect((await call('get', '/messages/threads', teacher()).expect(200)).body.items.find((x: Thread) => x.id === t.id).unread).toBe(true);
    const asTeacher = await open(t.id, teacher());
    expect(asTeacher.messages!.map((m) => m.body)).toEqual(['Asha has a cough, may she skip games?']);
    expect(asTeacher.messages![0]).toMatchObject({ mine: false, canHide: false });
    await call('post', `/messages/threads/${t.id}/read`, teacher()).expect(204);
    expect((await call('get', '/messages/threads', teacher()).expect(200)).body.items.find((x: Thread) => x.id === t.id).unread).toBe(false);
    await say(t.id, teacher(), 'Yes, she may. Please send a note.').expect(201); // the teacher replies late in the evening: no refusal
    expect((await call('get', '/messages/threads', parent()).expect(200)).body.items.find((x: Thread) => x.id === t.id).unread).toBe(true);
    const sent = await audit('message.send');
    expect(sent.some((a) => JSON.stringify(a.details ?? '').includes('may she skip games'))).toBe(true); // the System Admin can read the words
  });

  it('only the two people see a conversation; other roles, other schools and other parents get nothing', async () => {
    const t = await start(parent(), kid, teacher().uid);
    await call('get', `/messages/threads/${t.id}`, hr()).expect(403);
    await call('get', `/messages/threads/${t.id}`, w!.roles.B.PARENT, w!.schools.B).expect(404);
    await say(t.id, w!.roles.B.PARENT, 'hello').expect(403); // not even the right school header: the route refuses before the conversation is looked up
    expect((await call('get', '/messages/threads', principal()).expect(403)).status).toBe(403);
    await call('get', `/messages/threads/${randomUUID()}`, parent()).expect(404);
  });

  it('the sender hides a message for 5 minutes by the server\'s clock; the other person cannot; the other person can report one to the Principal', async () => {
    const t = await start(parent(), kid, teacher().uid);
    const m = (await say(t.id, parent(), 'A message I regret').expect(201)).body;
    await call('post', `/messages/threads/${t.id}/messages/${m.id}/hide`, teacher()).expect(404);
    const hid = (await call('post', `/messages/threads/${t.id}/messages/${m.id}/hide`, parent()).expect(200)).body;
    expect(hid).toMatchObject({ hidden: true, body: null });
    const view = (await open(t.id, teacher())).messages!.find((x) => x.id === m.id)!;
    expect(view).toMatchObject({ hidden: true, body: null });
    await call('post', `/messages/threads/${t.id}/messages/${m.id}/hide`, parent()).expect(409);
    const old = (await say(t.id, parent(), 'An older one').expect(201)).body;
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 6 * 60_000);
    try {
      expect(JSON.stringify((await call('post', `/messages/threads/${t.id}/messages/${old.id}/hide`, parent()).expect(409)).body)).toContain('hideWindowClosed');
    } finally { vi.restoreAllMocks(); }
    // reporting: the other person's message only
    const theirs = (await say(t.id, teacher(), 'Something improper').expect(201)).body;
    await call('post', `/messages/threads/${t.id}/messages/${theirs.id}/report`, teacher()).send({}).expect(400); // not your own
    await call('post', `/messages/threads/${t.id}/messages/${theirs.id}/report`, parent()).send({ note: 'This is not appropriate' }).expect(204);
    expect((await notices(principal(), 'message.reported')).length).toBeGreaterThan(0);
    expect((await audit('message.report')).length).toBeGreaterThan(0);
    expect((await audit('message.hide')).length).toBeGreaterThan(0);
  });
});
