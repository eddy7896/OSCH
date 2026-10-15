import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Role } from '@oruschools/rbac';
import type { Request } from 'express';
import type { AuthenticatedRequest } from '../auth/authenticated-user.js';

export const SCOPE = 'oru:scope';
export type RouteScope = 'user' | 'platform';

/**
 * Route scopes (deny by default). A route is a TENANT route unless it says otherwise: it then needs a valid
 * `X-School-Id` the caller is an active member of. Opt-outs:
 *  - `@Public()`      no sign-in at all (see auth/public.decorator.ts)
 *  - `@UserScoped()`  signed in, no school (for example `/me`, accepting an invitation)
 *  - `@Platform()`    SUPER_ADMIN only, no school (`/v1/platform/*`)
 */
export const UserScoped = () => SetMetadata(SCOPE, 'user' satisfies RouteScope);
export const Platform = () => SetMetadata(SCOPE, 'platform' satisfies RouteScope);

/** The school the request is acting in, established from a verified membership, never from the body or query. */
export interface TenantContext {
  schoolId: string;
  userId: string;
  schoolRole: Role;
}

export type TenantRequest = AuthenticatedRequest & Request & { tenant?: TenantContext };

/** `@Tenant() tenant: TenantContext` in a handler of a tenant route. */
export const Tenant = createParamDecorator((_data: unknown, ctx: ExecutionContext): TenantContext => {
  const tenant = ctx.switchToHttp().getRequest<TenantRequest>().tenant;
  if (!tenant) throw new Error('Tenant used on a route that has no tenant context'); // programmer error, not a client error
  return tenant;
});
