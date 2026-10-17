import { ArgumentMetadata } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { createValidationPipe, toDetails } from './validation.js';

class Address {
  @IsString() city!: string;
}
class MemberDto {
  @IsString() userId!: string;
  @IsOptional() @IsInt() @Max(10) level?: number;
  @IsOptional() @ValidateNested() @Type(() => Address) address?: Address;
}
class Undecorated {
  note?: string;
}
const meta = (metatype: unknown): ArgumentMetadata => ({ type: 'body', metatype: metatype as never });
const run = async (value: unknown, metatype: unknown = MemberDto) => {
  try {
    return { ok: await createValidationPipe().transform(value, meta(metatype)) };
  } catch (e) {
    const ex = e as { getStatus(): number; code: string; details: Array<{ field: string; rule: string }> };
    return { status: ex.getStatus(), code: ex.code, details: ex.details };
  }
};

describe('validation pipe', () => {
  it('accepts a body that matches the DTO and returns an instance of it', async () => {
    const out = (await run({ userId: 'u1', level: 3 })) as { ok: MemberDto };
    expect(out.ok).toBeInstanceOf(MemberDto);
    expect(out.ok).toMatchObject({ userId: 'u1', level: 3 });
  });

  it.each(['schoolId', 'schoolRole', 'globalRole', 'tenant', '__proto__x'])('rejects a body that carries an unknown "%s" (it is rejected, not silently dropped)', async (extra) => {
    const out = await run({ userId: 'u1', [extra]: 'PRINCIPAL' });
    expect(out).toMatchObject({ status: 400, code: 'INVALID_REQUEST' });
    expect(out.details).toContainEqual({ field: extra, rule: 'whitelistValidation' });
  });

  it('never copies the submitted value into the response', async () => {
    const out = await run({ userId: 'u1', schoolId: '11111111-SECRET-VALUE' });
    expect(JSON.stringify(out)).not.toContain('SECRET-VALUE');
  });

  it('reports every violation by field and rule, including nested ones', async () => {
    const out = await run({ userId: 5, level: 99, address: { city: 1, floor: 2 } });
    expect(out.details).toEqual(expect.arrayContaining([{ field: 'userId', rule: 'isString' }, { field: 'level', rule: 'max' }, { field: 'address.city', rule: 'isString' }, { field: 'address.floor', rule: 'whitelistValidation' }]));
  });

  it('does not coerce types: a numeric string is not an integer', async () => {
    expect((await run({ userId: 'u1', level: '3' })).details).toContainEqual({ field: 'level', rule: 'isInt' });
  });

  it('rejects a missing required field', async () => {
    expect((await run({})).details).toContainEqual({ field: 'userId', rule: 'isString' });
  });

  it('rejects a DTO with no decorators at all (otherwise it would accept anything)', async () => {
    expect(await run({ note: 'x' }, Undecorated)).toMatchObject({ status: 400 });
    expect(await run({}, Undecorated)).toMatchObject({ status: 400, details: [{ rule: 'unknownValue' }] }); // even an empty body: a DTO nobody validates is a mistake
  });

  it('rejects an array or a primitive where an object is expected', async () => {
    for (const bad of [[{ userId: 'u1' }], 'text', 42]) expect(await run(bad)).toMatchObject({ status: 400 });
  });
});

describe('toDetails', () => {
  it('flattens nested errors into dotted paths', () => {
    expect(toDetails([{ property: 'a', constraints: { isString: 'x' }, children: [{ property: 'b', constraints: { min: 'y' }, children: [] }] }] as never)).toEqual([{ field: 'a', rule: 'isString' }, { field: 'a.b', rule: 'min' }]);
  });
});
