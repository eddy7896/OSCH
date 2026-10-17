// P1-6c against the REAL stack: the System Admin manages who may sign in and as what; effects reach the guards at once.
import { Controller, Get, type INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Permission } from '../../src/permission/permission.decorator.js';
import { agent } from '../support/serve.js';
import { bootRealApp } from './app.js';
import { requireEmulatorsOrSkip } from './emulators.js';
import { buildWorld, signIn, type Person, type World } from './fixtures.js';

@Controller('probe')
class Probe {
  @Permission('students', 'read') @Get('students') students() { return { ok: true }; }
}

const ready = requireEmulatorsOrSkip();
let app: INestApplication | undefined;
let w: World | undefined;
if (ready) {
  app = await bootRealApp([Probe], { TENANT_CACHE_TTL_MS: '30000' }); // cache ON: role/suspension changes must still bite at once
  w = await buildWorld();
}

describe.skipIf(!ready)('/v1/memberships against the real emulators (P1-6c)', () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const admin = () => w!.roles.A.SYSTEM_ADMIN;
  const call = (method: 'get' | 'post' | 'patch' | 'delete', path: string, who: Person = admin(), school = A()) => agent(app!)[method](`/v1/memberships${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const audit = async (action: string) => (await w!.db.listAuditLog({ schoolId: A().replaceAll('-', ''), limit: 200, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  const newUser = async (): Promise<Person> => {
    const email = `new-${randomUUID().slice(0, 8)}@example.com`;
    const res = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'pw123456', returnSecureToken: true }) });
    const b = (await res.json()) as { localId: string; idToken: string };
    await w!.db.upsertUser({ id: b.localId, email });
    return { uid: b.localId, email, token: b.idToken };
  };
  const probe = (who: Person) => agent(app!).get('/v1/probe/students').set('Authorization', `Bearer ${who.token}`).set('X-School-Id', A());

  it('lists exactly this school\'s members: all 14 roles plus the suspended one, none of school B', async () => {
    const items = (await call('get', '').expect(200)).body.items as Array<{ userId: string; role: string; status: string }>;
    expect(items.filter((i) => i.status === 'ACTIVE' && Object.values(w!.roles.A).some((p) => p.uid === i.userId))).toHaveLength(14);
    expect(items.find((i) => i.userId === w!.suspendedMember.uid)?.status).toBe('SUSPENDED');
    expect(items.some((i) => Object.values(w!.roles.B).some((p) => p.uid === i.userId))).toBe(false);
    expect(items[0]).toEqual(expect.objectContaining({ email: expect.any(String), since: expect.any(String) }));
  });

  it('adds an existing user: 201, audited with the verified actor, and they can use the school at once', async () => {
    const u = await newUser();
    await probe(u).expect(403); // not a member yet (and the denial is not cached)
    const res = await call('post', '').send({ userId: u.uid, schoolRole: 'TEACHER' }).expect(201);
    expect(res.body).toMatchObject({ userId: u.uid, role: 'TEACHER', status: 'ACTIVE', email: u.email });
    await probe(u).expect(200);
    const row = (await audit('membership.add')).find((a) => a.details && (a.details as { userId?: string } | null)?.userId === u.uid)!;
    expect(row.actor.id).toBe(admin().uid);
    expect(row.details).toEqual({ userId: u.uid, schoolRole: 'TEACHER' });
  });

  it('a duplicate add is 409 and leaves no extra audit row; an unknown uid is 404', async () => {
    const u = await newUser();
    await call('post', '').send({ userId: u.uid, schoolRole: 'STAFF' }).expect(201);
    const before = (await audit('membership.add')).length;
    expect((await call('post', '').send({ userId: u.uid, schoolRole: 'TEACHER' }).expect(409)).body.error.code).toBe('CONFLICT');
    await call('post', '').send({ userId: 'no-such-user', schoolRole: 'TEACHER' }).expect(404);
    expect((await audit('membership.add')).length).toBe(before);
  });

  it('suspending bites at once even with the cache on; a role change is visible at once; restoring works', async () => {
    const u = await newUser();
    await call('post', '').send({ userId: u.uid, schoolRole: 'TEACHER' }).expect(201);
    await probe(u).expect(200); // allowed and cached
    await call('patch', `/${u.uid}`).send({ status: 'SUSPENDED' }).expect(200);
    await probe(u).expect(403);
    await call('patch', `/${u.uid}`).send({ status: 'ACTIVE' }).expect(200);
    await probe(u).expect(200);
    await call('patch', `/${u.uid}`).send({ schoolRole: 'DRIVER' }).expect(200); // a DRIVER has no students:read
    await probe(u).expect(403);
    const rows = (await audit('membership.update')).filter((a) => (a.details as { userId?: string } | null)?.userId === u.uid);
    expect(rows).toHaveLength(3);
    expect(rows[0]!.details).toMatchObject({ from: expect.any(Object), to: expect.any(Object) });
  });

  it('only the System Admin: every other role is refused, including the Principal and HR (privilege-escalation guard)', async () => {
    const target = w!.roles.A.STAFF;
    for (const role of ['PRINCIPAL', 'HR_MANAGER', 'MANAGEMENT', 'BURSAR', 'ACADEMIC_ADMIN', 'TEACHER'] as const) {
      const who = w!.roles.A[role];
      await call('get', '', who).expect(403);
      await call('post', '', who).send({ userId: target.uid, schoolRole: 'PRINCIPAL' }).expect(403);
      await call('patch', `/${target.uid}`, who).send({ schoolRole: 'PRINCIPAL' }).expect(403);
      await call('delete', `/${target.uid}`, who).expect(403);
    }
    expect((await call('get', '').expect(200)).body.items.find((i: { userId: string }) => i.userId === target.uid).role).toBe('STAFF');
  });

  it('nobody changes their own membership, so a school cannot lock out or promote its own System Admin through the API', async () => {
    const me = admin();
    for (const res of [await call('patch', `/${me.uid}`).send({ schoolRole: 'PRINCIPAL' }), await call('patch', `/${me.uid}`).send({ status: 'SUSPENDED' }), await call('delete', `/${me.uid}`), await call('post', '').send({ userId: me.uid, schoolRole: 'PRINCIPAL' })]) {
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CANNOT_CHANGE_OWN_MEMBERSHIP');
    }
    const items = (await call('get', '').expect(200)).body.items as Array<{ userId: string; role: string; status: string }>;
    expect(items.find((i) => i.userId === me.uid)).toMatchObject({ role: 'SYSTEM_ADMIN', status: 'ACTIVE' });
  });

  it('cross-tenant: a System Admin of school B cannot see or touch school A members, whichever header they send', async () => {
    const adminB = w!.roles.B.SYSTEM_ADMIN;
    const target = w!.roles.A.TEACHER;
    await call('get', '', adminB, A()).expect(403); // not a member of A
    await call('patch', `/${target.uid}`, adminB, A()).send({ status: 'SUSPENDED' }).expect(403);
    await call('delete', `/${target.uid}`, adminB, A()).expect(403);
    // Naming their own school B, the user is simply not a member there: 404, and A is untouched.
    await call('patch', `/${target.uid}`, adminB, w!.schools.B).send({ status: 'SUSPENDED' }).expect(404);
    await call('delete', `/${target.uid}`, adminB, w!.schools.B).expect(404);
    const items = (await call('get', '').expect(200)).body.items as Array<{ userId: string; status: string }>;
    expect(items.find((i) => i.userId === target.uid)?.status).toBe('ACTIVE');
  });

  it('removes a member: 204, audited with what they were, and access ends at once', async () => {
    const u = await newUser();
    await call('post', '').send({ userId: u.uid, schoolRole: 'ACCOUNTANT' }).expect(201);
    await call('delete', `/${u.uid}`).expect(204);
    await call('delete', `/${u.uid}`).expect(404); // already gone
    const row = (await audit('membership.remove')).find((a) => (a.details as { userId?: string } | null)?.userId === u.uid)!;
    expect(row.details).toMatchObject({ role: 'ACCOUNTANT', status: 'ACTIVE' });
    const me = (await agent(app!).get('/v1/me').set('Authorization', `Bearer ${await signIn(u.email)}`).expect(200)).body;
    expect(me.memberships).toEqual([]);
  });

  it('rejects bad input: unknown role, SUPER_ADMIN as a school role, smuggled schoolId, empty update', async () => {
    const u = await newUser();
    await call('post', '').send({ userId: u.uid, schoolRole: 'GOD' }).expect(400);
    await call('post', '').send({ userId: u.uid, schoolRole: 'SUPER_ADMIN' }).expect(400);
    await call('post', '').send({ userId: u.uid, schoolRole: 'STAFF', schoolId: w!.schools.B }).expect(400);
    await call('patch', `/${w!.roles.A.STAFF.uid}`).send({}).expect(400);
    await call('patch', `/${w!.roles.A.STAFF.uid}`).send({ status: 'DELETED' }).expect(400);
  });
});
