import { describe, expect, it, vi } from 'vitest';
import { PushService } from './push.service.js';
import type { PushMessage, PushSender } from './push.types.js';

interface N { id: string; kind: string; audienceRole?: string | null; recipientStaff?: { userId?: string | null } | null }

function rig(opts: { notices: N[]; claim?: (id: string) => number; members?: Array<{ status: string; schoolRole: string; user: { id: string } }>; muted?: Record<string, string[]>; devices?: Array<{ id: string; token: string; platform: 'IOS' | 'ANDROID'; userId: string }>; enabled?: boolean; send?: PushSender['send'] }) {
  const sent: PushMessage[] = [];
  const removed: string[][] = [];
  const sender: PushSender = { send: opts.send ?? (async (m) => (sent.push(...m), { invalidTokens: [] })) };
  const db = {
    listUnpushedNotifications: async () => ({ data: { notifications: opts.notices } }),
    claimNotificationPush: async ({ id }: { id: string }) => ({ data: { notification_updateMany: opts.claim ? opts.claim(id) : 1 } }),
    listMemberships: async () => ({ data: { schoolMembers: opts.members ?? [] } }),
    listNotificationMutes: async ({ userId }: { userId: string }) => ({ data: { notificationMutes: (opts.muted?.[userId] ?? []).map((category) => ({ category })) } }),
    listDevicesForUsers: async ({ userIds }: { userIds: string[] }) => ({ data: { deviceTokens: (opts.devices ?? []).filter((d) => userIds.includes(d.userId)) } }),
    removeDevicesById: async ({ ids }: { ids: string[] }) => (removed.push(ids), { data: {} }),
  };
  const config = { get: (k: string) => (k === 'PUSH_ENABLED' ? opts.enabled ?? true : 10) };
  return { svc: new PushService(db as never, sender, config as never), sent, removed };
}

const dev = (user: string, n = 1) => ({ id: `d-${user}-${n}`, token: `tok-${user}-${n}-aaaa`, platform: 'ANDROID' as const, userId: user });

describe('PushService.flush', () => {
  it('pushes a notice for one person to that person\'s phones, with the notice id and school only', async () => {
    const { svc, sent } = rig({ notices: [{ id: 'n1', kind: 'leave.approved', recipientStaff: { userId: 'u1' } }], devices: [dev('u1', 1), dev('u1', 2), dev('u2')] });
    expect(await svc.flush('s1')).toEqual({ claimed: 1, sent: 2 });
    expect(sent.map((m) => m.token).sort()).toEqual(['tok-u1-1-aaaa', 'tok-u1-2-aaaa']);
    expect(sent.every((m) => JSON.stringify(m.data) === JSON.stringify({ type: 'notice', noticeId: 'n1', schoolId: 's1' }))).toBe(true);
  });

  it('a notice for a role goes to the active members with that role only', async () => {
    const { svc, sent } = rig({
      notices: [{ id: 'n1', kind: 'leave.requested', audienceRole: 'PRINCIPAL' }],
      members: [{ status: 'ACTIVE', schoolRole: 'PRINCIPAL', user: { id: 'p1' } }, { status: 'SUSPENDED', schoolRole: 'PRINCIPAL', user: { id: 'p2' } }, { status: 'ACTIVE', schoolRole: 'TEACHER', user: { id: 't1' } }],
      devices: [dev('p1'), dev('p2'), dev('t1')],
    });
    await svc.flush('s1');
    expect(sent.map((m) => m.token)).toEqual(['tok-p1-1-aaaa']);
  });

  it('someone who switched that category off is not pushed; others still are', async () => {
    const { svc, sent } = rig({
      notices: [{ id: 'n1', kind: 'leave.requested', audienceRole: 'PRINCIPAL' }],
      members: [{ status: 'ACTIVE', schoolRole: 'PRINCIPAL', user: { id: 'p1' } }, { status: 'ACTIVE', schoolRole: 'PRINCIPAL', user: { id: 'p2' } }],
      devices: [dev('p1'), dev('p2')],
      muted: { p1: ['leave'] },
    });
    await svc.flush('s1');
    expect(sent.map((m) => m.token)).toEqual(['tok-p2-1-aaaa']);
  });

  it('a notice another instance already claimed is not sent again (at most once)', async () => {
    const { svc, sent } = rig({ notices: [{ id: 'n1', kind: 'leave.approved', recipientStaff: { userId: 'u1' } }], devices: [dev('u1')], claim: () => 0 });
    expect(await svc.flush('s1')).toEqual({ claimed: 0, sent: 0 });
    expect(sent).toEqual([]);
  });

  it('tokens the provider says are dead are forgotten, and are not counted as sent', async () => {
    const { svc, removed } = rig({ notices: [{ id: 'n1', kind: 'leave.approved', recipientStaff: { userId: 'u1' } }], devices: [dev('u1', 1), dev('u1', 2)], send: async () => ({ invalidTokens: ['tok-u1-2-aaaa'] }) });
    expect(await svc.flush('s1')).toEqual({ claimed: 1, sent: 1 });
    expect(removed).toEqual([['d-u1-2']]);
  });

  it('a provider that fails costs the push only: flush does not throw, and the next notice is still handled', async () => {
    let calls = 0;
    const { svc } = rig({
      notices: [{ id: 'n1', kind: 'leave.approved', recipientStaff: { userId: 'u1' } }, { id: 'n2', kind: 'leave.approved', recipientStaff: { userId: 'u1' } }],
      devices: [dev('u1')],
      send: async () => { calls++; if (calls === 1) throw new Error('provider down'); return { invalidTokens: [] }; },
    });
    const r = await svc.flush('s1');
    expect(r.claimed).toBe(2);
    expect(calls).toBe(2);
  });

  it('nobody to push to, or no devices, is quietly nothing', async () => {
    expect(await rig({ notices: [{ id: 'n1', kind: 'leave.approved' }] }).svc.flush('s1')).toEqual({ claimed: 1, sent: 0 });
    expect(await rig({ notices: [{ id: 'n1', kind: 'leave.approved', recipientStaff: { userId: 'u1' } }] }).svc.flush('s1')).toEqual({ claimed: 1, sent: 0 });
  });
});

describe('PushService.schedule', () => {
  it('does nothing when push is off', () => {
    vi.useFakeTimers();
    const { svc } = rig({ notices: [], enabled: false });
    const flush = vi.spyOn(svc, 'flush');
    svc.schedule('s1');
    vi.advanceTimersByTime(5000);
    expect(flush).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('many writes in a moment become one flush per school', () => {
    vi.useFakeTimers();
    const { svc } = rig({ notices: [] });
    const flush = vi.spyOn(svc, 'flush').mockResolvedValue({ claimed: 0, sent: 0 });
    for (let i = 0; i < 20; i++) svc.schedule('s1');
    svc.schedule('s2');
    vi.advanceTimersByTime(2000);
    expect(flush.mock.calls.map((c) => c[0]).sort()).toEqual(['s1', 's2']);
    vi.useRealTimers();
  });
});
