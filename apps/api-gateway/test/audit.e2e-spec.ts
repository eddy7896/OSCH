// P1-4: security events and request auditing through the real pipeline (fake data layer, fake Firebase tokens).
import { Controller, Get, type INestApplication, Logger, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { agent, serve } from './support/serve.js';
import { Audit, NoAudit } from '../src/audit/audit.decorators.js';
import { Permission } from '../src/permission/permission.decorator.js';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const ROLE_OF: Record<string, string> = { 'u-principal': 'PRINCIPAL', 'u-sysadmin': 'SYSTEM_ADMIN' };

const auditRows: Array<Record<string, any>> = [];
let auditFails = false;
const fakeDb = {
  getMembership: async ({ schoolId, userId }: { schoolId: string; userId: string }) => ({ data: { schoolMembers: schoolId === A && ROLE_OF[userId] ? [{ schoolRole: ROLE_OF[userId], status: 'ACTIVE', school: { subscriptionStatus: 'ACTIVE' } }] : [] } }),
  listSchools: async () => ({ data: { schools: [] } }),
  createAuditLog: async (v: Record<string, any>) => {
    if (auditFails) throw new Error('db down: secret-detail');
    auditRows.push(v);
    return { data: { auditLog_insert: { id: 'x' } } };
  },
};
const fakeAuth = {
  verifyIdToken: async (t: string) => {
    if (['principal', 'sysadmin', 'stranger'].includes(t)) return { uid: `u-${t}` };
    throw Object.assign(new Error('x'), { code: 'auth/argument-error' });
  },
};

@Controller('m')
class Routes {
  @Permission('memberships', 'create') @Audit({ action: 'membership.add', operation: 'AddMembership' }) @Post('members') add() { return { ok: true }; }
  @Permission('memberships', 'create') @NoAudit('test probe that writes nothing') @Post('quiet') quiet() { return { ok: true }; }
  @Permission('students', 'read') @Get('students') read() { return { ok: true }; }
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
const flush = () => new Promise((r) => setTimeout(r, 25));

describe('security events and auditing (P1-4)', () => {
  let app: INestApplication;
  beforeAll(async () => (app = await boot()));
  afterAll(async () => app.close());
  beforeEach(() => { auditRows.length = 0; auditFails = false; });
  const post = (path: string, who: string, school: string = A) => agent(app).post(`/v1/m/${path}`).set('Authorization', `Bearer ${who}`).set('X-School-Id', school).send({ password: 'SECRET-BODY' });

  it('a role-change attempt by someone who may not is stored as a security event with the required permission and the verified school', async () => {
    await post('members', 'principal').expect(403); // only the System Admin may create memberships
    await flush();
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]).toMatchObject({ schoolId: A, actorId: 'u-principal', action: 'security.denied', entityType: 'Route', entityId: 'POST /v1/m/members', details: { code: 'FORBIDDEN', status: 403, resource: 'memberships', requiredAction: 'create' } });
    expect(JSON.stringify(auditRows)).not.toMatch(/SECRET-BODY|Bearer/);
  });

  it('the client never learns it was recorded or why: the 403 body is the plain envelope', async () => {
    const res = await post('members', 'principal').expect(403);
    expect(Object.keys(res.body)).toEqual(['error']);
    expect(Object.keys(res.body.error).sort()).toEqual(['code', 'message', 'requestId']);
    expect(JSON.stringify(res.body)).not.toMatch(/audit|security|memberships/i);
  });

  it('probing a school you do not belong to is stored with no school and the claimed id in the details', async () => {
    await post('members', 'stranger', B).expect(403);
    await post('members', 'stranger', A).expect(403);
    await flush();
    expect(auditRows[0]).toMatchObject({ schoolId: null, actorId: 'u-stranger', details: { attemptedSchoolId: B } });
    expect(auditRows[1]).toMatchObject({ schoolId: null, details: { attemptedSchoolId: A } });
  });

  it('an unauthenticated 401 is not stored, an unknown route is not stored, a success is not a security event', async () => {
    await agent(app).post('/v1/m/members').expect(401);
    await agent(app).get('/v1/nope').set('Authorization', 'Bearer principal').expect(404);
    await post('members', 'sysadmin').expect(201);
    await flush();
    expect(auditRows).toHaveLength(0);
  });

  it('a failing audit write cannot change the answer: still a clean 403', async () => {
    auditFails = true;
    const res = await post('members', 'principal').expect(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(JSON.stringify(res.body)).not.toContain('secret-detail');
  });

  it('a flood of denied calls from one user stores at most 30 rows a minute', async () => {
    const fresh = await boot(); // the cap is per actor per minute and earlier tests already used some of this app's allowance
    try {
      for (let i = 0; i < 40; i++) await agent(fresh).post('/v1/m/members').set('Authorization', 'Bearer principal').set('X-School-Id', A).expect(403);
      await flush();
      expect(auditRows.length).toBe(30);
    } finally {
      await fresh.close();
    }
  });

  it('a successful state-changing request writes one audited log line with the declared action and no body or token', async () => {
    const log = vi.spyOn(Logger.prototype, 'log');
    try {
      await post('members', 'sysadmin').expect(201);
      const lines = log.mock.calls.map((c) => c[0] as Record<string, unknown>).filter((o) => o && typeof o === 'object' && o['event'] === 'request.audited');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({ outcome: 'success', status: 201, uid: 'u-sysadmin', schoolId: A, role: 'SYSTEM_ADMIN', method: 'POST', route: '/v1/m/members', action: 'membership.add' });
      expect(JSON.stringify(log.mock.calls)).not.toMatch(/SECRET-BODY|Bearer|sysadmin-token/);
    } finally {
      log.mockRestore();
    }
  });

  it('reads and denied requests are not written as audited-request lines (only requests that reached the handler)', async () => {
    const log = vi.spyOn(Logger.prototype, 'log');
    try {
      await agent(app).get('/v1/m/students').set('Authorization', 'Bearer principal').set('X-School-Id', A).expect(200);
      await post('members', 'principal').expect(403);
      expect(log.mock.calls.filter((c) => (c[0] as Record<string, unknown>)?.['event'] === 'request.audited')).toHaveLength(0);
    } finally {
      log.mockRestore();
    }
  });
});

describe('startup refusal for unaudited writes', () => {
  it('does not boot when a POST/PUT/PATCH/DELETE route has neither @Audit nor @NoAudit, and names it', async () => {
    @Controller('w')
    class Unaudited {
      @Permission('students', 'create') @Post('x') x() { return 1; }
    }
    await expect(boot([Unaudited])).rejects.toThrow(/Refusing to start[\s\S]*POST \/w\/x \(Unaudited\.x\)[\s\S]*needs @Audit/);
  });

  it('does not boot when a read route carries @Audit', async () => {
    @Controller('r')
    class AuditedRead {
      @Permission('students', 'read') @Audit({ action: 'student.view', operation: 'ViewStudent' }) @Get('x') x() { return 1; }
    }
    await expect(boot([AuditedRead])).rejects.toThrow(/only belongs on a state-changing route/);
  });
});
