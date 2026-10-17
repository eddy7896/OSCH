import { ArgumentMetadata } from '@nestjs/common';
import { createValidationPipe } from '../../common/validation.js';
import { CreateSchoolDto } from './create-school.dto.js';
import { ListSchoolsQueryDto } from './list-schools-query.dto.js';
import { SchoolStatusDto } from './school-status.dto.js';
import { UpdateSchoolDto } from './update-school.dto.js';

const run = async (value: unknown, metatype: unknown, type: ArgumentMetadata['type'] = 'body') => {
  try {
    return { ok: (await createValidationPipe().transform(value, { type, metatype } as ArgumentMetadata)) as Record<string, unknown> };
  } catch (e) {
    return { fields: (e as { details: Array<{ field: string }> }).details.map((d) => d.field) };
  }
};
const good = { name: 'Green Valley School', subDomain: 'greenvalley', defaultLanguage: 'en' };

describe('CreateSchoolDto', () => {
  it('accepts a valid school and trims the name and subdomain', async () => {
    expect((await run({ ...good, name: '  Green Valley  ', subDomain: ' greenvalley ' }, CreateSchoolDto)).ok).toMatchObject({ name: 'Green Valley', subDomain: 'greenvalley' });
  });

  it.each([
    ['a reserved subdomain', { subDomain: 'www' }, 'subDomain'],
    ['an upper-case subdomain', { subDomain: 'GreenValley' }, 'subDomain'],
    ['an unsupported language', { defaultLanguage: 'xx' }, 'defaultLanguage'],
    ['a one-character name', { name: 'A' }, 'name'],
    ['a 121-character name', { name: 'x'.repeat(121) }, 'name'],
    ['a numeric name', { name: 5 }, 'name'],
    ['a missing subdomain', { subDomain: undefined }, 'subDomain'],
  ])('rejects %s', async (_n, over, field) => {
    expect((await run({ ...good, ...over }, CreateSchoolDto)).fields).toContain(field);
  });

  it.each(['id', 'subscriptionStatus', 'schoolId', 'createdAt', 'status'])('rejects a client-supplied "%s" (the server owns it)', async (extra) => {
    expect((await run({ ...good, [extra]: 'x' }, CreateSchoolDto)).fields).toContain(extra);
  });
});

describe('UpdateSchoolDto', () => {
  it('accepts either field alone, and never the subdomain (it is the school\'s address)', async () => {
    expect((await run({ name: 'New name' }, UpdateSchoolDto)).ok).toBeDefined();
    expect((await run({ defaultLanguage: 'ur' }, UpdateSchoolDto)).ok).toBeDefined();
    expect((await run({ subDomain: 'other' }, UpdateSchoolDto)).fields).toContain('subDomain');
  });
});

describe('SchoolStatusDto and ListSchoolsQueryDto', () => {
  it('reason is optional and bounded', async () => {
    expect((await run({}, SchoolStatusDto)).ok).toBeDefined();
    expect((await run({ reason: 'unpaid invoice' }, SchoolStatusDto)).ok).toBeDefined();
    expect((await run({ reason: 'x'.repeat(501) }, SchoolStatusDto)).fields).toContain('reason');
  });

  it('paging comes from the query string as real numbers within bounds', async () => {
    expect((await run({ limit: '10', offset: '20' }, ListSchoolsQueryDto, 'query')).ok).toMatchObject({ limit: 10, offset: 20 });
    for (const bad of [{ limit: '0' }, { limit: '101' }, { limit: 'abc' }, { offset: '-1' }, { limit: '1.5' }]) expect((await run(bad, ListSchoolsQueryDto, 'query')).fields, JSON.stringify(bad)).toBeDefined();
  });
});
