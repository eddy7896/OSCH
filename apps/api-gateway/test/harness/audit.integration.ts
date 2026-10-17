// E-AUD-1 (runtime): every @Audit route, called with its sample request, leaves exactly one audit row with the declared
// action, written by the verified caller, in the right school; and a refused call leaves no such row.
import type { INestApplication } from '@nestjs/common';
import { RouteDecisionCheck, type RouteFacts } from '../../src/permission/route-decision.check.js';
import { agent } from '../support/serve.js';
import { bootRealApp } from './app.js';
import { requireEmulatorsOrSkip } from './emulators.js';
import { buildWorld, type World } from './fixtures.js';
import { SAMPLES } from './samples.js';
import { urlFor } from './matrix.js';

const ready = requireEmulatorsOrSkip();
let app: INestApplication | undefined;
let w: World | undefined;
let audited: RouteFacts[] = [];
if (ready) {
  app = await bootRealApp();
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

  describe.each(audited.map((r) => [key(r), r] as const))('%s', (_k, route) => {
    it('a successful call writes exactly one audit row: declared action, verified actor, the right school', async () => {
      const sample = SAMPLES[key(route)]!;
      const ctx = sample.prepare ? await sample.prepare(w!) : {};
      const path = urlFor(route).replace(/[0-9a-f-]{36}/i, ctx['id'] ?? '');
      const method = (route.method ?? 'POST').toLowerCase() as 'post' | 'patch' | 'put' | 'delete';
      // The path contains a placeholder uuid only when the route has a parameter.
      const url = route.path!.includes(':') ? path : urlFor(route);
      const countBefore = async (school: string) => (await rows(school.replaceAll('-', ''), route.audit!.action)).filter((a) => a.actor.id === sample.actor(w!)).length;
      const before = ctx['id'] ? await countBefore(ctx['id']) : 0; // prepare() may already have written rows of the same action
      const res = await agent(app!)[method](url).set('Authorization', `Bearer ${sample.token(w!)}`).send(sample.body?.(w!, ctx) ?? {});
      expect(res.status, JSON.stringify(res.body)).toBeLessThan(300);
      expect(await countBefore(sample.auditSchool(ctx, res.body))).toBe(before + 1);
    });

    it('a refused call (not a platform admin) writes no row of this action', async () => {
      const sample = SAMPLES[key(route)]!;
      const ctx = sample.prepare ? await sample.prepare(w!) : {};
      const url = route.path!.includes(':') ? urlFor(route).replace(/[0-9a-f-]{36}/i, ctx['id'] ?? '') : urlFor(route);
      const method = (route.method ?? 'POST').toLowerCase() as 'post' | 'patch' | 'put' | 'delete';
      const before = ctx['id'] ? (await rows(ctx['id'].replaceAll('-', ''), route.audit!.action)).length : 0;
      const res = await agent(app!)[method](url).set('Authorization', `Bearer ${w!.roles.A.PRINCIPAL.token}`).set('X-School-Id', w!.schools.A).send(sample.body?.(w!, ctx) ?? {});
      expect(res.status).toBe(403);
      if (ctx['id']) expect((await rows(ctx['id'].replaceAll('-', ''), route.audit!.action)).length).toBe(before);
    });
  });
});
