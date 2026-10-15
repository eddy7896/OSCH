import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import { ACTIONS, RESOURCES, type Action, type Resource, type Scope } from '@oruschools/rbac';
import type { TenantRequest } from '../tenant/tenant.decorators.js';

export const PERMISSION = 'oru:permission';

export interface RequiredPermission {
  resource: Resource;
  action: Action;
}

/** What the caller was granted for this request; handlers use `scope` to narrow queries (own / linked / school). */
export interface GrantedPermission extends RequiredPermission {
  scope: Scope;
}

export type PermissionRequest = TenantRequest & { permission?: GrantedPermission };

/**
 * The decision every non-public route must carry: `@Permission('students', 'read')` is checked against the single
 * matrix in packages/rbac. A resource or action that does not exist throws when the class is loaded, so a typo can never
 * silently mean "no check".
 */
export const Permission = (resource: Resource, action: Action) => {
  if (!(RESOURCES as readonly string[]).includes(resource) || !(ACTIONS as readonly string[]).includes(action)) {
    throw new Error(`@Permission('${String(resource)}', '${String(action)}'): not a known resource/action of packages/rbac`);
  }
  return SetMetadata(PERMISSION, { resource, action } satisfies RequiredPermission);
};

/** `@Granted() granted: GrantedPermission` in a handler. */
export const Granted = createParamDecorator((_data: unknown, ctx: ExecutionContext): GrantedPermission => {
  const granted = ctx.switchToHttp().getRequest<PermissionRequest>().permission;
  if (!granted) throw new Error('Granted used on a route without @Permission'); // programmer error
  return granted;
});
