import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { authorize, ROLES } from '@oruschools/rbac';
import { IS_PUBLIC } from '../auth/public.decorator.js';
import { type RouteScope, SCOPE } from '../tenant/tenant.decorators.js';
import { PERMISSION, type RequiredPermission } from './permission.decorator.js';

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL', 'OPTIONS', 'HEAD', 'SEARCH'];

export interface RouteFacts {
  label: string;
  isPublic: boolean;
  scope?: RouteScope;
  permission?: RequiredPermission;
}

/** Pure rule set, so it can be tested without booting an application. Returns one message per bad route. */
export function routeProblems(routes: readonly RouteFacts[]): string[] {
  const problems: string[] = [];
  for (const r of routes) {
    const p = r.permission;
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
