// The generated client (@oruschools/api-client) against the REAL gateway, real tokens, real database: the contract in use.
import type { INestApplication } from '@nestjs/common';
import { ApiError, createApi } from '@oruschools/api-client';
import { randomUUID } from 'node:crypto';
import { baseUrl } from '../support/serve.js';
import { bootRealApp } from './app.js';
import { requireEmulatorsOrSkip } from './emulators.js';
import { buildWorld, type Person, type World } from './fixtures.js';

const ready = requireEmulatorsOrSkip();
let app: INestApplication | undefined;
let w: World | undefined;
if (ready) {
  app = await bootRealApp();
  w = await buildWorld();
}

describe.skipIf(!ready)('@oruschools/api-client against the real gateway', () => {
  afterAll(async () => app?.close());
  const as = (who: Person | undefined, school?: string, extra: Record<string, unknown> = {}) => createApi({ baseUrl: baseUrl(app!), getToken: () => who?.token, getSchoolId: () => school, ...extra });
  const err = async (p: Promise<unknown>) => (await p.then(() => undefined, (e: unknown) => e)) as ApiError;

  it('public lookup works signed out; /me returns the typed profile; a platform owner creates a school', async () => {
    const owner = as(w!.superAdmin);
    const sub = `client-${randomUUID().slice(0, 8)}`;
    const created = await owner.platformSchoolsCreate({ body: { name: 'Client School', subDomain: sub, defaultLanguage: 'ta' } });
    expect(created).toMatchObject({ name: 'Client School', subDomain: sub, status: 'ACTIVE', defaultLanguage: 'ta' });

    const found = await as(undefined).publicSchoolsBySubdomain({ path: { sub } });
    expect(found).toEqual({ id: created.id, name: 'Client School', subDomain: sub, defaultLanguage: 'ta' });

    const me = await owner.meGet({});
    expect(me.user.globalRole).toBe('SUPER_ADMIN');
    expect(me.platform?.permissions['platform_schools']).toBeDefined();
    expect((await owner.platformSchoolsList({ query: { limit: 100 } })).items.some((s) => s.id === created.id)).toBe(true);
  });

  it('a School Admin works through the active school: the client adds the header, the role matrix decides', async () => {
    const admin = as(w!.roles.A.SYSTEM_ADMIN, w!.schools.A);
    const list = await admin.membershipsList({});
    expect(list.items.length).toBeGreaterThanOrEqual(15);

    const me = await admin.meGet({}); // the same client sends the active school to /me too
    expect(me.activeSchool).toMatchObject({ schoolId: w!.schools.A, role: 'SYSTEM_ADMIN' });

    const account = await admin.accountsCreate({ body: { displayName: 'Client Driver', schoolRole: 'DRIVER', phoneNumber: `+9197${Math.floor(10_000_000 + Math.random() * 89_999_999)}` } });
    expect(account).toMatchObject({ role: 'DRIVER', signIn: 'PHONE', nextStep: 'NONE' });
  });

  it('refusals arrive as ApiError with the code, status and request id the UI needs', async () => {
    const teacher = as(w!.roles.A.TEACHER, w!.schools.A);
    const forbidden = await err(teacher.membershipsList({}));
    expect(forbidden).toBeInstanceOf(ApiError);
    expect(forbidden).toMatchObject({ code: 'FORBIDDEN', status: 403 });
    expect(forbidden.requestId).toMatch(/^[0-9a-f-]{36}$/);

    // cross-tenant: a member of B naming A
    expect(await err(as(w!.roles.B.SYSTEM_ADMIN, w!.schools.A).membershipsList({}))).toMatchObject({ code: 'FORBIDDEN' });
    // a member of a suspended school
    expect(await err(as(w!.memberOfSuspendedSchool, w!.schools.SUSPENDED).meGet({}).then(() => as(w!.memberOfSuspendedSchool, w!.schools.SUSPENDED).membershipsList({})))).toMatchObject({ code: 'SCHOOL_SUSPENDED' });
    // not found, conflict, validation with field problems
    expect(await err(as(w!.superAdmin).platformSchoolsGet({ path: { id: '99999999-9999-4999-8999-999999999999' } }))).toMatchObject({ code: 'NOT_FOUND', status: 404 });
    const invalid = await err(as(w!.superAdmin).platformSchoolsCreate({ body: { name: 'x', subDomain: 'www', defaultLanguage: 'zz' as never } }));
    expect(invalid).toMatchObject({ code: 'INVALID_REQUEST', status: 400 });
    expect(invalid.details?.map((d) => d.field).sort()).toEqual(['defaultLanguage', 'name', 'subDomain']);
  });

  it('a school route with no active school never reaches the network', async () => {
    const e = await err(as(w!.roles.A.SYSTEM_ADMIN, undefined).membershipsList({}));
    expect(e).toMatchObject({ code: 'SCHOOL_REQUIRED', status: 0 });
  });

  it('an expired token is replaced once, for real: the gateway answers 401, the client asks for a fresh token and succeeds', async () => {
    const asked: boolean[] = [];
    const api = createApi({ baseUrl: baseUrl(app!), getToken: ({ forceRefresh }) => (asked.push(forceRefresh), forceRefresh ? w!.outsider.token : 'expired.or.garbage') });
    expect((await api.meGet({})).user.id).toBe(w!.outsider.uid);
    expect(asked).toEqual([false, true]);
  });

  it('signed out, a protected route is AUTH_REQUIRED and needsSignIn', async () => {
    const e = await err(as(undefined).meGet({}));
    expect(e).toMatchObject({ code: 'AUTH_REQUIRED', status: 401, needsSignIn: true });
  });

  it('invitations through the client: create, then the newcomer accepts', async () => {
    const { verifiedNewcomer } = await import('./fixtures.js');
    const newcomer = await verifiedNewcomer('viaclient');
    const admin = as(w!.roles.A.SYSTEM_ADMIN, w!.schools.A);
    const inv = await admin.invitationsCreate({ body: { email: newcomer.email, schoolRole: 'STAFF' } });
    expect(inv.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const accepted = await as(newcomer).invitationsAccept({ body: { token: inv.token } });
    expect(accepted).toEqual({ school: { id: w!.schools.A, name: 'School A' }, role: 'STAFF' });
    expect(await err(as(newcomer).invitationsAccept({ body: { token: inv.token } }))).toMatchObject({ code: 'INVITATION_INVALID', status: 400 });
  });

  it('a throttled request is RATE_LIMITED with a retry-after the UI can show', async () => {
    const limited = await bootRealApp([], { THROTTLE_LIMIT: '3' });
    try {
      const api = createApi({ baseUrl: baseUrl(limited), getToken: () => w!.outsider.token });
      for (let i = 0; i < 3; i++) await api.meGet({});
      const e = await err(api.meGet({}));
      expect(e).toMatchObject({ code: 'RATE_LIMITED', status: 429, retryable: true });
      expect(e.retryAfterSeconds).toBeGreaterThan(0);
    } finally {
      await limited.close();
    }
  });
});
