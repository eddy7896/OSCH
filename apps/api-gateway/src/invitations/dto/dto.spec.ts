import { ArgumentMetadata } from '@nestjs/common';
import { createValidationPipe } from '../../common/validation.js';
import { newInvitationToken } from '../token.js';
import { AcceptInvitationDto, CreateInvitationDto } from './invitation-requests.dto.js';

const run = async (value: unknown, metatype: unknown) => {
  try {
    return { ok: (await createValidationPipe().transform(value, { type: 'body', metatype } as ArgumentMetadata)) as Record<string, unknown> };
  } catch (e) {
    return { fields: (e as { details: Array<{ field: string }> }).details.map((d) => d.field) };
  }
};

describe('CreateInvitationDto', () => {
  it('accepts an email, a role, optional phone and expiry; lower-cases and trims the email', async () => {
    const out = await run({ email: '  Asha.K@Example.COM ', schoolRole: 'TEACHER', phoneNumber: '+919876543210', expiresInDays: 14 }, CreateInvitationDto);
    expect(out.ok).toMatchObject({ email: 'asha.k@example.com', schoolRole: 'TEACHER', expiresInDays: 14 });
  });

  it.each([
    ['not an email', { email: 'nope' }, 'email'],
    ['an unknown role', { schoolRole: 'GOD' }, 'schoolRole'],
    ['SUPER_ADMIN as a school role', { schoolRole: 'SUPER_ADMIN' }, 'schoolRole'],
    ['a bad phone number', { phoneNumber: '98765' }, 'phoneNumber'],
    ['0 days', { expiresInDays: 0 }, 'expiresInDays'],
    ['31 days', { expiresInDays: 31 }, 'expiresInDays'],
    ['a fractional expiry', { expiresInDays: 1.5 }, 'expiresInDays'],
    ['a string expiry', { expiresInDays: '7' }, 'expiresInDays'],
  ])('rejects %s', async (_n, over, field) => {
    expect((await run({ email: 'a@example.com', schoolRole: 'TEACHER', ...over }, CreateInvitationDto)).fields).toContain(field);
  });

  it.each(['schoolId', 'status', 'tokenHash', 'token', 'createdBy', 'expiresAt'])('rejects a client-supplied "%s"', async (extra) => {
    expect((await run({ email: 'a@example.com', schoolRole: 'TEACHER', [extra]: 'x' }, CreateInvitationDto)).fields).toContain(extra);
  });
});

describe('AcceptInvitationDto', () => {
  it('takes only the secret, in its exact shape', async () => {
    expect((await run({ token: newInvitationToken() }, AcceptInvitationDto)).ok).toBeDefined();
    expect((await run({ token: 'short' }, AcceptInvitationDto)).fields).toContain('token');
    expect((await run({}, AcceptInvitationDto)).fields).toContain('token');
  });

  it.each(['schoolRole', 'role', 'schoolId', 'email'])('the accepter cannot choose "%s"', async (extra) => {
    expect((await run({ token: newInvitationToken(), [extra]: 'PRINCIPAL' }, AcceptInvitationDto)).fields).toContain(extra);
  });
});
