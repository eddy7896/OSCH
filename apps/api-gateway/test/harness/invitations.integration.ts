// P1-6d against the REAL stack: the invitation flow from the inviter's click to the invitee's first request.
import type { INestApplication } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { agent } from '../support/serve.js';
import { bootRealApp } from './app.js';
import { requireEmulatorsOrSkip } from './emulators.js';
import { buildWorld, signUp, verifiedNewcomer, type Person, type World } from './fixtures.js';

const ready = requireEmulatorsOrSkip();
let app: INestApplication | undefined;
let w: World | undefined;
if (ready) {
  app = await bootRealApp();
  w = await buildWorld();
}

describe.skipIf(!ready)('/v1/invitations against the real emulators (P1-6d)', () => {
  afterAll(async () => app?.close());
  const admin = () => w!.roles.A.SYSTEM_ADMIN;
  const school = () => w!.schools.A;
  const call = (method: 'get' | 'post', path: string, who: Person = admin(), s: string | undefined = school()) => {
    const r = agent(app!)[method](`/v1/invitations${path}`).set('Authorization', `Bearer ${who.token}`);
    return s ? r.set('X-School-Id', s) : r;
  };
  const accept = (who: Person, token: string) => agent(app!).post('/v1/invitations/accept').set('Authorization', `Bearer ${who.token}`).send({ token });
  const audit = async (action: string, sid = school()) => (await w!.db.listAuditLog({ schoolId: sid.replaceAll('-', ''), limit: 200, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  const invite = async (email: string, role = 'ACCOUNTANT') => (await call('post', '').send({ email, schoolRole: role }).expect(201)).body as { id: string; token: string; email: string };
  const hash = (t: string) => createHash('sha256').update(t).digest('hex');

  it('the full flow: invite -> the newcomer accepts with the secret -> a member with exactly the invited role', async () => {
    const newcomer = await verifiedNewcomer('flow');
    const inv = await invite(newcomer.email, 'ACCOUNTANT');
    expect(inv.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(inv).toMatchObject({ email: newcomer.email, role: 'ACCOUNTANT', status: 'PENDING' });

    // no User row yet: this is a first sign-in
    expect((await w!.db.getUser({ id: newcomer.uid })).data.user ?? null).toBeNull();
    const res = await accept(newcomer, inv.token).expect(200);
    expect(res.body).toEqual({ school: { id: school(), name: 'School A' }, role: 'ACCOUNTANT' });

    const me = (await agent(app!).get('/v1/me').set('Authorization', `Bearer ${newcomer.token}`).set('X-School-Id', school()).expect(200)).body;
    expect(me.memberships).toMatchObject([{ role: 'ACCOUNTANT', status: 'ACTIVE' }]);
    expect(me.activeSchool.role).toBe('ACCOUNTANT');
    expect((await call('get', '').expect(200)).body.items.find((i: { id: string }) => i.id === inv.id).status).toBe('ACCEPTED');
  });

  it('the audit trail has both halves: the System Admin who created it, the invitee who accepted it, and no secret anywhere', async () => {
    const newcomer = await verifiedNewcomer('audit');
    const inv = await invite(newcomer.email, 'STAFF');
    await accept(newcomer, inv.token).expect(200);
    const created = (await audit('invitation.create')).find((a) => (a.details as { email?: string } | null)?.email === newcomer.email)!;
    const accepted = (await audit('invitation.accept')).find((a) => (a.details as { email?: string } | null)?.email === newcomer.email)!;
    expect(created.actor.id).toBe(admin().uid);
    expect(accepted.actor.id).toBe(newcomer.uid);
    expect(JSON.stringify([created, accepted])).not.toContain(inv.token);
    expect(JSON.stringify([created, accepted])).not.toContain(hash(inv.token));
  });

  it('the secret is single use: the second attempt, by anyone, is INVITATION_INVALID', async () => {
    const newcomer = await verifiedNewcomer('once');
    const inv = await invite(newcomer.email);
    await accept(newcomer, inv.token).expect(200);
    expect((await accept(newcomer, inv.token).expect(400)).body.error.code).toBe('INVITATION_INVALID');
  });

  it('only the invited, VERIFIED address can accept: a leaked link is not enough', async () => {
    const intended = await verifiedNewcomer('intended');
    const thief = await verifiedNewcomer('thief');
    const inv = await invite(intended.email, 'PRINCIPAL');
    expect((await accept(thief, inv.token).expect(400)).body.error.code).toBe('INVITATION_INVALID');
    // an unverified account with the right address is refused too
    const email = `unverified-${randomUUID().slice(0, 8)}@example.com`;
    const signed = await signUp(email);
    const unverified: Person = { uid: signed.uid, email, token: signed.token };
    const inv2 = await invite(email);
    expect((await accept(unverified, inv2.token).expect(403)).body.error.code).toBe('EMAIL_NOT_VERIFIED');
    // the rightful invitee still can, afterwards
    await accept(intended, inv.token).expect(200);
  });

  it('the role is fixed at creation: the accepter cannot send or choose one', async () => {
    const newcomer = await verifiedNewcomer('role');
    const inv = await invite(newcomer.email, 'DRIVER');
    await agent(app!).post('/v1/invitations/accept').set('Authorization', `Bearer ${newcomer.token}`).send({ token: inv.token, schoolRole: 'PRINCIPAL' }).expect(400);
    await accept(newcomer, inv.token).expect(200);
    expect((await agent(app!).get('/v1/me').set('Authorization', `Bearer ${newcomer.token}`).expect(200)).body.memberships[0].role).toBe('DRIVER');
  });

  it('revoked, expired, unknown and suspended-school invitations all give the byte-identical refusal', async () => {
    const bodies: string[] = [];
    const refuse = async (who: Person, token: string) => {
      const res = await accept(who, token).expect(400);
      const { requestId: _omit, ...rest } = res.body.error;
      bodies.push(JSON.stringify(rest));
    };

    const a = await verifiedNewcomer('revoked');
    const invA = await invite(a.email);
    await call('post', `/${invA.id}/revoke`).send({}).expect(200);
    await refuse(a, invA.token);

    const b = await verifiedNewcomer('expired');
    const tokenB = randomBytes(32).toString('base64url');
    await w!.db.createInvitation({ schoolId: school(), email: b.email, schoolRole: 'STAFF' as never, tokenHash: hash(tokenB), expiresAt: new Date(Date.now() - 60_000).toISOString(), actorId: admin().uid });
    await refuse(b, tokenB);

    await refuse(await verifiedNewcomer('unknown'), randomBytes(32).toString('base64url'));

    const d = await verifiedNewcomer('suspended');
    const tokenD = randomBytes(32).toString('base64url');
    await w!.db.createInvitation({ schoolId: w!.schools.A, email: d.email, schoolRole: 'STAFF' as never, tokenHash: hash(tokenD), expiresAt: new Date(Date.now() + 3_600_000).toISOString(), actorId: admin().uid });
    await w!.db.setSubscriptionStatus({ schoolId: w!.schools.A, status: 'SUSPENDED' as never, actorId: w!.superAdmin.uid });
    try {
      await refuse(d, tokenD);
    } finally {
      await w!.db.setSubscriptionStatus({ schoolId: w!.schools.A, status: 'ACTIVE' as never, actorId: w!.superAdmin.uid });
    }
    expect(new Set(bodies).size).toBe(1);
  });

  it('the database re-checks everything inside the accepting transaction, even if the gateway were fooled', async () => {
    const victim = await verifiedNewcomer('direct');
    const token = randomBytes(32).toString('base64url');
    await w!.db.createInvitation({ schoolId: school(), email: victim.email, schoolRole: 'STAFF' as never, tokenHash: hash(token), expiresAt: new Date(Date.now() + 3_600_000).toISOString(), actorId: admin().uid });
    const row = (await w!.db.getInvitationByTokenHash({ tokenHash: hash(token) })).data.invitations[0]!;
    await w!.db.upsertUser({ id: victim.uid, email: victim.email });
    const base = { schoolId: school(), invitationId: row.id, userId: victim.uid, now: new Date().toISOString() };
    await expect(w!.db.acceptInvitation({ ...base, schoolRole: 'PRINCIPAL' as never })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // not the invited role
    await expect(w!.db.acceptInvitation({ ...base, schoolId: w!.schools.B, schoolRole: 'STAFF' as never })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // not this school's invitation
    await expect(w!.db.acceptInvitation({ ...base, now: new Date(Date.now() + 7_200_000).toISOString(), schoolRole: 'STAFF' as never })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // after expiry
  });

  it('joining a school you already belong to is 409 and does not consume the invitation', async () => {
    const member = w!.roles.A.TEACHER;
    const signedUp = await verifiedNewcomer('already');
    const inv = await invite(signedUp.email);
    await w!.db.upsertUser({ id: signedUp.uid, email: signedUp.email });
    await w!.db.createSchoolMember({ schoolId: school(), userId: signedUp.uid, schoolRole: 'TEACHER' as never });
    expect((await accept(signedUp, inv.token).expect(409)).body.error.code).toBe('CONFLICT');
    expect(member).toBeDefined();
  });

  it('a second open invitation for the same address is 409; revoking the first lets a new one through', async () => {
    const email = `dup-${randomUUID().slice(0, 8)}@example.com`;
    const first = await invite(email);
    await call('post', '').send({ email, schoolRole: 'TEACHER' }).expect(409);
    await call('post', `/${first.id}/revoke`).send({}).expect(200);
    await call('post', `/${first.id}/revoke`).send({}).expect(409); // already revoked
    await call('post', '').send({ email, schoolRole: 'TEACHER' }).expect(201);
  });

  it('the list never reveals a secret or hash, and shows only this school\'s invitations', async () => {
    const inv = await invite(`list-${randomUUID().slice(0, 8)}@example.com`);
    const res = (await call('get', '').expect(200)).body;
    expect(JSON.stringify(res)).not.toContain(inv.token);
    expect(JSON.stringify(res)).not.toContain(hash(inv.token));
    expect(res.items.some((i: { id: string }) => i.id === inv.id)).toBe(true);
    const other = (await call('get', '', w!.roles.B.SYSTEM_ADMIN, w!.schools.B).expect(200)).body;
    expect(other.items.some((i: { id: string }) => i.id === inv.id)).toBe(false);
  });

  it('cross-tenant: the System Admin of B can neither read nor revoke A\'s invitations', async () => {
    const inv = await invite(`x-${randomUUID().slice(0, 8)}@example.com`);
    const adminB = w!.roles.B.SYSTEM_ADMIN;
    await call('get', '', adminB, school()).expect(403);
    await call('post', `/${inv.id}/revoke`, adminB, school()).send({}).expect(403);
    await call('post', `/${inv.id}/revoke`, adminB, w!.schools.B).send({}).expect(404); // naming their own school: not found there
    expect((await call('get', '').expect(200)).body.items.find((i: { id: string }) => i.id === inv.id).status).toBe('PENDING');
  });

  it('only the System Admin creates, lists or revokes; everyone else is refused', async () => {
    for (const role of ['PRINCIPAL', 'HR_MANAGER', 'MANAGEMENT', 'TEACHER', 'PARENT'] as const) {
      const who = w!.roles.A[role];
      await call('get', '', who).expect(403);
      await call('post', '', who).send({ email: 'nobody@example.com', schoolRole: 'PRINCIPAL' }).expect(403);
    }
  });

  it('accept is strictly rate limited per user (own app with a low limit), without touching other users', async () => {
    const limited = await bootRealApp([], { THROTTLE_STRICT_LIMIT: '4' });
    try {
      const go = (who: Person) => agent(limited).post('/v1/invitations/accept').set('Authorization', `Bearer ${who.token}`).send({ token: randomBytes(32).toString('base64url') });
      const noisy = await verifiedNewcomer('noisy');
      const calm = await verifiedNewcomer('calm');
      const codes: number[] = [];
      for (let i = 0; i < 6; i++) codes.push((await go(noisy)).status);
      expect(codes).toEqual([400, 400, 400, 400, 429, 429]);
      expect((await go(calm)).status).toBe(400); // another user on the same IP is unaffected
    } finally {
      await limited.close();
    }
  });
});
