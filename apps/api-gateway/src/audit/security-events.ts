import type { PermissionRequest } from '../permission/permission.decorator.js';

export type DeniedRequest = PermissionRequest & { denial?: { resource?: string; action?: string } };

/** What the error filter tells the audit trail. An interface plus a token, so the filter needs no database in tests. */
export interface SecurityEvents {
  securityEvent(req: DeniedRequest, status: number, code: string): void;
}
export const SECURITY_EVENTS = Symbol('SECURITY_EVENTS');
