import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC } from '../auth/public.decorator.js';
import { SCOPE } from '../tenant/tenant.decorators.js';
import { PERMISSION } from './permission.decorator.js';
import { PermissionGuard } from './permission.guard.js';

function run(meta: { isPublic?: boolean; scope?: string; permission?: { resource: string; action: string } }, req: Record<string, unknown>) {
  const reflector = {
    getAllAndOverride: (key: string) => (key === IS_PUBLIC ? meta.isPublic : key === SCOPE ? meta.scope : key === PERMISSION ? meta.permission : undefined),
  } as unknown as Reflector;
  const ctx = { getHandler: () => null, getClass: () => null, switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
  const guard = new PermissionGuard(reflector);
  return { req, result: () => guard.canActivate(ctx) };
}
const tenant = (schoolRole: string) => ({ schoolId: 's', userId: 'u', schoolRole });
const refused = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    expect((e as { getStatus(): number }).getStatus()).toBe(403);
    expect((e as { getResponse(): unknown }).getResponse()).toEqual({ code: 'FORBIDDEN' });
    return;
  }
  throw new Error('expected a 403');
};

describe('PermissionGuard', () => {
  it('grants an allowed role and records the scope for the handler', () => {
    const { req, result } = run({ permission: { resource: 'students', action: 'read' } }, { tenant: tenant('TEACHER'), user: { uid: 'u', globalRole: 'USER' } });
    expect(result()).toBe(true);
    expect(req.permission).toEqual({ resource: 'students', action: 'read', scope: 'own' });
  });

  it('gives a wider scope to a wider role', () => {
    const { req, result } = run({ permission: { resource: 'students', action: 'read' } }, { tenant: tenant('PRINCIPAL'), user: { uid: 'u', globalRole: 'USER' } });
    result();
    expect((req.permission as { scope: string }).scope).toBe('school');
  });

  it.each([['DRIVER'], ['SYSTEM_ADMIN'], ['HR_MANAGER']])('refuses %s on students:read', (role) => {
    refused(run({ permission: { resource: 'students', action: 'read' } }, { tenant: tenant(role), user: { uid: 'u', globalRole: 'USER' } }).result);
  });

  it('only the System Admin grants roles: the Principal is refused memberships:create', () => {
    expect(run({ permission: { resource: 'memberships', action: 'create' } }, { tenant: tenant('SYSTEM_ADMIN'), user: { uid: 'u', globalRole: 'USER' } }).result()).toBe(true);
    refused(run({ permission: { resource: 'memberships', action: 'create' } }, { tenant: tenant('PRINCIPAL'), user: { uid: 'u', globalRole: 'USER' } }).result);
  });

  it('a SUPER_ADMIN claim never grants school data on a tenant route (only the school role counts)', () => {
    const asTeacher = { tenant: tenant('TEACHER'), user: { uid: 'u', globalRole: 'SUPER_ADMIN' } };
    refused(run({ permission: { resource: 'finance', action: 'read' } }, asTeacher).result);
    expect(run({ permission: { resource: 'students', action: 'read' } }, asTeacher).result()).toBe(true); // what a TEACHER may do, no more
  });

  it('platform routes use the global role only; a school role is not enough', () => {
    expect(run({ scope: 'platform', permission: { resource: 'platform_schools', action: 'read' } }, { user: { uid: 'u', globalRole: 'SUPER_ADMIN' } }).result()).toBe(true);
    refused(run({ scope: 'platform', permission: { resource: 'platform_schools', action: 'read' } }, { user: { uid: 'u', globalRole: 'USER' }, tenant: tenant('PRINCIPAL') }).result);
  });

  it('public and user-scoped routes pass without a permission', () => {
    expect(run({ isPublic: true }, {}).result()).toBe(true);
    expect(run({ scope: 'user' }, { user: { uid: 'u' } }).result()).toBe(true);
  });

  it('fails closed: no declared permission, or no tenant on a tenant route, is a 403', () => {
    refused(run({}, { tenant: tenant('PRINCIPAL'), user: { uid: 'u' } }).result);
    refused(run({ permission: { resource: 'students', action: 'read' } }, { user: { uid: 'u', globalRole: 'USER' } }).result);
  });

  it('refuses an unknown role string', () => {
    refused(run({ permission: { resource: 'students', action: 'read' } }, { tenant: tenant('GOD'), user: { uid: 'u', globalRole: 'USER' } }).result);
  });
});
