import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard.js';
import { IS_PUBLIC } from './public.decorator.js';

const FAKE_DECODED = { uid: 'u1', email: 'a@example.com', email_verified: true } as Record<string, unknown>;

function setup(opts: { verify?: (token: string, revoked?: boolean) => Promise<Record<string, unknown>>; revoked?: boolean; isPublic?: boolean } = {}) {
  const calls: { token: string; revoked?: boolean }[] = [];
  const auth = {
    verifyIdToken: async (token: string, revoked?: boolean) => {
      calls.push({ token, revoked });
      return (opts.verify ?? (async () => FAKE_DECODED))(token, revoked);
    },
  };
  const reflector = { getAllAndOverride: (key: string) => (key === IS_PUBLIC ? (opts.isPublic ?? false) : undefined) } as unknown as Reflector;
  const config = { get: () => opts.revoked ?? true } as never;
  const guard = new AuthGuard(reflector, config, auth as never);
  const run = (authorization?: string) => {
    const req: Record<string, unknown> = { headers: authorization === undefined ? {} : { authorization }, method: 'GET', path: '/v1/x' };
    const ctx = { getHandler: () => null, getClass: () => null, switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
    return { req, result: guard.canActivate(ctx) };
  };
  return { run, calls };
}

const denied = async (p: Promise<unknown>) => {
  const e = await p.then(() => undefined, (x: unknown) => x as { getStatus(): number; getResponse(): { code: string } });
  expect(e).toBeDefined();
  expect(e!.getStatus()).toBe(401);
  expect(e!.getResponse()).toEqual({ code: 'AUTH_REQUIRED' });
};

describe('AuthGuard', () => {
  it('lets a @Public route through without looking at the header', async () => {
    const { run, calls } = setup({ isPublic: true });
    await expect(run().result).resolves.toBe(true);
    expect(calls).toHaveLength(0);
  });

  it('accepts a valid Bearer token and attaches the user', async () => {
    const { run, calls } = setup();
    const { req, result } = run('Bearer abc.def.ghi');
    await expect(result).resolves.toBe(true);
    expect(req.user).toEqual({ uid: 'u1', email: 'a@example.com', emailVerified: true, globalRole: 'USER' });
    expect(calls[0]).toEqual({ token: 'abc.def.ghi', revoked: true });
  });

  it('accepts the scheme in any case (RFC 7235)', async () => {
    await expect(setup().run('bearer abc.def').result).resolves.toBe(true);
  });

  it('passes AUTH_CHECK_REVOKED through to verifyIdToken', async () => {
    const { run, calls } = setup({ revoked: false });
    await run('Bearer abc.def').result;
    expect(calls[0]!.revoked).toBe(false);
  });

  it.each([
    ['no header', undefined],
    ['empty header', ''],
    ['wrong scheme', 'Basic dXNlcjpwYXNz'],
    ['scheme only', 'Bearer'],
    ['scheme and space only', 'Bearer '],
    ['two spaces', 'Bearer  abc.def'],
    ['two tokens', 'Bearer abc def'],
    ['token with newline', 'Bearer abc\ndef'],
    ['token with quote', 'Bearer "abc"'],
    ['oversized', `Bearer ${'a'.repeat(5000)}`],
  ])('rejects %s with 401 AUTH_REQUIRED and never calls Firebase', async (_name, header) => {
    const { run, calls } = setup();
    await denied(run(header).result);
    expect(calls).toHaveLength(0);
  });

  it.each(['auth/argument-error', 'auth/id-token-expired', 'auth/user-disabled', 'auth/id-token-revoked', undefined])('maps a Firebase failure (%s) to the same 401', async (code) => {
    const { run } = setup({ verify: async () => Promise.reject(Object.assign(new Error('secret firebase detail'), { code })) });
    await denied(run('Bearer abc.def').result);
  });

  it('grants SUPER_ADMIN only for the exact claim value', async () => {
    for (const [claim, expected] of [['SUPER_ADMIN', 'SUPER_ADMIN'], ['super_admin', 'USER'], ['ADMIN', 'USER'], [true, 'USER'], [undefined, 'USER'], [['SUPER_ADMIN'], 'USER']] as const) {
      const { run } = setup({ verify: async () => ({ ...FAKE_DECODED, globalRole: claim }) });
      const { req, result } = run('Bearer abc.def');
      await result;
      expect((req.user as { globalRole: string }).globalRole).toBe(expected);
    }
  });

  it('treats a missing email_verified as not verified', async () => {
    const { run } = setup({ verify: async () => ({ uid: 'u1' }) });
    const { req, result } = run('Bearer abc.def');
    await result;
    expect(req.user).toMatchObject({ emailVerified: false, email: undefined });
  });
});
