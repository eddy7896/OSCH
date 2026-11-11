// P5-8a against the REAL stack: the parents' notice board (ADR-0018 decisions 5 and 8): who may post in which category, who a post reaches, scheduling, withdrawing, and that staff announcements are untouched.
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

describe.skipIf(!ready)('notice board against the real emulators (P5-8a)', { timeout: 240_000 }, () => {
  afterAll(async () => { vi.restoreAllMocks(); await app?.close(); });
  const A = () => w!.schools.A;
  const acad = () => w!.roles.A.ACADEMIC_ADMIN;
  const teacher = () => w!.roles.A.TEACHER;
  const parent = () => w!.roles.A.PARENT;
  const hr = () => w!.roles.A.HR_MANAGER;
  const principal = () => w!.roles.A.PRINCIPAL;
  const bursar = () => w!.roles.A.BURSAR;
  const transport = () => w!.roles.A.TRANSPORT_MANAGER;
  const accountant = () => w!.roles.A.ACCOUNTANT;
  const call = (method: 'get' | 'post' | 'put' | 'patch', path: string, who: Person = acad(), school = A()) => agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const audit = async (action: string) => (await w!.db.listAuditLog({ schoolId: A().replaceAll('-', ''), limit: 800, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  const uniq = () => randomUUID().slice(0, 6);
  const notices = async (who: Person, kind: string) => ((await call('get', '/notifications', who).expect(200)).body.items as Array<{ kind: string; title: string; body: string }>).filter((n) => n.kind === kind);
  let cA = '', cG = '', levelA = '', levelG = '';
  const levels = async () => ((await call('get', '/academics/levels').expect(200)).body.items as Array<{ id: string; name: string }>);
  const makeClass = async (levelId: string) => (await call('post', '/academics/classes').send({ gradeLevelId: levelId, section: `S${uniq()}`.slice(0, 6), capacity: 40 }).expect(201)).body as { id: string };
  const student = async (name: string, classroomId: string) => ((await call('post', '/students').send({ firstName: name, lastName: `L${uniq()}`, classroomId }).expect(201)).body as { id: string }).id;
  interface Notice { id: string; title: string; body: string; state: string; pinned: boolean; category: string; told: number | null; withdrawn: boolean }
  const post = (who: Person, over: Record<string, unknown> = {}) => call('post', '/notice-board', who).send({ title: `T${uniq()}`, body: 'Words for the parents', category: 'GENERAL', audience: 'ALL_PARENTS', ...over });
  const mine = async (who: Person) => (await call('get', '/notice-board', who).expect(200)).body.items as Notice[];

  beforeAll(async () => {
    const y = (await call('post', '/academics/years').send({ name: `NB-${uniq()}`, startDate: '2092-04-01', endDate: '2093-03-31' }).expect(201)).body;
    await call('post', `/academics/years/${y.id}/activate`).send({}).expect(200);
    const ls = await levels();
    levelA = ls[0]!.id;
    levelG = ls.find((l) => l.id !== levelA)!.id;
    cA = (await makeClass(levelA)).id;
    cG = (await makeClass(levelG)).id; // a class and grade the parent has no child in
    const kid = await student('Asha', cA);
    await student('Gita', cG);
    await call('post', `/students/${kid}/parent-accounts`).send({ userId: parent().uid, relationship: 'MOTHER' }).expect(201);
  }, 120_000);

  it('the Academic admin posts to all parents: the parent sees it and is told once, in words that name no child; staff announcements are untouched', async () => {
    const title = `Holiday ${uniq()}`;
    const n = (await post(acad(), { title, category: 'HOLIDAY', pinned: true }).expect(201)).body as Notice;
    expect(n).toMatchObject({ state: 'LIVE', category: 'HOLIDAY', pinned: true });
    expect(n.told).toBeGreaterThanOrEqual(1);
    expect((await mine(parent())).map((x) => x.title)).toContain(title);
    const told = ((await call('get', '/notifications', parent()).expect(200)).body.items as Array<{ kind: string; title: string; body: string }>).filter((x) => x.kind === 'notice.posted');
    expect(told.some((x) => x.body === title)).toBe(true);
    expect(JSON.stringify(told)).not.toContain('Asha');
    expect(((await call('get', '/announcements', acad()).expect(200)).body.items as Array<{ title: string }>).map((x) => x.title)).not.toContain(title);
    await call('get', `/announcements/${n.id}`, acad()).expect(404);
    expect((await audit('notice.post')).some((a) => JSON.stringify(a.details ?? '').includes('Words') || JSON.stringify(a.details ?? '').includes(title))).toBe(true);
  });

  it('a grade or a class reaches only the parents of its students; the reach is counted before posting', async () => {
    const a = (await post(acad(), { audience: 'CLASS', classId: cA, title: `ClassA ${uniq()}` }).expect(201)).body as Notice;
    const g = (await post(acad(), { audience: 'CLASS', classId: cG, title: `ClassG ${uniq()}` }).expect(201)).body as Notice;
    const ga = (await post(acad(), { audience: 'GRADE', gradeLevelId: levelA, title: `GradeA ${uniq()}` }).expect(201)).body as Notice;
    const gg = (await post(acad(), { audience: 'GRADE', gradeLevelId: levelG, title: `GradeG ${uniq()}` }).expect(201)).body as Notice;
    expect([a.told, g.told, ga.told, gg.told]).toEqual([1, 0, 1, 0]);
    const seen = (await mine(parent())).map((x) => x.id);
    expect(seen).toEqual(expect.arrayContaining([a.id, ga.id]));
    expect(seen).not.toContain(g.id);
    expect(seen).not.toContain(gg.id);
    await call('get', `/notice-board/${g.id}`, parent()).expect(404);
    await call('get', `/notice-board/${a.id}`, parent()).expect(200);
    expect((await call('get', `/notice-board/reach?audience=CLASS&classId=${cA}`, acad()).expect(200)).body).toEqual({ parents: 1, students: 1 });
    expect((await call('get', `/notice-board/reach?audience=CLASS&classId=${cG}`, acad()).expect(200)).body).toEqual({ parents: 0, students: 0 });
    expect((await call('get', '/notice-board/reach?audience=ALL_PARENTS', acad()).expect(200)).body.parents).toBeGreaterThanOrEqual(1);
    await call('get', '/notice-board/reach?audience=GRADE', acad()).expect(400);
    await call('get', `/notice-board/reach?audience=CLASS&classId=${randomUUID()}`, acad()).expect(400);
    await post(acad(), { audience: 'GRADE' }).expect(400);
    await post(acad(), { audience: 'ALL_PARENTS', classId: cA }).expect(400);
  });

  it('the Bursar posts only Fees and the transport manager only Transport, and each sees and changes only their own category', async () => {
    await post(bursar(), { category: 'HOLIDAY' }).expect(403);
    await post(transport(), { category: 'FEES' }).expect(403);
    const fee = (await post(bursar(), { category: 'FEES', title: `Fee ${uniq()}` }).expect(201)).body as Notice;
    const bus = (await post(transport(), { category: 'TRANSPORT', title: `Bus ${uniq()}` }).expect(201)).body as Notice;
    const general = (await post(acad(), { title: `Gen ${uniq()}` }).expect(201)).body as Notice;
    expect((await mine(bursar())).every((x) => x.category === 'FEES')).toBe(true);
    expect((await mine(bursar())).map((x) => x.id)).toContain(fee.id);
    expect((await mine(transport())).map((x) => x.id)).toEqual(expect.arrayContaining([bus.id]));
    expect((await mine(transport())).map((x) => x.id)).not.toContain(fee.id);
    await call('get', `/notice-board/${general.id}`, bursar()).expect(404);
    await call('patch', `/notice-board/${general.id}`, bursar()).send({ title: 'x', body: 'y', category: 'FEES', pinned: false }).expect(404);
    await call('post', `/notice-board/${general.id}/withdraw`, bursar()).send({}).expect(404);
    await call('patch', `/notice-board/${fee.id}`, bursar()).send({ title: 'Fee changed', body: 'y', category: 'HOLIDAY', pinned: false }).expect(403);
    expect((await call('patch', `/notice-board/${fee.id}`, bursar()).send({ title: 'Fee changed', body: 'y', category: 'FEES', pinned: true }).expect(200)).body.title).toBe('Fee changed');
    const principalList = await mine(principal());
    expect(principalList.map((x) => x.id)).toEqual(expect.arrayContaining([fee.id, bus.id, general.id]));
  });

  it('only the posting roles may post; parents only read; other roles and other schools see nothing', async () => {
    for (const who of [teacher(), parent(), hr(), accountant()]) await post(who).expect(403);
    for (const who of [teacher(), hr(), accountant()]) await call('get', '/notice-board', who).expect(403);
    await post(principal()).expect(201);
    await call('get', '/notice-board', principal(), w!.schools.B).expect((r) => { if (![403, 404].includes(r.status)) throw new Error(`status ${r.status}`); });
  });

  it('a post that is not yet visible is hidden from parents and tells nobody; an expiry in the past is refused; pinned comes first; withdrawing removes the words but keeps the row', async () => {
    const later = new Date(Date.now() + 86_400_000).toISOString();
    const sched = (await post(acad(), { publishAt: later, title: `Later ${uniq()}` }).expect(201)).body as Notice;
    expect(sched).toMatchObject({ state: 'SCHEDULED', told: 0 });
    expect((await mine(parent())).map((x) => x.id)).not.toContain(sched.id);
    expect((await mine(acad())).find((x) => x.id === sched.id)!.state).toBe('SCHEDULED');
    await post(acad(), { expiresAt: new Date(Date.now() - 60_000).toISOString() }).expect(400);
    await post(acad(), { publishAt: later, expiresAt: new Date(Date.parse(later) - 1000).toISOString() }).expect(400);

    const loud = (await post(acad(), { pinned: true, title: `Pinned ${uniq()}` }).expect(201)).body as Notice;
    const quiet = (await post(acad(), { title: `Quiet ${uniq()}` }).expect(201)).body as Notice;
    const order = (await mine(parent())).map((x) => x.id);
    expect(order.indexOf(loud.id)).toBeLessThan(order.indexOf(quiet.id));

    const out = (await call('post', `/notice-board/${loud.id}/withdraw`, acad()).send({}).expect(200)).body as Notice;
    expect(out).toMatchObject({ withdrawn: true, state: 'WITHDRAWN', title: '', body: '' });
    expect((await mine(parent())).map((x) => x.id)).not.toContain(loud.id);
    expect((await mine(acad())).find((x) => x.id === loud.id)!.withdrawn).toBe(true);
    await call('post', `/notice-board/${loud.id}/withdraw`, acad()).send({}).expect(200); // again: the same answer
    await call('patch', `/notice-board/${loud.id}`, acad()).send({ title: 'x', body: 'y', category: 'GENERAL', pinned: false }).expect(404);
  });
});
