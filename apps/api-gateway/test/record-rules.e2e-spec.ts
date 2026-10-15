import { NoAudit } from '../src/audit/audit.decorators.js';
// P1-3d wired into the real pipeline: a handler loads the record, then asks RecordRules before it writes.
import { Body, Controller, Get, type INestApplication, Inject, Param, Patch } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Granted, Permission, type GrantedPermission } from '../src/permission/permission.decorator.js';
import type { RecordRules } from '../src/permission/record-rules.service.js';
import { Tenant, type TenantContext } from '../src/tenant/tenant.decorators.js';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

// The "database": leave requests, including one that (wrongly) belongs to school B.
const leaves = new Map<string, { schoolId: string; ownerUserId: string; status: string; reason: string }>([
  ['l-teacher', { schoolId: A, ownerUserId: 'u-teacher', status: 'PENDING', reason: 'fever' }],
  ['l-principal', { schoolId: A, ownerUserId: 'u-principal', status: 'PENDING', reason: 'conference' }],
  ['l-foreign', { schoolId: B, ownerUserId: 'u-other', status: 'PENDING', reason: 'other school' }],
]);
const ROLE_OF: Record<string, string> = { 'u-principal': 'PRINCIPAL', 'u-hr': 'HR_MANAGER', 'u-teacher': 'TEACHER' };
// Audit rows the fake data layer received (security events).
const auditRows: unknown[] = [];
const fakeDb = {
  getMembership: async ({ userId }: { userId: string }) => ({ data: { schoolMembers: ROLE_OF[userId] ? [{ schoolRole: ROLE_OF[userId], status: 'ACTIVE', school: { subscriptionStatus: 'ACTIVE' } }] : [] } }),
  listSchools: async () => ({ data: { schools: [] } }),
  createAuditLog: async (v: unknown) => ({ data: { auditLog_insert: { id: String((auditRows.push(v), auditRows.length)) } } }),
};
const fakeAuth = { verifyIdToken: async (t: string) => { if (!ROLE_OF[`u-${t}`]) throw Object.assign(new Error('x'), { code: 'auth/argument-error' }); return { uid: `u-${t}` }; } };

let RecordRulesToken: typeof RecordRules;

@Controller('leave')
class LeaveRoutes {
  constructor(@Inject('RECORD_RULES') private readonly rules: RecordRules) {}

  // The matrix lets HR "update" and the Principal "approve" at school scope; the rules decide the rest.
  @NoAudit('test probe route, writes nothing') @Permission('leave', 'update') @Patch(':id') update(@Param('id') id: string, @Body() body: Record<string, unknown>, @Tenant() tenant: TenantContext, @Granted() granted: GrantedPermission) {
    const rec = leaves.get(id);
    if (!rec) return { error: 'missing' };
    this.rules.assert({ tenant, granted, record: { schoolId: rec.schoolId, ownerUserId: rec.ownerUserId }, changes: body });
    Object.assign(rec, body);
    return rec;
  }
}

@Controller('leave-approve')
class ApproveRoutes {
  constructor(@Inject('RECORD_RULES') private readonly rules: RecordRules) {}

  @NoAudit('test probe route, writes nothing') @Permission('leave', 'approve') @Patch(':id') approve(@Param('id') id: string, @Tenant() tenant: TenantContext, @Granted() granted: GrantedPermission) {
    const rec = leaves.get(id)!;
    this.rules.assert({ tenant, granted, record: { schoolId: rec.schoolId, ownerUserId: rec.ownerUserId }, changes: { status: 'APPROVED' } });
    rec.status = 'APPROVED';
    return rec;
  }
}

@Controller('leave-read')
class ReadRoutes {
  constructor(@Inject('RECORD_RULES') private readonly rules: RecordRules) {}

  @Permission('leave', 'read') @Get(':id') read(@Param('id') id: string, @Tenant() tenant: TenantContext, @Granted() granted: GrantedPermission) {
    const rec = leaves.get(id)!;
    this.rules.assert({ tenant, granted, record: { schoolId: rec.schoolId, ownerUserId: rec.ownerUserId } });
    return rec;
  }
}

describe('record rules in the pipeline (P1-3d)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    Object.assign(process.env, { NODE_ENV: 'test', LOG_LEVEL: 'silent', CORS_ORIGINS: 'http://localhost:3002', THROTTLE_LIMIT: '100000', TENANT_CACHE_TTL_MS: '0' });
    const { vi } = await import('vitest');
    vi.resetModules();
    const { AppModule } = await import('../src/app.module.js');
    const { configureApp } = await import('../src/configure-app.js');
    const { DATABASE } = await import('@oruschools/database');
    const { FIREBASE_AUTH } = await import('../src/auth/firebase-auth.js');
    ({ RecordRules: RecordRulesToken } = await import('../src/permission/record-rules.service.js'));
    const moduleRef = await Test.createTestingModule({ imports: [AppModule], controllers: [LeaveRoutes, ApproveRoutes, ReadRoutes], providers: [{ provide: 'RECORD_RULES', useExisting: RecordRulesToken }] })
      .overrideProvider(DATABASE).useValue(fakeDb).overrideProvider(FIREBASE_AUTH).useValue(fakeAuth).compile();
    app = moduleRef.createNestApplication({ bufferLogs: true });
    configureApp(app);
    await app.init();
  });
  afterAll(async () => app.close());
  beforeEach(() => { for (const r of leaves.values()) r.status = 'PENDING'; });
  const patch = (path: string, who: string, body: object = {}) => request(app.getHttpServer()).patch(`/v1/${path}`).set('Authorization', `Bearer ${who}`).set('X-School-Id', A).send(body);
  const get = (path: string, who: string) => request(app.getHttpServer()).get(`/v1/${path}`).set('Authorization', `Bearer ${who}`).set('X-School-Id', A);

  it('the Principal approves a teacher\'s leave', async () => {
    expect((await patch('leave-approve/l-teacher', 'principal').expect(200)).body.status).toBe('APPROVED');
  });

  it('the Principal cannot approve their OWN leave: 403, and the record is unchanged', async () => {
    const res = await patch('leave-approve/l-principal', 'principal').expect(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(JSON.stringify(res.body)).not.toMatch(/own|rule|cannot_approve/i);
    expect(leaves.get('l-principal')!.status).toBe('PENDING');
  });

  it('HR can update the reason of a leave request but not its status', async () => {
    expect((await patch('leave/l-teacher', 'hr', { reason: 'updated by HR' }).expect(200)).body.reason).toBe('updated by HR');
    await patch('leave/l-teacher', 'hr', { status: 'APPROVED' }).expect(403);
    await patch('leave/l-teacher', 'hr', { reason: 'x', status: 'APPROVED' }).expect(403);
    expect(leaves.get('l-teacher')!.status).toBe('PENDING');
  });

  it('a record that belongs to another school is refused even if a handler loaded it by mistake', async () => {
    await patch('leave-approve/l-foreign', 'principal').expect(403);
    expect(leaves.get('l-foreign')!.status).toBe('PENDING');
  });

  it('own scope is enforced on the loaded record: a teacher reads their own leave, not a colleague\'s', async () => {
    await get('leave-read/l-teacher', 'teacher').expect(200);
    await get('leave-read/l-principal', 'teacher').expect(403);
  });

  it('a role without the matrix permission never reaches the rules (403 from the permission guard)', async () => {
    await patch('leave-approve/l-teacher', 'hr').expect(403);
  });
});
