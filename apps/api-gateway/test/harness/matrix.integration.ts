// P1-7: the cross-tenant / RBAC route matrix. Generated from the REGISTERED routes, run against the real app, the real
// Data Connect emulator and the real Auth emulator. A new route is covered the moment it is registered.
import type { INestApplication } from '@nestjs/common';
import { RouteDecisionCheck, type RouteFacts } from '../../src/permission/route-decision.check.js';
import { bootRealApp } from './app.js';
import { requireEmulatorsOrSkip } from './emulators.js';
import { buildWorld, type World } from './fixtures.js';
import { casesFor } from './matrix.js';
import { runCase as run } from './run.js';

const ready = requireEmulatorsOrSkip();
let app: INestApplication | undefined;
let world: World | undefined;
let routes: RouteFacts[] = [];
if (ready) {
  app = await bootRealApp();
  world = await buildWorld();
  routes = app.get(RouteDecisionCheck).collect();
}

describe.skipIf(!ready)('cross-tenant and RBAC route matrix (P1-7)', () => {
  afterAll(async () => app?.close());

  it('covers the routes that exist (health, /me) and every access class', () => {
    const labels = routes.map((r) => `${r.method} ${r.path}`);
    expect(labels).toEqual(expect.arrayContaining(['GET /health', 'GET /health/db', 'GET /me', 'PATCH /me/preferences']));
    expect(routes.length).toBeGreaterThanOrEqual(4);
  });

  describe.each(routes.map((r) => [`${r.method} ${r.path}`, r] as const))('%s', (_label, route) => {
    const cases = ready ? casesFor(route, world!) : [];
    it.each(cases.map((c) => [c.name, c] as const))('%s', async (_name, c) => {
      const res = await run(app!, route, c);
      if (c.expect.status !== undefined) expect(res.status, `body: ${JSON.stringify(res.body)}`).toBe(c.expect.status);
      if (c.expect.notIn) expect(c.expect.notIn, `got ${res.status}: ${JSON.stringify(res.body)}`).not.toContain(res.status);
      if (c.expect.code) expect(res.body?.error?.code).toBe(c.expect.code);
    });
  });

  it('refusals never reveal why: an unknown school, a school the caller is not in and a suspended member give byte-identical bodies', async () => {
    const tenant = routes.find((r) => !r.isPublic && !r.scope && r.permission);
    if (!tenant) return; // no tenant route registered yet; the first one (P1-6b/c) switches this on
    const w = world!;
    const bodies = await Promise.all(
      [
        { token: w.roles.A.SYSTEM_ADMIN.token, schoolId: '99999999-9999-4999-8999-999999999999' },
        { token: w.roles.B.SYSTEM_ADMIN.token, schoolId: w.schools.A },
        { token: w.suspendedMember.token, schoolId: w.schools.A },
        { token: w.outsider.token, schoolId: w.schools.A },
      ].map(async (c) => {
        const res = await run(app!, tenant, { name: 'x', ...c, expect: {} });
        const { requestId: _omit, ...rest } = res.body.error;
        return JSON.stringify(rest);
      }),
    );
    expect(new Set(bodies).size).toBe(1);
  });
});
