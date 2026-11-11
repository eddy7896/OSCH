import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC } from '../auth/public.decorator.js';
import { ApiException, ErrorCode } from '../common/errors.js';
import { type RouteScope, SCOPE, type TenantRequest } from '../tenant/tenant.decorators.js';
import { CONSENT_EXEMPT } from './consent.decorators.js';
import { ConsentService } from './consent.service.js';

/**
 * Last gate (after authentication, school membership and permission): a PARENT who has not consented to the current privacy notice cannot reach any school route except the consent routes
 * (E-PRIV-3). Withdrawing consent therefore closes the Parent app's data at once. Staff, teachers and the other roles are not affected. Fail closed: if the answer cannot be read, the request fails.
 */
@Injectable()
export class ConsentGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly consent: ConsentService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;
    if (this.reflector.getAllAndOverride<RouteScope | undefined>(SCOPE, targets)) return true; // self-service and platform routes carry no school data
    if (this.reflector.getAllAndOverride<boolean>(CONSENT_EXEMPT, targets)) return true;
    const tenant = context.switchToHttp().getRequest<TenantRequest>().tenant;
    if (!tenant || tenant.schoolRole !== 'PARENT') return true;
    if (await this.consent.hasCurrent(tenant)) return true;
    throw new ApiException(ErrorCode.CONSENT_REQUIRED, 403);
  }
}
