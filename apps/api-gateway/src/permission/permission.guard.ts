import { type CanActivate, type ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { authorize } from '@oruschools/rbac';
import { IS_PUBLIC } from '../auth/public.decorator.js';
import type { DeniedRequest } from '../audit/security-events.js';
import { ApiException, ErrorCode } from '../common/errors.js';
import { type RouteScope, SCOPE } from '../tenant/tenant.decorators.js';
import { PERMISSION, type PermissionRequest, type RequiredPermission } from './permission.decorator.js';

/**
 * Third gate (after AuthGuard and TenantGuard): may THIS role do THIS action on THIS resource?
 * The role is the one resolved from the verified membership (tenant routes) or the verified global claim (platform
 * routes); nothing the client sends is consulted. Tenant routes are checked with the school role only, so a SUPER_ADMIN
 * claim never grants school data, and platform routes with the global role only.
 * Fail closed: a route that somehow reaches here without a decision is refused (startup also refuses to boot, see
 * route-decision.check.ts).
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger('Permission');

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;
    const scope = this.reflector.getAllAndOverride<RouteScope | undefined>(SCOPE, targets);
    if (scope === 'user') return true; // self-service: touches only the caller's own data

    const req = context.switchToHttp().getRequest<PermissionRequest>();
    const required = this.reflector.getAllAndOverride<RequiredPermission | undefined>(PERMISSION, targets);
    if (!required) return this.refuse(req, 'no_permission_declared');

    const subject = scope === 'platform' ? { globalRole: req.user?.globalRole } : req.tenant ? { schoolRole: req.tenant.schoolRole } : undefined;
    if (!subject) return this.refuse(req, 'no_subject');

    const decision = authorize(subject, required.resource, required.action);
    if (!decision.allowed) return this.refuse(req, 'role_not_permitted', required);

    req.permission = { ...required, scope: decision.scope };
    return true;
  }

  private refuse(req: DeniedRequest, reason: string, required?: RequiredPermission): never {
    if (required) req.denial = { resource: required.resource, action: required.action }; // for the security event; never sent to the client
    this.logger.warn(
      { uid: req.user?.uid, schoolId: req.tenant?.schoolId, role: req.tenant?.schoolRole ?? req.user?.globalRole, resource: required?.resource, action: required?.action, reason, method: req.method, path: req.path },
      'permission refused',
    );
    throw new ApiException(ErrorCode.FORBIDDEN, 403);
  }
}
