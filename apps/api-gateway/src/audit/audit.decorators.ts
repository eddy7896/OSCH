import { SetMetadata } from '@nestjs/common';

export const AUDIT = 'oru:audit';
export const NO_AUDIT = 'oru:no-audit';

/** `noun.verb`, lower case, as written in the Data Connect `auditLog_insert` of the operation. */
export const AUDIT_ACTION = /^[a-z]+(\.[a-z]+)+$/;

export interface AuditDecl {
  /** The audit action the operation records, for example `membership.add`. */
  action: string;
  /** The Data Connect mutation the handler calls; its `auditLog_insert` must record exactly this action (checked by `auditBindingProblems`). */
  operation: string;
}

/**
 * Declares which audited operation a state-changing route performs. The row itself is written INSIDE that operation's
 * transaction (ADR-0008), so the change and its audit row cannot be separated; this decorator makes the link explicit and
 * checkable. Every POST/PUT/PATCH/DELETE route must carry `@Audit(...)` or `@NoAudit('reason')` or the app does not boot.
 */
export const Audit = (decl: AuditDecl) => {
  if (!AUDIT_ACTION.test(decl.action)) throw new Error(`@Audit action "${decl.action}" must look like noun.verb (for example membership.add)`);
  if (!/^[A-Z][A-Za-z0-9]+$/.test(decl.operation)) throw new Error(`@Audit operation "${decl.operation}" must be a Data Connect operation name (for example AddMembership)`);
  return SetMetadata(AUDIT, decl);
};

/** For a state-changing route that deliberately writes no audit row (self-service preferences, test probes). The reason is mandatory. */
export const NoAudit = (reason: string) => {
  if (reason.trim().length < 10) throw new Error('@NoAudit needs a written reason of at least 10 characters');
  return SetMetadata(NO_AUDIT, reason);
};
