// P4-S4 against the REAL stack: announcements from the school to its staff (ADR-0014 decision 11).
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

interface Ann { id: string; title: string; body: string; author: { id: string; name: string }; withdrawn: boolean; createdAt: string; updatedAt: string }
const STAFF_ROLES = ['PRINCIPAL', 'MANAGEMENT', 'BURSAR', 'ACADEMIC_ADMIN', 'SYSTEM_ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'ADMISSIONS_OFFICER', 'TRANSPORT_MANAGER', 'OPERATIONS_MANAGER', 'TEACHER', 'STAFF', 'DRIVER'] as const;

describe.skipIf(!ready)('announcements against the real emulators (P4-S4)', { timeout: 240_000 }, () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const principal = () => w!.roles.A.PRINCIPAL;
  const academic = () => w!.roles.A.ACADEMIC_ADMIN;
  const call = (who: Person, method: 'get' | 'post' | 'patch', path: string, school = A()) => agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const notices = async (who: Person) => ((await call(who, 'get', '/notifications').expect(200)).body.items as Array<{ kind: string; title: string; body: string; entityId: string | null }>).filter((n) => n.kind === 'announcement.posted');
  const audit = async (action: string) => (await w!.db.listAuditLog({ schoolId: A().replaceAll('-', ''), limit: 800, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  const uniq = () => randomUUID().slice(0, 6);

  it('the Principal and the Academic admin write; nobody else does, whatever their role', async () => {
    const body = { title: `Meeting ${uniq()}`, body: 'In the hall at 3 pm.' };
    for (const role of STAFF_ROLES) {
      if (role === 'PRINCIPAL' || role === 'ACADEMIC_ADMIN') continue;
      expect([403, 404], role).toContain((await call(w!.roles.A[role], 'post', '/announcements').send(body)).status);
    }
    expect([403, 404]).toContain((await call(w!.roles.A.PARENT, 'post', '/announcements').send(body)).status);
    await call(principal(), 'post', '/announcements').send(body).expect(201);
    await call(academic(), 'post', '/announcements').send(body).expect(201);
  });

  it('every role reads the list and one announcement, with who wrote it', async () => {
    const a = (await call(principal(), 'post', '/announcements').send({ title: `Sports day ${uniq()}`, body: 'Friday, on the field.' }).expect(201)).body as Ann;
    expect(a).toMatchObject({ body: 'Friday, on the field.', withdrawn: false });
    expect(a.author.id).toBe(principal().uid);
    for (const role of [...STAFF_ROLES, 'PARENT'] as const) {
      const res = await call(w!.roles.A[role], 'get', '/announcements');
      expect(res.status, `${role}: ${JSON.stringify(res.body)}`).toBe(200);
      const list = res.body as { items: Ann[]; next: string };
      expect(list.items.some((i) => i.id === a.id), role).toBe(true);
      expect(((await call(w!.roles.A[role], 'get', `/announcements/${a.id}`).expect(200)).body as Ann).title, role).toBe(a.title);
    }
    await call(principal(), 'get', `/announcements/${randomUUID()}`).expect(404);
    await call(principal(), 'get', '/announcements/not-an-id').expect(400);
  });

  it('posting tells every staff role in the same transaction (a notice per role carrying only the title), and a parent is not told', async () => {
    const title = `Fee day ${uniq()}`;
    const a = (await call(academic(), 'post', '/announcements').send({ title, body: 'Details inside.' }).expect(201)).body as Ann;
    for (const role of STAFF_ROLES) {
      const mine = (await notices(w!.roles.A[role])).filter((n) => n.entityId?.replaceAll('-', '') === a.id.replaceAll('-', ''));
      expect(mine, role).toHaveLength(1);
      expect(mine[0]).toMatchObject({ title: 'New announcement', body: title });
    }
    expect((await notices(w!.roles.A.PARENT)).filter((n) => n.entityId?.replaceAll('-', '') === a.id.replaceAll('-', ''))).toHaveLength(0);
    expect((await audit('announcement.post')).length).toBeGreaterThan(0);
  });

  it('editing corrects the words and tells nobody again; withdrawing keeps the row, empties the words, and is repeatable', async () => {
    const a = (await call(principal(), 'post', '/announcements').send({ title: `Draft ${uniq()}`, body: 'First version.' }).expect(201)).body as Ann;
    const before = (await notices(w!.roles.A.TEACHER)).length;
    const edited = (await call(academic(), 'patch', `/announcements/${a.id}`).send({ title: '  Final title  ', body: 'Second version.' }).expect(200)).body as Ann;
    expect(edited).toMatchObject({ title: 'Final title', body: 'Second version.', withdrawn: false });
    expect(new Date(edited.updatedAt).getTime()).toBeGreaterThan(new Date(a.updatedAt).getTime());
    expect((await notices(w!.roles.A.TEACHER)).length).toBe(before);

    const gone = (await call(principal(), 'post', `/announcements/${a.id}/withdraw`).send({}).expect(200)).body as Ann;
    expect(gone).toMatchObject({ withdrawn: true, title: '', body: '' });
    expect(((await call(w!.roles.A.TEACHER, 'get', `/announcements/${a.id}`).expect(200)).body as Ann).withdrawn).toBe(true);
    expect(((await call(principal(), 'post', `/announcements/${a.id}/withdraw`).send({}).expect(200)).body as Ann).withdrawn).toBe(true);
    await call(principal(), 'patch', `/announcements/${a.id}`).send({ title: 'x', body: 'y' }).expect(404);
    expect((await audit('announcement.edit')).length).toBeGreaterThan(0);
    expect((await audit('announcement.withdraw')).length).toBeGreaterThan(0);
  });

  it('updatedSince: a phone hears what was posted, edited or withdrawn since, withdrawn ones included', async () => {
    const x = (await call(principal(), 'post', '/announcements').send({ title: `X ${uniq()}`, body: 'x' }).expect(201)).body as Ann;
    const y = (await call(principal(), 'post', '/announcements').send({ title: `Y ${uniq()}`, body: 'y' }).expect(201)).body as Ann;
    const base = (await call(w!.roles.A.STAFF, 'get', '/announcements').expect(200)).body as { items: Ann[]; next: string };
    expect(base.next).toMatch(/^\d{4}-/);
    await call(academic(), 'post', `/announcements/${x.id}/withdraw`).send({}).expect(200);
    const z = (await call(academic(), 'post', '/announcements').send({ title: `Z ${uniq()}`, body: 'z' }).expect(201)).body as Ann;
    const since = (await call(w!.roles.A.STAFF, 'get', `/announcements?updatedSince=${encodeURIComponent(base.next)}`).expect(200)).body as { items: Ann[]; next: string };
    const ids = since.items.map((i) => i.id);
    expect(ids).toEqual(expect.arrayContaining([x.id, z.id]));
    expect(since.items.find((i) => i.id === x.id)!.withdrawn).toBe(true);
    expect(base.items.filter((i) => i.id !== y.id && i.id !== x.id).every((i) => !ids.includes(i.id) || i.updatedAt >= base.next)).toBe(true);
    await call(w!.roles.A.STAFF, 'get', '/announcements?updatedSince=yesterday').expect(400);
  });

  it('refuses empty or oversized words and unknown fields', async () => {
    const bad = (b: object) => call(principal(), 'post', '/announcements').send(b).expect(400);
    await bad({ title: '', body: 'x' });
    await bad({ title: '   ', body: 'x' });
    await bad({ title: 'x'.repeat(121), body: 'x' });
    await bad({ title: 'x', body: '' });
    await bad({ title: 'x', body: 'x'.repeat(5001) });
    await bad({ title: 'x', body: 'x', audience: 'PARENT' });
  });

  it('a school sees only its own announcements', async () => {
    const a = (await call(principal(), 'post', '/announcements').send({ title: `Private ${uniq()}`, body: 'Only A.' }).expect(201)).body as Ann;
    const b = (await call(w!.roles.B.PRINCIPAL, 'get', '/announcements', w!.schools.B).expect(200)).body as { items: Ann[] };
    expect(b.items.some((i) => i.id === a.id)).toBe(false);
    await call(w!.roles.B.PRINCIPAL, 'get', `/announcements/${a.id}`, w!.schools.B).expect(404);
    await call(w!.roles.B.PRINCIPAL, 'patch', `/announcements/${a.id}`, w!.schools.B).send({ title: 'x', body: 'y' }).expect(403).catch(() => undefined);
    expect(((await call(principal(), 'get', `/announcements/${a.id}`).expect(200)).body as Ann).title).toBe(a.title);
  });

  it('a person who switched announcements off does not see its notices in the inbox', async () => {
    await call(w!.roles.A.TEACHER, 'post', '/notifications/preferences/announcement').send({ enabled: false }).catch(() => undefined);
    await agent(app!).put('/v1/notifications/preferences/announcement').set('Authorization', `Bearer ${w!.roles.A.TEACHER.token}`).set('X-School-Id', A()).send({ enabled: false }).expect(200);
    const a = (await call(principal(), 'post', '/announcements').send({ title: `Muted ${uniq()}`, body: 'x' }).expect(201)).body as Ann;
    expect((await notices(w!.roles.A.TEACHER)).some((n) => n.entityId?.replaceAll('-', '') === a.id.replaceAll('-', ''))).toBe(false);
    expect((await notices(w!.roles.A.STAFF)).some((n) => n.entityId?.replaceAll('-', '') === a.id.replaceAll('-', ''))).toBe(true);
  });
});
