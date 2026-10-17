import { authorize, ROLES, type Role } from '@oruschools/rbac';
import type { RouteFacts } from '../../src/permission/route-decision.check.js';
import type { World } from './fixtures.js';

export interface Expect {
  /** Exact status, or */
  status?: number;
  /** a status that must NOT be one of these (the request got past the gates), and/or */
  notIn?: number[];
  /** the error envelope code. */
  code?: string;
}

export interface Case {
  name: string;
  token?: string;
  schoolId?: string;
  /** Sent as the JSON body / query string instead of nothing. */
  body?: Record<string, unknown>;
  query?: Record<string, string>;
  expect: Expect;
}

const PASSED_THE_GATES = [401, 403];
const FOREIGN = '99999999-9999-4999-8999-999999999999';

/** The URL to call: global prefix added (health lives outside it) and `:param` segments replaced by a well-formed uuid. */
export const urlFor = (route: RouteFacts) => (route.path === '/health' || route.path?.startsWith('/health/') ? route.path : `/v1${route.path}`.replace(/:[A-Za-z]+/g, FOREIGN));

/** Every case that must hold for ONE route, derived only from how the route is declared (public, user, platform, tenant + permission). */
export function casesFor(route: RouteFacts, w: World): Case[] {
  const cases: Case[] = [];
  const kind = route.isPublic ? 'public' : route.scope === 'user' ? 'user' : route.scope === 'platform' ? 'platform' : 'tenant';
  const A = w.schools.A;
  const smuggled = { schoolId: w.schools.B, schoolRole: 'PRINCIPAL', globalRole: 'SUPER_ADMIN' };

  if (kind === 'public') {
    cases.push({ name: 'anonymous callers are allowed', expect: { notIn: PASSED_THE_GATES } });
    return cases;
  }

  cases.push({ name: 'no token -> 401', expect: { status: 401, code: 'AUTH_REQUIRED' } });
  cases.push({ name: 'garbage token -> 401', token: 'not.a.jwt', expect: { status: 401, code: 'AUTH_REQUIRED' } });

  if (kind === 'user') {
    cases.push({ name: 'any signed-in user gets through, with no school', token: w.outsider.token, expect: { notIn: PASSED_THE_GATES } });
    if (route.hasBody) cases.push({ name: 'smuggled schoolId/schoolRole/globalRole in the body -> 400', token: w.outsider.token, body: smuggled, expect: { status: 400, code: 'INVALID_REQUEST' } });
    if (route.hasQuery) cases.push({ name: 'smuggled schoolId in the query -> 400', token: w.outsider.token, query: { schoolId: w.schools.B }, expect: { status: 400, code: 'INVALID_REQUEST' } });
    return cases;
  }

  if (kind === 'platform') {
    cases.push({ name: 'a Principal of a school -> 403', token: w.roles.A.PRINCIPAL.token, schoolId: A, expect: { status: 403, code: 'FORBIDDEN' } });
    cases.push({ name: 'a System Admin of a school -> 403', token: w.roles.A.SYSTEM_ADMIN.token, schoolId: A, expect: { status: 403, code: 'FORBIDDEN' } });
    cases.push({ name: 'a signed-in user with no school -> 403', token: w.outsider.token, expect: { status: 403, code: 'FORBIDDEN' } });
    cases.push({ name: 'SUPER_ADMIN gets through', token: w.superAdmin.token, expect: { notIn: PASSED_THE_GATES } });
    cases.push({ name: 'SUPER_ADMIN gets through and X-School-Id changes nothing', token: w.superAdmin.token, schoolId: A, expect: { notIn: PASSED_THE_GATES } });
    if (route.hasBody) cases.push({ name: 'smuggled fields in the body -> 400', token: w.superAdmin.token, body: smuggled, expect: { status: 400, code: 'INVALID_REQUEST' } });
    return cases;
  }

  // Tenant route: every role in school A is checked against the single matrix in packages/rbac.
  const p = route.permission!;
  const admin = w.roles.A.SYSTEM_ADMIN.token;
  cases.push({ name: 'no X-School-Id -> 400', token: admin, expect: { status: 400, code: 'INVALID_REQUEST' } });
  cases.push({ name: 'malformed X-School-Id -> 400', token: admin, schoolId: 'school-a', expect: { status: 400, code: 'INVALID_REQUEST' } });
  cases.push({ name: 'a signed-in user with no membership -> 403', token: w.outsider.token, schoolId: A, expect: { status: 403, code: 'FORBIDDEN' } });
  cases.push({ name: 'a member of school B naming school A -> 403', token: w.roles.B.SYSTEM_ADMIN.token, schoolId: A, expect: { status: 403, code: 'FORBIDDEN' } });
  cases.push({ name: 'a member of school A naming school B -> 403', token: w.roles.A.SYSTEM_ADMIN.token, schoolId: w.schools.B, expect: { status: 403, code: 'FORBIDDEN' } });
  cases.push({ name: 'a school that does not exist -> 403 (same answer as one the caller is not in)', token: admin, schoolId: FOREIGN, expect: { status: 403, code: 'FORBIDDEN' } });
  cases.push({ name: 'a suspended member -> 403', token: w.suspendedMember.token, schoolId: A, expect: { status: 403, code: 'FORBIDDEN' } });
  cases.push({ name: 'SUPER_ADMIN has no school access -> 403', token: w.superAdmin.token, schoolId: A, expect: { status: 403, code: 'FORBIDDEN' } });
  cases.push({ name: 'a member of a suspended school -> 403 SCHOOL_SUSPENDED', token: w.memberOfSuspendedSchool.token, schoolId: w.schools.SUSPENDED, expect: { status: 403, code: 'SCHOOL_SUSPENDED' } });

  for (const role of ROLES as readonly Role[]) {
    const allowed = authorize({ schoolRole: role }, p.resource, p.action).allowed;
    for (const key of role === 'PRINCIPAL' || role === 'TEACHER' ? (['A', 'B'] as const) : (['A'] as const)) {
      cases.push(
        allowed
          ? { name: `${role} in ${key} holds ${p.resource}:${p.action} -> gets through`, token: w.roles[key][role].token, schoolId: w.schools[key], expect: { notIn: PASSED_THE_GATES } }
          : { name: `${role} in ${key} lacks ${p.resource}:${p.action} -> 403`, token: w.roles[key][role].token, schoolId: w.schools[key], expect: { status: 403, code: 'FORBIDDEN' } },
      );
    }
  }

  const holder = (ROLES as readonly Role[]).find((r) => authorize({ schoolRole: r }, p.resource, p.action).allowed);
  if (holder) {
    const token = w.roles.A[holder].token;
    if (route.hasBody) cases.push({ name: `smuggled schoolId/schoolRole/globalRole in the body (as ${holder}) -> 400`, token, schoolId: A, body: smuggled, expect: { status: 400, code: 'INVALID_REQUEST' } });
    if (route.hasQuery) cases.push({ name: `smuggled schoolId in the query (as ${holder}) -> 400`, token, schoolId: A, query: { schoolId: w.schools.B }, expect: { status: 400, code: 'INVALID_REQUEST' } });
  }
  return cases;
}
