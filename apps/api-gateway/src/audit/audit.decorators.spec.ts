import { Audit, NoAudit } from './audit.decorators.js';

describe('audit decorators', () => {
  it('@Audit accepts noun.verb actions and Data Connect operation names', () => {
    expect(() => Audit({ action: 'membership.add', operation: 'AddMembership' })).not.toThrow();
    expect(() => Audit({ action: 'platform.school.create', operation: 'ProvisionSchool' })).not.toThrow();
  });

  it.each(['membership', 'Membership.Add', 'membership_add', 'membership.', '.add', 'a b.c', ''])('@Audit rejects the action "%s"', (action) => {
    expect(() => Audit({ action, operation: 'AddMembership' })).toThrow(/noun\.verb/);
  });

  it.each(['addMembership', 'Add Membership', '', 'Add-Membership'])('@Audit rejects the operation "%s"', (operation) => {
    expect(() => Audit({ action: 'membership.add', operation })).toThrow(/operation/);
  });

  it('@NoAudit needs a real reason', () => {
    expect(() => NoAudit('')).toThrow();
    expect(() => NoAudit('todo')).toThrow();
    expect(() => NoAudit('caller edits only their own preferences')).not.toThrow();
  });
});
