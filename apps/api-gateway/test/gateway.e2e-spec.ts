import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../src/auth/authenticated-user.js';
import { NoAudit } from '../src/audit/audit.decorators.js';
import { Public } from '../src/auth/public.decorator.js';
import { Permission } from '../src/permission/permission.decorator.js';
import { Platform, Tenant, UserScoped, type TenantContext } from '../src/tenant/tenant.decorators.js';
import { IsOptional, IsString } from 'class-validator';
import { agent, serve } from './support/serve.js';

// A real throttled route does not exist yet; unmatched routes (404) never reach guards.
/** One optional property: anything else sent is a 400 (whitelist + forbidNonWhitelisted). A DTO with no decorators at all is itself rejected (forbidUnknownValues). */
class EmptyDto {
  @IsOptional() @IsString() note?: string;
}

@Controller()
class ProbeController {
  @Public()
  @Get('probe')
  open() {
    return { ok: true };
  }

  @UserScoped()
  @Get('secure')
  secure(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @Permission('students', 'read')
  @Get('school-data')
  async schoolData(@Tenant() tenant: TenantContext, @Query() _query: EmptyDto) {
    await new Promise((r) => setTimeout(r, Math.random() * 15)); // interleave concurrent requests
    return tenant;
  }

  @Permission('students', 'create')
  @NoAudit('test probe route, writes nothing')
  @Post('school-data')
  write(@Tenant() tenant: TenantContext, @Body() _body: EmptyDto) {
    return tenant;
  }

  @Platform()
  @Permission('platform_schools', 'read')
  @Get('platform/ping')
  platform(@CurrentUser() user: AuthenticatedUser) {
    return { by: user.uid };
  }
}

// Stands in for Firebase: 'good-user' and 'good-admin' verify, everything else is refused with a Firebase-style code.
const fakeAuth = {
  verifyIdToken: async (token: string) => {
    if (token === 'good-user') return { uid: 'u-1', email: 'u1@example.com', email_verified: true };
    if (token === 'good-admin') return { uid: 'u-2', email: 'a@example.com', email_verified: true, globalRole: 'SUPER_ADMIN' };
    throw Object.assign(new Error('firebase says no: secret detail'), { code: token === 'expired' ? 'auth/id-token-expired' : 'auth/argument-error' });
  },
};

const ENV = { NODE_ENV: 'test', LOG_LEVEL: 'silent', CORS_ORIGINS: 'http://localhost:3002', THROTTLE_LIMIT: '5', THROTTLE_TTL_MS: '60000' };

async function boot(env: Record<string, string> = ENV, db: object = { listSchools: async () => ({ data: { schools: [] } }) }): Promise<INestApplication> {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  try {
    // ConfigModule.forRoot() reads and validates process.env when app.module is first evaluated, so load it fresh per boot.
    vi.resetModules();
    const { AppModule } = await import('../src/app.module.js');
    const { configureApp } = await import('../src/configure-app.js');
    const { DATABASE } = await import('@oruschools/database');
    const { FIREBASE_AUTH } = await import('../src/auth/firebase-auth.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule], controllers: [ProbeController] }).overrideProvider(DATABASE).useValue(db).overrideProvider(FIREBASE_AUTH).useValue(fakeAuth).compile();
    const app = moduleRef.createNestApplication({ bufferLogs: true });
    configureApp(app);
    await serve(app);
    return app;
  } finally {
    for (const k of Object.keys(env)) if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
  }
}

describe('gateway HTTP skeleton (P1-1)', () => {
  let app: INestApplication;
  beforeAll(async () => (app = await boot()));
  afterAll(async () => app.close());

  it('GET /health is 200 and unauthenticated', async () => {
    const res = await agent(app).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('echoes a safe X-Request-Id and generates one otherwise', async () => {
    const a = await agent(app).get('/health').set('X-Request-Id', 'client-id-12345').expect(200);
    expect(a.headers['x-request-id']).toBe('client-id-12345');
    const b = await agent(app).get('/health').expect(200);
    expect(b.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('sets helmet security headers and hides the framework', async () => {
    const res = await agent(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('allows a listed origin and refuses an unlisted one (CORS)', async () => {
    const ok = await agent(app).get('/health').set('Origin', 'http://localhost:3002');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:3002');
    expect(ok.headers['access-control-expose-headers']).toContain('x-request-id');
    const bad = await agent(app).get('/health').set('Origin', 'https://evil.example.com');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('a school wildcard entry allows exactly one label in front of the domain, over the real HTTP stack', async () => {
    const wild = await boot({ ...ENV, CORS_ORIGINS: 'http://localhost:3002,http://*.localhost:3002' });
    try {
      const get = (origin: string) => agent(wild).get('/health').set('Origin', origin).then((r) => r.headers['access-control-allow-origin']);
      expect(await get('http://greenfield.localhost:3002')).toBe('http://greenfield.localhost:3002');
      expect(await get('http://localhost:3002')).toBe('http://localhost:3002');
      expect(await get('http://a.b.localhost:3002')).toBeUndefined();
      expect(await get('http://greenfield.localhost:3003')).toBeUndefined();
      expect(await get('http://greenfield.localhost.evil.com:3002')).toBeUndefined();
      const preflight = await agent(wild).options('/v1/me').set('Origin', 'http://greenfield.localhost:3002').set('Access-Control-Request-Method', 'GET').set('Access-Control-Request-Headers', 'authorization,x-school-id');
      expect(preflight.headers['access-control-allow-origin']).toBe('http://greenfield.localhost:3002');
    } finally {
      await wild.close();
    }
  });

  it('answers a CORS preflight with the allowed headers including X-School-Id', async () => {
    const res = await agent(app).options('/v1/anything').set('Origin', 'http://localhost:3002').set('Access-Control-Request-Method', 'POST').set('Access-Control-Request-Headers', 'authorization,x-school-id');
    expect(res.status).toBeLessThan(300);
    expect(res.headers['access-control-allow-headers']?.toLowerCase()).toContain('x-school-id');
  });

  it('serves nothing at the old scaffold route and 404s unknown /v1 routes with the error envelope', async () => {
    await agent(app).get('/').expect(404);
    const res = await agent(app).get('/v1/nope').expect(404); // guards only run on matched routes
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND', message: 'Not found.' });
    expect(res.body.error.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('authentication (P1-3a)', () => {
  let app: INestApplication;
  beforeAll(async () => (app = await boot({ ...ENV, THROTTLE_LIMIT: '1000' })));
  afterAll(async () => app.close());
  const secure = () => agent(app).get('/v1/secure');

  it('rejects a request with no token: 401 AUTH_REQUIRED in the error envelope with the request id', async () => {
    const res = await secure().set('X-Request-Id', 'req-auth-0001').expect(401);
    expect(res.body).toEqual({ error: { code: 'AUTH_REQUIRED', message: 'Sign in to continue.', requestId: 'req-auth-0001' } });
    expect(res.headers['x-request-id']).toBe('req-auth-0001');
  });

  it.each([['garbage', 'Bearer not.a.jwt'], ['expired', 'Bearer expired'], ['wrong scheme', 'Basic good-user'], ['empty bearer', 'Bearer ']])('rejects %s with the identical 401 (the response never says why)', async (_n, header) => {
    const res = await secure().set('Authorization', header).expect(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
    expect(JSON.stringify(res.body)).not.toMatch(/firebase|secret|expired|argument/i);
  });

  it('accepts a verified token and exposes only uid, email, emailVerified and globalRole', async () => {
    const res = await secure().set('Authorization', 'Bearer good-user').expect(200);
    expect(res.body).toEqual({ uid: 'u-1', email: 'u1@example.com', emailVerified: true, globalRole: 'USER' });
    const admin = await secure().set('Authorization', 'Bearer good-admin').expect(200);
    expect(admin.body.globalRole).toBe('SUPER_ADMIN');
  });

  it('a public route and the health endpoints need no token', async () => {
    await agent(app).get('/v1/probe').expect(200);
    await agent(app).get('/health').expect(200);
    await agent(app).get('/health/db').expect(200);
  });

  it('a request-body or query schoolId or role never changes who the caller is', async () => {
    const res = await agent(app).get('/v1/secure?globalRole=SUPER_ADMIN&uid=u-2').set('Authorization', 'Bearer good-user').set('X-Globalrole', 'SUPER_ADMIN').expect(200);
    expect(res.body).toMatchObject({ uid: 'u-1', globalRole: 'USER' });
  });
});

describe('database readiness', () => {
  it('GET /health/db is 200 when Data Connect answers, and is outside /v1', async () => {
    const app = await boot();
    try {
      const res = await agent(app).get('/health/db').expect(200);
      expect(res.body.info.database.status).toBe('up');
      await agent(app).get('/v1/health/db').expect(404);
    } finally {
      await app.close();
    }
  });

  it('GET /health/db is 503 when Data Connect fails, without leaking the cause; liveness stays 200', async () => {
    const app = await boot(ENV, { listSchools: async () => Promise.reject(new Error('connect ECONNREFUSED 10.1.2.3:9399 secret-detail')) });
    try {
      const res = await agent(app).get('/health/db').expect(503);
      expect(res.body.error.database.status).toBe('down');
      expect(JSON.stringify(res.body)).not.toMatch(/ECONNREFUSED|10\.1\.2\.3|secret-detail/);
      await agent(app).get('/health').expect(200);
    } finally {
      await app.close();
    }
  });
});

describe('throttling', () => {
  it('returns 429 after the configured number of requests, but never for /health', async () => {
    const app = await boot();
    try {
      for (let i = 0; i < 20; i++) await agent(app).get('/health').expect(200);
      // Rate limiting runs before authentication: a flood of unauthenticated calls is throttled, not just rejected.
      for (let i = 0; i < 5; i++) await agent(app).get('/v1/secure').expect(401);
      await agent(app).get('/v1/secure').expect(429);
      await agent(app).get('/v1/secure').expect(429);
      for (let i = 0; i < 5; i++) await agent(app).get('/v1/probe').expect(200);
      await agent(app).get('/v1/probe').expect(429);
      await agent(app).get('/health').expect(200);
    } finally {
      await app.close();
    }
  });
});

describe('fail-fast configuration', () => {
  it('refuses to boot with a bad environment and lists the variables', async () => {
    await expect(boot({ ...ENV, PORT: 'abc', CORS_ORIGINS: 'nope' })).rejects.toThrow(/PORT[\s\S]*CORS_ORIGINS/);
  });
});
