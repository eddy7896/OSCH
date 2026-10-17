import { ArgumentMetadata } from '@nestjs/common';
import { createValidationPipe } from '../../common/validation.js';
import { ACCOUNT_ROLES, CreateStaffAccountDto } from './create-staff-account.dto.js';

const run = async (value: unknown) => {
  try {
    return { ok: (await createValidationPipe().transform(value, { type: 'body', metatype: CreateStaffAccountDto } as ArgumentMetadata)) as Record<string, unknown> };
  } catch (e) {
    return { fields: (e as { details: Array<{ field: string }> }).details.map((d) => d.field) };
  }
};
const base = { displayName: 'Asha Kumar', schoolRole: 'TEACHER' };

describe('CreateStaffAccountDto', () => {
  it('accepts an email, a phone, or both; trims the name and lower-cases the email', async () => {
    expect((await run({ ...base, email: ' Asha@Example.COM ' })).ok).toMatchObject({ email: 'asha@example.com', displayName: 'Asha Kumar' });
    expect((await run({ ...base, phoneNumber: '+919876543210' })).ok).toBeDefined();
    expect((await run({ ...base, email: 'a@example.com', phoneNumber: '+919876543210' })).ok).toBeDefined();
  });

  it('PARENT is not an account role here (parents come through admissions and guardian links); the other 13 are', async () => {
    expect(ACCOUNT_ROLES).toHaveLength(13);
    expect(ACCOUNT_ROLES).not.toContain('PARENT');
    expect((await run({ ...base, schoolRole: 'PARENT', email: 'a@example.com' })).fields).toContain('schoolRole');
    for (const r of ['DRIVER', 'TEACHER', 'STAFF', 'SYSTEM_ADMIN']) expect((await run({ ...base, schoolRole: r, email: 'a@example.com' })).ok).toBeDefined();
  });

  it.each([
    ['not an email', { email: 'nope' }, 'email'],
    ['a short phone', { phoneNumber: '98765' }, 'phoneNumber'],
    ['a phone without +', { phoneNumber: '919876543210' }, 'phoneNumber'],
    ['an empty name', { displayName: '  ' }, 'displayName'],
    ['a 121-character name', { displayName: 'x'.repeat(121) }, 'displayName'],
    ['an unknown role', { schoolRole: 'GOD' }, 'schoolRole'],
    ['SUPER_ADMIN as a school role', { schoolRole: 'SUPER_ADMIN' }, 'schoolRole'],
  ])('rejects %s', async (_n, over, field) => {
    expect((await run({ ...base, email: 'a@example.com', ...over })).fields).toContain(field);
  });

  it.each(['password', 'userId', 'schoolId', 'uid', 'emailVerified', 'status', 'globalRole'])('rejects a client-supplied "%s" (the admin never chooses a password or an id)', async (extra) => {
    expect((await run({ ...base, email: 'a@example.com', [extra]: 'x' })).fields).toContain(extra);
  });
});
