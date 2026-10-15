import { authorize, type Action, type Resource, type Role, type Scope } from '@oruschools/rbac';

/**
 * Record-level rules: the things the role x resource x action matrix cannot say because they depend on WHICH record
 * and WHAT is being changed (ADR-0007, guardrails section 4). The PermissionGuard answers "may this role do this at
 * all, and how far does it reach"; a handler that has loaded the record asks these rules before it writes.
 * Pure functions: no I/O, so every rule is unit-testable.
 */
export interface RecordActor {
  userId: string;
  schoolId: string;
  schoolRole: Role;
}

/** The facts about the record the rules need. Fields the handler cannot supply are left out, and rules that need them deny. */
export interface RecordFacts {
  schoolId?: string;
  /** The person the record belongs to (for example the applicant on a leave request). */
  ownerUserId?: string;
  /** Guardians linked to the student the record is about. */
  guardianUserIds?: readonly string[];
}

export interface RecordCheck {
  actor: RecordActor;
  resource: Resource;
  action: Action;
  /** The scope the PermissionGuard granted (`@Granted()`). */
  scope: Scope;
  record?: RecordFacts;
  /** The fields the request wants to change (keys are what matter). */
  changes?: Readonly<Record<string, unknown>>;
}

export type RecordDecision = { allowed: true } | { allowed: false; rule: RecordRuleName };

export type RecordRuleName =
  | 'record_in_other_school'
  | 'scope_own_not_owner'
  | 'scope_linked_not_guardian'
  | 'cannot_approve_own'
  | 'approve_needs_known_owner'
  | 'status_change_needs_approval_right';

const DENY = (rule: RecordRuleName): RecordDecision => ({ allowed: false, rule });

/** Evaluates every rule; the first violation wins. */
export function checkRecordRules(c: RecordCheck): RecordDecision {
  const { actor, record } = c;

  // 1. Defence in depth: a record that carries a school must be this school's, whatever the query returned.
  if (record?.schoolId !== undefined && record.schoolId !== actor.schoolId) return DENY('record_in_other_school');

  // 2. The scope the matrix granted must hold for this record.
  if (c.scope === 'own' && record?.ownerUserId !== actor.userId) return DENY('scope_own_not_owner');
  if (c.scope === 'linked' && !(record?.guardianUserIds ?? []).includes(actor.userId)) return DENY('scope_linked_not_guardian');

  // 3. Nobody approves their own request, whatever their role (a Principal's own leave needs someone else, guardrails section 4).
  if (c.action === 'approve') {
    if (record?.ownerUserId !== undefined && record.ownerUserId === actor.userId) return DENY('cannot_approve_own');
    if (c.resource === 'leave' && record?.ownerUserId === undefined) return DENY('approve_needs_known_owner'); // cannot prove it is not their own
  }

  // 4. Changing the decision state of a leave request is an approval, even when sent as a plain update: HR may edit
  //    the details of a request but only a role holding leave:approve may set its status.
  if (c.resource === 'leave' && c.action === 'update' && c.changes && 'status' in c.changes) {
    if (!authorize({ schoolRole: actor.schoolRole }, 'leave', 'approve').allowed) return DENY('status_change_needs_approval_right');
  }

  return { allowed: true };
}
