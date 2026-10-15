import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { authorize } from '@oruschools/rbac';
import { IS_PUBLIC } from '../auth/public.decorator.js';
import { SCOPE } from '../tenant/tenant.decorators.js';
import { PERMISSION } from './permission.decorator.js';
import { PermissionGuard } from './permission.guard.js';

vi.mock('@oruschools/rbac', async (importOriginal) => ({ ...(await importOriginal<typeof import('@oruschools/rbac')>()), authorize: vi.fn(() => ({ allowed: true, scope: 'school' })) }));

// The two role namespaces must never be merged into one subject: if the matrix ever grows a global grant on a tenant
// resource (or a school grant on a platform one), a combined subject would silently widen access.
function call(scope: string | undefined, req: Record<string, unknown>) {
  const reflector = { getAllAndOverride: (k: string) => (k === IS_PUBLIC ? false : k === SCOPE ? scope : k === PERMISSION ? { resource: 'students', action: 'read' } : undefined) } as unknown as Reflector;
  const ctx = { getHandler: () => null, getClass: () => null, switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
  new PermissionGuard(reflector).canActivate(ctx);
}

describe('PermissionGuard subject', () => {
  beforeEach(() => vi.mocked(authorize).mockClear());

  it('tenant routes are authorised with the school role ONLY, even for a SUPER_ADMIN', () => {
    call(undefined, { user: { uid: 'u', globalRole: 'SUPER_ADMIN' }, tenant: { schoolId: 's', userId: 'u', schoolRole: 'TEACHER' } });
    expect(vi.mocked(authorize).mock.calls[0]![0]).toEqual({ schoolRole: 'TEACHER' });
  });

  it('platform routes are authorised with the global role ONLY, even if a school role is present', () => {
    call('platform', { user: { uid: 'u', globalRole: 'SUPER_ADMIN' }, tenant: { schoolId: 's', userId: 'u', schoolRole: 'PRINCIPAL' } });
    expect(vi.mocked(authorize).mock.calls[0]![0]).toEqual({ globalRole: 'SUPER_ADMIN' });
  });
});
