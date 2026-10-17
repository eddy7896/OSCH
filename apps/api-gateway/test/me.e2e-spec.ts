// P1-6a through the real pipeline (fake data layer and tokens; the real-emulator proof is in the cross-tenant harness).
import type { INestApplication } from '@nestjs/common';
import { bootApp } from './support/boot.js';
import { agent } from './support/serve.js';

const S1 = '11111111-1111-4111-8111-111111111111';
const users = new Map<string, { id: string; email: string; displayName: string | null; language: string | null; globalRole: string }>();
const fakeDb = {
  getUser: async ({ id }: { id: string }) => ({ data: { user: users.get(id) } }),
  upsertUser: async (v: { id: string; email: string }) => { users.set(v.id, { displayName: null, language: null, globalRole: 'USER', ...users.get(v.id), ...v }); return {}; },
  listMembershipsForUser: async ({ userId }: { userId: string }) => ({ data: { schoolMembers: userId === 'u-teacher' ? [{ schoolRole: 'TEACHER', status: 'ACTIVE', school: { id: S1.replaceAll('-', ''), name: 'School One', subDomain: 'one', subscriptionStatus: 'ACTIVE', defaultLanguage: 'hi' } }] : [] } }),
  setUserLanguage: async ({ userId, language }: { userId: string; language: string | null }) => { users.get(userId)!.language = language; return {}; },
  getMembership: async () => ({ data: { schoolMembers: [] } }),
  listSchools: async () => ({ data: { schools: [] } }),
  createAuditLog: async () => ({ data: {} }),
};
const fakeAuth = { verifyIdToken: async (t: string) => (t === 'admin' ? { uid: 'u-admin', email: 'admin@example.com', globalRole: 'SUPER_ADMIN' } : { uid: `u-${t}`, email: `${t}@example.com` }) };

describe('GET /v1/me and PATCH /v1/me/preferences (P1-6a)', () => {
  let app: INestApplication;
  beforeAll(async () => (app = await bootApp({ db: fakeDb, auth: fakeAuth })));
  afterAll(async () => app.close());
  beforeEach(() => users.clear());
  const get = (who?: string, school?: string) => {
    const r = agent(app).get('/v1/me');
    if (who) r.set('Authorization', `Bearer ${who}`);
    if (school) r.set('X-School-Id', school);
    return r;
  };
  const patch = (body: unknown, who = 'teacher') => agent(app).patch('/v1/me/preferences').set('Authorization', `Bearer ${who}`).send(body as object);

  it('needs a sign-in', async () => {
    expect((await get().expect(401)).body.error.code).toBe('AUTH_REQUIRED');
    await agent(app).patch('/v1/me/preferences').send({ language: 'ur' }).expect(401);
  });

  it('returns the profile and memberships without needing any school', async () => {
    const res = await get('teacher').expect(200);
    expect(res.body.user).toMatchObject({ id: 'u-teacher', email: 'teacher@example.com', globalRole: 'USER' });
    expect(res.body.memberships).toEqual([{ school: { id: S1.replaceAll('-', ''), name: 'School One', subDomain: 'one', defaultLanguage: 'hi', status: 'ACTIVE' }, role: 'TEACHER', status: 'ACTIVE' }]);
    expect(res.body.activeSchool).toBeNull();
    expect(res.body.language).toEqual({ chosen: null, effective: 'en' });
  });

  it('adds permissions, navigation and the school default language when X-School-Id names the caller\'s school', async () => {
    const res = await get('teacher', S1).expect(200);
    expect(res.body.activeSchool).toMatchObject({ schoolId: S1, role: 'TEACHER' });
    expect(res.body.activeSchool.permissions.students.read).toBe('own');
    expect(res.body.language.effective).toBe('hi');
  });

  it('answers a school the caller is not in exactly like no school: activeSchool null, 200, no hint', async () => {
    const other = await get('teacher', '99999999-9999-4999-8999-999999999999').expect(200);
    const none = await get('teacher').expect(200);
    expect(other.body.activeSchool).toBeNull();
    expect({ ...other.body, language: 0 }).toEqual({ ...none.body, language: 0 });
  });

  it('shows platform access for a SUPER_ADMIN and nothing else', async () => {
    const res = await get('admin').expect(200);
    expect(Object.keys(res.body.platform.permissions)).toEqual(['platform_schools']);
    expect(res.body.user.globalRole).toBe('SUPER_ADMIN');
  });

  it('stores an explicit language, which then wins over the school default; null clears it', async () => {
    expect((await patch({ language: 'ur' }).expect(200)).body).toEqual({ language: 'ur' });
    expect((await get('teacher', S1).expect(200)).body.language).toEqual({ chosen: 'ur', effective: 'ur' });
    await patch({ language: null }).expect(200);
    expect((await get('teacher', S1).expect(200)).body.language).toEqual({ chosen: null, effective: 'hi' });
  });

  it.each([
    ['an unsupported language code', { language: 'xx' }],
    ['a missing language', {}],
    ['a number', { language: 5 }],
    ['an extra field (schoolId)', { language: 'ur', schoolId: S1 }],
    ['an attempt to set the global role', { language: 'ur', globalRole: 'SUPER_ADMIN' }],
  ])('rejects %s with 400', async (_n, body) => {
    const res = await patch(body).expect(400);
    expect(res.body.error.code).toBe('INVALID_REQUEST');
  });

  it('a user can only change their own preference: the target is always the verified uid', async () => {
    await get('teacher').expect(200);
    await get('student').expect(200);
    await patch({ language: 'ur' }, 'teacher').expect(200);
    expect(users.get('u-teacher')!.language).toBe('ur');
    expect(users.get('u-student')!.language).toBeNull();
  });
});
