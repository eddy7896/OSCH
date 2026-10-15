import { Logger } from '@nestjs/common';
import { AuditService } from './audit.service.js';
import type { DeniedRequest } from './security-events.js';

const SCHOOL = '11111111-1111-4111-8111-111111111111';
const OTHER = '99999999-9999-4999-8999-999999999999';

class Clocked extends AuditService {
  t = 1_000;
  protected override now() {
    return this.t;
  }
}

function setup(fail = false) {
  const writes: Array<Record<string, unknown>> = [];
  const db = { createAuditLog: async (v: Record<string, unknown>) => { if (fail) throw new Error('db down: secret-detail'); writes.push(v); return {}; } };
  const svc = new Clocked(db as never);
  return { svc, writes };
}
const req = (over: Record<string, unknown> = {}): DeniedRequest =>
  ({ method: 'POST', route: { path: '/v1/memberships' }, headers: {}, user: { uid: 'u-1' }, ...over }) as unknown as DeniedRequest;
const flush = () => new Promise((r) => setImmediate(r));

describe('AuditService.securityEvent', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('stores a 403 for an authenticated caller with the route, the required permission and the verified school', async () => {
    const { svc, writes } = setup();
    svc.securityEvent(req({ tenant: { schoolId: SCHOOL, userId: 'u-1', schoolRole: 'PRINCIPAL' }, denial: { resource: 'memberships', action: 'create' } }), 403, 'FORBIDDEN');
    await flush();
    expect(writes).toEqual([
      { schoolId: SCHOOL, actorId: 'u-1', action: 'security.denied', entityType: 'Route', entityId: 'POST /v1/memberships', details: { code: 'FORBIDDEN', status: 403, resource: 'memberships', requiredAction: 'create', attemptedSchoolId: undefined } },
    ]);
  });

  it('a school id the client merely CLAIMED never reaches the school column, only details.attemptedSchoolId (and only if it is a uuid)', async () => {
    const { svc, writes } = setup();
    svc.securityEvent(req({ headers: { 'x-school-id': OTHER.toUpperCase() } }), 403, 'FORBIDDEN');
    svc.securityEvent(req({ headers: { 'x-school-id': "x'; DROP TABLE school;--" } }), 403, 'FORBIDDEN');
    await flush();
    expect(writes[0]).toMatchObject({ schoolId: null, details: { attemptedSchoolId: OTHER } });
    expect(writes[1]).toMatchObject({ schoolId: null });
    expect(JSON.stringify(writes[1])).not.toContain('DROP');
  });

  it('a 401 is logged but never stored (there is no actor to attribute it to)', async () => {
    const { svc, writes } = setup();
    svc.securityEvent(req({ user: undefined }), 401, 'AUTH_REQUIRED');
    await flush();
    expect(writes).toHaveLength(0);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('is not stored for an unmatched route (404 probes) or when there is no user, but is still logged', async () => {
    const { svc, writes } = setup();
    svc.securityEvent(req({ route: undefined }), 403, 'FORBIDDEN');
    svc.securityEvent(req({ user: undefined }), 403, 'FORBIDDEN');
    await flush();
    expect(writes).toHaveLength(0);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('only 403 is stored: other statuses are not security denials', async () => {
    const { svc, writes } = setup();
    for (const status of [400, 404, 409, 429, 500]) svc.securityEvent(req(), status, 'X');
    await flush();
    expect(writes).toHaveLength(0);
  });

  it('a failing database never escapes: the event is logged and the caller still gets its 403', async () => {
    const { svc } = setup(true);
    expect(() => svc.securityEvent(req(), 403, 'FORBIDDEN')).not.toThrow();
    await flush();
    expect(error).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(error.mock.calls)).not.toContain('secret-detail'); // class name only, not the message
  });

  it('even a data layer that throws synchronously (or lacks the operation) cannot break the response', () => {
    const svc = new Clocked({ createAuditLog: () => { throw new Error('sync boom: secret-detail'); } } as never);
    expect(() => svc.securityEvent(req(), 403, 'FORBIDDEN')).not.toThrow();
    expect(() => new Clocked({} as never).securityEvent(req(), 403, 'FORBIDDEN')).not.toThrow();
    expect(JSON.stringify(error.mock.calls)).not.toContain('secret-detail');
  });

  it('caps stored events per actor per minute, then lets a new minute start; the log line is always written', async () => {
    const { svc, writes } = setup();
    for (let i = 0; i < 100; i++) svc.securityEvent(req(), 403, 'FORBIDDEN');
    await flush();
    expect(writes).toHaveLength(30);
    expect(warn).toHaveBeenCalledTimes(100);
    svc.t += 60_001;
    svc.securityEvent(req(), 403, 'FORBIDDEN');
    await flush();
    expect(writes).toHaveLength(31);
  });

  it('counts each actor separately', async () => {
    const { svc, writes } = setup();
    for (let i = 0; i < 40; i++) svc.securityEvent(req({ user: { uid: 'noisy' } }), 403, 'FORBIDDEN');
    svc.securityEvent(req({ user: { uid: 'quiet' } }), 403, 'FORBIDDEN');
    await flush();
    expect(writes.filter((w) => w.actorId === 'quiet')).toHaveLength(1);
  });

  it('puts nothing but identifiers in the log: no headers, body or token', () => {
    const { svc } = setup();
    svc.securityEvent(req({ headers: { authorization: 'Bearer SECRET', cookie: 'c=SECRET' }, body: { password: 'SECRET' } }), 403, 'FORBIDDEN');
    expect(JSON.stringify(warn.mock.calls)).not.toContain('SECRET');
  });
});
