import { ACTIONS, RESOURCES, SCOPE_RANK, grantsOf, type Action, type Resource, type Scope } from "./permissions.js";
import { GLOBAL_MATRIX, MATRIX } from "./matrix.js";
import { isRole, GLOBAL_ROLES, type GlobalRole, type Role } from "./roles.js";

/** Who is asking. `schoolRole` is the role in the ACTIVE school (resolved by the gateway from SchoolMember, never from the client). */
export interface Subject {
  readonly globalRole?: GlobalRole | string | null;
  readonly schoolRole?: Role | string | null;
}

export type Decision = { readonly allowed: false } | { readonly allowed: true; readonly scope: Scope };

const DENY: Decision = { allowed: false };

const isResource = (v: unknown): v is Resource => typeof v === "string" && (RESOURCES as readonly string[]).includes(v);
const isAction = (v: unknown): v is Action => typeof v === "string" && (ACTIONS as readonly string[]).includes(v);
const isGlobalRole = (v: unknown): v is GlobalRole => typeof v === "string" && (GLOBAL_ROLES as readonly string[]).includes(v);

/**
 * Deny-by-default authorisation. Unknown role / resource / action => denied (never throws).
 * Global (platform) and school grants are separate namespaces: a SUPER_ADMIN gets platform
 * resources only, a school role gets tenant resources only.
 */
export function authorize(subject: Subject | null | undefined, resource: string, action: string): Decision {
  // An unauthenticated request has no subject: deny, never throw (a thrown error would surface as a 500, not a 403).
  if (!subject || typeof subject !== "object") return DENY;
  if (!isResource(resource) || !isAction(action)) return DENY;

  const fromGlobal = isGlobalRole(subject.globalRole) ? widest(GLOBAL_MATRIX[subject.globalRole][resource], action) : undefined;
  if (fromGlobal) return { allowed: true, scope: fromGlobal };

  if (!isRole(subject.schoolRole)) return DENY;
  const scope = widest(MATRIX[subject.schoolRole][resource], action);
  return scope ? { allowed: true, scope } : DENY;
}

/** Among all grants on a resource that include `action`, the widest scope; undefined if none allow it. */
function widest(grants: Parameters<typeof grantsOf>[0], action: Action): Scope | undefined {
  let best: Scope | undefined;
  for (const g of grantsOf(grants))
    if (g.actions.includes(action) && (best === undefined || SCOPE_RANK[g.scope] > SCOPE_RANK[best])) best = g.scope;
  return best;
}

export const can = (subject: Subject | null | undefined, resource: string, action: string): boolean =>
  authorize(subject, resource, action).allowed;

/** Every `resource:action` the subject holds, with scope. Used for nav building, codegen and debugging. */
export function permissionsOf(subject: Subject | null | undefined): Array<{ resource: Resource; action: Action; scope: Scope }> {
  const out: Array<{ resource: Resource; action: Action; scope: Scope }> = [];
  for (const resource of RESOURCES)
    for (const action of ACTIONS) {
      const d = authorize(subject, resource, action);
      if (d.allowed) out.push({ resource, action, scope: d.scope });
    }
  return out;
}
