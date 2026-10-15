import { DatabaseError } from '@oruschools/database';
import { MembershipService } from './membership.service.js';

type Row = { schoolRole: string; status: string; school: { subscriptionStatus: string } };
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

class Clocked extends MembershipService {
  t = 1_000;
  protected override now() {
    return this.t;
  }
}

function make(ttl = 30_000) {
  const rows = new Map<string, Row>();
  const calls: string[] = [];
  const db = {
    getMembership: async ({ schoolId, userId }: { schoolId: string; userId: string }) => {
      calls.push(`${schoolId}:${userId}`);
      const row = rows.get(`${schoolId}:${userId}`);
      return { data: { schoolMembers: row ? [row] : [] } };
    },
  };
  const svc = new Clocked(db as never, { get: () => ttl } as never);
  const put = (schoolId: string, userId: string, over: Partial<Row> = {}) => rows.set(`${schoolId}:${userId}`, { schoolRole: 'TEACHER', status: 'ACTIVE', school: { subscriptionStatus: 'ACTIVE' }, ...over });
  return { svc, put, rows, calls };
}

describe('MembershipService', () => {
  it('allows an active member of an active school with their role', async () => {
    const { svc, put } = make();
    put(A, 'u1');
    expect(await svc.decide(A, 'u1')).toEqual({ kind: 'active', schoolRole: 'TEACHER' });
  });

  it.each([
    ['no membership', undefined],
    ['suspended member', { status: 'SUSPENDED' }],
    ['unknown role string', { schoolRole: 'GOD' }],
    ['empty role', { schoolRole: '' }],
  ])('denies %s', async (_n, over) => {
    const { svc, put } = make();
    if (over) put(A, 'u1', over);
    expect(await svc.decide(A, 'u1')).toEqual({ kind: 'denied' });
  });

  it('reports a suspended school only for a genuine active member', async () => {
    const { svc, put } = make();
    put(A, 'u1', { school: { subscriptionStatus: 'SUSPENDED' } });
    expect(await svc.decide(A, 'u1')).toEqual({ kind: 'school_suspended', schoolRole: 'TEACHER' });
    put(A, 'u2', { school: { subscriptionStatus: 'SUSPENDED' }, status: 'SUSPENDED' });
    expect(await svc.decide(A, 'u2')).toEqual({ kind: 'denied' });
  });

  it('allows a TRIAL school', async () => {
    const { svc, put } = make();
    put(A, 'u1', { school: { subscriptionStatus: 'TRIAL' } });
    expect((await svc.decide(A, 'u1')).kind).toBe('active');
  });

  it('caches an allow for the TTL, then asks the database again', async () => {
    const { svc, put, calls } = make(30_000);
    put(A, 'u1');
    await svc.decide(A, 'u1');
    await svc.decide(A, 'u1');
    expect(calls).toHaveLength(1);
    svc.t += 30_001;
    await svc.decide(A, 'u1');
    expect(calls).toHaveLength(2);
  });

  it('never caches a denial, so a new membership works immediately', async () => {
    const { svc, put, calls } = make();
    expect((await svc.decide(A, 'u1')).kind).toBe('denied');
    put(A, 'u1');
    expect((await svc.decide(A, 'u1')).kind).toBe('active');
    expect(calls).toHaveLength(2);
  });

  it('keys the cache by school AND user: an allow in A is not an allow in B', async () => {
    const { svc, put } = make();
    put(A, 'u1');
    expect((await svc.decide(A, 'u1')).kind).toBe('active');
    expect((await svc.decide(B, 'u1')).kind).toBe('denied');
    expect((await svc.decide(A, 'u2')).kind).toBe('denied');
  });

  it('invalidate and invalidateSchool take effect at once', async () => {
    const { svc, put, rows } = make();
    put(A, 'u1');
    put(A, 'u2');
    await svc.decide(A, 'u1');
    await svc.decide(A, 'u2');
    rows.get(`${A}:u1`)!.status = 'SUSPENDED';
    svc.invalidate(A, 'u1');
    expect((await svc.decide(A, 'u1')).kind).toBe('denied');
    expect((await svc.decide(A, 'u2')).kind).toBe('active'); // still cached
    rows.get(`${A}:u2`)!.school.subscriptionStatus = 'SUSPENDED';
    svc.invalidateSchool(A);
    expect((await svc.decide(A, 'u2')).kind).toBe('school_suspended');
  });

  it('TTL 0 disables the cache', async () => {
    const { svc, put, calls } = make(0);
    put(A, 'u1');
    await svc.decide(A, 'u1');
    await svc.decide(A, 'u1');
    expect(calls).toHaveLength(2);
  });

  it('lets a database failure propagate (fail closed), never an allow', async () => {
    const svc = new Clocked({ getMembership: async () => Promise.reject(new DatabaseError('UNAVAILABLE')) } as never, { get: () => 30_000 } as never);
    await expect(svc.decide(A, 'u1')).rejects.toMatchObject({ kind: 'UNAVAILABLE' });
  });
});
