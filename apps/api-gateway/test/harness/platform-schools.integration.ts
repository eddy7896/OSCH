// P1-6b against the REAL stack: SUPER_ADMIN manages schools; effects are visible to members through the real guards.
import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Permission } from '../../src/permission/permission.decorator.js';
import { agent } from '../support/serve.js';
import { bootRealApp } from './app.js';
import { requireEmulatorsOrSkip } from './emulators.js';
import { randomUUID } from 'node:crypto';
import { buildWorld, signIn, type World } from './fixtures.js';

@Controller('probe')
class Probe {
  @Permission('students', 'read') @Get('students') students() { return { ok: true }; }
}

const ready = requireEmulatorsOrSkip();
let app: INestApplication | undefined;
let w: World | undefined;
if (ready) {
  app = await bootRealApp([Probe], { TENANT_CACHE_TTL_MS: '30000' }); // cache ON: suspension must still bite at once
  w = await buildWorld();
}

describe.skipIf(!ready)('/v1/platform/schools against the real emulators (P1-6b)', () => {
  const admin = () => w!.superAdmin.token;
  const call = (method: 'get' | 'post' | 'patch', path: string, token = admin()) => agent(app!)[method](`/v1/platform/schools${path}`).set('Authorization', `Bearer ${token}`);
  const sub = (s: string) => `${s}-${w!.tag}`;
  const audit = async (id: string) => (await w!.db.listAuditLog({ schoolId: id.replaceAll('-', ''), limit: 100, offset: 0 })).data.auditLogs;

  let school: { id: string };
  it('creates a school: 201, canonical id, ACTIVE, and the audit row is there in the same breath', async () => {
    const res = await call('post', '', admin()).send({ name: '  Green Valley School ', subDomain: sub('greenvalley'), defaultLanguage: 'hi' }).expect(201);
    school = res.body;
    expect(res.body).toMatchObject({ name: 'Green Valley School', subDomain: sub('greenvalley'), status: 'ACTIVE', defaultLanguage: 'hi' });
    expect(res.body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    const rows = (await audit(school.id)).filter((a) => a.action === 'platform.school.create');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.actor.id).toBe(w!.superAdmin.uid);
  });

  it('reads it back by id and in the list', async () => {
    expect((await call('get', `/${school.id}`).expect(200)).body).toMatchObject({ id: school.id, subDomain: sub('greenvalley') });
    const list = (await call('get', '?limit=100').expect(200)).body;
    expect(list.items.map((s: { id: string }) => s.id)).toContain(school.id);
    expect((await call('get', '?limit=1&offset=0').expect(200)).body.items).toHaveLength(1);
  });

  it('a taken subdomain is 409 CONFLICT and leaves no audit row behind', async () => {
    const before = (await audit(school.id)).length;
    const res = await call('post', '').send({ name: 'Copycat', subDomain: sub('greenvalley'), defaultLanguage: 'en' }).expect(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(JSON.stringify(res.body)).not.toMatch(/unique|sql|constraint|school_subDomain/i);
    expect((await audit(school.id)).length).toBe(before);
  });

  it.each([
    ['reserved subdomain', { name: 'X School', subDomain: 'www', defaultLanguage: 'en' }],
    ['upper-case subdomain', { name: 'X School', subDomain: 'Upper', defaultLanguage: 'en' }],
    ['unsupported language', { name: 'X School', subDomain: 'okname', defaultLanguage: 'xx' }],
    ['client-chosen id', { name: 'X School', subDomain: 'okname', defaultLanguage: 'en', id: '11111111-1111-4111-8111-111111111111' }],
    ['client-chosen status', { name: 'X School', subDomain: 'okname', defaultLanguage: 'en', subscriptionStatus: 'ACTIVE' }],
  ])('rejects %s with 400', async (_n, body) => {
    expect((await call('post', '').send(body).expect(400)).body.error.code).toBe('INVALID_REQUEST');
  });

  it('updates the name and language with an audit row of only what changed; empty update is 400; the subdomain cannot change', async () => {
    const res = await call('patch', `/${school.id}`).send({ name: 'Green Valley Public School' }).expect(200);
    expect(res.body).toMatchObject({ name: 'Green Valley Public School', defaultLanguage: 'hi', subDomain: sub('greenvalley') });
    const row = (await audit(school.id)).find((a) => a.action === 'school.update')!;
    expect(row.details).toEqual({ name: 'Green Valley Public School' });
    await call('patch', `/${school.id}`).send({}).expect(400);
    await call('patch', `/${school.id}`).send({ subDomain: 'other' }).expect(400);
  });

  it('unknown school: 404 for read, update and status change; a malformed id is 400', async () => {
    const ghost = '99999999-9999-4999-8999-999999999999';
    await call('get', `/${ghost}`).expect(404);
    await call('patch', `/${ghost}`).send({ name: 'Nope' }).expect(404);
    await call('post', `/${ghost}/suspend`).send({}).expect(404);
    await call('get', '/not-a-uuid').expect(400);
  });

  it('suspending bites immediately, even with the membership cache on; activating restores access', async () => {
    const member = w!.roles.A.PRINCIPAL; // a real user ...
    await w!.db.createSchoolMember({ schoolId: school.id, userId: member.uid, schoolRole: 'PRINCIPAL' as never }); // ... made a member of the new school
    const probe = () => agent(app!).get('/v1/probe/students').set('Authorization', `Bearer ${member.token}`).set('X-School-Id', school.id);
    await probe().expect(200); // allowed, and now cached
    const meBefore = (await agent(app!).get('/v1/me').set('Authorization', `Bearer ${member.token}`).set('X-School-Id', school.id).expect(200)).body;
    expect(meBefore.activeSchool?.schoolId).toBe(school.id);

    expect((await call('post', `/${school.id}/suspend`).send({ reason: 'unpaid invoice' }).expect(200)).body.status).toBe('SUSPENDED');
    expect((await probe().expect(403)).body.error.code).toBe('SCHOOL_SUSPENDED');
    const meDuring = (await agent(app!).get('/v1/me').set('Authorization', `Bearer ${member.token}`).set('X-School-Id', school.id).expect(200)).body;
    expect(meDuring.activeSchool).toBeNull();

    const status = (await audit(school.id)).filter((a) => a.action === 'platform.school.status');
    expect(status).toHaveLength(1);
    expect(status[0]!.details).toMatchObject({ status: 'SUSPENDED', from: 'ACTIVE', reason: 'unpaid invoice' });

    await call('post', `/${school.id}/suspend`).send({}).expect(200); // idempotent
    expect((await audit(school.id)).filter((a) => a.action === 'platform.school.status')).toHaveLength(1);

    expect((await call('post', `/${school.id}/activate`).send({}).expect(200)).body.status).toBe('ACTIVE');
    await probe().expect(200);
    expect((await audit(school.id)).filter((a) => a.action === 'platform.school.status')).toHaveLength(2);
  });

  it('only a SUPER_ADMIN: school staff of any role and signed-in outsiders get 403 on every platform route', async () => {
    for (const token of [w!.roles.A.PRINCIPAL.token, w!.roles.A.SYSTEM_ADMIN.token, w!.outsider.token]) {
      await call('get', '', token).expect(403);
      await call('post', '', token).send({ name: 'Nope School', subDomain: sub('nope'), defaultLanguage: 'en' }).expect(403);
      await call('post', `/${school.id}/suspend`, token).send({}).expect(403);
    }
    expect((await call('get', `/${school.id}`).expect(200)).body.status).toBe('ACTIVE');
  });
});

describe.skipIf(!ready)('the first System Admin of a school (/v1/platform/schools/:id/admins)', () => {
  afterAll(async () => app?.close()); // the last block of this file closes the shared app
  const owner = () => w!.superAdmin.token;
  const newSchool = async () => {
    const id = randomUUID();
    await w!.db.provisionSchool({ id, name: 'First admin school', subDomain: `fa${randomUUID().slice(0, 10)}`, defaultLanguage: 'en', actorId: w!.superAdmin.uid });
    return id;
  };
  const post = (id: string, body: object, token = owner()) => agent(app!).post(`/v1/platform/schools/${id}/admins`).set('Authorization', `Bearer ${token}`).send(body);
  const members = async (id: string) => (await w!.db.listMemberships({ schoolId: id.replaceAll('-', '') })).data.schoolMembers;
  const identityBase = () => `http://${process.env['FIREBASE_AUTH_EMULATOR_HOST']}/identitytoolkit.googleapis.com/v1/accounts`;
  const email = () => `first-admin-${randomUUID().slice(0, 10)}@example.com`;

  it('creates the account and an ACTIVE SYSTEM_ADMIN membership, audited by the platform owner, and the person can then use the school', async () => {
    const id = await newSchool();
    const address = email();
    const res = await post(id, { displayName: 'Asha Principal', email: address }).expect(201);
    expect(res.body).toMatchObject({ displayName: 'Asha Principal', email: address, role: 'SYSTEM_ADMIN', status: 'ACTIVE', signIn: 'EMAIL', nextStep: 'SEND_SET_PASSWORD_EMAIL' });
    expect(JSON.stringify(res.body)).not.toMatch(/"password"|oobCode|resetLink|resetUrl/i);

    expect((await members(id)).map((m) => [m.user.id, m.schoolRole, m.status])).toEqual([[res.body.userId, 'SYSTEM_ADMIN', 'ACTIVE']]);
    const rows = (await w!.db.listAuditLog({ schoolId: id.replaceAll('-', ''), limit: 50, offset: 0 })).data.auditLogs.filter((a) => a.action === 'platform.school.admin.create');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.actor.id).toBe(w!.superAdmin.uid);
    expect(JSON.stringify(rows[0]!.details)).not.toContain(address);

    // The person sets their own password through Firebase (the Auth emulator stands in); then their token works for that school.
    const localId = res.body.userId as string;
    await fetch(`${identityBase()}:update?key=fake`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }, body: JSON.stringify({ localId, password: 'pw123456' }) });
    const token = await signIn(address);
    const me = (await agent(app!).get('/v1/me').set('Authorization', `Bearer ${token}`).set('X-School-Id', id).expect(200)).body;
    expect(me.activeSchool).toMatchObject({ schoolId: id, role: 'SYSTEM_ADMIN' });
  });

  it('a second one is refused (409) and creates no account: after that the school grants roles itself', async () => {
    const id = await newSchool();
    await post(id, { displayName: 'First', email: email() }).expect(201);
    const address = email();
    const res = await post(id, { displayName: 'Second', email: address }).expect(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect((await members(id)).length).toBe(1);
    expect(await signIn(address)).toBeUndefined(); // no Firebase account was left behind
  });

  it('an address that already has an account is never touched: 409 ACCOUNT_EXISTS', async () => {
    const res = await post(await newSchool(), { displayName: 'Dup', email: w!.roles.A.TEACHER.email }).expect(409);
    expect(res.body.error.code).toBe('ACCOUNT_EXISTS');
  });

  it('an unknown school is 404, and neither an email nor a phone is a 400', async () => {
    await post(randomUUID(), { displayName: 'X', email: email() }).expect(404);
    expect((await post(await newSchool(), { displayName: 'X' }).expect(400)).body.error.code).toBe('INVALID_REQUEST');
  });

  it('the role is not chosen by the caller: any role or school field in the body is a 400', async () => {
    const id = await newSchool();
    for (const extra of [{ schoolRole: 'PRINCIPAL' }, { role: 'SYSTEM_ADMIN' }, { schoolId: w!.schools.B }, { globalRole: 'SUPER_ADMIN' }])
      await post(id, { displayName: 'X', email: email(), ...extra }).expect(400);
    expect((await members(id)).length).toBe(0);
  });

  it('only the platform owner: school staff of every role and outsiders get 403, and nothing is created', async () => {
    const id = await newSchool();
    for (const token of [w!.roles.A.PRINCIPAL.token, w!.roles.A.SYSTEM_ADMIN.token, w!.roles.B.SYSTEM_ADMIN.token, w!.outsider.token]) await post(id, { displayName: 'X', email: email() }, token).expect(403);
    expect((await members(id)).length).toBe(0);
  });

  it('the database enforces what it can see: a missing school or a school that already has an admin is refused even if the gateway were bypassed', async () => {
    const id = await newSchool();
    const user = `direct-${randomUUID()}`;
    await w!.db.upsertUser({ id: user, email: `${user}@example.com` });
    await expect(w!.db.provisionSchoolAdmin({ schoolId: randomUUID(), userId: user, actorId: w!.superAdmin.uid })).rejects.toBeTruthy(); // no such school
    await w!.db.provisionSchoolAdmin({ schoolId: id, userId: user, actorId: w!.superAdmin.uid });
    const other = `direct-${randomUUID()}`;
    await w!.db.upsertUser({ id: other, email: `${other}@example.com` });
    await expect(w!.db.provisionSchoolAdmin({ schoolId: id, userId: other, actorId: w!.superAdmin.uid })).rejects.toBeTruthy(); // already has one
    expect((await members(id)).length).toBe(1);
  });
});
