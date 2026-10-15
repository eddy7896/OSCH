import { type CanActivate, type ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC } from '../auth/public.decorator.js';
import { ApiException, ErrorCode } from '../common/errors.js';
import { MembershipService } from './membership.service.js';
import { type RouteScope, SCOPE, type TenantRequest } from './tenant.decorators.js';

export const SCHOOL_HEADER = 'x-school-id';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Second gate (after AuthGuard): decides WHICH school the request acts in.
 *  - The school id comes only from the `X-School-Id` header and is trusted only after a membership check; a school id in
 *    the body or query is never read.
 *  - An unknown school, a school the caller does not belong to, and a suspended member are indistinguishable (403 FORBIDDEN),
 *    so the response never reveals which schools exist. Only a genuine active member of a suspended school learns
 *    that (403 SCHOOL_SUSPENDED), because they already know the school.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger('Tenant');

  constructor(
    private readonly reflector: Reflector,
    private readonly memberships: MembershipService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const req = context.switchToHttp().getRequest<TenantRequest>();
    const user = req.user;
    if (!user) throw new ApiException(ErrorCode.AUTH_REQUIRED, 401); // cannot happen behind AuthGuard; fail closed anyway

    const scope = this.reflector.getAllAndOverride<RouteScope | undefined>(SCOPE, targets);
    if (scope === 'user') return true;
    if (scope === 'platform') {
      if (user.globalRole !== 'SUPER_ADMIN') this.deny(req, user.uid, undefined, 'not_super_admin');
      return true;
    }

    const raw = req.headers[SCHOOL_HEADER];
    if (typeof raw !== 'string' || !UUID.test(raw)) throw new ApiException(ErrorCode.INVALID_REQUEST, 400);
    const schoolId = raw.toLowerCase();

    const decision = await this.memberships.decide(schoolId, user.uid);
    if (decision.kind === 'denied') this.deny(req, user.uid, schoolId, 'no_active_membership');
    if (decision.kind === 'school_suspended') {
      this.logger.warn({ uid: user.uid, schoolId, reason: 'school_suspended' }, 'tenant access refused');
      throw new ApiException(ErrorCode.SCHOOL_SUSPENDED, 403);
    }
    req.tenant = { schoolId, userId: user.uid, schoolRole: decision.schoolRole };
    return true;
  }

  private deny(req: TenantRequest, uid: string, schoolId: string | undefined, reason: string): never {
    this.logger.warn({ uid, schoolId, reason, method: req.method, path: req.path }, 'tenant access refused');
    throw new ApiException(ErrorCode.FORBIDDEN, 403);
  }
}
