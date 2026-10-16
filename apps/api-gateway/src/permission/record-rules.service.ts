import { Injectable, Logger } from '@nestjs/common';
import { ApiException, ErrorCode } from '../common/errors.js';
import type { GrantedPermission } from './permission.decorator.js';
import { checkRecordRules, type RecordFacts } from './record-rules.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';

/**
 * The hook handlers call after loading the record and before writing:
 *
 *   this.rules.assert({ tenant, granted, record: { schoolId, ownerUserId }, changes: dto });
 *
 * A violation is a 403 FORBIDDEN identical to a missing permission (the response never says which rule fired); the rule
 * name goes to the server log. Handlers must pass the record they actually loaded, never values taken from the request.
 */
@Injectable()
export class RecordRules {
  private readonly logger = new Logger('RecordRules');

  assert(input: { tenant: TenantContext; granted: GrantedPermission; record?: RecordFacts; changes?: Readonly<Record<string, unknown>> }): void {
    const { tenant, granted } = input;
    const decision = checkRecordRules({
      actor: { userId: tenant.userId, schoolId: tenant.schoolId, schoolRole: tenant.schoolRole },
      resource: granted.resource,
      action: granted.action,
      scope: granted.scope,
      record: input.record,
      changes: input.changes && definedOnly(input.changes),
    });
    if (decision.allowed) return;
    this.logger.warn({ uid: tenant.userId, schoolId: tenant.schoolId, role: tenant.schoolRole, resource: granted.resource, action: granted.action, rule: decision.rule }, 'record rule refused');
    throw new ApiException(ErrorCode.FORBIDDEN, 403);
  }
}

/**
 * A DTO instance carries a key for every declared optional property, set to undefined when the client did not send it
 * (JSON has no undefined). Those keys mean "not touched" and must not trip rules such as "HR may not change status".
 * A key the client DID send, including null, stays.
 */
function definedOnly(changes: Readonly<Record<string, unknown>>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined));
}
