import { nextCursor } from '../common/updated-since.js';
import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { getMessages, isRtl, matchLanguageTag } from '@oruschools/i18n';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import type { NotificationListDto, PreferenceListDto, ReadAllDto } from './dto/notifications.dto.js';
import { categoryOf, CATEGORIES, render } from './notification-rules.js';

const notFound = () => new ApiException(ErrorCode.NOT_FOUND, 404);
const WINDOW = 200;
const BATCH = 20;

/** The in-app inbox (P3-9). A user reads only their own: the ones addressed to their staff record and the ones addressed to their role. The words are made here, in their language. */
@Injectable()
export class NotificationsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  private async language(t: TenantContext): Promise<string> {
    const [user, school] = await Promise.all([this.db.getUser({ id: t.userId }), this.db.getSchoolProfile({ schoolId: t.schoolId })]);
    return matchLanguageTag(user.data.user?.language ?? school.data.school?.defaultLanguage ?? 'en') ?? 'en';
  }
  private async muted(t: TenantContext): Promise<Set<string>> {
    return new Set((await this.db.listNotificationMutes({ schoolId: t.schoolId, userId: t.userId })).data.notificationMutes.map((m) => m.category));
  }
  private async rows(t: TenantContext, updatedSince?: string) {
    return (await this.db.listNotifications({ schoolId: t.schoolId, userId: t.userId, role: t.schoolRole as never, limit: WINDOW, ...(updatedSince ? { updatedSince } : {}) })).data.notifications;
  }

  async list(t: TenantContext, unreadOnly = false, limit = 50, updatedSince?: string): Promise<NotificationListDto> {
    const [rows, muted, code] = await Promise.all([this.rows(t, updatedSince), this.muted(t), this.language(t)]);
    const messages = getMessages(code), english = getMessages('en');
    const shown = rows.filter((n) => { const c = categoryOf(n.kind); return !c || !muted.has(c); }).map((n) => {
      const words = render(n.kind, n.params, messages, english, isRtl(code));
      return { id: dashed(n.id), kind: n.kind, category: categoryOf(n.kind) ?? 'other', title: words.title, body: words.body, createdAt: n.createdAt, read: n.reads.length > 0, entityType: n.entityType ?? null, entityId: n.entityId ?? null };
    });
    return { unreadCount: shown.filter((n) => !n.read).length, items: shown.filter((n) => !unreadOnly || !n.read).slice(0, limit), next: nextCursor(rows.map((n) => ({ updatedAt: n.createdAt })), updatedSince) };
  }

  async markRead(t: TenantContext, id: string): Promise<void> {
    try {
      await this.db.markNotificationRead({ schoolId: t.schoolId, notificationId: dashed(id), role: t.schoolRole as never, actorId: t.userId });
    } catch (e) {
      if ((e as { kind?: string }).kind === 'FORBIDDEN_REFERENCE') throw notFound(); // someone else's looks exactly like one that does not exist
      throw e;
    }
  }

  async markAllRead(t: TenantContext): Promise<ReadAllDto> {
    const unread = (await this.rows(t)).filter((n) => n.reads.length === 0);
    for (let i = 0; i < unread.length; i += BATCH) await Promise.all(unread.slice(i, i + BATCH).map((n) => this.markRead(t, n.id)));
    return { marked: unread.length };
  }

  async preferences(t: TenantContext): Promise<PreferenceListDto> {
    const muted = await this.muted(t);
    return { items: CATEGORIES.map((category) => ({ category, enabled: !muted.has(category) })) };
  }
  async setPreference(t: TenantContext, category: string, enabled: boolean): Promise<PreferenceListDto> {
    if (enabled) await this.db.unmuteNotificationCategory({ schoolId: t.schoolId, category, actorId: t.userId }).catch(() => undefined); // already on is fine
    else await this.db.muteNotificationCategory({ schoolId: t.schoolId, category, actorId: t.userId });
    return this.preferences(t);
  }
}
