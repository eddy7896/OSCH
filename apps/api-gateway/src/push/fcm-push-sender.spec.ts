import { describe, expect, it } from 'vitest';
import { FcmPushSender, type MessagingLike } from './fcm-push-sender.js';
import type { PushMessage } from './push.types.js';

const msg = (n: number): PushMessage => ({ token: `token-${n}-aaaaaaaa`, platform: n % 2 ? 'IOS' : 'ANDROID', data: { type: 'notice', noticeId: 'n1', schoolId: 's1' } });

describe('FcmPushSender', () => {
  it('sends data only: the ids and nothing a person could read (the words are fetched in their language)', async () => {
    const seen: Array<Record<string, unknown>> = [];
    const messaging: MessagingLike = { sendEach: async (m) => (seen.push(...m), { responses: m.map(() => ({ success: true })) }) };
    await new FcmPushSender(messaging).send([msg(1)]);
    const m = seen[0]!;
    expect(m['data']).toEqual({ type: 'notice', noticeId: 'n1', schoolId: 's1' });
    expect(m['notification']).toBeUndefined();
    expect(JSON.stringify(m)).not.toMatch(/title|body/i);
    expect((m['apns'] as { headers: Record<string, string> }).headers['apns-push-type']).toBe('background');
  });

  it('reports exactly the tokens the provider says are dead, and not tokens that failed for other reasons', async () => {
    const messaging: MessagingLike = {
      sendEach: async (m) => ({
        responses: m.map((x) => {
          const t = x['token'] as string;
          if (t.startsWith('token-1')) return { success: false, error: { code: 'messaging/registration-token-not-registered' } };
          if (t.startsWith('token-2')) return { success: false, error: { code: 'messaging/internal-error' } };
          return { success: true };
        }),
      }),
    };
    const r = await new FcmPushSender(messaging).send([msg(1), msg(2), msg(3)]);
    expect(r.invalidTokens).toEqual(['token-1-aaaaaaaa']);
  });

  it('sends in batches of at most 500', async () => {
    const sizes: number[] = [];
    const messaging: MessagingLike = { sendEach: async (m) => (sizes.push(m.length), { responses: m.map(() => ({ success: true })) }) };
    await new FcmPushSender(messaging).send(Array.from({ length: 1203 }, (_, i) => msg(i)));
    expect(sizes).toEqual([500, 500, 203]);
  });

  it('a provider that throws throws to the caller (the dispatcher treats it as not sent)', async () => {
    await expect(new FcmPushSender({ sendEach: async () => { throw new Error('down'); } }).send([msg(1)])).rejects.toThrow('down');
  });
});
