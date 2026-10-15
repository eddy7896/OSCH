import { checkRecordRules, type RecordCheck } from './record-rules.js';

const S = 's-1';
const base = (over: Partial<RecordCheck>): RecordCheck => ({ actor: { userId: 'u-actor', schoolId: S, schoolRole: 'PRINCIPAL' }, resource: 'leave', action: 'approve', scope: 'school', ...over });
const rule = (c: RecordCheck) => {
  const d = checkRecordRules(c);
  return d.allowed ? 'allowed' : d.rule;
};

describe('record rule: nobody approves their own request', () => {
  it('a Principal can approve someone else\'s leave', () => {
    expect(rule(base({ record: { schoolId: S, ownerUserId: 'u-teacher' } }))).toBe('allowed');
  });

  it('a Principal cannot approve their OWN leave', () => {
    expect(rule(base({ record: { schoolId: S, ownerUserId: 'u-actor' } }))).toBe('cannot_approve_own');
  });

  it('rejecting your own leave is the same decision and is refused too (approve covers both outcomes)', () => {
    expect(rule(base({ record: { ownerUserId: 'u-actor' }, changes: { status: 'REJECTED' } }))).toBe('cannot_approve_own');
  });

  it('a leave approval whose owner is not known is refused (cannot prove it is not their own)', () => {
    expect(rule(base({ record: { schoolId: S } }))).toBe('approve_needs_known_owner');
    expect(rule(base({}))).toBe('approve_needs_known_owner');
  });

  it('applies to every resource that has an approve action, whatever the role', () => {
    expect(rule(base({ resource: 'admissions', record: { ownerUserId: 'u-actor' } }))).toBe('cannot_approve_own');
    expect(rule(base({ actor: { userId: 'u-actor', schoolId: S, schoolRole: 'SYSTEM_ADMIN' }, record: { ownerUserId: 'u-actor' } }))).toBe('cannot_approve_own');
  });

  it('a non-leave approval with no known owner is not blocked by the owner rule', () => {
    expect(rule(base({ resource: 'admissions', record: {} }))).toBe('allowed');
  });
});

describe('record rule: HR may edit a leave request but not decide it', () => {
  const hr = { userId: 'u-hr', schoolId: S, schoolRole: 'HR_MANAGER' } as const;
  const update = (changes: Record<string, unknown>, actor: RecordCheck['actor'] = hr) => base({ actor, action: 'update', changes, record: { schoolId: S, ownerUserId: 'u-teacher' } });

  it('HR can change the details of a request', () => {
    expect(rule(update({ reason: 'family event', startDate: '2026-11-01' }))).toBe('allowed');
  });

  it('HR cannot change the status, even to the value it already has', () => {
    for (const status of ['APPROVED', 'REJECTED', 'PENDING']) expect(rule(update({ status }))).toBe('status_change_needs_approval_right');
  });

  it('HR cannot sneak the status in next to allowed fields', () => {
    expect(rule(update({ reason: 'x', status: 'APPROVED' }))).toBe('status_change_needs_approval_right');
  });

  it('even an explicit undefined status key counts as touching it', () => {
    expect(rule(update({ status: undefined }))).toBe('status_change_needs_approval_right');
  });

  it('a role that holds leave:approve may set the status through an update', () => {
    expect(rule(update({ status: 'APPROVED' }, { userId: 'u-principal', schoolId: S, schoolRole: 'PRINCIPAL' }))).toBe('allowed');
  });

  it('a TEACHER (no update right in the matrix) is also kept away from status by this rule', () => {
    expect(rule(update({ status: 'APPROVED' }, { userId: 'u-t', schoolId: S, schoolRole: 'TEACHER' }))).toBe('status_change_needs_approval_right');
  });

  it('only leave updates are affected: a "status" field on another resource is not this rule\'s business', () => {
    expect(rule(base({ resource: 'finance', action: 'update', actor: hr, changes: { status: 'PAID' } }))).toBe('allowed');
  });
});

describe('record rules: scope and school are enforced on the loaded record', () => {
  it('own scope: only the owner', () => {
    expect(rule(base({ action: 'read', scope: 'own', record: { ownerUserId: 'u-actor' } }))).toBe('allowed');
    expect(rule(base({ action: 'read', scope: 'own', record: { ownerUserId: 'u-other' } }))).toBe('scope_own_not_owner');
    expect(rule(base({ action: 'read', scope: 'own', record: {} }))).toBe('scope_own_not_owner');
    expect(rule(base({ action: 'read', scope: 'own' }))).toBe('scope_own_not_owner');
  });

  it('linked scope: only a guardian of the student', () => {
    expect(rule(base({ resource: 'students', action: 'read', scope: 'linked', record: { guardianUserIds: ['u-x', 'u-actor'] } }))).toBe('allowed');
    expect(rule(base({ resource: 'students', action: 'read', scope: 'linked', record: { guardianUserIds: ['u-x'] } }))).toBe('scope_linked_not_guardian');
    expect(rule(base({ resource: 'students', action: 'read', scope: 'linked', record: {} }))).toBe('scope_linked_not_guardian');
  });

  it('school scope: any record of this school, none of another (defence in depth against a bad query)', () => {
    expect(rule(base({ action: 'read', record: { schoolId: S } }))).toBe('allowed');
    expect(rule(base({ action: 'read', record: { schoolId: 's-2' } }))).toBe('record_in_other_school');
    expect(rule(base({ action: 'read', scope: 'own', record: { schoolId: 's-2', ownerUserId: 'u-actor' } }))).toBe('record_in_other_school');
  });
});
