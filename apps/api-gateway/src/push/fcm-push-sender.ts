import type { PushMessage, PushResult, PushSender } from './push.types.js';

/** The part of firebase-admin's messaging this uses, so tests can stand in for it. */
export interface MessagingLike {
  sendEach(messages: Array<Record<string, unknown>>): Promise<{ responses: Array<{ success: boolean; error?: { code?: string } }> }>;
}

const DEAD = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 'messaging/invalid-argument']);

/** Firebase Cloud Messaging. Data-only messages: no title or body, because the words depend on the reader's language and are fetched by the app. */
export class FcmPushSender implements PushSender {
  constructor(private readonly messaging: MessagingLike) {}

  async send(messages: PushMessage[]): Promise<PushResult> {
    const invalidTokens: string[] = [];
    // The provider takes at most 500 messages in one call.
    for (let i = 0; i < messages.length; i += 500) {
      const batch = messages.slice(i, i + 500);
      const res = await this.messaging.sendEach(batch.map((m) => ({
        token: m.token,
        data: { type: m.data.type, noticeId: m.data.noticeId, schoolId: m.data.schoolId },
        android: { priority: 'high' },
        // A silent push the app wakes for, never a visible one: iOS shows nothing until the app has fetched the words in the person's language.
        apns: { headers: { 'apns-push-type': 'background', 'apns-priority': '5' }, payload: { aps: { 'content-available': 1 } } },
      })));
      res.responses.forEach((r, n) => {
        if (!r.success && r.error?.code && DEAD.has(r.error.code)) invalidTokens.push(batch[n]!.token);
      });
    }
    return { invalidTokens };
  }
}
