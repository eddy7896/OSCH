import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { authorize, ROLES } from '@oruschools/rbac';
import { IS_PUBLIC } from '../auth/public.decorator.js';
import { type RouteScope, SCOPE } from '../tenant/tenant.decorators.js';
import { operationKey } from '../common/operation-key.js';
import { AUDIT, type AuditDecl, NO_AUDIT } from '../audit/audit.decorators.js';
import { PERMISSION, type RequiredPermission } from './permission.decorator.js';

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL', 'OPTIONS', 'HEAD', 'SEARCH'];

// @nestjs/throttler does not export this key; a unit test pins it against the real @SkipThrottle().
export const THROTTLER_SKIP = 'THROTTLER:SKIP';
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export interface RouteFacts {
  label: string;
  /** Joins this route to its OpenAPI operation. */
  operationKey?: string;
  /** HTTP method; routes without one are treated as reads. */
  method?: string;
  audit?: AuditDecl;
  noAuditReason?: string;
  /** The route reads a validated request body / query (DTO), so smuggled fields can be tested. */
  hasBody?: boolean;
  hasQuery?: boolean;
  /** HTTP path as registered, without the global prefix. */
  path?: string;
  /** Exempt from both rate limits (health checks): the contract must not promise a 429 there. */
  skipsThrottle?: boolean;
  /** `@Body()`/`@Query()` parameters whose type is not a DTO class (so the validation pipe would skip them). */
  untypedInputs?: string[];
  isPublic: boolean;
  scope?: RouteScope;
  permission?: RequiredPermission;
}

/** Pure rule set, so it can be tested without booting an application. Returns one message per bad route. */
export function routeProblems(routes: readonly RouteFacts[]): string[] {
  const problems: string[] = [];
  for (const r of routes) {
    const p = r.permission;
    for (const u of r.untypedInputs ?? []) problems.push(`${r.label}: ${u} is not typed with a DTO class, so the validation pipe would let anything through. Declare a DTO with class-validator decorators`);
    if (MUTATING.has(r.method ?? '')) {
      if (!r.audit && !r.noAuditReason) problems.push(`${r.label}: state-changing route needs @Audit({ action, operation }) or @NoAudit('reason')`);
      else if (r.audit && r.noAuditReason) problems.push(`${r.label}: @Audit and @NoAudit contradict each other`);
    } else if (r.audit) problems.push(`${r.label}: @Audit only belongs on a state-changing route (POST/PUT/PATCH/DELETE)`);
    if (r.isPublic) {
      if (p || r.scope) problems.push(`${r.label}: @Public() cannot be combined with @Permission/@UserScoped/@Platform`);
    } else if (r.scope === 'user') {
      if (p) problems.push(`${r.label}: @UserScoped() routes are self-service and carry no @Permission (remove one of them)`);
    } else if (!p) {
      problems.push(`${r.label}: no access decision. Add @Permission(resource, action), or @Public(), or @UserScoped()`);
    } else if (r.scope === 'platform') {
      if (!authorize({ globalRole: 'SUPER_ADMIN' }, p.resource, p.action).allowed) problems.push(`${r.label}: @Platform() route needs a permission SUPER_ADMIN holds, but ${p.resource}:${p.action} is not granted to it`);
    } else if (!ROLES.some((role) => authorize({ schoolRole: role }, p.resource, p.action).allowed)) {
      problems.push(`${r.label}: no school role holds ${p.resource}:${p.action}, so nobody could ever call this route`);
    }
  }
  return problems;
}

/**
 * Deny by default at startup: every route must have an explicit access decision or the application does not boot.
 * Complements the runtime guards (which also fail closed) by making a forgotten decorator impossible to ship.
 */
@Injectable()
export class RouteDecisionCheck implements OnApplicationBootstrap {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}

  onApplicationBootstrap(): void {
    const problems = routeProblems(this.collect());
    if (problems.length > 0) throw new Error(`Refusing to start: ${problems.length} route(s) without a valid access decision:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  }

  private hasInput(metatype: Function, name: string, kind: number): boolean {
    const args = (Reflect.getMetadata(ROUTE_ARGS_METADATA, metatype, name) ?? {}) as Record<string, unknown>;
    return Object.keys(args).some((k) => Number(k.split(':')[0]) === kind);
  }

  /** Body and query inputs must be DTO classes: an `Object`, array or primitive type bypasses `whitelist/forbidNonWhitelisted`. */
  private untypedInputs(metatype: Function, proto: Record<string, unknown>, name: string): string[] {
    const args = (Reflect.getMetadata(ROUTE_ARGS_METADATA, metatype, name) ?? {}) as Record<string, { index: number }>;
    const types = (Reflect.getMetadata('design:paramtypes', proto, name) ?? []) as unknown[];
    const bad: string[] = [];
    for (const [key, arg] of Object.entries(args)) {
      const kind = Number(key.split(':')[0]);
      if (kind !== RouteParamtypes.BODY && kind !== RouteParamtypes.QUERY) continue;
      const type = types[arg.index];
      if (typeof type !== 'function' || [Object, Array, String, Number, Boolean].includes(type as never)) bad.push(`@${kind === RouteParamtypes.BODY ? 'Body' : 'Query'}() parameter ${arg.index + 1}`);
    }
    return bad;
  }

  collect(): RouteFacts[] {
    const routes: RouteFacts[] = [];
    for (const wrapper of this.discovery.getControllers()) {
      const { instance, metatype } = wrapper;
      if (!instance || !metatype) continue;
      const proto = Object.getPrototypeOf(instance) as Record<string, unknown>;
      const base = (Reflect.getMetadata(PATH_METADATA, metatype) as string | string[] | undefined) ?? '';
      for (const name of this.scanner.getAllMethodNames(proto)) {
        const handler = proto[name] as (...args: unknown[]) => unknown;
        const method = Reflect.getMetadata(METHOD_METADATA, handler) as number | undefined;
        if (method === undefined) continue; // not a route
        const path = (Reflect.getMetadata(PATH_METADATA, handler) as string | string[] | undefined) ?? '';
        const targets = [handler, metatype];
        routes.push({
          operationKey: operationKey(metatype.name, name),
          hasBody: this.hasInput(metatype, name, RouteParamtypes.BODY),
          hasQuery: this.hasInput(metatype, name, RouteParamtypes.QUERY),
          path: `/${[base, path].flat().join('/')}`.replace(/\/+/g, '/').replace(/(.)\/$/, '$1'),
          skipsThrottle: this.reflector.getAllAndOverride<boolean>(`${THROTTLER_SKIP}ip`, targets) === true && this.reflector.getAllAndOverride<boolean>(`${THROTTLER_SKIP}user`, targets) === true,
          untypedInputs: this.untypedInputs(metatype, proto, name),
          method: METHODS[method],
          audit: this.reflector.getAllAndOverride<AuditDecl | undefined>(AUDIT, targets),
          noAuditReason: this.reflector.getAllAndOverride<string | undefined>(NO_AUDIT, targets),
          label: `${METHODS[method] ?? 'ROUTE'} /${[base, path].flat().join('/')} (${metatype.name}.${name})`.replace(/\/+/g, '/'),
          isPublic: this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets) === true,
          scope: this.reflector.getAllAndOverride<RouteScope | undefined>(SCOPE, targets),
          permission: this.reflector.getAllAndOverride<RequiredPermission | undefined>(PERMISSION, targets),
        });
      }
    }
    return routes;
  }
}
