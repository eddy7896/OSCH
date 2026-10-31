// P5-11a against the REAL stack: a teacher shares a worksheet for a class she teaches; the parents of that class read it; files are in a PRIVATE bucket (an in-memory fake here) (ADR-0016).
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
  presignPut: async (i: { key: string; contentType: string; contentLength: number; expiresInSeconds: number }) => `https://private.example/put/${i.key}?ct=${i.contentType}&len=${i.contentLength}&ttl=${i.expiresInSeconds}`,
  presignGet: async (i: { key: string; downloadName?: string }) => `https://private.example/get/${i.key}?name=${i.downloadName ?? ''}`,
  head: async (key: string) => objects.get(key) ?? null,
  remove: async (key: string) => void objects.delete(key),
};
let app: INestApplication | undefined;
let w: World | undefined;
if (ready) {
  app = await bootRealApp([], {}, [[PRIVATE_STORE, store]]);
  w = await buildWorld();
}

const PDF = 'application/pdf';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe.skipIf(!ready)('learning resources against the real emulators (P5-11a)', { timeout: 240_000 }, () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const acad = () => w!.roles.A.ACADEMIC_ADMIN;
  const teacher = () => w!.roles.A.TEACHER;
  const parent = () => w!.roles.A.PARENT;
  const hr = () => w!.roles.A.HR_MANAGER;
  const call = (method: 'get' | 'post' | 'put' | 'delete', path: string, who: Person = acad(), school = A()) => agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const audit = async (action: string) => (await w!.db.listAuditLog({ schoolId: A().replaceAll('-', ''), limit: 800, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  const uniq = () => randomUUID().slice(0, 6);
  let cA = '', cB = '', subject = '';

  const makeClass = async () => {
    const level = ((await call('get', '/academics/levels').expect(200)).body.items as Array<{ id: string; name: string }>).find((l) => l.name === '1');
    return (await call('post', '/academics/classes').send({ gradeLevelId: level!.id, section: `S${uniq()}`.slice(0, 6), capacity: 40 }).expect(201)).body as { id: string };
  };
  /** The whole teacher's path: ticket, "upload" (register the object), add. */
  const share = async (who: Person, classId: string, over: Record<string, unknown> = {}, type = PDF, size = 5000) => {
    const t = (await call('post', '/resources/uploads', who).send({ classId, subjectId: subject, contentType: type, sizeBytes: size }).expect(200)).body as { key: string };
    objects.set(t.key, { sizeBytes: size, contentType: type });
    return (await call('post', '/resources', who).send({ classId, subjectId: subject, key: t.key, title: `Worksheet ${uniq()}`, fileName: 'worksheet.pdf', ...over }).expect(201)).body as { id: string };
  };

  beforeAll(async () => {
    const y = (await call('post', '/academics/years').send({ name: `RS-${uniq()}`, startDate: '2090-04-01', endDate: '2091-03-31' }).expect(201)).body;
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

  it('a teacher shares for her own class: a ticket under the class path, the file must really be there with an allowed type, and it is audited', async () => {
    const t = (await call('post', '/resources/uploads', teacher()).send({ classId: cA, subjectId: subject, contentType: DOCX, sizeBytes: 9000 }).expect(200)).body;
    expect(t).toMatchObject({ method: 'PUT', expiresInSeconds: 300, headers: { 'Content-Type': DOCX, 'Content-Length': '9000' } });
    expect(t.key).toMatch(new RegExp(`^schools/${A()}/resources/${cA}/[0-9a-f-]{36}\\.docx$`));
    const body = { classId: cA, subjectId: subject, key: t.key, title: 'Fractions', note: 'Do page 4', fileName: 'fractions.docx' };
    await call('post', '/resources', teacher()).send(body).expect(400); // not uploaded yet
    objects.set(t.key, { sizeBytes: 9000, contentType: 'text/html' }); // a lying content type
    await call('post', '/resources', teacher()).send(body).expect(400);
    objects.set(t.key, { sizeBytes: 9000, contentType: DOCX });
    await call('post', '/resources', teacher()).send({ ...body, key: `schools/${A()}/resources/${cB}/${randomUUID()}.docx` }).expect(400); // another class's path
    const made = (await call('post', '/resources', teacher()).send(body).expect(201)).body;
    expect(made).toMatchObject({ title: 'Fractions', note: 'Do page 4', fileName: 'fractions.docx', contentType: DOCX, sizeBytes: 9000, class: { id: cA } });
    expect(JSON.stringify(made)).not.toContain(t.key);
    expect((await audit('resource.add')).some((a) => a.entityId?.replaceAll('-', '') === (made.id as string).replaceAll('-', ''))).toBe(true);
  });

  it('limits: type, size, a class she does not teach, and the roles with no grant', async () => {
    await call('post', '/resources/uploads', teacher()).send({ classId: cA, subjectId: subject, contentType: 'application/zip', sizeBytes: 10 }).expect(400);
    await call('post', '/resources/uploads', teacher()).send({ classId: cA, subjectId: subject, contentType: PDF, sizeBytes: 20 * 1024 * 1024 + 1 }).expect(400);
    await call('post', '/resources/uploads', teacher()).send({ classId: cB, subjectId: subject, contentType: PDF, sizeBytes: 10 }).expect(403);
    await call('post', '/resources/uploads', parent()).send({ classId: cA, subjectId: subject, contentType: PDF, sizeBytes: 10 }).expect(403);
    await call('post', '/resources/uploads', hr()).send({ classId: cA, subjectId: subject, contentType: PDF, sizeBytes: 10 }).expect(403);
    await call('post', '/resources/uploads', acad()).send({ classId: cB, subjectId: subject, contentType: PDF, sizeBytes: 10 }).expect(200); // the Academic admin may share for any class
  });

  it('a parent sees the resources of a linked child\'s class and downloads through a short-lived address; another class and another school are closed', async () => {
    const mine = await share(teacher(), cA);
    const theirs = await share(acad(), cB);
    const list = (await call('get', '/resources', parent()).expect(200)).body.items as Array<{ id: string }>;
    expect(list.map((r) => r.id)).toContain(mine.id);
    expect(list.map((r) => r.id)).not.toContain(theirs.id);
    expect((await call('get', `/resources?classId=${cB}`, parent()).expect(200)).body.items).toEqual([]);
    const dl = (await call('get', `/resources/${mine.id}/download`, parent()).expect(200)).body;
    expect(dl).toMatchObject({ expiresInSeconds: 300 });
    expect(dl.url).toContain(`/resources/${cA}/`);
    await call('get', `/resources/${theirs.id}/download`, parent()).expect(404);
    await call('get', `/resources/${theirs.id}`, parent()).expect(404);
    await call('get', `/resources/${mine.id}/download`, w!.roles.B.PARENT, w!.schools.B).expect(404);
    await call('get', '/resources', hr()).expect(403);
    // the class teacher reads her own class, not the other
    const t = (await call('get', '/resources', teacher()).expect(200)).body.items as Array<{ id: string }>;
    expect(t.map((r) => r.id)).toContain(mine.id);
    expect(t.map((r) => r.id)).not.toContain(theirs.id);
  });

  it('the uploader or the Academic admin removes; the file goes, the row leaves every list, and it is audited; a parent cannot', async () => {
    const mine = await share(teacher(), cA);
    await call('delete', `/resources/${mine.id}`, parent()).expect(403);
    const other = await share(acad(), cA);
    await call('delete', `/resources/${other.id}`, teacher()).expect(404); // not hers
    await call('delete', `/resources/${mine.id}`, teacher()).expect(204);
    await call('delete', `/resources/${other.id}`, acad()).expect(204);
    const list = (await call('get', '/resources', parent()).expect(200)).body.items as Array<{ id: string }>;
    expect(list.map((r) => r.id)).not.toContain(mine.id);
    await call('get', `/resources/${mine.id}/download`, parent()).expect(404);
    await call('delete', `/resources/${mine.id}`, teacher()).expect(404); // already gone
    expect((await audit('resource.remove')).length).toBeGreaterThanOrEqual(2);
  });
});
