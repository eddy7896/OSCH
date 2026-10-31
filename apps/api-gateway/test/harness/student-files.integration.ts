// P2-2b against the REAL stack: student photo and documents in a PRIVATE bucket (the bucket itself is an in-memory fake).
import { type INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PRIVATE_STORE } from '../../src/files/private-store.js';
import { agent } from '../support/serve.js';
import { bootRealApp } from './app.js';
import { requireEmulatorsOrSkip } from './emulators.js';
import { buildWorld, type Person, type World } from './fixtures.js';

const ready = requireEmulatorsOrSkip();
const objects = new Map<string, { sizeBytes: number; contentType: string }>();
const gets: string[] = [];
const store = {
  presignPut: async (i: { key: string; contentType: string; contentLength: number; expiresInSeconds: number }) => `https://private.example/put/${i.key}?ct=${i.contentType}&len=${i.contentLength}&ttl=${i.expiresInSeconds}`,
  presignGet: async (i: { key: string; downloadName?: string }) => (gets.push(i.key), `https://private.example/get/${i.key}?name=${i.downloadName ?? ''}`),
  head: async (key: string) => objects.get(key) ?? null,
  remove: async (key: string) => void objects.delete(key),
};
let app: INestApplication | undefined;
let unconfigured: INestApplication | undefined;
let w: World | undefined;
if (ready) {
  app = await bootRealApp([], {}, [[PRIVATE_STORE, store]]);
  unconfigured = await bootRealApp([], { R2_PRIVATE_BUCKET_NAME: '' });
  w = await buildWorld();
}

describe.skipIf(!ready)('student photo and documents against the real emulators (P2-2b)', () => {
  afterAll(async () => {
    await app?.close();
    await unconfigured?.close();
  });
  const A = () => w!.schools.A;
  const B = () => w!.schools.B;
  const acad = () => w!.roles.A.ACADEMIC_ADMIN;
  const call = (method: 'get' | 'post' | 'put' | 'delete', path: string, who: Person = acad(), school = A(), target: INestApplication = app!) =>
    agent(target)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const admit = async () => (await call('post', '/students').send({ firstName: `F${randomUUID().slice(0, 6)}`, lastName: 'Files' }).expect(201)).body;
  /** What the browser does after getting a ticket: PUT the bytes (here: register the object in the fake bucket). */
  const upload = (key: string, contentType: string, sizeBytes: number) => objects.set(key, { sizeBytes, contentType });

  it('photo: ticket under the student\'s own private path, then attach, then a signed read address', async () => {
    const s = await admit();
    const t = (await call('post', `/students/${s.id}/photo/upload-url`).send({ contentType: 'image/jpeg', sizeBytes: 50_000 }).expect(200)).body;
    expect(t).toMatchObject({ method: 'PUT', expiresInSeconds: 300, headers: { 'Content-Type': 'image/jpeg', 'Content-Length': '50000' } });
    expect(t.key).toMatch(new RegExp(`^schools/${A()}/students/${s.id}/photo/[0-9a-f-]{36}\\.jpg$`));
    await call('get', `/students/${s.id}/photo`).expect(404); // none yet
    await call('put', `/students/${s.id}/photo`).send({ key: t.key }).expect(400); // not uploaded yet
    upload(t.key, 'image/jpeg', 50_000);
    const attached = (await call('put', `/students/${s.id}/photo`).send({ key: t.key }).expect(200)).body;
    expect(attached.hasPhoto).toBe(true);
    expect(JSON.stringify(attached)).not.toContain(t.key); // the key itself is never returned
    const read = (await call('get', `/students/${s.id}/photo`).expect(200)).body;
    expect(read).toMatchObject({ expiresInSeconds: 300 });
    expect(read.url).toContain(t.key);
  });

  it('a new photo replaces the old one and the old object is deleted', async () => {
    const s = await admit();
    const one = (await call('post', `/students/${s.id}/photo/upload-url`).send({ contentType: 'image/png', sizeBytes: 10 }).expect(200)).body.key;
    upload(one, 'image/png', 10);
    await call('put', `/students/${s.id}/photo`).send({ key: one }).expect(200);
    const two = (await call('post', `/students/${s.id}/photo/upload-url`).send({ contentType: 'image/webp', sizeBytes: 20 }).expect(200)).body.key;
    upload(two, 'image/webp', 20);
    await call('put', `/students/${s.id}/photo`).send({ key: two }).expect(200);
    expect(objects.has(one)).toBe(false);
    expect(objects.has(two)).toBe(true);
  });

  it('refuses a key that is not this student\'s own path, another school\'s key, a wrong stored type, and bad requests', async () => {
    const s = await admit();
    const other = await admit();
    const foreign = `schools/${B()}/students/${s.id}/photo/${randomUUID()}.png`;
    const sibling = `schools/${A()}/students/${other.id}/photo/${randomUUID()}.png`;
    const traversal = `schools/${A()}/students/${s.id}/photo/../../../${B()}/x.png`;
    for (const key of [foreign, sibling, traversal, 'anything.png']) {
      upload(key, 'image/png', 5);
      await call('put', `/students/${s.id}/photo`).send({ key }).expect(400);
    }
    const own = (await call('post', `/students/${s.id}/photo/upload-url`).send({ contentType: 'image/png', sizeBytes: 5 }).expect(200)).body.key;
    upload(own, 'text/html', 5); // somebody got a non-image into the slot
    await call('put', `/students/${s.id}/photo`).send({ key: own }).expect(400);
    await call('post', `/students/${s.id}/photo/upload-url`).send({ contentType: 'application/pdf', sizeBytes: 5 }).expect(400); // photos are images
    await call('post', `/students/${s.id}/photo/upload-url`).send({ contentType: 'image/png', sizeBytes: 3 * 1024 * 1024 }).expect(400); // over 2 MB
    await call('post', `/students/${s.id}/photo/upload-url`).send({ contentType: 'image/png', sizeBytes: 0 }).expect(400);
  });

  it('documents: ticket, attach with kind and a cleaned name, list shows metadata only, signed download, remove deletes the object', async () => {
    const s = await admit();
    const t = (await call('post', `/students/${s.id}/documents/upload-url`).send({ contentType: 'application/pdf', sizeBytes: 90_000 }).expect(200)).body;
    expect(t.key).toMatch(new RegExp(`^schools/${A()}/students/${s.id}/documents/[0-9a-f-]{36}\\.pdf$`));
    upload(t.key, 'application/pdf', 90_000);
    const after = (await call('post', `/students/${s.id}/documents`).send({ key: t.key, kind: 'BIRTH_CERTIFICATE', fileName: 'C:\\scans\\birth "cert".pdf' }).expect(201)).body;
    expect(after.documents).toHaveLength(1);
    expect(after.documents[0]).toMatchObject({ kind: 'BIRTH_CERTIFICATE', fileName: 'birth _cert_.pdf', contentType: 'application/pdf', sizeBytes: 90_000 });
    expect(JSON.stringify(after)).not.toContain(t.key);
    const docId = after.documents[0].id;
    const read = (await call('get', `/students/${s.id}/documents/${docId}/url`).expect(200)).body;
    expect(read.url).toContain(t.key);
    expect(read.url).toContain('name=birth _cert_.pdf');
    await call('delete', `/students/${s.id}/documents/${docId}`).expect(204);
    expect(objects.has(t.key)).toBe(false);
    await call('delete', `/students/${s.id}/documents/${docId}`).expect(404);
    await call('get', `/students/${s.id}/documents/${docId}/url`).expect(404);
  });

  it('documents: at most 30 per student, unknown kind refused, a key used for the photo cannot be a document', async () => {
    const s = await admit();
    // 29 documents are recorded straight through the database operation (fast); the 30th goes through the API, the 31st is refused.
    for (let i = 0; i < 29; i++) {
      await w!.db.addStudentDocument({ schoolId: A().replaceAll('-', ''), id: randomUUID(), studentId: s.id, kind: 'OTHER' as never, fileKey: `schools/${A()}/students/${s.id}/documents/${randomUUID()}.png`, fileName: `d${i}.png`, contentType: 'image/png', sizeBytes: 5, actorId: acad().uid });
    }
    const last = (await call('post', `/students/${s.id}/documents/upload-url`).send({ contentType: 'image/png', sizeBytes: 5 }).expect(200)).body.key;
    upload(last, 'image/png', 5);
    await call('post', `/students/${s.id}/documents`).send({ key: last, kind: 'OTHER', fileName: 'last.png' }).expect(201);
    await call('post', `/students/${s.id}/documents/upload-url`).send({ contentType: 'image/png', sizeBytes: 5 }).expect(409);
    const s2 = await admit();
    const k2 = (await call('post', `/students/${s2.id}/documents/upload-url`).send({ contentType: 'image/png', sizeBytes: 5 }).expect(200)).body.key;
    upload(k2, 'image/png', 5);
    await call('post', `/students/${s2.id}/documents`).send({ key: k2, kind: 'PASSPORT', fileName: 'x.png' }).expect(400);
    const photoKey = (await call('post', `/students/${s2.id}/photo/upload-url`).send({ contentType: 'image/png', sizeBytes: 5 }).expect(200)).body.key;
    upload(photoKey, 'image/png', 5);
    await call('post', `/students/${s2.id}/documents`).send({ key: photoKey, kind: 'OTHER', fileName: 'x.png' }).expect(400);
  }, 120_000); // 29 database writes in a row took the whole 30 s on a busy CI runner

  it("another school's staff cannot get a ticket, attach, read or delete files of A's student; B's token with A's header is refused", async () => {
    const s = await admit();
    const t = (await call('post', `/students/${s.id}/documents/upload-url`).send({ contentType: 'image/png', sizeBytes: 5 }).expect(200)).body.key;
    upload(t, 'image/png', 5);
    const doc = (await call('post', `/students/${s.id}/documents`).send({ key: t, kind: 'OTHER', fileName: 'a.png' }).expect(201)).body.documents[0];
    const b = w!.roles.B.ACADEMIC_ADMIN;
    await call('post', `/students/${s.id}/photo/upload-url`, b, B()).send({ contentType: 'image/png', sizeBytes: 5 }).expect(404);
    await call('post', `/students/${s.id}/documents`, b, B()).send({ key: t, kind: 'OTHER', fileName: 'a.png' }).expect(404);
    await call('get', `/students/${s.id}/documents/${doc.id}/url`, b, B()).expect(404);
    await call('delete', `/students/${s.id}/documents/${doc.id}`, b, B()).expect(404);
    await call('get', `/students/${s.id}/photo`, b, A()).expect(403);
    expect(objects.has(t)).toBe(true);
  });

  it('roles: Principal may read files but not change them; Teacher and Parent get nothing; no private storage means 503 (never the public bucket)', async () => {
    const s = await admit();
    const k = (await call('post', `/students/${s.id}/documents/upload-url`).send({ contentType: 'image/png', sizeBytes: 5 }).expect(200)).body.key;
    upload(k, 'image/png', 5);
    const doc = (await call('post', `/students/${s.id}/documents`).send({ key: k, kind: 'OTHER', fileName: 'p.png' }).expect(201)).body.documents[0];
    await call('get', `/students/${s.id}/documents/${doc.id}/url`, w!.roles.A.PRINCIPAL).expect(200);
    await call('post', `/students/${s.id}/documents/upload-url`, w!.roles.A.PRINCIPAL).send({ contentType: 'image/png', sizeBytes: 5 }).expect(403);
    await call('delete', `/students/${s.id}/documents/${doc.id}`, w!.roles.A.PRINCIPAL).expect(403);
    await call('get', `/students/${s.id}/documents/${doc.id}/url`, w!.roles.A.TEACHER).expect(404);
    await call('get', `/students/${s.id}/photo`, w!.roles.A.PARENT).expect(404);
    await call('get', `/students/${s.id}/photo`, w!.roles.A.DRIVER).expect(403);
    await call('post', `/students/${s.id}/photo/upload-url`, acad(), A(), unconfigured!).send({ contentType: 'image/png', sizeBytes: 5 }).expect(503);
    await call('get', `/students/${s.id}/photo`, acad(), A(), unconfigured!).expect(503);
  });

  it('audit: attach and remove left rows by the verified actor; issuing a ticket or reading wrote none', async () => {
    const rows = async (a: string) => (await w!.db.listAuditLog({ schoolId: A().replaceAll('-', ''), limit: 300, offset: 0 })).data.auditLogs.filter((r) => r.action === a);
    for (const a of ['student.photo.set', 'student.document.add', 'student.document.remove']) expect((await rows(a)).length, a).toBeGreaterThan(0);
    expect((await rows('student.document.add')).every((r) => r.actor.id === acad().uid)).toBe(true);
    expect(await rows('student.photo.ticket')).toEqual([]);
  });
});
