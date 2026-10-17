// P1-7: the matrix generator itself, exercised on every access class. The application has no tenant or platform route
// yet (P1-6b/c add them), so the tenant and platform branches of `casesFor` are run here against probe routes, with the
// real emulators. Same generator, same assertions: if these pass, a real route with the same declaration passes.
import { Body, Controller, Delete, Get, type INestApplication, Post, Query } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { NoAudit } from '../../src/audit/audit.decorators.js';
import { Permission } from '../../src/permission/permission.decorator.js';
import { RouteDecisionCheck, type RouteFacts } from '../../src/permission/route-decision.check.js';
import { Platform } from '../../src/tenant/tenant.decorators.js';
import { bootRealApp } from './app.js';
import { requireEmulatorsOrSkip } from './emulators.js';
import { buildWorld, type World } from './fixtures.js';
import { casesFor } from './matrix.js';
import { runCase as run } from './run.js';

class NoteDto { @IsOptional() @IsString() note?: string; }
class FilterDto { @IsOptional() @IsString() q?: string; }

@Controller('probe')
class Probe {
  @Permission('students', 'read') @Get('students') students(@Query() _q: FilterDto) { return { ok: true }; }
  @Permission('finance', 'create') @NoAudit('probe route that writes nothing') @Post('invoices') invoices(@Body() _b: NoteDto) { return { ok: true }; }
  @Permission('memberships', 'create') @NoAudit('probe route that writes nothing') @Post('members') members(@Body() _b: NoteDto) { return { ok: true }; }
  @Permission('leave', 'approve') @NoAudit('probe route that writes nothing') @Delete('leave/:id') leave() { return { ok: true }; }
  @Platform() @Permission('platform_schools', 'create') @NoAudit('probe route that writes nothing') @Post('platform/schools') schools(@Body() _b: NoteDto) { return { ok: true }; }
}

const ready = requireEmulatorsOrSkip();
let app: INestApplication | undefined;
let world: World | undefined;
let routes: RouteFacts[] = [];
if (ready) {
  app = await bootRealApp([Probe]);
  world = await buildWorld();
  routes = app.get(RouteDecisionCheck).collect().filter((r) => r.path?.startsWith('/probe'));
}

describe.skipIf(!ready)('route matrix generator on probe routes (P1-7)', () => {
  afterAll(async () => app?.close());

  it('found the five probe routes', () => {
    expect(routes.map((r) => `${r.method} ${r.path}`).sort()).toEqual(['DELETE /probe/leave/:id', 'GET /probe/students', 'POST /probe/invoices', 'POST /probe/members', 'POST /probe/platform/schools']);
  });

  describe.each(routes.map((r) => [`${r.method} ${r.path}`, r] as const))('%s', (_label, route) => {
    const cases = ready ? casesFor(route, world!) : [];
    it('generates the full set of cases for its class', () => {
      expect(cases.length).toBeGreaterThanOrEqual(route.scope === 'platform' ? 7 : 9 + 14);
    });
    it.each(cases.map((c) => [c.name, c] as const))('%s', async (_name, c) => {
      const res = await run(app!, route, c);
      if (c.expect.status !== undefined) expect(res.status, `body: ${JSON.stringify(res.body)}`).toBe(c.expect.status);
      if (c.expect.notIn) expect(c.expect.notIn, `got ${res.status}: ${JSON.stringify(res.body)}`).not.toContain(res.status);
      if (c.expect.code) expect(res.body?.error?.code).toBe(c.expect.code);
    });
  });

  it('refusals never reveal why: an unknown school, a school the caller is not in, a suspended member and a non-member give byte-identical bodies', async () => {
    const tenant = routes.find((r) => r.path === '/probe/students')!;
    const w = world!;
    const bodies = await Promise.all(
      [
        { token: w.roles.A.SYSTEM_ADMIN.token, schoolId: '99999999-9999-4999-8999-999999999999' },
        { token: w.roles.B.SYSTEM_ADMIN.token, schoolId: w.schools.A },
        { token: w.suspendedMember.token, schoolId: w.schools.A },
        { token: w.outsider.token, schoolId: w.schools.A },
        { token: w.roles.A.DRIVER.token, schoolId: w.schools.A }, // lacks the permission
      ].map(async (c) => {
        const res = await run(app!, tenant, { name: 'x', ...c, expect: {} });
        const { requestId: _omit, ...rest } = res.body.error;
        return JSON.stringify(rest);
      }),
    );
    expect(new Set(bodies).size).toBe(1);
  });
});
