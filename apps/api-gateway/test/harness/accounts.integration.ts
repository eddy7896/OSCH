// P1-ADR-0011 against the REAL stack: an admin creates staff and driver accounts; the person then signs in the way the
// real clients do (a set-password link for email, a one-time code for phone), using the Auth emulator's own endpoints.
import { Controller, Get, type INestApplication } from '@nestjs/common';
import { getAuth } from 'firebase-admin/auth';
import { getApps } from 'firebase-admin/app';
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
  app = await bootRealApp([Probe]);
  w = await buildWorld();
}

const HOST = () => process.env.FIREBASE_AUTH_EMULATOR_HOST!;
const PROJECT = 'demo-oruschools';
const post = async (path: string, body: object) => (await fetch(`http://${HOST()}/identitytoolkit.googleapis.com/v1/${path}?key=fake`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json() as Promise<Record<string, any>>;

/** What the web client does after the API says SEND_SET_PASSWORD_EMAIL: Firebase mails a link; the person opens it and sets a password. */
async function setPasswordViaEmailedLink(email: string, newPassword: string): Promise<void> {
  await post('accounts:sendOobCode', { requestType: 'PASSWORD_RESET', email });
  const { oobCodes } = (await (await fetch(`http://${HOST()}/emulator/v1/projects/${PROJECT}/oobCodes`)).json()) as { oobCodes: Array<{ email: string; requestType: string; oobCode: string }> };
  const mine = oobCodes.filter((c) => c.email === email && c.requestType === 'PASSWORD_RESET').at(-1)!;
  const done = await post('accounts:resetPassword', { oobCode: mine.oobCode, newPassword });
  if (done['error']) throw new Error(JSON.stringify(done['error']));
}

/** What the apps do for a phone-only person: ask for a code, read it from the SMS, sign in. */
async function signInWithPhoneCode(phoneNumber: string): Promise<{ uid: string; token: string }> {
  const { sessionInfo } = await post('accounts:sendVerificationCode', { phoneNumber, recaptchaToken: 'test' });
  const { verificationCodes } = (await (await fetch(`http://${HOST()}/emulator/v1/projects/${PROJECT}/verificationCodes`)).json()) as { verificationCodes: Array<{ phoneNumber: string; code: string; sessionInfo: string }> };
  const code = verificationCodes.filter((c) => c.sessionInfo === sessionInfo).at(-1)!.code;
  const res = await post('accounts:signInWithPhoneNumber', { sessionInfo, code });
  return { uid: res['localId'], token: res['idToken'] };
}

describe.skipIf(!ready)('POST /v1/memberships/accounts against the real emulators (ADR-0011)', () => {
  afterAll(async () => app?.close());
  const admin = () => w!.roles.A.SYSTEM_ADMIN;
  const A = () => w!.schools.A;
  const create = (body: object, who: Person = admin(), school = A()) => agent(app!).post('/v1/memberships/accounts').set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school).send(body);
  const auth = () => getAuth(getApps().find((a) => a.name === 'oruschools'));
  const probe = (token: string) => agent(app!).get('/v1/probe/students').set('Authorization', `Bearer ${token}`).set('X-School-Id', A());
  const phone = () => `+9198${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;

  it('email staff: the admin never sees a password or a link; the person sets their own through the emailed link and is in', async () => {
    const email = `teacher-${randomUUID().slice(0, 8)}@example.com`;
    const res = await create({ displayName: 'Asha Kumar', schoolRole: 'TEACHER', email }).expect(201);
    expect(res.body).toMatchObject({ displayName: 'Asha Kumar', email, role: 'TEACHER', status: 'ACTIVE', signIn: 'EMAIL', nextStep: 'SEND_SET_PASSWORD_EMAIL' });
    expect(Object.keys(res.body)).not.toEqual(expect.arrayContaining(['password']));
    expect(JSON.stringify(res.body)).not.toMatch(/"password"|oobCode|resetLink|https?:/i); // no secret and no link: a link given to the admin would let the admin take the account over

    const user = await auth().getUserByEmail(email);
    expect(user).toMatchObject({ uid: res.body.userId, displayName: 'Asha Kumar', emailVerified: false, disabled: false });
    for (const guess of [randomUUID(), randomUUID(), email]) expect((await post('accounts:signInWithPassword', { email, password: guess, returnSecureToken: true }))['error']).toBeDefined(); // nobody knows it

    const chosenByThePerson = `${randomUUID()}${randomUUID()}`; // made up at run time: no literal in the repo
    await setPasswordViaEmailedLink(email, chosenByThePerson);
    expect(await signIn(email)).toBeUndefined(); // the fixtures' shared test password does not work: only the person's own does
    const real = await post('accounts:signInWithPassword', { email, password: chosenByThePerson, returnSecureToken: true });
    expect(real['localId']).toBe(user.uid);

    const me = (await agent(app!).get('/v1/me').set('Authorization', `Bearer ${real['idToken']}`).set('X-School-Id', A()).expect(200)).body;
    expect(me.memberships).toMatchObject([{ role: 'TEACHER', status: 'ACTIVE' }]);
    expect(me.user).toMatchObject({ displayName: 'Asha Kumar', email });
    await probe(real['idToken']).expect(200); // a TEACHER may read students (own scope)
  });

  it('phone-only driver: no password exists; one-time code signs in as the pre-created account with the membership already waiting', async () => {
    const number = phone();
    const res = await create({ displayName: 'Ravi Driver', schoolRole: 'DRIVER', phoneNumber: number }).expect(201);
    expect(res.body).toMatchObject({ signIn: 'PHONE', nextStep: 'NONE', email: null, phoneNumber: number, role: 'DRIVER' });

    const user = await auth().getUserByPhoneNumber(number);
    expect(user.uid).toBe(res.body.userId);
    expect(user.email).toBeUndefined();
    expect(user.passwordHash).toBeUndefined();

    const signedIn = await signInWithPhoneCode(number);
    expect(signedIn.uid).toBe(res.body.userId); // OTP matched the pre-created account, not a new one
    const me = (await agent(app!).get('/v1/me').set('Authorization', `Bearer ${signedIn.token}`).set('X-School-Id', A()).expect(200)).body;
    expect(me.memberships).toMatchObject([{ role: 'DRIVER', status: 'ACTIVE' }]);
    expect(me.user.email).toBe(`${signedIn.uid}@no-email.invalid`);
    await probe(signedIn.token).expect(403); // a DRIVER has no students:read: the role is exactly what the admin chose
  });

  it('an address or number that already has an account is 409 ACCOUNT_EXISTS: nothing is created or changed, and the person is invited instead', async () => {
    const existing = w!.roles.B.TEACHER; // has an account in school B
    const before = (await agent(app!).get('/v1/me').set('Authorization', `Bearer ${existing.token}`).expect(200)).body.memberships.length;
    const res = await create({ displayName: 'Someone', schoolRole: 'STAFF', email: existing.email }).expect(409);
    expect(res.body.error.code).toBe('ACCOUNT_EXISTS');
    expect((await agent(app!).get('/v1/me').set('Authorization', `Bearer ${existing.token}`).expect(200)).body.memberships.length).toBe(before);

    const number = phone();
    await create({ displayName: 'First', schoolRole: 'DRIVER', phoneNumber: number }).expect(201);
    expect((await create({ displayName: 'Second', schoolRole: 'DRIVER', phoneNumber: number }).expect(409)).body.error.code).toBe('ACCOUNT_EXISTS');
  });

  it('audited as membership.add by the verified admin, flagged as an account, with no contact details or secret', async () => {
    const email = `audit-${randomUUID().slice(0, 8)}@example.com`;
    const res = await create({ displayName: 'Audit Person', schoolRole: 'ACCOUNTANT', email }).expect(201);
    const rows = (await w!.db.listAuditLog({ schoolId: A().replaceAll('-', ''), limit: 200, offset: 0 })).data.auditLogs;
    const row = rows.find((r) => r.action === 'membership.add' && (r.details as { userId?: string } | null)?.userId === res.body.userId)!;
    expect(row.actor.id).toBe(admin().uid);
    expect(row.details).toEqual({ userId: res.body.userId, schoolRole: 'ACCOUNTANT', via: 'account', signIn: 'EMAIL' });
    expect(JSON.stringify(row)).not.toContain(email);
  });

  it('only the System Admin: every other role is refused and no account is created', async () => {
    for (const role of ['PRINCIPAL', 'HR_MANAGER', 'MANAGEMENT', 'TEACHER', 'DRIVER'] as const) {
      const email = `denied-${role.toLowerCase()}-${randomUUID().slice(0, 6)}@example.com`;
      await create({ displayName: 'Nope', schoolRole: 'STAFF', email }, w!.roles.A[role]).expect(403);
      await expect(auth().getUserByEmail(email)).rejects.toMatchObject({ code: 'auth/user-not-found' });
    }
  });

  it('cross-tenant: school B\'s System Admin cannot create into school A, and the new account belongs to A only', async () => {
    const email = `cross-${randomUUID().slice(0, 8)}@example.com`;
    await create({ displayName: 'Cross', schoolRole: 'STAFF', email }, w!.roles.B.SYSTEM_ADMIN, A()).expect(403);
    await expect(auth().getUserByEmail(email)).rejects.toMatchObject({ code: 'auth/user-not-found' });
    const ok = await create({ displayName: 'Mine', schoolRole: 'STAFF', email: `mine-${randomUUID().slice(0, 8)}@example.com` }).expect(201);
    const inB = (await agent(app!).get('/v1/memberships').set('Authorization', `Bearer ${w!.roles.B.SYSTEM_ADMIN.token}`).set('X-School-Id', w!.schools.B).expect(200)).body.items;
    expect(inB.some((m: { userId: string }) => m.userId === ok.body.userId)).toBe(false);
  });

  it('bad input is a 400 and creates nothing: no contact, a parent, a password or id of the admin\'s choosing', async () => {
    const email = `bad-${randomUUID().slice(0, 8)}@example.com`;
    await create({ displayName: 'No contact', schoolRole: 'STAFF' }).expect(400);
    await create({ displayName: 'Parent', schoolRole: 'PARENT', email }).expect(400);
    await create({ displayName: 'Pw', schoolRole: 'STAFF', email, password: randomUUID() }).expect(400);
    await create({ displayName: 'Id', schoolRole: 'STAFF', email, userId: 'chosen-by-admin' }).expect(400);
    await expect(auth().getUserByEmail(email)).rejects.toMatchObject({ code: 'auth/user-not-found' });
  });

  it('account creation is strictly rate limited per admin (it answers 409 for an existing address, so it must not become a probing tool)', async () => {
    const limited = await bootRealApp([], { THROTTLE_STRICT_LIMIT: '3' });
    try {
      const go = () => agent(limited).post('/v1/memberships/accounts').set('Authorization', `Bearer ${admin().token}`).set('X-School-Id', A()).send({ displayName: 'Rate', schoolRole: 'STAFF', email: `rate-${randomUUID().slice(0, 8)}@example.com` });
      expect([(await go()).status, (await go()).status, (await go()).status]).toEqual([201, 201, 201]);
      expect((await go()).status).toBe(429);
    } finally {
      await limited.close();
    }
  });
});
