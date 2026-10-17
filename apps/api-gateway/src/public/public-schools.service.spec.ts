import { PublicSchoolsService } from './public-schools.service.js';

class Clocked extends PublicSchoolsService {
  t = 1_000;
  protected override now() {
    return this.t;
  }
}
const ROW = { id: 'aaaaaaaabbbbccccddddeeeeeeeeeeee', name: 'Green Valley', subDomain: 'greenvalley', subscriptionStatus: 'ACTIVE', defaultLanguage: 'hi', createdAt: '2026-10-17', currency: 'INR' };

function setup(rows: Array<typeof ROW> = [ROW]) {
  const lookups: string[] = [];
  const db = { getSchoolBySubDomain: async ({ subDomain }: { subDomain: string }) => (lookups.push(subDomain), { data: { schools: rows.filter((r) => r.subDomain === subDomain) } }) };
  return { svc: new Clocked(db as never), lookups, rows };
}
const notFound = { code: 'NOT_FOUND' };

describe('PublicSchoolsService', () => {
  it('returns exactly id (canonical), name, subdomain and default language, nothing else', async () => {
    const { svc } = setup();
    expect(await svc.bySubdomain('greenvalley')).toEqual({ id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', name: 'Green Valley', subDomain: 'greenvalley', defaultLanguage: 'hi' });
  });

  it('is case-insensitive on the way in', async () => {
    const { svc, lookups } = setup();
    expect((await svc.bySubdomain('GreenValley')).subDomain).toBe('greenvalley');
    expect(lookups).toEqual(['greenvalley']);
  });

  it.each(['', 'ab', 'www', 'api', 'admin', 'staging', 'has space', 'under_score', '-lead', 'trail-', 'a--b', 'x'.repeat(64), 'dot.ted', '../etc'])('"%s" is a 404 that never reaches the database', async (bad) => {
    const { svc, lookups } = setup();
    await expect(svc.bySubdomain(bad)).rejects.toMatchObject(notFound);
    expect(lookups).toHaveLength(0);
  });

  it('an unknown school and a SUSPENDED school are the same 404', async () => {
    const { svc } = setup([{ ...ROW, subscriptionStatus: 'SUSPENDED' }]);
    const a = await svc.bySubdomain('greenvalley').catch((e) => ({ status: e.getStatus(), body: e.getResponse() }));
    const b = await svc.bySubdomain('nosuchschool').catch((e) => ({ status: e.getStatus(), body: e.getResponse() }));
    expect(a).toEqual(b);
    expect(a).toMatchObject({ status: 404 });
  });

  it('a TRIAL school is visible', async () => {
    const { svc } = setup([{ ...ROW, subscriptionStatus: 'TRIAL' }]);
    await expect(svc.bySubdomain('greenvalley')).resolves.toBeDefined();
  });

  it('answers repeats from the cache: hits for 60 s, misses for 10 s', async () => {
    const { svc, lookups } = setup();
    await svc.bySubdomain('greenvalley');
    await svc.bySubdomain('greenvalley');
    await svc.bySubdomain('nosuchschool').catch(() => undefined);
    await svc.bySubdomain('nosuchschool').catch(() => undefined);
    expect(lookups).toEqual(['greenvalley', 'nosuchschool']);
    svc.t += 10_001;
    await svc.bySubdomain('nosuchschool').catch(() => undefined);
    await svc.bySubdomain('greenvalley');
    expect(lookups).toEqual(['greenvalley', 'nosuchschool', 'nosuchschool']);
    svc.t += 50_000;
    await svc.bySubdomain('greenvalley');
    expect(lookups).toHaveLength(4);
  });

  it('invalidate makes a rename or a suspension visible at once', async () => {
    const { svc, rows } = setup();
    await svc.bySubdomain('greenvalley');
    rows[0]!.subscriptionStatus = 'SUSPENDED';
    await expect(svc.bySubdomain('greenvalley')).resolves.toBeDefined(); // still cached
    svc.invalidate('GreenValley');
    await expect(svc.bySubdomain('greenvalley')).rejects.toMatchObject(notFound);
  });

  it('spraying random names cannot grow the cache without bound or reach the database more than once per name per 10 s', async () => {
    const { svc, lookups } = setup();
    for (let i = 0; i < 6_000; i++) await svc.bySubdomain(`spray${i}x`).catch(() => undefined);
    expect(lookups).toHaveLength(6_000);
    expect((svc as unknown as { cache: Map<string, unknown> }).cache.size).toBeLessThanOrEqual(5_000);
    for (let i = 5_500; i < 5_600; i++) await svc.bySubdomain(`spray${i}x`).catch(() => undefined); // recent ones are still cached
    expect(lookups).toHaveLength(6_000);
  });
});
