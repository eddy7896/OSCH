import { DatabaseError } from '@oruschools/database';
import { InvitationsService } from './invitations.service.js';
import { hashInvitationToken, newInvitationToken } from './token.js';

const SCHOOL = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2026-10-17T10:00:00Z');
const tenant = { schoolId: SCHOOL, userId: 'admin-1', schoolRole: 'SYSTEM_ADMIN' } as const;
const user = (over: Record<string, unknown> = {}) => ({ uid: 'u-new', email: 'asha@example.com', emailVerified: true, globalRole: 'USER' as const, ...over });

class Fixed extends InvitationsService {
  protected override now() {
    return NOW;
  }
}

interface Inv { id: string; email: string; schoolRole: string; status: string; expiresAt: string; createdAt: string; tokenHash: string; school: { id: string; name: string; subscriptionStatus: string } }
function setup(initial: Inv[] = [], acceptError?: unknown) {
  const rows = [...initial];
  const calls = { create: [] as any[], revoke: [] as any[], accept: [] as any[], sync: 0, invalidated: [] as string[] };
  const db = {
    listInvitations: async () => ({ data: { invitations: rows.map((r) => ({ ...r, phoneNumber: null, acceptedAt: null, createdBy: { id: 'admin-1', displayName: null } })) } }),
    createInvitation: async (v: any) => {
      calls.create.push(v);
      rows.push({ id: 'aaaaaaaabbbbccccddddeeeeeeeeeeee', email: v.email, schoolRole: v.schoolRole, status: 'PENDING', expiresAt: v.expiresAt, createdAt: NOW.toISOString(), tokenHash: v.tokenHash, school: { id: SCHOOL.replaceAll('-', ''), name: 'S', subscriptionStatus: 'ACTIVE' } });
      return {};
    },
    revokeInvitation: async (v: any) => { calls.revoke.push(v); rows.find((r) => r.id.length)!.status = 'REVOKED'; return {}; },
    getInvitationByTokenHash: async ({ tokenHash }: { tokenHash: string }) => ({ data: { invitations: rows.filter((r) => r.tokenHash === tokenHash) } }),
    acceptInvitation: async (v: any) => { if (acceptError) throw acceptError; calls.accept.push(v); return {}; },
  };
  const users = { sync: async () => { calls.sync++; } };
  const cache = { invalidate: (s: string, u: string) => calls.invalidated.push(`${s}:${u}`) };
  return { svc: new Fixed(db as never, users as never, cache as never), calls, rows };
}
const invitation = (token: string, over: Partial<Inv> = {}): Inv => ({ id: 'aaaaaaaabbbbccccddddeeeeeeeeeeee', email: 'asha@example.com', schoolRole: 'ACCOUNTANT', status: 'PENDING', expiresAt: new Date(NOW.getTime() + 86_400_000).toISOString(), createdAt: NOW.toISOString(), tokenHash: hashInvitationToken(token), school: { id: SCHOOL.replaceAll('-', ''), name: 'Green Valley', subscriptionStatus: 'ACTIVE' }, ...over });

describe('InvitationsService.create', () => {
  it('stores only the hash, returns the secret once, defaults to 7 days, and audits without the secret', async () => {
    const { svc, calls } = setup();
    const out = await svc.create(tenant, { email: 'asha@example.com', schoolRole: 'ACCOUNTANT' });
    expect(out.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(calls.create[0].tokenHash).toBe(hashInvitationToken(out.token));
    expect(calls.create[0].expiresAt).toBe(new Date(NOW.getTime() + 7 * 86_400_000).toISOString());
    expect(JSON.stringify(calls.create[0].details)).not.toContain(out.token);
    expect(JSON.stringify(calls.create[0].details)).not.toContain(calls.create[0].tokenHash);
    expect(calls.create[0]).toMatchObject({ schoolId: SCHOOL, actorId: 'admin-1', schoolRole: 'ACCOUNTANT', email: 'asha@example.com' });
    expect(out).toMatchObject({ role: 'ACCOUNTANT', status: 'PENDING', email: 'asha@example.com' });
  });

  it('a second open invitation for the same address is a 409 and writes nothing', async () => {
    const { svc, calls } = setup([invitation(newInvitationToken())]);
    await expect(svc.create(tenant, { email: 'asha@example.com', schoolRole: 'TEACHER' })).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(calls.create).toHaveLength(0);
  });

  it('an expired or revoked earlier invitation does not block a new one', async () => {
    const old = invitation(newInvitationToken(), { expiresAt: new Date(NOW.getTime() - 1000).toISOString() });
    const { svc, calls } = setup([old]);
    await svc.create(tenant, { email: 'asha@example.com', schoolRole: 'TEACHER', expiresInDays: 30 });
    expect(calls.create).toHaveLength(1);
  });
});

describe('InvitationsService.list and revoke', () => {
  it('shows an overdue pending invitation as EXPIRED, never the secret or its hash', async () => {
    const t = newInvitationToken();
    const { svc } = setup([invitation(t, { expiresAt: new Date(NOW.getTime() - 1000).toISOString() })]);
    const out = await svc.list(tenant);
    expect(out.items[0]!.status).toBe('EXPIRED');
    expect(JSON.stringify(out)).not.toContain(t);
    expect(JSON.stringify(out)).not.toContain(hashInvitationToken(t));
  });

  it('revokes a pending invitation of this school with an audit record; unknown id is 404; already revoked is 409', async () => {
    const { svc, calls } = setup([invitation(newInvitationToken())]);
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    expect((await svc.revoke(tenant, id)).status).toBe('REVOKED');
    expect(calls.revoke[0]).toMatchObject({ schoolId: SCHOOL, invitationId: id, actorId: 'admin-1' });
    await expect(svc.revoke(tenant, id)).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(svc.revoke(tenant, '99999999-9999-4999-8999-999999999999')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('InvitationsService.accept', () => {
  it('joins the verified invitee with the role fixed at creation, via the database transaction', async () => {
    const t = newInvitationToken();
    const { svc, calls } = setup([invitation(t)]);
    const out = await svc.accept(user(), t);
    expect(calls.sync).toBe(1);
    expect(calls.accept[0]).toMatchObject({ schoolId: SCHOOL.replaceAll('-', ''), userId: 'u-new', schoolRole: 'ACCOUNTANT', now: NOW.toISOString() });
    expect(calls.invalidated).toEqual([`${SCHOOL}:u-new`]);
    expect(out).toEqual({ school: { id: SCHOOL, name: 'Green Valley' }, role: 'ACCOUNTANT' });
  });

  it('the email match ignores case', async () => {
    const t = newInvitationToken();
    const { svc } = setup([invitation(t, { email: 'ASHA@Example.com' })]);
    await expect(svc.accept(user({ email: 'Asha@example.COM' }), t)).resolves.toBeDefined();
  });

  it.each([
    ['an unknown secret', () => ({ rows: [] as Inv[], token: newInvitationToken() })],
    ['an already used invitation', () => { const t = newInvitationToken(); return { rows: [invitation(t, { status: 'ACCEPTED' })], token: t }; }],
    ['a revoked invitation', () => { const t = newInvitationToken(); return { rows: [invitation(t, { status: 'REVOKED' })], token: t }; }],
    ['an expired invitation', () => { const t = newInvitationToken(); return { rows: [invitation(t, { expiresAt: new Date(NOW.getTime() - 1).toISOString() })], token: t }; }],
    ['exactly at the expiry instant', () => { const t = newInvitationToken(); return { rows: [invitation(t, { expiresAt: NOW.toISOString() })], token: t }; }],
    ['an invitation for a different address', () => { const t = newInvitationToken(); return { rows: [invitation(t, { email: 'someone.else@example.com' })], token: t }; }],
    ['a suspended school', () => { const t = newInvitationToken(); return { rows: [invitation(t, { school: { id: SCHOOL.replaceAll('-', ''), name: 'S', subscriptionStatus: 'SUSPENDED' } })], token: t }; }],
  ])('%s is INVITATION_INVALID, with nothing written', async (_n, build) => {
    const { rows, token } = build();
    const { svc, calls } = setup(rows);
    await expect(svc.accept(user(), token)).rejects.toMatchObject({ code: 'INVITATION_INVALID' });
    expect(calls.accept).toHaveLength(0);
    expect(calls.sync).toBe(0);
  });

  it('all those failures are the same error (nothing to learn from the difference)', async () => {
    const t = newInvitationToken();
    const reasons = [setup([]), setup([invitation(t, { status: 'REVOKED' })]), setup([invitation(t, { email: 'x@example.com' })])];
    const errs = await Promise.all(reasons.map(async ({ svc }) => svc.accept(user(), t).catch((e) => ({ status: e.getStatus(), body: e.getResponse() }))));
    expect(new Set(errs.map((e) => JSON.stringify(e))).size).toBe(1);
  });

  it('an unverified or missing email is refused before the invitation is even looked at', async () => {
    const t = newInvitationToken();
    const { svc, calls } = setup([invitation(t)]);
    await expect(svc.accept(user({ emailVerified: false }), t)).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
    await expect(svc.accept(user({ email: undefined }), t)).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
    expect(calls.accept).toHaveLength(0);
  });

  it('losing a race (the database refuses inside its transaction) is INVITATION_INVALID; already a member stays a conflict', async () => {
    const t = newInvitationToken();
    await expect(setup([invitation(t)], new DatabaseError('FORBIDDEN_REFERENCE')).svc.accept(user(), t)).rejects.toMatchObject({ code: 'INVITATION_INVALID' });
    await expect(setup([invitation(t)], new DatabaseError('CONFLICT')).svc.accept(user(), t)).rejects.toMatchObject({ kind: 'CONFLICT' });
    await expect(setup([invitation(t)], new DatabaseError('UNAVAILABLE')).svc.accept(user(), t)).rejects.toMatchObject({ kind: 'UNAVAILABLE' });
  });
});
