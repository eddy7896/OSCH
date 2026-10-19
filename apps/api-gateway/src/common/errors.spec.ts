import { BadRequestException, HttpException, Logger, NotFoundException, type ArgumentsHost } from '@nestjs/common';
import { DatabaseError } from '@oruschools/database';
import { ApiException, ErrorCode, ErrorEnvelopeFilter, longestRetryAfter } from './errors.js';

function run(exception: unknown, path = '/v1/x', requestId: string | null = 'req-12345678') {
  let sent: { status?: number; body?: unknown } = {};
  const res = {
    getHeader: () => requestId ?? undefined,
    status(s: number) { sent.status = s; return this; },
    json(b: unknown) { sent.body = b; },
  };
  const host = { switchToHttp: () => ({ getRequest: () => ({ path }), getResponse: () => res }) } as unknown as ArgumentsHost;
  new ErrorEnvelopeFilter().catch(exception, host);
  return sent;
}

describe('Retry-After on 429', () => {
  it('the standard header is the longest of the throttler\'s named ones', () => {
    expect(longestRetryAfter((n) => ({ 'Retry-After-ip': '12', 'Retry-After-user': '40', 'Retry-After-strict': undefined })[n])).toBe(40);
    expect(longestRetryAfter(() => undefined)).toBeUndefined();
    expect(longestRetryAfter(() => 'soon')).toBeUndefined();
    expect(longestRetryAfter((n) => (n === 'Retry-After-strict' ? '0' : undefined))).toBeUndefined();
  });

  it('the filter sets Retry-After on a throttled answer and not on other errors', () => {
    const headers: Record<string, string> = { 'Retry-After-ip': '17' };
    const res = { getHeader: (n: string) => headers[n], setHeader: (n: string, v: string) => { headers[n] = v; }, status() { return this; }, json() { /* sink */ } };
    const host = { switchToHttp: () => ({ getRequest: () => ({ path: '/v1/x' }), getResponse: () => res }) } as unknown as ArgumentsHost;
    new ErrorEnvelopeFilter().catch(new HttpException('Too Many Requests', 429), host);
    expect(headers['Retry-After']).toBe('17');
    delete headers['Retry-After'];
    new ErrorEnvelopeFilter().catch(new NotFoundException(), host);
    expect(headers['Retry-After']).toBeUndefined();
  });
});

describe('ErrorEnvelopeFilter', () => {
  beforeEach(() => { vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined); });
  afterEach(() => vi.restoreAllMocks());

  it('wraps a named ApiException in the envelope with the request id', () => {
    expect(run(new ApiException(ErrorCode.AUTH_REQUIRED, 401))).toEqual({ status: 401, body: { error: { code: 'AUTH_REQUIRED', message: 'Sign in to continue.', requestId: 'req-12345678' } } });
  });

  it('maps plain HTTP exceptions by status', () => {
    expect(run(new NotFoundException('secret route detail')).body).toMatchObject({ error: { code: 'NOT_FOUND' } });
    expect(run(new BadRequestException(['field x must be a string'])).body).toMatchObject({ error: { code: 'INVALID_REQUEST' } });
  });

  it.each([
    ['FORBIDDEN_REFERENCE', 403, 'TENANT_REFERENCE_FORBIDDEN'],
    ['INVALID_ARGUMENT', 400, 'INVALID_REQUEST'],
    ['CONFLICT', 409, 'CONFLICT'],
    ['UNAVAILABLE', 502, 'UPSTREAM_UNAVAILABLE'],
    ['INTERNAL', 500, 'INTERNAL'],
  ] as const)('maps DatabaseError %s to %i %s', (kind, status, code) => {
    const out = run(new DatabaseError(kind, { cause: new Error('SELECT * FROM student') }));
    expect(out.status).toBe(status);
    expect(out.body).toMatchObject({ error: { code } });
  });

  it('turns any unknown error into a bare 500 INTERNAL with no detail', () => {
    const out = run(new Error('TypeError: cannot read property x of undefined at /srv/app.js:12'));
    expect(out.status).toBe(500);
    expect(JSON.stringify(out.body)).not.toMatch(/TypeError|srv|undefined/);
    expect(out.body).toMatchObject({ error: { code: 'INTERNAL' } });
  });

  it('never leaks the cause of a database error', () => {
    expect(JSON.stringify(run(new DatabaseError('FORBIDDEN_REFERENCE', { cause: new Error('student not found in this school') })).body)).not.toMatch(/student|school/i);
  });

  it('leaves health responses untouched for monitors', () => {
    const exception = new NotFoundException({ status: 'error', details: { database: { status: 'down' } } });
    expect(run(exception, '/health/db').body).toEqual({ status: 'error', details: { database: { status: 'down' } } });
  });

  it('omits requestId when there is none', () => {
    expect((run(new ApiException(ErrorCode.FORBIDDEN, 403), '/v1/x', null).body as { error: object }).error).not.toHaveProperty('requestId');
  });
});
