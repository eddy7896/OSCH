import { randomUUID } from 'node:crypto';
import type { World } from './fixtures.js';

/**
 * E-AUD-1, runtime half: for every `@Audit` route a sample REQUEST that succeeds. The audit harness sends it and then
 * checks that an audit row with the declared action, by the right actor, exists for the affected school. A new audited
 * route with no sample fails the build, so nobody can add a write that silently skips the audit trail.
 * Keys are `METHOD /path` exactly as registered (without the /v1 prefix).
 */
export interface Sample {
  /** Creates whatever the request needs (through the real operations) and returns values for the path parameters. */
  prepare?: (w: World) => Promise<Record<string, string>>;
  token: (w: World) => string;
  actor: (w: World) => string;
  body?: (w: World, ctx: Record<string, string>) => Record<string, unknown>;
  /** The school whose audit log must receive the row. */
  auditSchool: (ctx: Record<string, string>, responseBody: Record<string, any>) => string;
}

const freshSchool = async (w: World): Promise<Record<string, string>> => {
  const id = randomUUID();
  await w.db.provisionSchool({ id, name: 'Sample school', subDomain: `s${randomUUID().slice(0, 12)}`, defaultLanguage: 'en', actorId: w.superAdmin.uid });
  return { id };
};

export const SAMPLES: Record<string, Sample> = {
  'POST /platform/schools': {
    token: (w) => w.superAdmin.token,
    actor: (w) => w.superAdmin.uid,
    body: () => ({ name: 'Audit sample school', subDomain: `a${randomUUID().slice(0, 12)}`, defaultLanguage: 'en' }),
    auditSchool: (_ctx, res) => res['id'],
  },
  'PATCH /platform/schools/:id': {
    prepare: freshSchool,
    token: (w) => w.superAdmin.token,
    actor: (w) => w.superAdmin.uid,
    body: () => ({ name: 'Renamed by the audit sample' }),
    auditSchool: (ctx) => ctx['id']!,
  },
  'POST /platform/schools/:id/suspend': {
    prepare: freshSchool,
    token: (w) => w.superAdmin.token,
    actor: (w) => w.superAdmin.uid,
    body: () => ({ reason: 'audit sample' }),
    auditSchool: (ctx) => ctx['id']!,
  },
  'POST /platform/schools/:id/activate': {
    prepare: async (w) => {
      const ctx = await freshSchool(w);
      await w.db.setSubscriptionStatus({ schoolId: ctx['id']!, status: 'SUSPENDED' as never, actorId: w.superAdmin.uid });
      return ctx;
    },
    token: (w) => w.superAdmin.token,
    actor: (w) => w.superAdmin.uid,
    body: () => ({}),
    auditSchool: (ctx) => ctx['id']!,
  },
};
