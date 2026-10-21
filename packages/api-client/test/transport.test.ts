import { describe, expect, it } from 'vitest';
import { ApiError } from '../src/index.js';
import { envelope, harness, json, ME } from './helpers.js';

const SCHOOL = '11111111-1111-4111-8111-111111111111';
const creds = { getToken: () => 'tok-1', getSchoolId: () => SCHOOL };

describe('what each class of route is sent', () => {
  it('public: no token and no school, even when both are available (nothing to leak to an unauthenticated endpoint)', async () => {
    const { api, seen } = harness(() => json(200, { id: SCHOOL, name: 'S', subDomain: 'abc', defaultLanguage: 'en' }), creds);
    await api.publicSchoolsBySubdomain({ path: { sub: 'abc' } });
    expect(seen[0]!.url).toBe('https://api.example.test/v1/public/schools/by-subdomain/abc');
    expect(seen[0]!.headers.get('authorization')).toBeNull();
    expect(seen[0]!.headers.get('x-school-id')).toBeNull();
  });

  it('user route (/me): the token, and the active school when there is one', async () => {
    const { api, seen } = harness(() => json(200, ME), creds);
    await api.meGet({});
    expect(seen[0]!.headers.get('authorization')).toBe('Bearer tok-1');
    expect(seen[0]!.headers.get('x-school-id')).toBe(SCHOOL);
    const none = harness(() => json(200, ME), { getToken: () => 'tok-1' });
    await none.api.meGet({});
    expect(none.seen[0]!.headers.get('x-school-id')).toBeNull();
  });

  it('school route: the token and the school; with no active school nothing is sent at all', async () => {
    const { api, seen } = harness(() => json(200, { items: [] }), creds);
    await api.membershipsList({});
    expect(seen[0]!.headers.get('authorization')).toBe('Bearer tok-1');
    expect(seen[0]!.headers.get('x-school-id')).toBe(SCHOOL);

    const noSchool = harness(() => json(200, { items: [] }), { getToken: () => 'tok-1', getSchoolId: () => null });
    await expect(noSchool.api.membershipsList({})).rejects.toMatchObject({ name: 'ApiError', code: 'SCHOOL_REQUIRED' });
    expect(noSchool.seen).toHaveLength(0);
  });

  it('platform route: the token, never a school', async () => {
    const { api, seen } = harness(() => json(200, { items: [], limit: 25, offset: 0 }), creds);
    await api.platformSchoolsList({});
    expect(seen[0]!.headers.get('authorization')).toBe('Bearer tok-1');
    expect(seen[0]!.headers.get('x-school-id')).toBeNull();
  });

  it('a signed-out user sends no Authorization header (the gateway answers 401)', async () => {
    const { api, seen } = harness(() => envelope('AUTH_REQUIRED', 401), {});
    await expect(api.meGet({})).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    expect(seen[0]!.headers.get('authorization')).toBeNull();
  });

  it('what the caller puts in the credential headers is replaced by the provider\'s values, so UI code cannot send another school', async () => {
    const { api, seen } = harness(() => json(200, { items: [] }), creds);
    await api.membershipsList({ headers: { 'X-School-Id': '99999999-9999-4999-8999-999999999999', Authorization: 'Bearer hijacked' } } as never);
    expect(seen[0]!.headers.get('x-school-id')).toBe(SCHOOL);
    expect(seen[0]!.headers.get('authorization')).toBe('Bearer tok-1');
  });

  it('credential headers the caller adds are removed where the route must not carry them (public, platform)', async () => {
    const { api, seen } = harness(() => json(200, { id: SCHOOL, name: 'S', subDomain: 'abc', defaultLanguage: 'en' }), creds);
    await api.publicSchoolsBySubdomain({ path: { sub: 'abc' }, headers: { 'X-School-Id': SCHOOL, Authorization: 'Bearer smuggled' } } as never);
    expect(seen[0]!.headers.get('x-school-id')).toBeNull();
    expect(seen[0]!.headers.get('authorization')).toBeNull();
    const platform = harness(() => json(200, { items: [], limit: 25, offset: 0 }), creds);
    await platform.api.platformSchoolsList({ headers: { 'X-School-Id': SCHOOL } } as never);
    expect(platform.seen[0]!.headers.get('x-school-id')).toBeNull();
  });

  it('works behind a path prefix (basePath)', async () => {
    const { api, seen } = harness(() => json(200, ME), { ...creds, baseUrl: 'https://example.test/api', basePath: '/api' });
    await api.meGet({});
    expect(seen[0]!.url).toBe('https://example.test/api/v1/me');
    expect(seen[0]!.headers.get('authorization')).toBe('Bearer tok-1'); // still recognised as /v1/me
  });

  it('sends a body and path/query parameters correctly', async () => {
    const { api, seen } = harness(() => json(200, { id: SCHOOL }), creds);
    await api.platformSchoolsUpdate({ path: { id: SCHOOL }, body: { name: 'New name' } });
    expect(seen[0]).toMatchObject({ method: 'PATCH', url: `https://api.example.test/v1/platform/schools/${SCHOOL}`, body: '{"name":"New name"}' });
    await api.platformSchoolsList({ query: { limit: 10, offset: 20 } });
    expect(seen[1]!.url).toBe('https://api.example.test/v1/platform/schools?limit=10&offset=20');
  });
});

describe('an expired token', () => {
  it('a 401 gets exactly one retry with a freshly requested token, and the same body', async () => {
    const asked: boolean[] = [];
    const { api, seen } = harness((_s, n) => (n === 1 ? envelope('AUTH_REQUIRED', 401) : json(200, { id: SCHOOL, userId: 'x' })), {
      getToken: ({ forceRefresh }) => (asked.push(forceRefresh), forceRefresh ? 'tok-new' : 'tok-old'),
      getSchoolId: () => SCHOOL,
    });
    await api.membershipsAdd({ body: { userId: 'u9', schoolRole: 'STAFF' } });
    expect(seen.map((s) => s.headers.get('authorization'))).toEqual(['Bearer tok-old', 'Bearer tok-new']);
    expect(seen[1]!.body).toBe(seen[0]!.body);
    expect(asked).toEqual([false, true]);
  });

  it('a second 401 is final: AUTH_REQUIRED, needsSignIn, no third attempt', async () => {
    const { api, seen } = harness(() => envelope('AUTH_REQUIRED', 401), { getToken: ({ forceRefresh }) => (forceRefresh ? 'tok-new' : 'tok-old') });
    const err = (await api.meGet({}).catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.needsSignIn).toBe(true);
    expect(seen).toHaveLength(2);
  });

  it('no retry when the provider has nothing newer, when nothing was signed, or on a public route', async () => {
    const same = harness(() => envelope('AUTH_REQUIRED', 401), { getToken: () => 'same' });
    await same.api.meGet({}).catch(() => undefined);
    expect(same.seen).toHaveLength(1);
    const signedOut = harness(() => envelope('AUTH_REQUIRED', 401), { getToken: () => null });
    await signedOut.api.meGet({}).catch(() => undefined);
    expect(signedOut.seen).toHaveLength(1);
    const pub = harness(() => envelope('AUTH_REQUIRED', 401), { getToken: () => 'x' });
    await pub.api.publicSchoolsBySubdomain({ path: { sub: 'abc' } }).catch(() => undefined);
    expect(pub.seen).toHaveLength(1);
  });

  it('403 is never retried (a new token does not change a refusal)', async () => {
    const { api, seen } = harness(() => envelope('FORBIDDEN', 403), { getToken: ({ forceRefresh }) => (forceRefresh ? 'b' : 'a'), getSchoolId: () => SCHOOL });
    await expect(api.membershipsList({})).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
    expect(seen).toHaveLength(1);
  });
});

describe('errors', () => {
  it('maps the gateway envelope: code, status, request id, field problems, retry-after', async () => {
    const { api } = harness(() => envelope('INVALID_REQUEST', 400, { details: [{ field: 'name', rule: 'length' }] }), creds);
    const e = (await api.platformSchoolsCreate({ body: { name: 'x', subDomain: 'abc', defaultLanguage: 'en' } }).catch((x) => x)) as ApiError;
    expect(e).toMatchObject({ name: 'ApiError', code: 'INVALID_REQUEST', status: 400, requestId: 'req-1234567890', message: 'fallback for INVALID_REQUEST' });
    expect(e.details).toEqual([{ field: 'name', rule: 'length' }]);
    expect(e.is('INVALID_REQUEST', 'CONFLICT')).toBe(true);

    const limited = harness(() => envelope('RATE_LIMITED', 429, {}, { 'retry-after': '30' }), creds);
    const r = (await limited.api.meGet({}).catch((x) => x)) as ApiError;
    expect(r).toMatchObject({ code: 'RATE_LIMITED', retryAfterSeconds: 30, retryable: true });
  });

  it('every code the contract can send is understood; an unknown code is UNEXPECTED_RESPONSE, not trusted', async () => {
    for (const code of ['AUTH_REQUIRED', 'FORBIDDEN', 'SCHOOL_SUSPENDED', 'CANNOT_CHANGE_OWN_MEMBERSHIP', 'INVITATION_INVALID', 'ACCOUNT_EXISTS', 'EMAIL_NOT_VERIFIED', 'NOT_FOUND', 'INVALID_REQUEST', 'CONFLICT', 'RATE_LIMITED', 'TENANT_REFERENCE_FORBIDDEN', 'UPSTREAM_UNAVAILABLE', 'INTERNAL']) {
      const { api } = harness(() => envelope(code, 400), { getToken: () => null });
      expect(await api.healthCheck({}).catch((e) => e.code)).toBe(code);
    }
    const odd = harness(() => envelope('MADE_UP', 400), {});
    expect(await odd.api.healthCheck({}).catch((e) => e.code)).toBe('UNEXPECTED_RESPONSE');
  });

  it('a proxy error page or an empty body is UNEXPECTED_RESPONSE with the status; 502 and up is retryable', async () => {
    const html = harness(() => new Response('<html>Bad gateway</html>', { status: 502, headers: { 'content-type': 'text/html', 'x-request-id': 'edge-1' } }), {});
    const e = (await html.api.healthCheck({}).catch((x) => x)) as ApiError;
    expect(e).toMatchObject({ code: 'UNEXPECTED_RESPONSE', status: 502, requestId: 'edge-1', retryable: true });
    const empty = harness(() => new Response(null, { status: 404 }), {});
    expect(await empty.api.healthCheck({}).catch((x) => x)).toMatchObject({ code: 'UNEXPECTED_RESPONSE', status: 404, retryable: false });
  });

  it('no network is NETWORK_ERROR (retryable), a slow server is TIMEOUT, a caller cancel is ABORTED', async () => {
    const down = harness(() => { throw new TypeError('fetch failed: ECONNREFUSED 10.0.0.5'); }, {});
    const n = (await down.api.healthCheck({}).catch((x) => x)) as ApiError;
    expect(n).toMatchObject({ code: 'NETWORK_ERROR', retryable: true });
    expect(n.message).not.toMatch(/ECONNREFUSED|10\.0\.0\.5/); // internals stay out of messages

    const slow = harness(() => new Promise<Response>(() => undefined), { timeoutMs: 20 });
    expect(await slow.api.healthCheck({}).catch((x) => x.code)).toBe('TIMEOUT');

    const controller = new AbortController();
    const hang = harness(() => new Promise<Response>(() => undefined), {});
    const pending = hang.api.healthCheck({ signal: controller.signal }).catch((x) => x.code);
    controller.abort();
    expect(await pending).toBe('ABORTED');
  });

  it('the token never appears in an error message or the error object', async () => {
    const { api } = harness(() => envelope('FORBIDDEN', 403), { getToken: () => 'SECRET-TOKEN-VALUE', getSchoolId: () => SCHOOL });
    const e = (await api.membershipsList({}).catch((x) => x)) as ApiError;
    expect(JSON.stringify({ m: e.message, c: e.code, s: e.status, r: e.requestId, d: e.details })).not.toContain('SECRET-TOKEN-VALUE');
    expect(String(e.stack)).not.toContain('SECRET-TOKEN-VALUE');
  });
});
