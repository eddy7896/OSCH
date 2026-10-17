import { MembershipsService } from './memberships.service.js';

const SCHOOL = '11111111-1111-4111-8111-111111111111';
const tenant = { schoolId: SCHOOL, userId: 'admin-1', schoolRole: 'SYSTEM_ADMIN' } as const;
const member = (id: string, role = 'TEACHER', status = 'ACTIVE') => ({ schoolRole: role, status, createdAt: '2026-10-17T00:00:00Z', user: { id, email: `${id}@example.com`, displayName: null, phoneNumber: null } });

function setup(members = [member('admin-1', 'SYSTEM_ADMIN'), member('t-1'), member('t-2', 'ACCOUNTANT', 'SUSPENDED')], knownUsers = ['u-new', 'admin-1', 't-1', 't-2']) {
  const calls = { add: [] as any[], update: [] as any[], remove: [] as any[], invalidated: [] as string[] };
  const rows = [...members];
  const db = {
    listMemberships: async () => ({ data: { schoolMembers: rows } }),
    getUser: async ({ id }: { id: string }) => ({ data: { user: knownUsers.includes(id) ? { id } : null } }),
    addMembership: async (v: any) => { calls.add.push(v); rows.push(member(v.userId, v.schoolRole)); return {}; },
    updateMembership: async (v: any) => { calls.update.push(v); const r = rows.find((x) => x.user.id === v.userId)!; r.schoolRole = v.schoolRole; r.status = v.status; return {}; },
    removeMembership: async (v: any) => { calls.remove.push(v); rows.splice(rows.findIndex((x) => x.user.id === v.userId), 1); return {}; },
  };
  const cache = { invalidate: (s: string, u: string) => calls.invalidated.push(`${s}:${u}`) };
  return { svc: new MembershipsService(db as never, cache as never), calls };
}

describe('MembershipsService', () => {
  it('lists the school members with role and status', async () => {
    const { svc } = setup();
    const out = await svc.list(tenant);
    expect(out.items.map((i) => [i.userId, i.role, i.status])).toEqual([['admin-1', 'SYSTEM_ADMIN', 'ACTIVE'], ['t-1', 'TEACHER', 'ACTIVE'], ['t-2', 'ACCOUNTANT', 'SUSPENDED']]);
  });

  it('adds an existing user with the verified actor and the school from the token, and drops any cached decision for them', async () => {
    const { svc, calls } = setup();
    const out = await svc.add(tenant, { userId: 'u-new', schoolRole: 'STAFF' });
    expect(calls.add[0]).toMatchObject({ schoolId: SCHOOL, userId: 'u-new', schoolRole: 'STAFF', actorId: 'admin-1', details: { userId: 'u-new', schoolRole: 'STAFF' } });
    expect(calls.invalidated).toEqual([`${SCHOOL}:u-new`]);
    expect(out).toMatchObject({ userId: 'u-new', role: 'STAFF', status: 'ACTIVE' });
  });

  it('adding a user that has no account is 404 and writes nothing', async () => {
    const { svc, calls } = setup();
    await expect(svc.add(tenant, { userId: 'ghost', schoolRole: 'STAFF' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(calls.add).toHaveLength(0);
  });

  it('update merges the missing field from the current membership and audits from/to', async () => {
    const { svc, calls } = setup();
    const out = await svc.update(tenant, 't-1', { status: 'SUSPENDED' });
    expect(calls.update[0]).toMatchObject({ userId: 't-1', schoolRole: 'TEACHER', status: 'SUSPENDED', actorId: 'admin-1', details: { userId: 't-1', from: { role: 'TEACHER', status: 'ACTIVE' }, to: { role: 'TEACHER', status: 'SUSPENDED' } } });
    expect(calls.invalidated).toEqual([`${SCHOOL}:t-1`]);
    expect(out.status).toBe('SUSPENDED');
  });

  it('an update that changes nothing writes nothing (no audit row, no cache churn)', async () => {
    const { svc, calls } = setup();
    await svc.update(tenant, 't-1', { schoolRole: 'TEACHER', status: 'ACTIVE' });
    expect(calls.update).toHaveLength(0);
    expect(calls.invalidated).toHaveLength(0);
  });

  it('an empty update is a 400', async () => {
    await expect(setup().svc.update(tenant, 't-1', {})).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
  });

  it('a user who is not a member of THIS school is 404 for update and remove', async () => {
    const { svc, calls } = setup();
    await expect(svc.update(tenant, 'someone-in-another-school', { status: 'SUSPENDED' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(svc.remove(tenant, 'someone-in-another-school')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(calls.update.length + calls.remove.length).toBe(0);
  });

  it('nobody changes their OWN membership: no self-promotion, no self-lockout, no self-add', async () => {
    const { svc, calls } = setup();
    for (const f of [() => svc.update(tenant, 'admin-1', { schoolRole: 'PRINCIPAL' }), () => svc.update(tenant, 'admin-1', { status: 'SUSPENDED' }), () => svc.remove(tenant, 'admin-1'), () => svc.add(tenant, { userId: 'admin-1', schoolRole: 'PRINCIPAL' })])
      await expect(f()).rejects.toMatchObject({ code: 'CANNOT_CHANGE_OWN_MEMBERSHIP' });
    expect(calls.update.length + calls.remove.length + calls.add.length).toBe(0);
  });

  it('removes a member with an audit record of what they were, and drops the cached decision', async () => {
    const { svc, calls } = setup();
    await svc.remove(tenant, 't-2');
    expect(calls.remove[0]).toMatchObject({ schoolId: SCHOOL, userId: 't-2', actorId: 'admin-1', details: { userId: 't-2', role: 'ACCOUNTANT', status: 'SUSPENDED' } });
    expect(calls.invalidated).toEqual([`${SCHOOL}:t-2`]);
  });
});
