import { Logger, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of, type Observable, throwError } from 'rxjs';
import { AUDIT } from './audit.decorators.js';
import { AuditInterceptor } from './audit.interceptor.js';

function run(method: string, handler: () => Observable<unknown>, decl?: { action: string; operation: string }) {
  const reflector = { getAllAndOverride: (k: string) => (k === AUDIT ? decl : undefined) } as unknown as Reflector;
  const req = { method, route: { path: '/v1/memberships' }, user: { uid: 'u-1' }, tenant: { schoolId: 's-1', schoolRole: 'SYSTEM_ADMIN' }, body: { password: 'SECRET-BODY' }, headers: { authorization: 'Bearer SECRET-TOKEN' } };
  const res = { statusCode: 201, getHeader: () => 'req-123456789' };
  const ctx = { getHandler: () => null, getClass: () => null, switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }) } as unknown as ExecutionContext;
  return lastValueFrom(new AuditInterceptor(reflector).intercept(ctx, { handle: handler }));
}

describe('AuditInterceptor', () => {
  let log: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined); });
  afterEach(() => vi.restoreAllMocks());

  it('writes one structured line for a successful state-changing request, with the declared action', async () => {
    await run('POST', () => of('ok'), { action: 'membership.add', operation: 'AddMembership' });
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]![0]).toMatchObject({ event: 'request.audited', outcome: 'success', status: 201, uid: 'u-1', schoolId: 's-1', role: 'SYSTEM_ADMIN', method: 'POST', route: '/v1/memberships', action: 'membership.add', requestId: 'req-123456789' });
  });

  it('records an error outcome with the HTTP status, and rethrows the original error', async () => {
    const err = Object.assign(new Error('boom'), { getStatus: () => 409 });
    await expect(run('PATCH', () => throwError(() => err))).rejects.toBe(err);
    expect(log.mock.calls[0]![0]).toMatchObject({ outcome: 'error', status: 409 });
  });

  it('an unknown error is logged as 500', async () => {
    await expect(run('DELETE', () => throwError(() => new Error('x')))).rejects.toThrow('x');
    expect(log.mock.calls[0]![0]).toMatchObject({ outcome: 'error', status: 500 });
  });

  it('stays silent for reads', async () => {
    await run('GET', () => of('ok'));
    expect(log).not.toHaveBeenCalled();
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('audits %s', async (m) => {
    await run(m, () => of('ok'));
    expect(log).toHaveBeenCalledTimes(1);
  });

  it('never logs the body, the Authorization header or any token', async () => {
    await run('POST', () => of('ok'));
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/SECRET/);
  });
});
