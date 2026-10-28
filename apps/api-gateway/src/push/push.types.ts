/** One push to one phone. Only ids travel (ADR-0014 decision 7): the words are fetched from the inbox, in the reader's language, once the app is open. */
export interface PushMessage {
  token: string;
  platform: 'IOS' | 'ANDROID';
  data: { type: 'notice'; noticeId: string; schoolId: string };
}

export interface PushResult {
  /** Tokens the provider says are dead (the app was removed, the token rotated): the gateway forgets them. */
  invalidTokens: string[];
}

/** Sends pushes. [FcmPushSender] is the real one, [NoopPushSender] stands in when push is off, tests give their own. A sender may throw; the caller treats that as "not sent". */
export interface PushSender {
  send(messages: PushMessage[]): Promise<PushResult>;
}

// Symbol.for: the same token even when a test reloads the modules to boot with other settings.
export const PUSH_SENDER = Symbol.for('oruschools.PUSH_SENDER');

export class NoopPushSender implements PushSender {
  async send(): Promise<PushResult> {
    return { invalidTokens: [] };
  }
}
