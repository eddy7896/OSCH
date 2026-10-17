// P1-5: two named limits. `ip` runs before authentication, `user` after it, keyed by the verified uid.
import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Public } from '../src/auth/public.decorator.js';
import { Permission } from '../src/permission/permission.decorator.js';
import { UserScoped } from '../src/tenant/tenant.decorators.js';
import { bootApp } from './support/boot.js';
import { agent } from './support/serve.js';

@Controller('lim')
class Lim {
  @Public() @Get('open') open() { return { ok: true }; }
  @UserScoped() @Get('me') me() { return { ok: true }; }
  @Permission('students', 'read') @Get('school') school() { return { ok: true }; }
}

const MEMBER = { getMembership: async () => ({ data: { schoolMembers: [{ schoolRole: 'PRINCIPAL', status: 'ACTIVE', school: { subscriptionStatus: 'ACTIVE' } }] } }), listSchools: async () => ({ data: { schools: [] } }), createAuditLog: async () => ({ data: {} }) };
const A = '11111111-1111-4111-8111-111111111111';

describe('per-user limit', () => {
  let app: INestApplication;
  beforeAll(async () => (app = await bootApp({ controllers: [Lim], env: { THROTTLE_USER_LIMIT: '3' }, db: MEMBER })));
  afterAll(async () => app.close());
  const me = (who: string) => agent(app).get('/v1/lim/me').set('Authorization', `Bearer ${who}`);

  it('stops one signed-in user after the limit, with the standard envelope', async () => {
    for (let i = 0; i < 3; i++) await me('alice').expect(200);
    const res = await me('alice').expect(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });

  it('does not touch another user on the same IP (one noisy account cannot lock out a school network)', async () => {
    await me('bob').expect(200);
    await me('carol').expect(200);
  });

  it('is per route: the same user is not limited on a different route', async () => {
    await agent(app).get('/v1/lim/school').set('Authorization', 'Bearer alice').set('X-School-Id', A).expect(200);
  });

  it('a public route has no user, so only the IP limit applies to it', async () => {
    for (let i = 0; i < 10; i++) await agent(app).get('/v1/lim/open').expect(200);
  });

  it('health checks are exempt from both limits', async () => {
    for (let i = 0; i < 12; i++) await agent(app).get('/health').expect(200);
  });
});

describe('per-IP limit', () => {
  let app: INestApplication;
  beforeAll(async () => (app = await bootApp({ controllers: [Lim], env: { THROTTLE_LIMIT: '4' } })));
  afterAll(async () => app.close());

  it('limits anonymous callers before authentication is even attempted', async () => {
    for (let i = 0; i < 4; i++) await agent(app).get('/v1/lim/me').expect(401);
    expect((await agent(app).get('/v1/lim/me').expect(429)).body.error.code).toBe('RATE_LIMITED');
  });

  it('applies to a public route as well', async () => {
    for (let i = 0; i < 4; i++) await agent(app).get('/v1/lim/open').expect(200);
    await agent(app).get('/v1/lim/open').expect(429);
  });
});
