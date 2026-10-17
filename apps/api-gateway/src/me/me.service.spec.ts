import { UserSyncService } from '../users/user-sync.service.js';
import { MeService } from './me.service.js';

const S1 = '11111111-1111-4111-8111-111111111111';
const S2 = '22222222-2222-4222-8222-222222222222';
const bare = (s: string) => s.replaceAll('-', '');

interface Row { id: string; email: string; displayName?: string | null; language?: string | null }
function setup(opts: { user?: Row; memberships?: Array<{ id: string; role: string; status?: string; school?: string; defaultLanguage?: string }> } = {}) {
  let row: Row | undefined = opts.user;
  const calls = { upsert: [] as Array<Record<string, unknown>>, setLanguage: [] as Array<Record<string, unknown>>, getUser: 0 };
  const db = {
    getUser: async () => (calls.getUser++, { data: { user: row } }),
    upsertUser: async (v: { id: string; email: string }) => { calls.upsert.push(v); row = { ...row, id: v.id, email: v.email }; return {}; },
    listMembershipsForUser: async () => ({
      data: {
        schoolMembers: (opts.memberships ?? []).map((m) => ({ schoolRole: m.role, status: m.status ?? 'ACTIVE', school: { id: bare(m.id), name: `School ${m.id.slice(0, 2)}`, subDomain: `s${m.id.slice(0, 2)}`, subscriptionStatus: m.school ?? 'ACTIVE', defaultLanguage: m.defaultLanguage ?? 'en' } })),
      },
    }),
    setUserLanguage: async (v: Record<string, unknown>) => { calls.setLanguage.push(v); return {}; },
  };
  return { svc: new MeService(db as never, new UserSyncService(db as never)), calls };
}
const user = (over: Record<string, unknown> = {}) => ({ uid: 'u1', email: 'a@example.com', emailVerified: true, globalRole: 'USER' as const, ...over });

describe('MeService.me', () => {
  it('creates the user row on first sight and does not touch it again while the email is unchanged', async () => {
    const { svc, calls } = setup();
    await svc.me(user(), undefined);
    expect(calls.upsert).toEqual([{ id: 'u1', email: 'a@example.com' }]);
    await svc.me(user(), undefined);
    expect(calls.upsert).toHaveLength(1);
  });

  it('refreshes the row when Firebase says the email changed', async () => {
    const { svc, calls } = setup({ user: { id: 'u1', email: 'old@example.com' } });
    const out = await svc.me(user(), undefined);
    expect(calls.upsert).toEqual([{ id: 'u1', email: 'a@example.com' }]);
    expect(out.user.email).toBe('a@example.com');
  });

  it('gives a phone-only sign-in a reserved .invalid placeholder email (User.email is required)', async () => {
    const { svc, calls } = setup();
    await svc.me(user({ email: undefined }), undefined);
    expect(calls.upsert[0]).toEqual({ id: 'u1', email: 'u1@no-email.invalid' });
  });

  it('lists every membership with its status, and the user globalRole comes from the verified token only', async () => {
    const { svc } = setup({ user: { id: 'u1', email: 'a@example.com' }, memberships: [{ id: S1, role: 'TEACHER' }, { id: S2, role: 'PARENT', status: 'SUSPENDED' }] });
    const out = await svc.me(user(), undefined);
    expect(out.memberships.map((m) => [m.role, m.status])).toEqual([['TEACHER', 'ACTIVE'], ['PARENT', 'SUSPENDED']]);
    expect(out.user.globalRole).toBe('USER');
    expect(out.activeSchool).toBeNull();
    expect(out.platform).toBeNull();
  });

  it('active school: permissions and navigation of the role in the school named by the header', async () => {
    const { svc } = setup({ user: { id: 'u1', email: 'a@example.com' }, memberships: [{ id: S1, role: 'PRINCIPAL' }] });
    const out = await svc.me(user(), S1);
    expect(out.activeSchool).toMatchObject({ schoolId: S1, role: 'PRINCIPAL' });
    expect(out.activeSchool!.permissions['students']?.['read']).toBe('school');
    expect(out.activeSchool!.permissions['memberships']).toBeUndefined(); // only the System Admin
    expect(out.activeSchool!.navigation.flatMap((s) => s.items.map((i) => i.key))).toContain('students');
  });

  it('a TEACHER gets own-scope grants but not the school-wide ERP sidebar items', async () => {
    const { svc } = setup({ user: { id: 'u1', email: 'a@example.com' }, memberships: [{ id: S1, role: 'TEACHER' }] });
    const out = await svc.me(user(), S1);
    expect(out.activeSchool!.permissions['students']?.['read']).toBe('own');
    expect(out.activeSchool!.navigation.flatMap((s) => s.items.map((i) => i.key))).not.toContain('students');
  });

  it('is case-insensitive on the header and matches the database uuid format', async () => {
    const { svc } = setup({ user: { id: 'u1', email: 'a@example.com' }, memberships: [{ id: S1, role: 'TEACHER' }] });
    expect((await svc.me(user(), S1.toUpperCase())).activeSchool?.schoolId).toBe(S1);
  });

  it.each([
    ['a school the user does not belong to', S2, [{ id: S1, role: 'TEACHER' }]],
    ['a school that does not exist', '99999999-9999-4999-8999-999999999999', [{ id: S1, role: 'TEACHER' }]],
    ['a suspended membership', S1, [{ id: S1, role: 'TEACHER', status: 'SUSPENDED' }]],
    ['a suspended school', S1, [{ id: S1, role: 'TEACHER', school: 'SUSPENDED' }]],
    ['an unknown role string', S1, [{ id: S1, role: 'GOD' }]],
    ['a malformed header', 'not-a-uuid', [{ id: S1, role: 'TEACHER' }]],
  ])('active school is null (identical, no hint) for %s', async (_n, header, memberships) => {
    const { svc } = setup({ user: { id: 'u1', email: 'a@example.com' }, memberships });
    expect((await svc.me(user(), header)).activeSchool).toBeNull();
  });

  it('a SUPER_ADMIN gets platform access only (platform_schools), never school data', async () => {
    const { svc } = setup({ user: { id: 'u1', email: 'a@example.com' } });
    const out = await svc.me(user({ globalRole: 'SUPER_ADMIN' }), undefined);
    expect(Object.keys(out.platform!.permissions)).toEqual(['platform_schools']);
    expect(out.activeSchool).toBeNull();
  });

  it('language: the explicit choice wins, then the active school default, then English; never the browser', async () => {
    const withLang = setup({ user: { id: 'u1', email: 'a@example.com', language: 'ur' }, memberships: [{ id: S1, role: 'TEACHER', defaultLanguage: 'hi' }] });
    expect((await withLang.svc.me(user(), S1)).language).toEqual({ chosen: 'ur', effective: 'ur' });
    const school = setup({ user: { id: 'u1', email: 'a@example.com' }, memberships: [{ id: S1, role: 'TEACHER', defaultLanguage: 'hi' }] });
    expect((await school.svc.me(user(), S1)).language).toEqual({ chosen: null, effective: 'hi' });
    expect((await school.svc.me(user(), undefined)).language).toEqual({ chosen: null, effective: 'en' });
  });
});

describe('MeService.setLanguage', () => {
  it('stores the choice, and null clears it', async () => {
    const { svc, calls } = setup({ user: { id: 'u1', email: 'a@example.com' } });
    expect(await svc.setLanguage(user(), 'ur')).toEqual({ language: 'ur' });
    expect(await svc.setLanguage(user(), null)).toEqual({ language: null });
    expect(calls.setLanguage).toEqual([{ userId: 'u1', language: 'ur' }, { userId: 'u1', language: null }]);
  });

  it('makes sure the user row exists first', async () => {
    const { svc, calls } = setup();
    await svc.setLanguage(user(), 'hi');
    expect(calls.upsert).toHaveLength(1);
  });
});
