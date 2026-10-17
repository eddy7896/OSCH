import { ArgumentMetadata } from '@nestjs/common';
import { createValidationPipe } from '../../common/validation.js';
import { AddMembershipDto, UpdateMembershipDto, UserIdParamDto } from './membership-requests.dto.js';

const run = async (value: unknown, metatype: unknown, type: ArgumentMetadata['type'] = 'body') => {
  try {
    return { ok: await createValidationPipe().transform(value, { type, metatype } as ArgumentMetadata) };
  } catch (e) {
    return { fields: (e as { details: Array<{ field: string }> }).details.map((d) => d.field) };
  }
};

describe('membership DTOs', () => {
  it('add: a uid and one of the 14 roles', async () => {
    expect((await run({ userId: 'AbC123_-xyz', schoolRole: 'TEACHER' }, AddMembershipDto)).ok).toBeDefined();
    expect((await run({ userId: 'u1', schoolRole: 'SUPER_ADMIN' }, AddMembershipDto)).fields).toContain('schoolRole'); // not a school role
    expect((await run({ userId: 'u1', schoolRole: 'GOD' }, AddMembershipDto)).fields).toContain('schoolRole');
    expect((await run({ userId: 'a b', schoolRole: 'TEACHER' }, AddMembershipDto)).fields).toContain('userId');
    expect((await run({ userId: '../x', schoolRole: 'TEACHER' }, AddMembershipDto)).fields).toContain('userId');
    expect((await run({ userId: '', schoolRole: 'TEACHER' }, AddMembershipDto)).fields).toContain('userId');
  });

  it.each(['schoolId', 'status', 'globalRole', 'email'])('add: rejects "%s" in the body', async (extra) => {
    expect((await run({ userId: 'u1', schoolRole: 'TEACHER', [extra]: 'x' }, AddMembershipDto)).fields).toContain(extra);
  });

  it('update: role and/or status, status limited to ACTIVE and SUSPENDED, nothing else', async () => {
    expect((await run({ schoolRole: 'ACCOUNTANT' }, UpdateMembershipDto)).ok).toBeDefined();
    expect((await run({ status: 'SUSPENDED' }, UpdateMembershipDto)).ok).toBeDefined();
    expect((await run({ status: 'DELETED' }, UpdateMembershipDto)).fields).toContain('status');
    expect((await run({ userId: 'someone-else' }, UpdateMembershipDto)).fields).toContain('userId');
    expect((await run({ schoolId: 'x' }, UpdateMembershipDto)).fields).toContain('schoolId');
  });

  it('path userId is a plain uid', async () => {
    expect((await run({ userId: 'abc-123_X' }, UserIdParamDto, 'param')).ok).toBeDefined();
    expect((await run({ userId: 'a%2Fb' }, UserIdParamDto, 'param')).fields).toContain('userId');
  });
});
