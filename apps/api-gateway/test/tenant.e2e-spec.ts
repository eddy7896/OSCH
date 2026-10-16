// P1-3b: the school check. A fake data layer holds memberships; tokens are fake Firebase tokens (the real ones are
// covered in auth.integration.ts).
import { Body, Controller, Get, type INestApplication, Post, Query } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsOptional, IsString } from 'class-validator';
import { agent, serve } from './support/serve.js';
import { CurrentUser, type AuthenticatedUser } from '../src/auth/authenticated-user.js';
import { NoAudit } from '../src/audit/audit.decorators.js';
import { Public } from '../src/auth/public.decorator.js';
import { Permission } from '../src/permission/permission.decorator.js';
import { Platform, Tenant, UserScoped, type TenantContext } from '../src/tenant/tenant.decorators.js';

const A = '11111111-1111-4111-8111-111111111111'; // active school
const B = '22222222-2222-4222-8222-222222222222'; // another active school
const S = '33333333-3333-4333-8333-333333333333'; // suspended school
const GHOST = '99999999-9999-4999-8999-999999999999'; // does not exist

type Row = { schoolRole: string; status: string; school: { subscriptionStatus: string } };
const members = new Map<string, Row>();
const row = (schoolRole = 'TEACHER', status = 'ACTIVE', subscriptionStatus = 'ACTIVE'): Row => ({ schoolRole, status, school: { subscriptionStatus } });
let dbCalls = 0;
let dbFailure: Error | undefined;
// Audit rows the fake data layer received (security events).
const auditRows: unknown[] = [];
const fakeDb = {
  getMembership: async ({ schoolId, userId }: { schoolId: string; userId: string }) => {
    dbCalls++;
    if (dbFailure) throw dbFailure;
    const r = members.get(`${schoolId}:${userId}`);
    return { data: { schoolMembers: r ? [r] : [] } };
  },
  listSchools: async () => ({ data: { schools: [] } }),
  createAuditLog: async (v: unknown) => ({ data: { auditLog_insert: { id: String((auditRows.push(v), auditRows.length)) } } }),
};

const USERS: Record<string, { uid: string; globalRole?: string }> = {
  teacher: { uid: 'u-teacher' },
  other: { uid: 'u-other' },
  outsider: { uid: 'u-outsider' },
  suspended: { uid: 'u-suspended' },
  admin: { uid: 'u-admin', globalRole: 'SUPER_ADMIN' },
};
const fakeAuth = {
  verifyIdToken: async (token: string) => {
    const u = USERS[token];
    if (!u) throw Object.assign(new Error('no'), { code: 'auth/argument-error' });
    return { ...u, email: `${u.uid}@example.com`, email_verified: true };
  },
};

class EmptyDto {
  @IsOptional() @IsString() note?: string;
}

@Controller()
class Probe {
  @Public()
  @Get('open')
  open() {
    return { ok: true };
  }

  @UserScoped()
  @Get('me-ish')
  me(@CurrentUser() u: AuthenticatedUser) {
    return { uid: u.uid };
  }

  @Permission('students', 'read')
  @Get('school-data')
  async read(@Tenant() t: TenantContext, @Query() _q: EmptyDto) {
    await new Promise((r) => setTimeout(r, Math.random() * 15));
    return t;
  }

  @Permission('attendance', 'create')
  @NoAudit('test probe route, writes nothing')
  @Post('school-data')
  write(@Tenant() t: TenantContext, @Body() _b: EmptyDto) {
    return t;
  }

  @Platform()
  @Permission('platform_schools', 'read')
  @Get('platform/ping')
  ping(@CurrentUser() u: AuthenticatedUser) {
    return { by: u.uid };
  }
}

async function boot(ttl = '30000'): Promise<INestApplication> {
  Object.assign(process.env, { NODE_ENV: 'test', LOG_LEVEL: 'silent', CORS_ORIGINS: 'http://localhost:3002', THROTTLE_LIMIT: '100000', TENANT_CACHE_TTL_MS: ttl });
  const { vi: v } = await import('vitest');
  v.resetModules();
  const { AppModule } = await import('../src/app.module.js');
  const { configureApp } = await import('../src/configure-app.js');
  const { DATABASE } = await import('@oruschools/database');
  const { FIREBASE_AUTH } = await import('../src/auth/firebase-auth.js');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule], controllers: [Probe] }).overrideProvider(DATABASE).useValue(fakeDb).overrideProvider(FIREBASE_AUTH).useValue(fakeAuth).compile();
  const app = moduleRef.createNestApplication({ bufferLogs: true });
  configureApp(app);
  await serve(app);
  return app;
}

describe('TenantGuard (P1-3b)', () => {
  let app: INestApplication;
  const get = (path: string, user?: string, school?: string) => {
    const r = agent(app).get(path);
    if (user) r.set('Authorization', `Bearer ${user}`);
    if (school) r.set('X-School-Id', school);
    return r;
  };

  beforeAll(async () => (app = await boot('0'))); // cache off here; cache behaviour has its own block
  afterAll(async () => app.close());
  beforeEach(() => {
    members.clear();
    dbCalls = 0;
    dbFailure = undefined;
    members.set(`${A}:u-teacher`, row('TEACHER'));
    members.set(`${B}:u-other`, row('PRINCIPAL'));
    members.set(`${A}:u-suspended`, row('TEACHER', 'SUSPENDED'));
    members.set(`${S}:u-teacher`, row('TEACHER', 'ACTIVE', 'SUSPENDED'));
  });

  it('gives an active member the tenant context built from the membership', async () => {
    const res = await get('/v1/school-data', 'teacher', A).expect(200);
    expect(res.body).toEqual({ schoolId: A, userId: 'u-teacher', schoolRole: 'TEACHER' });
  });

  it('normalises the school id to lower case', async () => {
    expect((await get('/v1/school-data', 'teacher', A.toUpperCase()).expect(200)).body.schoolId).toBe(A);
  });

  it.each([
    ['no header', undefined],
    ['not a uuid', 'school-a'],
    ['sql-ish', `${A}' OR '1'='1`],
    ['two ids', `${A},${B}`],
    ['empty', ' '],
  ])('rejects %s with 400 INVALID_REQUEST before touching the database', async (_n, header) => {
    const res = await get('/v1/school-data', 'teacher', header).expect(400);
    expect(res.body.error.code).toBe('INVALID_REQUEST');
    expect(dbCalls).toBe(0);
  });

  it('answers an unknown school, a school the user does not belong to, and a suspended member with the IDENTICAL 403', async () => {
    const unknown = await get('/v1/school-data', 'teacher', GHOST).expect(403);
    const notMine = await get('/v1/school-data', 'teacher', B).expect(403);
    const outsider = await get('/v1/school-data', 'outsider', A).expect(403);
    const suspendedMember = await get('/v1/school-data', 'suspended', A).expect(403);
    const strip = (b: { error: { requestId?: string } }) => ({ ...b.error, requestId: undefined });
    for (const r of [notMine, outsider, suspendedMember]) expect(strip(r.body)).toEqual(strip(unknown.body));
    expect(unknown.body.error.code).toBe('FORBIDDEN');
  });

  it('tells an active member of a suspended school that it is suspended, and nobody else', async () => {
    expect((await get('/v1/school-data', 'teacher', S).expect(403)).body.error.code).toBe('SCHOOL_SUSPENDED');
    members.set(`${S}:u-other`, row('TEACHER', 'SUSPENDED', 'SUSPENDED'));
    expect((await get('/v1/school-data', 'other', S).expect(403)).body.error.code).toBe('FORBIDDEN');
    expect((await get('/v1/school-data', 'outsider', S).expect(403)).body.error.code).toBe('FORBIDDEN');
  });

  it('a school id in the query or the body is rejected outright (400) and never read; the header-verified school is the only one', async () => {
    const q = await get(`/v1/school-data?schoolId=${B}&school=${B}`, 'teacher', A).expect(400);
    expect(q.body.error.code).toBe('INVALID_REQUEST');
    const b = await agent(app).post('/v1/school-data').set('Authorization', 'Bearer teacher').set('X-School-Id', A).send({ schoolId: B, tenant: { schoolId: B } }).expect(400);
    expect(b.body.error.details).toEqual(expect.arrayContaining([{ field: 'schoolId', rule: 'whitelistValidation' }]));
    expect(JSON.stringify(b.body)).not.toContain(B); // the submitted value is never echoed
    const ok = await agent(app).post('/v1/school-data').set('Authorization', 'Bearer teacher').set('X-School-Id', A).send({}).expect(201);
    expect(ok.body).toMatchObject({ schoolId: A, userId: 'u-teacher' });
  });

  it('a school id only in the body or query (no header) is not enough', async () => {
    await agent(app).post('/v1/school-data').set('Authorization', 'Bearer teacher').send({ schoolId: A }).expect(400);
    await get(`/v1/school-data?schoolId=${A}`, 'teacher').expect(400);
  });

  it('a membership of school B gives no access to school A even with a valid token', async () => {
    await get('/v1/school-data', 'other', A).expect(403);
    expect((await get('/v1/school-data', 'other', B).expect(200)).body.schoolRole).toBe('PRINCIPAL');
  });

  it('a user-scoped route needs a token but no school', async () => {
    await get('/v1/me-ish', 'outsider').expect(200);
    await get('/v1/me-ish').expect(401);
  });

  it('a platform route is for SUPER_ADMIN only, ignores X-School-Id, and a SUPER_ADMIN has no tenant access', async () => {
    expect((await get('/v1/platform/ping', 'admin').expect(200)).body).toEqual({ by: 'u-admin' });
    expect((await get('/v1/platform/ping', 'admin', A).expect(200)).body).toEqual({ by: 'u-admin' });
    await get('/v1/platform/ping', 'teacher', A).expect(403);
    await get('/v1/platform/ping').expect(401);
    await get('/v1/school-data', 'admin', A).expect(403); // platform role is not a school role
  });

  it('a public route needs nothing', async () => {
    await get('/v1/open').expect(200);
  });

  it('fails closed when the database is unavailable: 502, never an allow', async () => {
    // Must be the DatabaseError class the app loaded (boot() resets the module registry).
    const { DatabaseError } = await import('@oruschools/database');
    dbFailure = new DatabaseError('UNAVAILABLE');
    const res = await get('/v1/school-data', 'teacher', A).expect(502);
    expect(res.body.error.code).toBe('UPSTREAM_UNAVAILABLE');
  });

  it('treats a role string it does not know as no access', async () => {
    members.set(`${A}:u-teacher`, row('SUPERUSER'));
    await get('/v1/school-data', 'teacher', A).expect(403);
  });

  it('keeps concurrent requests of different users and schools apart (no context leaks between requests)', async () => {
    const plan = Array.from({ length: 60 }, (_v, i) => (i % 2 === 0 ? { user: 'teacher', school: A, uid: 'u-teacher', role: 'TEACHER' } : { user: 'other', school: B, uid: 'u-other', role: 'PRINCIPAL' }));
    const results = await Promise.all(plan.map((p) => agent(app).get('/v1/school-data').set('Authorization', `Bearer ${p.user}`).set('X-School-Id', p.school)));
    results.forEach((res, i) => expect(res.body).toEqual({ schoolId: plan[i]!.school, userId: plan[i]!.uid, schoolRole: plan[i]!.role }));
  });
});

describe('TenantGuard membership cache', () => {
  let app: INestApplication;
  beforeAll(async () => (app = await boot('30000')));
  afterAll(async () => app.close());
  beforeEach(() => {
    members.clear();
    dbCalls = 0;
    dbFailure = undefined;
    members.set(`${A}:u-teacher`, row('TEACHER'));
  });
  const hit = (user = 'teacher', school = A) => agent(app).get('/v1/school-data').set('Authorization', `Bearer ${user}`).set('X-School-Id', school);

  it('asks the database once for repeated allowed requests, and never caches a denial', async () => {
    await hit().expect(200);
    await hit().expect(200);
    expect(dbCalls).toBe(1);
    await hit('outsider').expect(403);
    members.set(`${A}:u-outsider`, row('TEACHER'));
    await hit('outsider').expect(200); // a new member is allowed immediately
  });
});
