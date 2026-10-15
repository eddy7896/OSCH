import { RecordRules } from './record-rules.service.js';

const tenant = { schoolId: 's-1', userId: 'u-hr', schoolRole: 'HR_MANAGER' } as const;
const granted = { resource: 'leave', action: 'update', scope: 'school' } as const;
const run = (changes: Record<string, unknown>) => () => new RecordRules().assert({ tenant, granted, record: { schoolId: 's-1', ownerUserId: 'u-t' }, changes });

describe('RecordRules.assert', () => {
  it('ignores keys that are undefined (a DTO declares every optional property but the client did not send it)', () => {
    class Dto { reason?: string = 'fever'; status?: string = undefined; }
    expect(run(Object.fromEntries(Object.entries(new Dto())))).not.toThrow();
  });

  it('still refuses a status the client really sent, including null', () => {
    for (const status of ['APPROVED', null, '']) expect(run({ reason: 'x', status })).toThrow();
  });

  it('turns a violation into the opaque 403 without naming the rule', () => {
    try {
      run({ status: 'APPROVED' })();
    } catch (e) {
      expect((e as { getStatus(): number }).getStatus()).toBe(403);
      expect(JSON.stringify((e as { getResponse(): unknown }).getResponse())).toBe('{"code":"FORBIDDEN"}');
      return;
    }
    throw new Error('expected a 403');
  });
});
