// P1-6a against the REAL stack: real Data Connect (user sync, memberships, language) and real Auth tokens.
import type { INestApplication } from '@nestjs/common';
import { permissionsOf } from '@oruschools/rbac';
import { bootRealApp } from './app.js';
import { requireEmulatorsOrSkip } from './emulators.js';
import { buildWorld, type World, type Person } from './fixtures.js';
import { agent } from '../support/serve.js';

const ready = requireEmulatorsOrSkip();
let app: INestApplication | undefined;
let w: World | undefined;
if (ready) {
  app = await bootRealApp();
  w = await buildWorld();
}

describe.skipIf(!ready)('/v1/me against the real emulators (P1-6a)', () => {
  afterAll(async () => app?.close());
  const me = (p: Person, school?: string) => {
    const r = agent(app!).get('/v1/me').set('Authorization', `Bearer ${p.token}`);
    return school ? r.set('X-School-Id', school) : r;
  };
  const patch = (p: Person, body: object) => agent(app!).patch('/v1/me/preferences').set('Authorization', `Bearer ${p.token}`).send(body);

  it('returns the real membership, and the permissions it computes equal the rbac matrix for that role', async () => {
    const teacher = w!.roles.A.TEACHER;
    const res = await me(teacher, w!.schools.A).expect(200);
    expect(res.body.user).toMatchObject({ id: teacher.uid, email: teacher.email, globalRole: 'USER' });
    expect(res.body.memberships).toHaveLength(1);
    // The school id is the one the caller sends back as X-School-Id: canonical and dashed, like every other id the API speaks.
    expect(res.body.memberships[0].school.id).toMatch(/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
    expect(res.body.memberships[0]).toMatchObject({ role: 'TEACHER', status: 'ACTIVE', school: { name: 'School A', status: 'ACTIVE', defaultLanguage: 'en' } });
    expect(res.body.activeSchool).toMatchObject({ schoolId: w!.schools.A, role: 'TEACHER' });
    const flat = Object.entries(res.body.activeSchool.permissions as Record<string, Record<string, string>>).flatMap(([resource, acts]) => Object.entries(acts).map(([action, scope]) => `${resource}:${action}:${scope}`)).sort();
    expect(flat).toEqual(permissionsOf({ schoolRole: 'TEACHER' }).map((p) => `${p.resource}:${p.action}:${p.scope}`).sort());
  });

  it('naming another school, a missing school or a suspended membership gives activeSchool null with no hint', async () => {
    const p = w!.roles.A.PRINCIPAL;
    const none = (await me(p).expect(200)).body;
    for (const school of [w!.schools.B, '99999999-9999-4999-8999-999999999999']) {
      const other = (await me(p, school).expect(200)).body;
      expect(other.activeSchool).toBeNull();
      expect(other).toEqual(none);
    }
    const suspended = (await me(w!.suspendedMember, w!.schools.A).expect(200)).body;
    expect(suspended.activeSchool).toBeNull();
    expect(suspended.memberships[0].status).toBe('SUSPENDED');
  });

  it('a member of a suspended school sees it suspended and gets no active school', async () => {
    const res = await me(w!.memberOfSuspendedSchool, w!.schools.SUSPENDED).expect(200);
    expect(res.body.memberships[0].school.status).toBe('SUSPENDED');
    expect(res.body.activeSchool).toBeNull();
  });

  it('creates the User row on first sign-in for someone the world did not pre-create', async () => {
    // The world pre-created every fixture user; prove the path with a brand new Auth user.
    const email = `fresh-${w!.tag}@example.com`;
    const signUp = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'pw123456', returnSecureToken: true }) });
    const { localId, idToken } = (await signUp.json()) as { localId: string; idToken: string };
    expect((await w!.db.getUser({ id: localId })).data.user ?? null).toBeNull(); // the real emulator answers null, not undefined
    const res = await me({ uid: localId, email, token: idToken }).expect(200);
    expect(res.body.user).toMatchObject({ id: localId, email });
    expect(res.body.memberships).toEqual([]);
    expect((await w!.db.getUser({ id: localId })).data.user).toMatchObject({ id: localId, email });
  });

  it('refreshes a changed email without wiping the display name or the language choice', async () => {
    const p = w!.roles.A.STAFF;
    await w!.db.upsertUser({ id: p.uid, email: p.email, displayName: 'Asha K' });
    await patch(p, { language: 'ur' }).expect(200);
    await w!.db.upsertUser({ id: p.uid, email: `stale-${p.email}` }); // the stored email is now out of date
    const res = await me(p).expect(200);
    expect(res.body.user).toMatchObject({ email: p.email, displayName: 'Asha K' });
    expect(res.body.language).toEqual({ chosen: 'ur', effective: 'ur' });
  });

  it('stores the explicit language for real, null clears it, and the school default applies after', async () => {
    const p = w!.roles.A.ACCOUNTANT;
    expect((await patch(p, { language: 'hi' }).expect(200)).body).toEqual({ language: 'hi' });
    expect((await w!.db.getUser({ id: p.uid })).data.user?.language).toBe('hi');
    await patch(p, { language: null }).expect(200);
    expect((await me(p, w!.schools.A).expect(200)).body.language).toEqual({ chosen: null, effective: 'en' });
  });

  it('a user changes only their own preference', async () => {
    const a = w!.roles.A.DRIVER;
    const b = w!.roles.B.DRIVER;
    await patch(a, { language: 'ta' }).expect(200);
    expect((await w!.db.getUser({ id: b.uid })).data.user?.language ?? null).toBeNull();
  });

  it('SUPER_ADMIN gets platform access only, and no school permissions even when naming a school', async () => {
    const res = await me(w!.superAdmin, w!.schools.A).expect(200);
    expect(res.body.user.globalRole).toBe('SUPER_ADMIN');
    expect(Object.keys(res.body.platform.permissions)).toEqual(['platform_schools']);
    expect(res.body.activeSchool).toBeNull();
  });

  it('a user with a school role gets no platform access', async () => {
    expect((await me(w!.roles.A.SYSTEM_ADMIN).expect(200)).body.platform).toBeNull();
  });
});
