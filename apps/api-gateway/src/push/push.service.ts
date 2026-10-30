import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DATABASE, type Database } from '@oruschools/database';
import { dashed } from '../common/uuid.js';
import type { Env } from '../config/env.js';
import { categoryOf } from '../notifications/notification-rules.js';
import { PUSH_SENDER, type PushSender } from './push.types.js';

const DEBOUNCE_MS = 750;
const BATCH = 50;

/**
 * Turns a new notice into a push to the phones of whoever it is for (P4-S2). It runs AFTER the request that caused the notice has
 * answered, for the school that request acted in, so it can never delay or undo the cause: a failing provider costs a push, not a notice.
 *
 * At most once: a notice is claimed in the database first (one instance gets the claim), then sent. A notice is only pushed within
 * `PUSH_WINDOW_MINUTES` of being written, so a gateway that was down does not send an hour-old notice as if it were new.
 */
@Injectable()
export class PushService {
  private readonly log = new Logger(PushService.name);
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(PUSH_SENDER) private readonly sender: PushSender,
    private readonly config: ConfigService<Env, true>,
  ) {}

  get enabled(): boolean {
    return this.config.get('PUSH_ENABLED', { infer: true });
  }

  /** Asks for a flush soon; many writes in a moment become one. Does nothing when push is off. */
  schedule(schoolId: string): void {
    if (!this.enabled || this.timers.has(schoolId)) return;
    const t = setTimeout(() => {
      this.timers.delete(schoolId);
      this.flush(schoolId).catch((e) => this.log.warn(`push flush failed for a school: ${(e as Error).message}`));
    }, DEBOUNCE_MS);
    t.unref();
    this.timers.set(schoolId, t);
  }

  /** Sends what is new for one school. Returns how many notices this instance claimed and how many pushes it sent. */
  async flush(schoolId: string): Promise<{ claimed: number; sent: number }> {
    const windowMs = this.config.get('PUSH_WINDOW_MINUTES', { infer: true }) * 60_000;
    const since = new Date(Date.now() - windowMs).toISOString();
    const rows = (await this.db.listUnpushedNotifications({ schoolId, since, limit: BATCH })).data.notifications;
    let claimed = 0;
    let sent = 0;
    for (const n of rows) {
      try {
        const claim = await this.db.claimNotificationPush({ schoolId, id: n.id });
        if (claim.data.notification_updateMany !== 1) continue; // another instance has it
        claimed++;
        sent += await this.push(schoolId, n);
      } catch (e) {
        this.log.warn(`push for one notice failed: ${(e as Error).message}`);
      }
    }
    return { claimed, sent };
  }

  private async recipients(schoolId: string, n: { audienceRole?: string | null; recipientStaff?: { userId?: string | null } | null; recipientUser?: { id?: string | null } | null }): Promise<string[]> {
    if (n.recipientStaff?.userId) return [n.recipientStaff.userId];
    if (n.recipientUser?.id) return [n.recipientUser.id]; // a person with no staff record, such as a parent
    if (!n.audienceRole) return [];
    const members = (await this.db.listMemberships({ schoolId })).data.schoolMembers;
    return members.filter((m) => m.status === 'ACTIVE' && m.schoolRole === n.audienceRole).map((m) => m.user.id);
  }

  private async push(schoolId: string, n: { id: string; kind: string; audienceRole?: string | null; recipientStaff?: { userId?: string | null } | null; recipientUser?: { id?: string | null } | null }): Promise<number> {
    const category = categoryOf(n.kind);
    let users = await this.recipients(schoolId, n);
    if (category && users.length) {
      // Someone who switched this kind of notice off is not buzzed for it either.
      const muted = await Promise.all(users.map(async (u) => ((await this.db.listNotificationMutes({ schoolId, userId: u })).data.notificationMutes.some((m) => m.category === category) ? u : null)));
      const off = new Set(muted.filter((u): u is string => u !== null));
      users = users.filter((u) => !off.has(u));
    }
    if (!users.length) return 0;
    const devices = (await this.db.listDevicesForUsers({ schoolId, userIds: users })).data.deviceTokens;
    if (!devices.length) return 0;
    const result = await this.sender.send(devices.map((d) => ({ token: d.token, platform: d.platform, data: { type: 'notice' as const, noticeId: dashed(n.id), schoolId } })));
    const dead = new Set(result.invalidTokens);
    const ids = devices.filter((d) => dead.has(d.token)).map((d) => d.id);
    if (ids.length) await this.db.removeDevicesById({ ids });
    return devices.length - ids.length;
  }
}
