// E-AUD-1 (runtime): every @Audit route, called with its sample request, leaves exactly one audit row with the declared
// action, written by the verified caller, in the right school; and a refused call leaves no such row.
import type { INestApplication } from '@nestjs/common';
import { RouteDecisionCheck, type RouteFacts } from '../../src/permission/route-decision.check.js';
import { agent } from '../support/serve.js';
import { bootRealApp } from './app.js';
import { requireEmulatorsOrSkip } from './emulators.js';
import { buildWorld, type World } from './fixtures.js';
import { PRIVATE_STORE } from '../../src/files/private-store.js';
import { SAMPLES, sampleStore } from './samples.js';

const ready = requireEmulatorsOrSkip();
let app: INestApplication | undefined;
let w: World | undefined;
let audited: RouteFacts[] = [];
if (ready) {
  app = await bootRealApp([], {}, [[PRIVATE_STORE, sampleStore.store]]);
  w = await buildWorld();
  audited = app.get(RouteDecisionCheck).collect().filter((r) => r.audit);
}

const key = (r: RouteFacts) => `${r.method} ${r.path}`;
const rows = async (schoolId: string, action: string) => (await w!.db.listAuditLog({ schoolId, limit: 100, offset: 0 })).data.auditLogs.filter((a) => a.action === action);

describe.skipIf(!ready)('E-AUD-1 runtime: every audited write adds its audit row', () => {
  afterAll(async () => app?.close());

  it('every @Audit route has a sample request registered (and no sample is stale)', () => {
    expect(audited.length).toBeGreaterThan(0);
    expect(audited.filter((r) => !SAMPLES[key(r)]).map(key), 'add a sample to test/harness/samples.ts').toEqual([]);
    expect(Object.keys(SAMPLES).filter((k) => !audited.some((r) => key(r) === k)), 'sample for a route that no longer exists').toEqual([]);
  });

  const send = (route: RouteFacts, token: string, school: string | undefined, ctx: Record<string, string>, body: object) => {
    const url = (route.path!.startsWith('/health') ? route.path! : `/v1${route.path}`).replace(/:([A-Za-z]+)/g, (_m, name: string) => ctx[name] ?? '99999999-9999-4999-8999-999999999999');
    const method = (route.method ?? 'POST').toLowerCase() as 'post' | 'patch' | 'put' | 'delete';
    let req = agent(app!)[method](url).set('Authorization', `Bearer ${token}`);
    if (school) req = req.set('X-School-Id', school);
    return req.send(body);
  };

  describe.each(audited.map((r) => [key(r), r] as const))('%s', (_k, route) => {
    it('a successful call writes exactly one audit row: declared action, verified actor, the right school', async () => {
      const sample = SAMPLES[key(route)]!;
      const ctx = sample.prepare ? await sample.prepare(w!) : {};
      const count = async (school: string) => (await rows(school.replaceAll('-', ''), route.audit!.action)).filter((a) => a.actor.id === sample.actor(w!, ctx)).length;
      const school = sample.auditSchool(w!, ctx, {});
      const before = school ? await count(school) : 0; // prepare() may already have written rows of the same action
      const res = await send(route, sample.token(w!, ctx), sample.school?.(w!), ctx, (await sample.body?.(w!, ctx)) ?? {});
      expect(res.status, JSON.stringify(res.body)).toBeLessThan(300);
      expect(await count(sample.auditSchool(w!, ctx, res.body))).toBe((school ? before : 0) + 1);
    });

    it('a refused call (a role without the permission) writes no row of this action', async () => {
      const sample = SAMPLES[key(route)]!;
      const ctx = sample.prepare ? await sample.prepare(w!) : {};
      const school = sample.auditSchool(w!, ctx, {});
      const count = async () => (school ? (await rows(school.replaceAll('-', ''), route.audit!.action)).length : 0);
      const before = await count();
      // The Principal holds no write grants (except to approve); for the route the Principal may call, an Accountant (no payroll, no HR) is the outsider.
      const outsider = sample.actor(w!, ctx) === w!.roles.A.PRINCIPAL.uid ? w!.roles.A.ACCOUNTANT : w!.roles.A.PRINCIPAL;
      const res = await send(route, outsider.token, w!.schools.A, ctx, (await sample.body?.(w!, ctx)) ?? {});
      expect(res.status).toBe(sample.refusedStatus ?? 403);
      expect(await count()).toBe(before);
    });
  });
});
