// P1-5: the validation pipeline through the real app, and the startup refusal of untyped inputs.
import { Body, Controller, Get, type INestApplication, Post, Query } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { NoAudit } from '../src/audit/audit.decorators.js';
import { Permission } from '../src/permission/permission.decorator.js';
import { bootApp } from './support/boot.js';
import { agent } from './support/serve.js';

const A = '11111111-1111-4111-8111-111111111111';
const MEMBER = { getMembership: async () => ({ data: { schoolMembers: [{ schoolRole: 'SYSTEM_ADMIN', status: 'ACTIVE', school: { subscriptionStatus: 'ACTIVE' } }] } }), listSchools: async () => ({ data: { schools: [] } }), createAuditLog: async () => ({ data: {} }) };

class AddMemberDto {
  @IsString() @MaxLength(64) userId!: string;
}
class SearchDto {
  @IsOptional() @IsString() q?: string;
}

let handled = 0;
@Controller('v')
class V {
  @Permission('memberships', 'create') @NoAudit('test probe that writes nothing') @Post('members')
  add(@Body() dto: AddMemberDto) { handled++; return { userId: dto.userId }; }

  @Permission('memberships', 'read') @Get('search')
  search(@Query() q: SearchDto) { return { q: q.q ?? null }; }
}

describe('validation through the pipeline (P1-5)', () => {
  let app: INestApplication;
  beforeAll(async () => (app = await bootApp({ controllers: [V], db: MEMBER })));
  afterAll(async () => app.close());
  beforeEach(() => { handled = 0; });
  const post = (body: unknown) => agent(app).post('/v1/v/members').set('Authorization', 'Bearer admin').set('X-School-Id', A).send(body as object);

  it('accepts a valid body', async () => {
    expect((await post({ userId: 'u-1' }).expect(201)).body).toEqual({ userId: 'u-1' });
  });

  it.each([
    ['schoolId', { userId: 'u-1', schoolId: '22222222-2222-4222-8222-222222222222' }],
    ['schoolRole', { userId: 'u-1', schoolRole: 'PRINCIPAL' }],
    ['globalRole', { userId: 'u-1', globalRole: 'SUPER_ADMIN' }],
  ])('rejects %s smuggled into the body: 400 with the field named, the handler never runs, the value is not echoed', async (field, body) => {
    const res = await post(body).expect(400);
    expect(res.body.error.code).toBe('INVALID_REQUEST');
    expect(res.body.error.details).toContainEqual({ field, rule: 'whitelistValidation' });
    expect(JSON.stringify(res.body)).not.toMatch(/SUPER_ADMIN|PRINCIPAL|22222222/);
    expect(handled).toBe(0);
  });

  it('rejects missing and wrongly typed fields, with the standard envelope and request id', async () => {
    const res = await post({ userId: 5 }).expect(400);
    expect(res.body.error).toMatchObject({ code: 'INVALID_REQUEST', message: 'The request is not valid.' });
    expect(res.body.error.requestId).toBeTruthy();
    expect(res.body.error.details).toContainEqual({ field: 'userId', rule: 'isString' });
    await post({}).expect(400);
    await post({ userId: 'x'.repeat(65) }).expect(400);
  });

  it('rejects a body that is not an object', async () => {
    await agent(app).post('/v1/v/members').set('Authorization', 'Bearer admin').set('X-School-Id', A).set('Content-Type', 'application/json').send('[1,2]').expect(400);
    await agent(app).post('/v1/v/members').set('Authorization', 'Bearer admin').set('X-School-Id', A).set('Content-Type', 'application/json').send('{not json').expect(400);
  });

  it('a malformed JSON body is the same envelope, with no parser detail', async () => {
    const res = await agent(app).post('/v1/v/members').set('Authorization', 'Bearer admin').set('X-School-Id', A).set('Content-Type', 'application/json').send('{"userId": ').expect(400);
    expect(res.body.error.code).toBe('INVALID_REQUEST');
    expect(JSON.stringify(res.body)).not.toMatch(/Unexpected|JSON|position|SyntaxError/i);
  });

  it('validates the query string the same way: unknown parameters are refused', async () => {
    await agent(app).get('/v1/v/search?q=ok').set('Authorization', 'Bearer admin').set('X-School-Id', A).expect(200);
    const res = await agent(app).get('/v1/v/search?q=ok&schoolId=22222222-2222-4222-8222-222222222222').set('Authorization', 'Bearer admin').set('X-School-Id', A).expect(400);
    expect(res.body.error.details).toContainEqual({ field: 'schoolId', rule: 'whitelistValidation' });
  });

  it('runs after the guards: an unauthenticated or unauthorised caller never gets validation feedback', async () => {
    const anon = await agent(app).post('/v1/v/members').send({ nonsense: true }).expect(401);
    expect(anon.body.error.details).toBeUndefined();
  });
});

describe('startup refusal for untyped inputs', () => {
  it('does not boot when @Body() is typed as a plain object, because the pipe would let anything through', async () => {
    @Controller('u1')
    class Untyped {
      @Permission('students', 'create') @NoAudit('test probe that writes nothing') @Post('x')
      x(@Body() body: Record<string, unknown>) { return body; }
    }
    await expect(bootApp({ controllers: [Untyped] })).rejects.toThrow(/Refusing to start[\s\S]*@Body\(\) parameter 1 is not typed with a DTO class/);
  });

  it('does not boot when @Query() is untyped', async () => {
    @Controller('u2')
    class UntypedQuery {
      @Permission('students', 'read') @Get('x')
      x(@Query() q: unknown) { return q; }
    }
    await expect(bootApp({ controllers: [UntypedQuery] })).rejects.toThrow(/@Query\(\) parameter 1 is not typed/);
  });

  it('boots with a DTO, and a handler with no body or query at all needs nothing', async () => {
    @Controller('u3')
    class Fine {
      @Permission('students', 'read') @Get('x') x() { return 1; }
      @Permission('students', 'create') @NoAudit('test probe that writes nothing') @Post('y') y(@Body() b: AddMemberDto) { return b; }
    }
    const app = await bootApp({ controllers: [Fine] });
    await app.close();
  });
});
