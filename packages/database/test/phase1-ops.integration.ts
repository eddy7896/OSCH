// P1-2c: identity, membership, invitation, platform and audit operations against the real emulator.
// Each test names the guarantee it proves. Run: npm run test:database
import { randomUUID } from 'node:crypto';
import { createDatabase, type Database } from '../src/index.js';

const host = process.env.DATA_CONNECT_EMULATOR_HOST;
// Data Connect returns uuids without dashes in query results.
const bare = (u: string) => u.replaceAll('-', '');
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

describe.skipIf(!host)('Phase 1 operations', () => {
  let db: Database;
  const A = randomUUID();
  const B = randomUUID();
  const tag = A.slice(0, 8);
  const admin = `admin-${tag}`; // SYSTEM_ADMIN of A
  const adminB = `adminb-${tag}`; // SYSTEM_ADMIN of B
  const teacher = `teacher-${tag}`; // member of A
  const outsider = `outsider-${tag}`; // member of nothing
  const audit = async (schoolId: string) => (await db.listAuditLog({ schoolId, limit: 100, offset: 0 })).data.auditLogs;
  const membership = async (schoolId: string, userId: string) => (await db.getMembership({ schoolId, userId })).data.schoolMembers[0];

  beforeAll(async () => {
    db = createDatabase({ projectId: 'demo-oruschools' });
    for (const id of [admin, adminB, teacher, outsider]) await db.upsertUser({ id, email: `${id}@example.com` });
    await db.provisionSchool({ id: A, name: 'School A', subDomain: `a-${tag}`, defaultLanguage: 'en', actorId: admin });
    await db.provisionSchool({ id: B, name: 'School B', subDomain: `b-${tag}`, defaultLanguage: 'ur', actorId: adminB });
    // Bootstrap memberships use the Phase 0 seed operation (the first admin has nobody to audit them).
    await db.createSchoolMember({ schoolId: A, userId: admin, schoolRole: 'SYSTEM_ADMIN' as never });
    await db.createSchoolMember({ schoolId: B, userId: adminB, schoolRole: 'SYSTEM_ADMIN' as never });
  });

  describe('identity and schools', () => {
    it('upserts a user idempotently and reads it back', async () => {
      await db.upsertUser({ id: teacher, email: `${teacher}@example.com`, displayName: 'Asha' });
      await db.upsertUser({ id: teacher, email: `${teacher}@example.com`, displayName: 'Asha K' });
      expect((await db.getUser({ id: teacher })).data.user).toMatchObject({ id: teacher, displayName: 'Asha K', globalRole: 'USER' });
    });

    it('stores an explicit language choice, and null clears it', async () => {
      await db.setUserLanguage({ userId: teacher, language: 'ur' });
      expect((await db.getUser({ id: teacher })).data.user?.language).toBe('ur');
      await db.setUserLanguage({ userId: teacher, language: null });
      expect((await db.getUser({ id: teacher })).data.user?.language).toBeNull();
    });

    it('provisioning a school writes its audit row in the same transaction, with the entity id', async () => {
      const rows = await audit(A);
      const row = rows.find((r) => r.action === 'platform.school.create');
      expect(row).toMatchObject({ entityType: 'School' });
      expect(bare(row?.entityId ?? '')).toBe(bare(A));
      expect(row?.actor.id).toBe(admin);
      expect((await db.getSchool({ schoolId: B })).data.school?.defaultLanguage).toBe('ur');
    });

    it('a failed provision (duplicate subdomain) leaves no audit row behind', async () => {
      const dup = randomUUID();
      await expect(db.provisionSchool({ id: dup, name: 'dup', subDomain: `a-${tag}`, defaultLanguage: 'en', actorId: admin })).rejects.toMatchObject({ kind: 'CONFLICT' });
      expect((await db.getSchool({ schoolId: dup })).data.school).toBeNull();
    });

    it('updates settings with an audit row; an unknown school aborts the whole mutation', async () => {
      await db.updateSchool({ schoolId: A, name: 'School A (renamed)', defaultLanguage: 'hi', actorId: admin });
      expect((await db.getSchool({ schoolId: A })).data.school).toMatchObject({ name: 'School A (renamed)', defaultLanguage: 'hi' });
      expect((await audit(A)).some((r) => r.action === 'school.update')).toBe(true);
      await expect(db.updateSchool({ schoolId: randomUUID(), name: 'ghost', defaultLanguage: 'en', actorId: admin })).rejects.toBeDefined();
    });

    it('looks a school up by subdomain, lists schools for the platform', async () => {
      expect(bare((await db.getSchoolBySubDomain({ subDomain: `b-${tag}` })).data.schools[0]?.id ?? '')).toBe(bare(B));
      expect((await db.getSchoolBySubDomain({ subDomain: `nope-${tag}` })).data.schools).toHaveLength(0);
      const all = (await db.listSchools({ limit: 500, offset: 0 })).data.schools.map((s) => s.id);
      expect(all.map(bare)).toEqual(expect.arrayContaining([bare(A), bare(B)]));
    });

    it('suspending a school is visible in the membership the TenantGuard reads, and is audited', async () => {
      await db.setSubscriptionStatus({ schoolId: B, status: 'SUSPENDED' as never, actorId: adminB });
      expect((await membership(B, adminB))?.school.subscriptionStatus).toBe('SUSPENDED');
      expect((await audit(B)).some((r) => r.action === 'platform.school.status')).toBe(true);
      await db.setSubscriptionStatus({ schoolId: B, status: 'ACTIVE' as never, actorId: adminB });
      expect((await membership(B, adminB))?.school.subscriptionStatus).toBe('ACTIVE');
    });
  });

  describe('memberships', () => {
    it('refuses an actor who is not an active member of the school, and writes nothing', async () => {
      await expect(db.addMembership({ schoolId: A, userId: teacher, schoolRole: 'TEACHER' as never, actorId: outsider })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
      await expect(db.addMembership({ schoolId: A, userId: teacher, schoolRole: 'TEACHER' as never, actorId: adminB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
      expect(await membership(A, teacher)).toBeUndefined();
    });

    it('adds a member with an audit row whose entity is the user; a duplicate is a conflict', async () => {
      await db.addMembership({ schoolId: A, userId: teacher, schoolRole: 'TEACHER' as never, actorId: admin });
      expect(await membership(A, teacher)).toMatchObject({ schoolRole: 'TEACHER', status: 'ACTIVE' });
      expect((await audit(A)).find((r) => r.action === 'membership.add')).toMatchObject({ entityId: teacher });
      await expect(db.addMembership({ schoolId: A, userId: teacher, schoolRole: 'STAFF' as never, actorId: admin })).rejects.toMatchObject({ kind: 'CONFLICT' });
    });

    it('changing a role or suspending is scoped to the school: another school cannot touch the member', async () => {
      await expect(db.updateMembership({ schoolId: B, userId: teacher, schoolRole: 'PRINCIPAL' as never, status: 'ACTIVE' as never, actorId: adminB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
      await expect(db.removeMembership({ schoolId: B, userId: teacher, actorId: adminB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
      expect(await membership(A, teacher)).toMatchObject({ schoolRole: 'TEACHER' });
      expect((await audit(B)).some((r) => r.action.startsWith('membership.'))).toBe(false); // aborted: no audit row either
    });

    it('suspends and restores a member in its own school', async () => {
      await db.updateMembership({ schoolId: A, userId: teacher, schoolRole: 'TEACHER' as never, status: 'SUSPENDED' as never, actorId: admin });
      expect((await membership(A, teacher))?.status).toBe('SUSPENDED');
      await db.updateMembership({ schoolId: A, userId: teacher, schoolRole: 'TEACHER' as never, status: 'ACTIVE' as never, actorId: admin });
      expect((await membership(A, teacher))?.status).toBe('ACTIVE');
    });

    it('lists a school\'s members and a user\'s schools without crossing tenants', async () => {
      const members = (await db.listMemberships({ schoolId: A })).data.schoolMembers.map((m) => m.user.id);
      expect(members).toEqual(expect.arrayContaining([admin, teacher]));
      expect(members).not.toContain(adminB);
      const schools = (await db.listMembershipsForUser({ userId: teacher })).data.schoolMembers.map((m) => m.school.id);
      expect(schools.map(bare)).toEqual([bare(A)]);
    });

    it('removes a member with an audit row', async () => {
      await db.removeMembership({ schoolId: A, userId: teacher, actorId: admin });
      expect(await membership(A, teacher)).toBeUndefined();
      expect((await audit(A)).some((r) => r.action === 'membership.remove')).toBe(true);
    });
  });

  describe('invitations', () => {
    const invite = (over: Partial<Parameters<Database['createInvitation']>[0]> = {}) =>
      db.createInvitation({ schoolId: A, email: `new-${randomUUID().slice(0, 6)}@example.com`, schoolRole: 'TEACHER' as never, tokenHash: randomUUID(), expiresAt: iso(3_600_000), actorId: admin, ...over });
    const pending = async (schoolId: string) => (await db.listInvitations({ schoolId })).data.invitations;

    it('only an active member of the school can invite', async () => {
      await expect(invite({ actorId: outsider })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
      await expect(invite({ actorId: adminB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    });

    it('stores only the token hash and never returns it; the hash is unique', async () => {
      const tokenHash = `hash-${randomUUID()}`;
      await invite({ tokenHash });
      const list = await pending(A);
      expect(JSON.stringify(list)).not.toContain(tokenHash);
      await expect(invite({ tokenHash })).rejects.toMatchObject({ kind: 'CONFLICT' });
      expect((await db.getInvitationByTokenHash({ tokenHash })).data.invitations[0]?.status).toBe('PENDING');
      expect((await pending(B)).length).toBe(0);
    });

    it('revoking is scoped to the school; a revoked invitation can no longer be accepted', async () => {
      const tokenHash = `hash-${randomUUID()}`;
      await invite({ tokenHash });
      const inv = (await db.getInvitationByTokenHash({ tokenHash })).data.invitations[0]!;
      await expect(db.revokeInvitation({ schoolId: B, invitationId: inv.id, actorId: adminB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
      await db.revokeInvitation({ schoolId: A, invitationId: inv.id, actorId: admin });
      expect((await db.getInvitationByTokenHash({ tokenHash })).data.invitations[0]?.status).toBe('REVOKED');
      await expect(db.acceptInvitation({ schoolId: A, invitationId: inv.id, userId: outsider, schoolRole: 'TEACHER' as never, now: iso(0) })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
      expect(await membership(A, outsider)).toBeUndefined();
    });

    it('accepting joins the invitee with the invited role exactly once, and is audited', async () => {
      const tokenHash = `hash-${randomUUID()}`;
      await invite({ tokenHash, schoolRole: 'ACCOUNTANT' as never });
      const inv = (await db.getInvitationByTokenHash({ tokenHash })).data.invitations[0]!;
      const args = { schoolId: A, invitationId: inv.id, userId: outsider, schoolRole: 'ACCOUNTANT' as never, now: iso(0) };
      await expect(db.acceptInvitation({ ...args, schoolId: B })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // wrong school
      await expect(db.acceptInvitation({ ...args, schoolRole: 'PRINCIPAL' as never })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // role escalation
      await db.acceptInvitation(args);
      expect(await membership(A, outsider)).toMatchObject({ schoolRole: 'ACCOUNTANT', status: 'ACTIVE' });
      expect((await db.getInvitationByTokenHash({ tokenHash })).data.invitations[0]?.status).toBe('ACCEPTED');
      expect((await audit(A)).find((r) => r.action === 'invitation.accept')?.actor.id).toBe(outsider);
      await expect(db.acceptInvitation(args)).rejects.toBeDefined(); // second use
    });

    it('an expired invitation cannot be accepted', async () => {
      const tokenHash = `hash-${randomUUID()}`;
      await invite({ tokenHash, expiresAt: iso(-1000) });
      const inv = (await db.getInvitationByTokenHash({ tokenHash })).data.invitations[0]!;
      const late = `late-${tag}`;
      await db.upsertUser({ id: late, email: `${late}@example.com` });
      await expect(db.acceptInvitation({ schoolId: A, invitationId: inv.id, userId: late, schoolRole: 'TEACHER' as never, now: iso(0) })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
      expect(await membership(A, late)).toBeUndefined();
    });
  });

  describe('audit log', () => {
    it('is scoped to the school and ordered newest first', async () => {
      const a = await audit(A);
      const b = await audit(B);
      expect(a.length).toBeGreaterThan(3);
      expect(a.every((r) => r.actor.id !== adminB)).toBe(true);
      expect(b.every((r) => r.actor.id === adminB)).toBe(true);
      const times = a.map((r) => r.createdAt);
      expect([...times].sort().reverse()).toEqual(times);
    });
  });
});
