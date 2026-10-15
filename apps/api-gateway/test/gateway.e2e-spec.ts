import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { Controller, Get } from '@nestjs/common';
import request from 'supertest';

// A real throttled route does not exist yet; unmatched routes (404) never reach guards.
@Controller('probe')
class ProbeController {
  @Get()
  get() {
    return { ok: true };
  }
}

const ENV = { NODE_ENV: 'test', LOG_LEVEL: 'silent', CORS_ORIGINS: 'http://localhost:3002', THROTTLE_LIMIT: '5', THROTTLE_TTL_MS: '60000' };

async function boot(env: Record<string, string> = ENV): Promise<INestApplication> {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  try {
    // ConfigModule.forRoot() reads and validates process.env when app.module is first evaluated, so load it fresh per boot.
    vi.resetModules();
    const { AppModule } = await import('../src/app.module.js');
    const { configureApp } = await import('../src/configure-app.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule], controllers: [ProbeController] }).compile();
    const app = moduleRef.createNestApplication({ bufferLogs: true });
    configureApp(app);
    await app.init();
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
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('echoes a safe X-Request-Id and generates one otherwise', async () => {
    const a = await request(app.getHttpServer()).get('/health').set('X-Request-Id', 'client-id-12345').expect(200);
    expect(a.headers['x-request-id']).toBe('client-id-12345');
    const b = await request(app.getHttpServer()).get('/health').expect(200);
    expect(b.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('sets helmet security headers and hides the framework', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('allows a listed origin and refuses an unlisted one (CORS)', async () => {
    const ok = await request(app.getHttpServer()).get('/health').set('Origin', 'http://localhost:3002');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:3002');
    expect(ok.headers['access-control-expose-headers']).toContain('x-request-id');
    const bad = await request(app.getHttpServer()).get('/health').set('Origin', 'https://evil.example.com');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers a CORS preflight with the allowed headers including X-School-Id', async () => {
    const res = await request(app.getHttpServer()).options('/v1/anything').set('Origin', 'http://localhost:3002').set('Access-Control-Request-Method', 'POST').set('Access-Control-Request-Headers', 'authorization,x-school-id');
    expect(res.status).toBeLessThan(300);
    expect(res.headers['access-control-allow-headers']?.toLowerCase()).toContain('x-school-id');
  });

  it('serves nothing at the old scaffold route and 404s unknown /v1 routes', async () => {
    await request(app.getHttpServer()).get('/').expect(404);
    await request(app.getHttpServer()).get('/v1/nope').expect(404);
  });
});

describe('throttling', () => {
  it('returns 429 after the configured number of requests, but never for /health', async () => {
    const app = await boot();
    try {
      for (let i = 0; i < 20; i++) await request(app.getHttpServer()).get('/health').expect(200);
      for (let i = 0; i < 5; i++) await request(app.getHttpServer()).get('/v1/probe').expect(200);
      await request(app.getHttpServer()).get('/v1/probe').expect(429);
      await request(app.getHttpServer()).get('/health').expect(200);
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
