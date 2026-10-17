import { Permission } from './permission.decorator.js';
import { routeProblems, type RouteFacts } from './route-decision.check.js';

const route = (over: Partial<RouteFacts>): RouteFacts => ({ label: 'GET /x (C.x)', isPublic: false, ...over });

describe('routeProblems', () => {
  it('accepts the four legitimate shapes', () => {
    expect(
      routeProblems([
        route({ isPublic: true }),
        route({ scope: 'user' }),
        route({ permission: { resource: 'students', action: 'read' } }),
        route({ scope: 'platform', permission: { resource: 'platform_schools', action: 'read' } }),
      ]),
    ).toEqual([]);
  });

  it('refuses a route with no decision at all (the default is deny, so it must be said)', () => {
    expect(routeProblems([route({})]).join()).toMatch(/no access decision/);
    expect(routeProblems([route({ scope: 'platform' })]).join()).toMatch(/no access decision/);
  });

  it('refuses contradictory decisions', () => {
    expect(routeProblems([route({ isPublic: true, permission: { resource: 'students', action: 'read' } })]).join()).toMatch(/cannot be combined/);
    expect(routeProblems([route({ isPublic: true, scope: 'user' })]).join()).toMatch(/cannot be combined/);
    expect(routeProblems([route({ scope: 'user', permission: { resource: 'students', action: 'read' } })]).join()).toMatch(/self-service/);
  });

  it('refuses a dead route: a permission no school role holds', () => {
    expect(routeProblems([route({ permission: { resource: 'platform_schools', action: 'read' } })]).join()).toMatch(/nobody could ever call/);
    expect(routeProblems([route({ permission: { resource: 'audit_log', action: 'approve' } })]).join()).toMatch(/nobody could ever call/);
  });

  it('refuses a platform route whose permission SUPER_ADMIN does not hold (it has no school data)', () => {
    expect(routeProblems([route({ scope: 'platform', permission: { resource: 'students', action: 'read' } })]).join()).toMatch(/not granted to it/);
  });

  it('reports every bad route, not just the first', () => {
    expect(routeProblems([route({ label: 'A' }), route({ label: 'B' })])).toHaveLength(2);
  });
});

describe('@Permission', () => {
  it('throws at load time for a resource or action that does not exist, so a typo cannot mean "no check"', () => {
    expect(() => Permission('studnets' as never, 'read')).toThrow(/not a known resource/);
    expect(() => Permission('students', 'reed' as never)).toThrow(/not a known resource/);
    expect(() => Permission('students', 'read')).not.toThrow();
  });
});

describe('routeProblems: audit declarations on state-changing routes', () => {
  const perm = { permission: { resource: 'students', action: 'create' } as const };
  const post = (over: Partial<RouteFacts>): RouteFacts => ({ label: 'POST /x (C.x)', isPublic: false, method: 'POST', ...perm, ...over });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('%s without @Audit or @NoAudit is refused', (method) => {
    expect(routeProblems([post({ method })]).join()).toMatch(/needs @Audit/);
  });

  it('accepts @Audit or @NoAudit on a mutating route, and neither on a read', () => {
    expect(routeProblems([post({ audit: { action: 'student.create', operation: 'CreateStudent' } })])).toEqual([]);
    expect(routeProblems([post({ noAuditReason: 'preferences of the caller only' })])).toEqual([]);
    expect(routeProblems([{ label: 'GET /x', isPublic: false, method: 'GET', ...perm }])).toEqual([]);
  });

  it('refuses both together, and @Audit on a read', () => {
    expect(routeProblems([post({ audit: { action: 'a.b', operation: 'Op' }, noAuditReason: 'whatever reason here' })]).join()).toMatch(/contradict/);
    expect(routeProblems([{ label: 'GET /x', isPublic: false, method: 'GET', ...perm, audit: { action: 'a.b', operation: 'Op' } }]).join()).toMatch(/only belongs on a state-changing/);
  });

  it('applies to public routes too (a public write is the one most worth auditing)', () => {
    expect(routeProblems([{ label: 'POST /open', isPublic: true, method: 'POST' }]).join()).toMatch(/needs @Audit/);
  });
});

describe('routeProblems: inputs must be typed with a DTO class', () => {
  const ok = { permission: { resource: 'students', action: 'read' } as const };
  it('refuses an untyped @Body or @Query (the validation pipe would skip it)', () => {
    const p = routeProblems([{ label: 'GET /x (C.x)', isPublic: false, ...ok, untypedInputs: ['@Body() parameter 1', '@Query() parameter 2'] }]).join('\n');
    expect(p).toMatch(/@Body\(\) parameter 1 is not typed with a DTO class/);
    expect(p).toMatch(/@Query\(\) parameter 2/);
  });

  it('passes when there are none', () => {
    expect(routeProblems([{ label: 'GET /x (C.x)', isPublic: false, ...ok, untypedInputs: [] }])).toEqual([]);
  });
});
