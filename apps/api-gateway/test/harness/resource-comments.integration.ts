// P5-11d against the REAL stack: comments under a learning resource (ADR-0016 decision 6): who may read and write, the 5-minute window, hiding, notices, audit.
import { type INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PRIVATE_STORE } from '../../src/files/private-store.js';
import { agent } from '../support/serve.js';
import { bootRealApp } from './app.js';
import { requireEmulatorsOrSkip } from './emulators.js';
import { buildWorld, type Person, type World } from './fixtures.js';

const ready = requireEmulatorsOrSkip();
const objects = new Map<string, { sizeBytes: number; contentType: string }>();
const store = {
  presignPut: async (i: { key: string }) => `https://private.example/put/${i.key}`,
  presignGet: async (i: { key: string }) => `https://private.example/get/${i.key}`,
  head: async (key: string) => objects.get(key) ?? null,
  remove: async (key: string) => void objects.delete(key),
};
let app: INestApplication | undefined;
let w: World | undefined;
if (ready) {
  app = await bootRealApp([], {}, [[PRIVATE_STORE, store]]);
  w = await buildWorld();
}

interface Comment { id: string; resourceId: string; author: { kind: string; name: string; mine: boolean }; body: string | null; hidden: boolean; edited: boolean; replyToId: string | null; canChange: boolean }

describe.skipIf(!ready)('comments under a resource against the real emulators (P5-11d)', { timeout: 240_000 }, () => {
  afterAll(async () => { vi.restoreAllMocks(); await app?.close(); });
  const A = () => w!.schools.A;
  const acad = () => w!.roles.A.ACADEMIC_ADMIN;
  const teacher = () => w!.roles.A.TEACHER;
  const parent = () => w!.roles.A.PARENT;
  const hr = () => w!.roles.A.HR_MANAGER;
  const call = (method: 'get' | 'post' | 'put' | 'delete', path: string, who: Person = acad(), school = A()) => agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const audit = async (action: string) => (await w!.db.listAuditLog({ schoolId: A().replaceAll('-', ''), limit: 800, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  const uniq = () => randomUUID().slice(0, 6);
  const notices = async (who: Person, kind: string) => ((await call('get', '/notifications', who).expect(200)).body.items as Array<{ kind: string; title: string; body: string }>).filter((n) => n.kind === kind);
  let cA = '', cB = '', subject = '';

  const makeClass = async () => {
    const level = ((await call('get', '/academics/levels').expect(200)).body.items as Array<{ id: string; name: string }>).find((l) => l.name === '1');
    return (await call('post', '/academics/classes').send({ gradeLevelId: level!.id, section: `S${uniq()}`.slice(0, 6), capacity: 40 }).expect(201)).body as { id: string };
  };
  const share = async (who: Person, classId: string) => {
    const t = (await call('post', '/resources/uploads', who).send({ classId, subjectId: subject, contentType: 'application/pdf', sizeBytes: 100 }).expect(200)).body as { key: string };
    objects.set(t.key, { sizeBytes: 100, contentType: 'application/pdf' });
    return (await call('post', '/resources', who).send({ classId, subjectId: subject, key: t.key, title: `Sheet ${uniq()}`, fileName: 'a.pdf' }).expect(201)).body as { id: string; title: string };
  };
  const say = (resource: string, who: Person, body: string, over: Record<string, unknown> = {}) => call('post', `/resources/${resource}/comments`, who).send({ clientId: `c-${uniq()}`, body, ...over });
  const list = async (resource: string, who: Person) => (await call('get', `/resources/${resource}/comments`, who).expect(200)).body.items as Comment[];

  beforeAll(async () => {
    const y = (await call('post', '/academics/years').send({ name: `RC-${uniq()}`, startDate: '2090-04-01', endDate: '2091-03-31' }).expect(201)).body;
    await call('post', `/academics/years/${y.id}/activate`).send({}).expect(200);
    cA = (await makeClass()).id;
    cB = (await makeClass()).id;
    subject = ((await call('post', '/academics/subjects').send({ name: `Maths ${uniq()}`, code: `M${uniq()}` }).expect(201)).body as { id: string }).id;
    const staffT = ((await call('post', '/staff', hr()).send({ firstName: 'Tara', lastName: 'Teach' }).expect(201)).body as { id: string }).id;
    await call('put', `/staff/${staffT}/account`, hr()).send({ userId: teacher().uid }).expect(200);
    await call('put', `/academics/classes/${cA}/teacher`).send({ staffId: staffT }).expect(200);
    const kid = ((await call('post', '/students').send({ firstName: 'Asha', lastName: `L${uniq()}`, classroomId: cA }).expect(201)).body as { id: string }).id;
    await call('post', `/students/${kid}/parent-accounts`).send({ userId: parent().uid, relationship: 'MOTHER' }).expect(201);
  }, 120_000);

  it('a parent posts as "Parent of" the child\'s first name; a repeat is one comment; the teacher is told, the author is not', async () => {
    const r = await share(teacher(), cA);
    const first = (await say(r.id, parent(), 'Is page 4 needed?', { clientId: 'same-1' }).expect(201)).body as Comment;
    expect(first.author).toMatchObject({ kind: 'PARENT', name: 'Asha', mine: true });
    expect(first.canChange).toBe(true);
    expect(JSON.stringify(first)).not.toContain(parent().uid);
    const again = (await say(r.id, parent(), 'Is page 4 needed?', { clientId: 'same-1' }).expect(201)).body as Comment;
    expect(again.id).toBe(first.id);
    expect(await list(r.id, parent())).toHaveLength(1);
    await say(r.id, parent(), 'x'.repeat(501)).expect(400);
    await say(r.id, parent(), '   ').expect(400);
    const told = await notices(teacher(), 'resourcecomment.parentposted');
    expect(told.some((n) => n.body.includes('Asha') && n.body.includes(r.title))).toBe(true);
    expect((await notices(parent(), 'resourcecomment.parentposted')).length).toBe(0);
    expect((await audit('resourcecomment.post')).length).toBeGreaterThan(0);
  });

  it('the teacher answers; the earlier commenter is told; a reply to a reply is refused', async () => {
    const r = await share(teacher(), cA);
    const c1 = (await say(r.id, parent(), 'Question').expect(201)).body as Comment;
    const t1 = (await say(r.id, teacher(), 'Yes, page 4 too', { replyToId: c1.id }).expect(201)).body as Comment;
    expect(t1.author.kind).toBe('TEACHER');
    expect(t1.replyToId).toBe(c1.id);
    await say(r.id, parent(), 'Thanks', { replyToId: c1.id }).expect(201);
    await say(r.id, parent(), 'Nested', { replyToId: t1.id }).expect(400); // t1 is itself a reply: one level only
    const told = await notices(parent(), 'resourcecomment.staffposted');
    expect(told.some((n) => n.body.includes(r.title))).toBe(true);
  });

  it('edit and delete work for the author for 5 minutes by the server\'s clock; the first version is kept; later the comment stays', async () => {
    const r = await share(teacher(), cA);
    const c = (await say(r.id, parent(), 'Frist version').expect(201)).body as Comment;
    const edited = (await call('put', `/resources/${r.id}/comments/${c.id}`, parent()).send({ body: 'First version' }).expect(200)).body as Comment;
    expect(edited).toMatchObject({ body: 'First version', edited: true });
    const row = (await w!.db.listResourceComments({ schoolId: A().replaceAll('-', ''), resourceId: r.id, limit: 10 })).data.resourceComments[0]!;
    expect(row.originalBody).toBe('Frist version');
    await call('put', `/resources/${r.id}/comments/${c.id}`, teacher()).send({ body: 'hijack' }).expect(404); // not the author's role
    const c2 = (await say(r.id, parent(), 'To be deleted').expect(201)).body as Comment;
    await call('delete', `/resources/${r.id}/comments/${c2.id}`, parent()).expect(204);
    expect((await list(r.id, parent())).map((x) => x.id)).not.toContain(c2.id);
    // six minutes later by the server's clock
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 6 * 60_000);
    try {
      const body = (await call('put', `/resources/${r.id}/comments/${c.id}`, parent()).send({ body: 'Too late' }).expect(409)).body;
      expect(JSON.stringify(body)).toContain('editWindowClosed');
      await call('delete', `/resources/${r.id}/comments/${c.id}`, parent()).expect(409);
      expect((await list(r.id, parent())).find((x) => x.id === c.id)!.canChange).toBe(false);
    } finally {
      vi.restoreAllMocks();
    }
    expect((await audit('resourcecomment.edit')).length).toBeGreaterThan(0);
    expect((await audit('resourcecomment.delete')).length).toBeGreaterThan(0);
  });

  it('the uploading teacher or the Academic admin hides; parents see "hidden" with no words, staff keep them, the author is told; nobody else may hide', async () => {
    const r = await share(teacher(), cA);
    const c = (await say(r.id, parent(), 'A rude remark').expect(201)).body as Comment;
    await call('post', `/resources/${r.id}/comments/${c.id}/hide`, parent()).expect(404);
    const hid = (await call('post', `/resources/${r.id}/comments/${c.id}/hide`, teacher()).expect(200)).body as Comment;
    expect(hid.hidden).toBe(true);
    const asParent = (await list(r.id, parent())).find((x) => x.id === c.id)!;
    expect(asParent).toMatchObject({ hidden: true, body: null });
    expect(JSON.stringify(asParent)).not.toContain('rude');
    expect((await list(r.id, teacher())).find((x) => x.id === c.id)!.body).toBe('A rude remark');
    expect((await list(r.id, acad())).find((x) => x.id === c.id)!.body).toBe('A rude remark');
    await call('post', `/resources/${r.id}/comments/${c.id}/hide`, acad()).expect(409); // already hidden
    await call('put', `/resources/${r.id}/comments/${c.id}`, parent()).send({ body: 'sneaky edit' }).expect(409);
    expect((await notices(parent(), 'resourcecomment.hidden')).some((n) => n.body.includes(r.title))).toBe(true);
    const c2 = (await say(r.id, parent(), 'Another').expect(201)).body as Comment;
    await call('post', `/resources/${r.id}/comments/${c2.id}/hide`, acad()).expect(200); // the Academic admin may too
    expect((await audit('resourcecomment.hide')).length).toBeGreaterThanOrEqual(2);
  });

  it('only the class\'s parents, the uploading teacher and the Academic admin; everyone else gets nothing', async () => {
    const mine = await share(teacher(), cA);
    const other = await share(acad(), cB); // another class, shared by the admin
    await call('get', `/resources/${other.id}/comments`, parent()).expect(404); // a class their child is not in
    await say(other.id, parent(), 'Hello').expect(404);
    await call('get', `/resources/${other.id}/comments`, teacher()).expect(404); // not hers
    await say(other.id, teacher(), 'Hello').expect(404);
    await call('get', `/resources/${other.id}/comments`, acad()).expect(200);
    await call('get', `/resources/${mine.id}/comments`, hr()).expect(403);
    await call('get', `/resources/${mine.id}/comments`, w!.roles.A.PRINCIPAL).expect(403);
    await call('get', `/resources/${mine.id}/comments`, w!.roles.B.PARENT, w!.schools.B).expect(404);
    // the admin writes under the teacher's resource and shows by name with the admin kind
    const adminSaid = (await say(mine.id, acad(), 'Please keep to the syllabus').expect(201)).body as Comment;
    expect(adminSaid.author.kind).toBe('ADMIN');
    expect((await notices(teacher(), 'resourcecomment.staffposted')).length).toBeGreaterThan(0);
  });
});
