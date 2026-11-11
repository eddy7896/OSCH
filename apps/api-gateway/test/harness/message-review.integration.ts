// P5-3e against the REAL stack: the Principal reviews reported messages with the whole conversation; the System Admin reads the trail of messages and every such read is written down (ADR-0018, guardrails section 3).
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

describe.skipIf(!ready)('reviewing messages against the real emulators (P5-3e)', { timeout: 240_000 }, () => {
  afterAll(async () => { vi.restoreAllMocks(); await app?.close(); });
  const A = () => w!.schools.A;
  const acad = () => w!.roles.A.ACADEMIC_ADMIN;
  const teacher = () => w!.roles.A.TEACHER;
  const parent = () => w!.roles.A.PARENT;
  const hr = () => w!.roles.A.HR_MANAGER;
  const principal = () => w!.roles.A.PRINCIPAL;
  const sysadmin = () => w!.roles.A.SYSTEM_ADMIN;
  const accountant = () => w!.roles.A.ACCOUNTANT;
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

  let thread = '', reportId = '', badId = '';

  it('a reported message reaches the Principal with its whole conversation, even if the sender hid the words', async () => {
    const t = await start(parent(), kid, teacher().uid);
    thread = t.id;
    await say(thread, parent(), 'Good morning teacher').expect(201);
    const bad = (await say(thread, teacher(), `Rude words ${uniq()}`).expect(201)).body as { id: string };
    badId = bad.id;
    await call('post', `/messages/threads/${thread}/messages/${badId}/hide`, teacher()).expect(200);
    await call('post', `/messages/threads/${thread}/messages/${badId}/report`, parent()).send({ note: 'This is not fine' }).expect(204);

    const list = (await call('get', '/messages/reports', principal()).expect(200)).body.items as Array<{ id: string; reviewed: boolean; note: string | null; reportedBy: { name: string }; message: { body: string; hidden: boolean; sender: { userId: string }; student: { id: string } } }>;
    const mine = list.find((r) => r.message.student.id === kid)!;
    expect(mine).toMatchObject({ reviewed: false, note: 'This is not fine' });
    expect(mine.message.body.startsWith('Rude words')).toBe(true); // the words are there although the sender hid them
    expect(mine.message.hidden).toBe(true);
    expect(mine.message.sender.userId).toBe(teacher().uid);
    reportId = mine.id;

    const d = (await call('get', `/messages/reports/${reportId}`, principal()).expect(200)).body as { conversation: Array<{ body: string; reported: boolean }> };
    expect(d.conversation.map((m) => m.body.slice(0, 4))).toEqual(['Good', 'Rude']);
    expect(d.conversation.map((m) => m.reported)).toEqual([false, true]);
  });

  it('only the Principal reads or closes reports; a report of another school looks like none', async () => {
    for (const who of [teacher(), parent(), hr(), accountant(), acad(), sysadmin()]) {
      await call('get', '/messages/reports', who).expect(403);
      await call('get', `/messages/reports/${reportId}`, who).expect(403);
      await call('post', `/messages/reports/${reportId}/review`, who).send({}).expect(403);
    }
    await call('get', `/messages/reports/${reportId}`, principal(), w!.schools.B).expect((r) => { if (![403, 404].includes(r.status)) throw new Error(`status ${r.status}`); });
    await call('get', `/messages/reports/${randomUUID()}`, principal()).expect(404);
  });

  it('the Principal closes a report once; the note and the reported words go to the audit trail; the list shows waiting reports first', async () => {
    const r = (await call('post', `/messages/reports/${reportId}/review`, principal()).send({ note: 'Spoke to the teacher' }).expect(200)).body as { reviewed: boolean; reviewedAt: string };
    expect(r.reviewed).toBe(true);
    await call('post', `/messages/reports/${reportId}/review`, principal()).send({}).expect(409);
    const logged = (await audit('message.report.review')).filter((a) => JSON.stringify(a.details ?? '').includes('Spoke to the teacher'));
    expect(logged).toHaveLength(1);
    expect(JSON.stringify(logged[0]!.details)).toContain('Rude words');
    const list = (await call('get', '/messages/reports', principal()).expect(200)).body.items as Array<{ id: string; reviewed: boolean }>;
    expect(list.find((x) => x.id === reportId)!.reviewed).toBe(true);
    const flags = list.map((x) => x.reviewed);
    expect(flags).toEqual([...flags].sort((a, b) => Number(a) - Number(b))); // waiting first
  });

  it('the System Admin reads the trail with the words, who wrote to whom and about whom; each read is written down; nobody else may', async () => {
    const before = (await audit('audit.messages.read')).length;
    const page = (await call('get', '/audit/messages?limit=100', sysadmin()).expect(200)).body as { items: Array<{ action: string; body: string | null; to: string | null; student: string | null; actor: { userId: string } }>; next: number | null };
    const sent = page.items.find((i) => i.action === 'message.send' && i.body?.startsWith('Rude words'))!;
    expect(sent).toBeDefined();
    expect(sent.actor.userId).toBe(teacher().uid);
    expect(sent.to).toBeTruthy();
    expect(sent.student).toContain('Asha');
    expect(page.items.some((i) => i.action === 'message.report')).toBe(true);
    expect(page.items.some((i) => i.action === 'message.report.review')).toBe(true);
    expect((await audit('audit.messages.read')).length).toBe(before + 1);

    const one = (await call('get', '/audit/messages?limit=1', sysadmin()).expect(200)).body as { items: unknown[]; next: number | null };
    expect(one.items).toHaveLength(1);
    expect(one.next).toBe(1);
    await call('get', '/audit/messages?limit=0', sysadmin()).expect(400);
    for (const who of [principal(), teacher(), parent(), hr(), accountant(), acad()]) await call('get', '/audit/messages', who).expect(403);
    expect((await audit('audit.messages.read')).length).toBe(before + 2); // refused reads write nothing
  });
});
