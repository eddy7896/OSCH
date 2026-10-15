import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DATABASE, type Database } from '@oruschools/database';
import { isRole, type Role } from '@oruschools/rbac';
import type { Env } from '../config/env.js';

export type MembershipDecision =
  | { kind: 'active'; schoolRole: Role }
  | { kind: 'school_suspended'; schoolRole: Role }
  | { kind: 'denied' };

const MAX_ENTRIES = 10_000;

/**
 * Answers "may this user act in this school right now?" from the database, with a short cache of ALLOW decisions only
 * (TENANT_CACHE_TTL_MS). Anything unexpected is a denial: no row, a suspended member, an unknown role string.
 * A role or suspension change must call `invalidate` / `invalidateSchool`; otherwise it takes effect within the TTL.
 */
@Injectable()
export class MembershipService {
  private readonly cache = new Map<string, { schoolRole: Role; expires: number }>();

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly config: ConfigService<Env, true>,
  ) {}

  protected now(): number {
    return Date.now();
  }

  async decide(schoolId: string, userId: string): Promise<MembershipDecision> {
    const key = `${schoolId}:${userId}`;
    const hit = this.cache.get(key);
    if (hit && hit.expires > this.now()) return { kind: 'active', schoolRole: hit.schoolRole };
    this.cache.delete(key);

    const row = (await this.db.getMembership({ schoolId, userId })).data.schoolMembers[0];
    if (!row || row.status !== 'ACTIVE' || !isRole(row.schoolRole)) return { kind: 'denied' };
    if (row.school.subscriptionStatus === 'SUSPENDED') return { kind: 'school_suspended', schoolRole: row.schoolRole };

    const ttl = this.config.get('TENANT_CACHE_TTL_MS', { infer: true });
    if (ttl > 0) {
      if (this.cache.size >= MAX_ENTRIES) this.cache.delete(this.cache.keys().next().value as string);
      this.cache.set(key, { schoolRole: row.schoolRole, expires: this.now() + ttl });
    }
    return { kind: 'active', schoolRole: row.schoolRole };
  }

  invalidate(schoolId: string, userId: string): void {
    this.cache.delete(`${schoolId}:${userId}`);
  }

  invalidateSchool(schoolId: string): void {
    for (const key of this.cache.keys()) if (key.startsWith(`${schoolId}:`)) this.cache.delete(key);
  }
}
