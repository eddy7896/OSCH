import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUDIT_ACTION } from './audit.decorators.js';
import { auditActionsByOperation, auditBindingProblems } from './audit-binding.js';

const here = dirname(fileURLToPath(import.meta.url));
const real = auditActionsByOperation(readFileSync(resolve(here, '../../../../dataconnect/erp-connector/mutations.gql'), 'utf8'));

describe('audit binding against the real connector', () => {
  const PHASE1: Record<string, string> = {
    ProvisionSchool: 'platform.school.create',
    UpdateSchool: 'school.update',
    SetSubscriptionStatus: 'platform.school.status',
    AddMembership: 'membership.add',
    UpdateMembership: 'membership.update',
    RemoveMembership: 'membership.remove',
    CreateInvitation: 'invitation.create',
    RevokeInvitation: 'invitation.revoke',
    AcceptInvitation: 'invitation.accept',
  };

  it('every Phase 1 mutation records exactly one literal audit action, in noun.verb form', () => {
    for (const [op, action] of Object.entries(PHASE1)) {
      expect(real.get(op), op).toEqual([action]);
      expect(action).toMatch(AUDIT_ACTION);
    }
  });

  it('a route bound to the right operation and action passes', () => {
    expect(auditBindingProblems([{ label: 'POST /memberships', audit: { action: 'membership.add', operation: 'AddMembership' } }], real)).toEqual([]);
  });

  it('a wrong action, an unknown operation, or an unaudited operation is reported', () => {
    const p = auditBindingProblems(
      [
        { label: 'R1', audit: { action: 'membership.added', operation: 'AddMembership' } },
        { label: 'R2', audit: { action: 'x.y', operation: 'NoSuchOperation' } },
        { label: 'R3', audit: { action: 'leave.create', operation: 'CreateLeaveRequest' } }, // Phase 0 operation: no audit insert yet
      ],
      real,
    ).join('\n');
    expect(p).toMatch(/R1: @Audit says "membership.added" but AddMembership records "membership.add"/);
    expect(p).toMatch(/R2: .*NoSuchOperation is not a mutation/);
    expect(p).toMatch(/R3: operation CreateLeaveRequest has no auditLog_insert/);
  });

  it('routes without @Audit are ignored by the binding check', () => {
    expect(auditBindingProblems([{ label: 'GET /x' }], real)).toEqual([]);
  });
});
