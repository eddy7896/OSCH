// P1-3c: authorisation through the real pipeline, plus the startup refusal. Fake data layer and fake Firebase tokens.
import { Controller, Get, type INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { agent, serve } from './support/serve.js';
import { NoAudit } from '../src/audit/audit.decorators.js';
import { Public } from '../src/auth/public.decorator.js';
import { Granted, Permission, type GrantedPermission } from '../src/permission/permission.decorator.js';
import { Platform, UserScoped } from '../src/tenant/tenant.decorators.js';

const A = '11111111-1111-4111-8111-111111111111';
const roleOf = (name: string) => name.toUpperCase();
const ROLES_UNDER_TEST = ['principal', 'teacher', 'parent', 'accountant', 'hr_manager', 'system_admin', 'driver'];

// Audit rows the fake data layer received (security events).
const auditRows: unknown[] = [];
const fakeDb = {
  getMembership: async ({ userId }: { schoolId: string; userId: string }) => {
    const role = ROLES_UNDER_TEST.find((r) => `u-${r}` === userId);
    return { data: { schoolMembers: role ? [{ schoolRole: roleOf(role), status: 'ACTIVE', school: { subscriptionStatus: 'ACTIVE' } }] : [] } };
  },
  listSchools: async () => ({ data: { schools: [] } }),
  createAuditLog: async (v: unknown) => ({ data: { auditLog_insert: { id: String((auditRows.push(v), auditRows.length)) } } }),
};
const fakeAuth = {
  verifyIdToken: async (token: string) => {
    if (token === 'superadmin') return { uid: 'u-teacher', globalRole: 'SUPER_ADMIN' }; // also a TEACHER member of the school
    if (token === 'plain') return { uid: 'u-plain' };
    if (ROLES_UNDER_TEST.includes(token)) return { uid: `u-${token}` };
    throw Object.assign(new Error('no'), { code: 'auth/argument-error' });
  },
};

@Controller('t')
class Routes {
  @Permission('students', 'read') @Get('students') students(@Granted() g: GrantedPermission) { return g; }
  @NoAudit('test probe route, writes nothing') @Permission('finance', 'create') @Post('invoices') invoices(@Granted() g: GrantedPermission) { return g; }
  @NoAudit('test probe route, writes nothing') @Permission('memberships', 'create') @Post('members') members(@Granted() g: GrantedPermission) { return g; }
  @Permission('audit_log', 'read') @Get('audit') audit(@Granted() g: GrantedPermission) { return g; }
  @NoAudit('test probe route, writes nothing') @Permission('leave', 'approve') @Post('leave') leave(@Granted() g: GrantedPermission) { return g; }
  @NoAudit('test probe route, writes nothing') @Platform() @Permission('platform_schools', 'create') @Post('platform/schools') schools(@Granted() g: GrantedPermission) { return g; }
  @UserScoped() @Get('me') me() { return { ok: true }; }
  @Public() @Get('open') open() { return { ok: true }; }
}

async function boot(controllers: unknown[] = [Routes]): Promise<INestApplication> {
  Object.assign(process.env, { NODE_ENV: 'test', LOG_LEVEL: 'silent', CORS_ORIGINS: 'http://localhost:3002', THROTTLE_LIMIT: '100000', TENANT_CACHE_TTL_MS: '0' });
  const { vi } = await import('vitest');
  vi.resetModules();
  const { AppModule } = await import('../src/app.module.js');
  const { configureApp } = await import('../src/configure-app.js');
  const { DATABASE } = await import('@oruschools/database');
  const { FIREBASE_AUTH } = await import('../src/auth/firebase-auth.js');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule], controllers: controllers as never[] }).overrideProvider(DATABASE).useValue(fakeDb).overrideProvider(FIREBASE_AUTH).useValue(fakeAuth).compile();
  const app = moduleRef.createNestApplication({ bufferLogs: true });
  configureApp(app);
  await serve(app);
  return app;
}

describe('PermissionGuard through the pipeline (P1-3c)', () => {
  let app: INestApplication;
  beforeAll(async () => (app = await boot()));
  afterAll(async () => app.close());
  const call = (method: 'get' | 'post', path: string, token: string) => agent(app)[method](`/v1/t/${path}`).set('Authorization', `Bearer ${token}`).set('X-School-Id', A);

  // [route, role, expected status, expected scope]
  it.each([
    ['get', 'students', 'principal', 200, 'school'],
    ['get', 'students', 'teacher', 200, 'own'],
    ['get', 'students', 'parent', 200, 'linked'],
    ['get', 'students', 'accountant', 403],
    ['get', 'students', 'hr_manager', 403],
    ['get', 'students', 'driver', 403],
    ['post', 'invoices', 'accountant', 200, 'school'],
    ['post', 'invoices', 'parent', 200, 'linked'],
    ['post', 'invoices', 'teacher', 403],
    ['post', 'invoices', 'hr_manager', 403],
    ['post', 'members', 'system_admin', 200, 'school'],
    ['post', 'members', 'principal', 403], // only the System Admin grants roles (ADR-0007)
    ['post', 'members', 'hr_manager', 403],
    ['get', 'audit', 'system_admin', 200, 'school'],
    ['get', 'audit', 'principal', 403],
    ['post', 'leave', 'principal', 200, 'school'], // only the Principal approves
    ['post', 'leave', 'hr_manager', 403],
    ['post', 'leave', 'system_admin', 403],
  ] as unknown as Array<['get' | 'post', string, string, 200 | 403, string | undefined]>)('%s /%s as %s -> %i', async (method, path, role, status, scope) => {
    const res = await call(method, path, role);
    if (status === 200) {
      expect(res.status).toBeLessThan(300); // POST answers 201
      expect(res.body).toMatchObject({ scope });
    } else {
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    }
  });

  it('a SUPER_ADMIN who is also a TEACHER member gets exactly the TEACHER rights in that school, no more', async () => {
    expect((await call('get', 'students', 'superadmin').expect(200)).body.scope).toBe('own');
    await call('post', 'invoices', 'superadmin').expect(403);
    await call('post', 'members', 'superadmin').expect(403);
  });

  it('platform routes: SUPER_ADMIN only; a Principal of a school cannot create schools', async () => {
    await agent(app).post('/v1/t/platform/schools').set('Authorization', 'Bearer superadmin').expect(201);
    await agent(app).post('/v1/t/platform/schools').set('Authorization', 'Bearer principal').set('X-School-Id', A).expect(403);
  });

  it('user-scoped and public routes need no permission', async () => {
    await agent(app).get('/v1/t/me').set('Authorization', 'Bearer plain').expect(200);
    await agent(app).get('/v1/t/open').expect(200);
  });

  it('a refused request does not leak the permission or role in the response', async () => {
    const res = await call('post', 'members', 'principal').expect(403);
    expect(JSON.stringify(res.body)).not.toMatch(/memberships|SYSTEM_ADMIN|principal|resource|action/i);
  });
});

describe('startup refusal (deny by default)', () => {
  it('does not boot when a route has no access decision, and names the route', async () => {
    @Controller('bad')
    class Forgot {
      @Get('thing') thing() { return 1; }
    }
    await expect(boot([Forgot])).rejects.toThrow(/Refusing to start[\s\S]*GET \/bad\/thing \(Forgot\.thing\)[\s\S]*no access decision/);
  });

  it('does not boot when a route nobody can call is declared (dead permission)', async () => {
    @Controller('dead')
    class Dead {
      @Permission('platform_schools', 'read') @Get('x') x() { return 1; }
    }
    await expect(boot([Dead])).rejects.toThrow(/nobody could ever call/);
  });

  it('does not boot with contradictory decorators', async () => {
    @Controller('mixed')
    class Mixed {
      @Public() @Permission('students', 'read') @Get('x') x() { return 1; }
    }
    await expect(boot([Mixed])).rejects.toThrow(/cannot be combined/);
  });

  it('a class-level decision covers its routes (and a method can still override)', async () => {
    @Public()
    @Controller('openclass')
    class OpenClass {
      @Get('a') a() { return 1; }
      @Get('b') b() { return 2; }
    }
    const app = await boot([OpenClass]);
    try {
      await agent(app).get('/v1/openclass/a').expect(200);
    } finally {
      await app.close();
    }
  });
});
