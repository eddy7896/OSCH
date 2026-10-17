import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { DEFAULT_LOCALE } from '@oruschools/i18n';
import { isRole, navigationFor, permissionsOf, type Subject } from '@oruschools/rbac';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import type { AccessDto, MeResponseDto } from './dto/me-response.dto.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bare = (id: string) => id.replaceAll('-', '').toLowerCase(); // Data Connect returns uuids without dashes

function accessFor(subject: Subject): AccessDto {
  const permissions: Record<string, Record<string, string>> = {};
  for (const p of permissionsOf(subject)) (permissions[p.resource] ??= {})[p.action] = p.scope;
  return { permissions, navigation: navigationFor(subject).map((s) => ({ title: s.title, items: s.items.map((i) => ({ key: i.key, label: i.label })) })) };
}

@Injectable()
export class MeService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Creates or refreshes the global User row from the VERIFIED token (first sign-in, or the email changed in Firebase). */
  private async syncUser(user: AuthenticatedUser) {
    const email = user.email ?? `${user.uid}@no-email.invalid`; // phone-only sign-in has no email; User.email is required; .invalid is reserved (RFC 2606)
    const row = (await this.db.getUser({ id: user.uid })).data.user;
    if (row && row.email === email) return row;
    await this.db.upsertUser({ id: user.uid, email });
    return (await this.db.getUser({ id: user.uid })).data.user!;
  }

  async me(user: AuthenticatedUser, claimedSchoolId: string | undefined): Promise<MeResponseDto> {
    const row = await this.syncUser(user);
    const memberships = (await this.db.listMembershipsForUser({ userId: user.uid })).data.schoolMembers;

    const mapped = memberships.map((m) => ({
      school: { id: m.school.id, name: m.school.name, subDomain: m.school.subDomain, defaultLanguage: m.school.defaultLanguage, status: m.school.subscriptionStatus as string },
      role: m.schoolRole as string,
      status: m.status as string,
    }));

    // The active school is only ever a school the caller is verified in; anything else is silently null (no hint about existence).
    let active: MeResponseDto['activeSchool'] = null;
    if (claimedSchoolId && UUID.test(claimedSchoolId)) {
      const hit = mapped.find((m) => bare(m.school.id) === bare(claimedSchoolId));
      if (hit && hit.status === 'ACTIVE' && hit.school.status !== 'SUSPENDED' && isRole(hit.role)) {
        const access = accessFor({ schoolRole: hit.role });
        active = { schoolId: claimedSchoolId.toLowerCase(), role: hit.role, permissions: access.permissions, navigation: access.navigation };
      }
    }

    const activeDefault = active ? mapped.find((m) => bare(m.school.id) === bare(active!.schoolId))?.school.defaultLanguage : undefined;
    return {
      user: { id: row.id, email: row.email, displayName: row.displayName ?? null, globalRole: user.globalRole },
      memberships: mapped,
      activeSchool: active,
      platform: user.globalRole === 'SUPER_ADMIN' ? accessFor({ globalRole: 'SUPER_ADMIN' }) : null,
      language: { chosen: row.language ?? null, effective: row.language ?? activeDefault ?? DEFAULT_LOCALE },
    };
  }

  async setLanguage(user: AuthenticatedUser, language: string | null): Promise<{ language: string | null }> {
    await this.syncUser(user); // the row must exist before it can be updated
    await this.db.setUserLanguage({ userId: user.uid, language });
    return { language };
  }
}
