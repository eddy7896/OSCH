// P1-5: the OpenAPI document is generated from the same decorators the guards enforce.
import { Body, Controller, Get, type INestApplication, Post } from '@nestjs/common';
import { IsString } from 'class-validator';
import { Audit } from '../src/audit/audit.decorators.js';
import { Public } from '../src/auth/public.decorator.js';
import { Permission } from '../src/permission/permission.decorator.js';
import { Platform, UserScoped } from '../src/tenant/tenant.decorators.js';
import { bootApp } from './support/boot.js';

class MemberDto { @IsString() userId!: string; }

@Controller('c')
class Contract {
  @Public() @Get('open') open() { return 1; }
  @UserScoped() @Get('me') me() { return 1; }
  @Platform() @Permission('platform_schools', 'read') @Get('platform/schools') schools() { return 1; }
  @Permission('students', 'read') @Get('students') students() { return 1; }
  @Permission('memberships', 'create') @Audit({ action: 'membership.add', operation: 'AddMembership' }) @Post('members') add(@Body() _b: MemberDto) { return 1; }
}

describe('OpenAPI contract (P1-5)', () => {
  let app: INestApplication;
  let doc: any;
  let routes: any[];
  beforeAll(async () => {
    app = await bootApp({ controllers: [Contract] });
    const { RouteDecisionCheck } = await import('../src/permission/route-decision.check.js');
    const { buildOpenApi } = await import('../src/openapi/build-openapi.js');
    routes = app.get(RouteDecisionCheck).collect();
    doc = buildOpenApi(app, routes);
  });
  afterAll(async () => app.close());
  const op = (method: string, path: string) => doc.paths[path][method];

  it('documents every registered route under the /v1 prefix (health outside it) with a stable operationId', () => {
    expect(op('get', '/v1/c/open').operationId).toBe('Contract_open');
    expect(op('post', '/v1/c/members').operationId).toBe('Contract_add');
    expect(op('get', '/health').operationId).toBe('Health_check');
    const ids = Object.values(doc.paths).flatMap((p: any) => Object.values(p).map((o: any) => o.operationId));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('marks exactly the @Public routes as needing no credentials; everything else needs the bearer token', () => {
    expect(op('get', '/v1/c/open').security).toEqual([]);
    expect(op('get', '/health').security).toEqual([]);
    for (const [m, p] of [['get', '/v1/c/me'], ['get', '/v1/c/platform/schools'], ['get', '/v1/c/students'], ['post', '/v1/c/members']]) expect(op(m!, p!).security).toEqual([{ bearer: [] }]);
    expect(doc.components.securitySchemes.bearer).toMatchObject({ type: 'http', scheme: 'bearer' });
  });

  it('requires X-School-Id on tenant routes only', () => {
    const hasSchool = (o: any) => (o.parameters ?? []).some((p: any) => p.$ref === '#/components/parameters/SchoolId');
    expect(hasSchool(op('get', '/v1/c/students'))).toBe(true);
    expect(hasSchool(op('post', '/v1/c/members'))).toBe(true);
    for (const [m, p] of [['get', '/v1/c/open'], ['get', '/v1/c/me'], ['get', '/v1/c/platform/schools']]) expect(hasSchool(op(m!, p!))).toBe(false);
    expect(doc.components.parameters.SchoolId).toMatchObject({ name: 'X-School-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } });
  });

  it('states the access class, the permission and the audit action on each operation', () => {
    expect(op('get', '/v1/c/open')['x-access']).toBe('public');
    expect(op('get', '/v1/c/me')['x-access']).toBe('user');
    expect(op('get', '/v1/c/platform/schools')).toMatchObject({ 'x-access': 'platform', 'x-permission': { resource: 'platform_schools', action: 'read' } });
    expect(op('post', '/v1/c/members')).toMatchObject({ 'x-access': 'tenant', 'x-permission': { resource: 'memberships', action: 'create' }, 'x-audit': { action: 'membership.add', operation: 'AddMembership' } });
    expect(op('get', '/v1/c/students')['x-audit']).toBeUndefined();
  });

  it('declares the error envelope on the right statuses', () => {
    const statuses = (o: any) => Object.keys(o.responses).filter((s) => s !== '200' && s !== '201').sort();
    expect(statuses(op('get', '/v1/c/open'))).toEqual(['429', '500']);
    expect(statuses(op('get', '/v1/c/me'))).toEqual(['401', '403', '429', '500']);
    expect(statuses(op('get', '/v1/c/students'))).toEqual(['400', '401', '403', '429', '500']);
    expect(op('post', '/v1/c/members').responses['400']).toEqual({ $ref: '#/components/responses/Error400' });
    expect(doc.components.responses.Error403.content['application/json'].schema).toEqual({ $ref: '#/components/schemas/ErrorEnvelope' });
  });

  it('does not promise a 429 on the health checks, which are exempt from rate limiting', () => {
    expect(Object.keys(op('get', '/health').responses)).not.toContain('429');
  });

  it('the ErrorEnvelope schema lists exactly the codes the gateway can send', async () => {
    const { ErrorCode } = await import('../src/common/errors.js');
    expect([...doc.components.schemas.ErrorEnvelope.properties.error.properties.code.enum].sort((a: string, b: string) => a.localeCompare(b))).toEqual(Object.values(ErrorCode).sort((a, b) => a.localeCompare(b)));
  });

  it('is deterministic: the same routes always give byte-identical text', async () => {
    const { stableStringify, buildOpenApi } = await import('../src/openapi/build-openapi.js');
    expect(stableStringify(buildOpenApi(app, routes))).toBe(stableStringify(doc));
    expect(stableStringify({ b: 1, a: { d: 1, c: [3, 1, 2] } })).toBe('{\n  "a": {\n    "c": [\n      3,\n      1,\n      2\n    ],\n    "d": 1\n  },\n  "b": 1\n}\n');
  });

  it('refuses to build a document for an operation it cannot join to a registered route', async () => {
    const { buildOpenApi } = await import('../src/openapi/build-openapi.js');
    expect(() => buildOpenApi(app, [])).toThrow(/no matching registered route/);
  });
});
