import { PlatformSchoolsService } from './platform-schools.service.js';

const ID = '11111111-1111-4111-8111-111111111111';
const actor = { uid: 'u-admin', email: 'admin@example.com', emailVerified: true, globalRole: 'SUPER_ADMIN' as const };

function setup(initial?: { status?: string }) {
  const rows = new Map<string, { id: string; name: string; subDomain: string; subscriptionStatus: string; defaultLanguage: string; createdAt: string }>();
  if (initial) rows.set(ID.replaceAll('-', ''), { id: ID.replaceAll('-', ''), name: 'Old', subDomain: 'old', subscriptionStatus: initial.status ?? 'ACTIVE', defaultLanguage: 'en', createdAt: '2026-10-17T00:00:00Z' });
  const calls = { provision: [] as any[], update: [] as any[], status: [] as any[], sync: 0, invalidated: [] as string[], publicInvalidated: [] as string[] };
  const db = {
    getSchool: async ({ schoolId }: { schoolId: string }) => ({ data: { school: rows.get(schoolId.replaceAll('-', '')) ?? null } }),
    listSchools: async () => ({ data: { schools: [...rows.values()] } }),
    provisionSchool: async (v: any) => { calls.provision.push(v); rows.set(v.id.replaceAll('-', ''), { id: v.id.replaceAll('-', ''), name: v.name, subDomain: v.subDomain, subscriptionStatus: 'ACTIVE', defaultLanguage: v.defaultLanguage, createdAt: 'now' }); return {}; },
    updateSchool: async (v: any) => { calls.update.push(v); const r = rows.get(v.schoolId.replaceAll('-', ''))!; r.name = v.name; r.defaultLanguage = v.defaultLanguage; return {}; },
    setSubscriptionStatus: async (v: any) => { calls.status.push(v); rows.get(v.schoolId.replaceAll('-', ''))!.subscriptionStatus = v.status; return {}; },
  };
  const users = { sync: async () => { calls.sync++; } };
  const memberships = { invalidateSchool: (id: string) => calls.invalidated.push(id) };
  const publicSchools = { invalidate: (sub: string) => calls.publicInvalidated.push(sub) };
  return { svc: new PlatformSchoolsService(db as never, users as never, memberships as never, publicSchools as never), calls };
}

describe('PlatformSchoolsService', () => {
  it('creates a school with a server-chosen id, the actor from the token, and the audit details; returns it in canonical uuid form', async () => {
    const { svc, calls } = setup();
    const out = await svc.create(actor, { name: 'Green', subDomain: 'green', defaultLanguage: 'hi' });
    expect(calls.sync).toBe(1);
    expect(calls.provision[0]).toMatchObject({ name: 'Green', subDomain: 'green', defaultLanguage: 'hi', actorId: 'u-admin', details: { name: 'Green', subDomain: 'green', defaultLanguage: 'hi' } });
    expect(calls.provision[0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(out).toMatchObject({ id: calls.provision[0].id, name: 'Green', status: 'ACTIVE' });
  });

  it('get: canonical uuid, and 404 for an unknown school', async () => {
    const { svc } = setup({});
    expect((await svc.get(ID)).id).toBe(ID);
    await expect(svc.get('99999999-9999-4999-8999-999999999999')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('update keeps the field that was not sent and audits only what changed', async () => {
    const { svc, calls } = setup({});
    const out = await svc.update(actor, ID, { name: 'Renamed' });
    expect(calls.update[0]).toMatchObject({ schoolId: ID, name: 'Renamed', defaultLanguage: 'en', actorId: 'u-admin', details: { name: 'Renamed' } });
    expect(out.name).toBe('Renamed');
    expect(calls.publicInvalidated).toEqual(['old']);
  });

  it('update with nothing to change is a 400, and an unknown school a 404, before anything is written', async () => {
    const { svc, calls } = setup({});
    await expect(svc.update(actor, ID, {})).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
    await expect(svc.update(actor, '99999999-9999-4999-8999-999999999999', { name: 'x' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(calls.update).toHaveLength(0);
  });

  it('suspend records who, why and from what, and drops this instance\'s cached allows for the school at once', async () => {
    const { svc, calls } = setup({});
    const out = await svc.setStatus(actor, ID, 'SUSPENDED', 'unpaid invoice');
    expect(calls.status[0]).toMatchObject({ schoolId: ID, status: 'SUSPENDED', actorId: 'u-admin', details: { status: 'SUSPENDED', from: 'ACTIVE', reason: 'unpaid invoice' } });
    expect(calls.invalidated).toEqual([ID]);
    expect(calls.publicInvalidated).toEqual(['old']); // the public school lookup forgets it at once
    expect(out.status).toBe('SUSPENDED');
  });

  it('activate restores access; repeating a status change is a no-op with no audit row and no invalidation', async () => {
    const { svc, calls } = setup({ status: 'SUSPENDED' });
    expect((await svc.setStatus(actor, ID, 'ACTIVE', undefined)).status).toBe('ACTIVE');
    expect(calls.status).toHaveLength(1);
    await svc.setStatus(actor, ID, 'ACTIVE', undefined);
    expect(calls.status).toHaveLength(1);
    expect(calls.invalidated).toEqual([ID]);
  });

  it('unknown school on suspend is a 404 and writes nothing', async () => {
    const { svc, calls } = setup();
    await expect(svc.setStatus(actor, ID, 'SUSPENDED', undefined)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(calls.status).toHaveLength(0);
  });

  it('list passes paging through with sane defaults', async () => {
    const { svc } = setup({});
    expect(await svc.list()).toMatchObject({ limit: 25, offset: 0, items: [{ id: ID }] });
  });
});
