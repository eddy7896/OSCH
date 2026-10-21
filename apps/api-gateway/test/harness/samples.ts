import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import { verifiedNewcomer, type World } from './fixtures.js';

/**
 * E-AUD-1, runtime half: for every `@Audit` route a sample REQUEST that succeeds. The audit harness sends it and then
 * checks that an audit row with the declared action, by the right actor, exists for the affected school. A new audited
 * route with no sample fails the build, so nobody can add a write that silently skips the audit trail.
 * Keys are `METHOD /path` exactly as registered (without the /v1 prefix); `prepare` returns a value for every `:param`.
 */
export interface Sample {
  /** Creates whatever the request needs (through the real operations) and returns values for the path parameters. */
  prepare?: (w: World) => Promise<Record<string, string>>;
  token: (w: World, ctx: Record<string, string>) => string;
  actor: (w: World, ctx: Record<string, string>) => string;
  /** `X-School-Id` for school routes (platform routes send none). */
  school?: (w: World) => string;
  body?: (w: World, ctx: Record<string, string>) => Record<string, unknown>;
  /** The school whose audit log must receive the row. */
  auditSchool: (w: World, ctx: Record<string, string>, responseBody: Record<string, any>) => string;
}

const freshSchool = async (w: World): Promise<Record<string, string>> => {
  const id = randomUUID();
  await w.db.provisionSchool({ id, name: 'Sample school', subDomain: `s${randomUUID().slice(0, 12)}`, defaultLanguage: 'en', actorId: w.superAdmin.uid });
  return { id };
};

/** A real user row that is not yet a member of anything. */
const freshUser = async (w: World): Promise<string> => {
  const uid = `sample-${randomUUID()}`;
  await w.db.upsertUser({ id: uid, email: `${uid}@example.com` });
  return uid;
};
const memberOfA = async (w: World): Promise<Record<string, string>> => {
  const userId = await freshUser(w);
  await w.db.createSchoolMember({ schoolId: w.schools.A, userId, schoolRole: 'TEACHER' as never });
  return { userId };
};

/** An open invitation to a real, verified newcomer; the secret and the newcomer's token travel in ctx. */
const openInvitation = async (w: World): Promise<Record<string, string>> => {
  const person = await verifiedNewcomer('invitee');
  const token = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '').slice(0, 11); // 43 url-safe characters, like a real one
  await w.db.createInvitation({ schoolId: w.schools.A, email: person.email, schoolRole: 'ACCOUNTANT' as never, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 86_400_000).toISOString(), actorId: w.roles.A.SYSTEM_ADMIN.uid });
  const pending = (await w.db.listInvitations({ schoolId: w.schools.A })).data.invitations.find((i) => i.email === person.email)!;
  return { id: pending.id.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5'), token, jwt: person.token, uid: person.uid };
};

const platform = { token: (w: World) => w.superAdmin.token, actor: (w: World) => w.superAdmin.uid };
const systemAdminOfA = { token: (w: World) => w.roles.A.SYSTEM_ADMIN.token, actor: (w: World) => w.roles.A.SYSTEM_ADMIN.uid, school: (w: World) => w.schools.A, auditSchool: (w: World) => w.schools.A };

export const SAMPLES: Record<string, Sample> = {
  'POST /platform/schools': { ...platform, body: () => ({ name: 'Audit sample school', subDomain: `a${randomUUID().slice(0, 12)}`, defaultLanguage: 'en' }), auditSchool: (_w, _c, res) => res['id'] },
  'PATCH /platform/schools/:id': { ...platform, prepare: freshSchool, body: () => ({ name: 'Renamed by the audit sample' }), auditSchool: (_w, ctx) => ctx['id']! },
  'POST /platform/schools/:id/suspend': { ...platform, prepare: freshSchool, body: () => ({ reason: 'audit sample' }), auditSchool: (_w, ctx) => ctx['id']! },
  'POST /platform/schools/:id/activate': {
    ...platform,
    prepare: async (w) => {
      const ctx = await freshSchool(w);
      await w.db.setSubscriptionStatus({ schoolId: ctx['id']!, status: 'SUSPENDED' as never, actorId: w.superAdmin.uid });
      return ctx;
    },
    body: () => ({}),
    auditSchool: (_w, ctx) => ctx['id']!,
  },
  'POST /platform/schools/:id/admins': { ...platform, prepare: freshSchool, body: () => ({ displayName: 'Audit Admin', email: `school-admin-${randomUUID().slice(0, 10)}@example.com` }), auditSchool: (_w, ctx) => ctx['id']! },
  'POST /memberships': { ...systemAdminOfA, prepare: async (w) => ({ userId: await freshUser(w) }), body: (_w, ctx) => ({ userId: ctx['userId'], schoolRole: 'STAFF' }) },
  'POST /memberships/accounts': { ...systemAdminOfA, body: () => ({ displayName: 'Audit Sample', schoolRole: 'STAFF', email: `account-${randomUUID().slice(0, 10)}@example.com` }) },
  'PATCH /memberships/:userId': { ...systemAdminOfA, prepare: memberOfA, body: () => ({ status: 'SUSPENDED' }) },
  'DELETE /memberships/:userId': { ...systemAdminOfA, prepare: memberOfA },
  'POST /invitations': { ...systemAdminOfA, prepare: async () => ({ email: `invitee-${randomUUID().slice(0, 8)}@example.com` }), body: (_w, ctx) => ({ email: ctx['email'], schoolRole: 'TEACHER' }) },
  'POST /invitations/:id/revoke': { ...systemAdminOfA, prepare: openInvitation, body: () => ({}) },
  'POST /invitations/accept': {
    prepare: openInvitation,
    token: (_w, ctx) => ctx['jwt']!,
    actor: (_w, ctx) => ctx['uid']!,
    body: (_w, ctx) => ({ token: ctx['token'] }),
    auditSchool: (w) => w.schools.A,
  },
};
