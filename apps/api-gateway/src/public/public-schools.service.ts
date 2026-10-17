import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import { subdomainProblem } from '../platform/subdomain.js';
import type { PublicSchoolDto } from './dto/public-school.dto.js';

const MAX_ENTRIES = 5_000;
const HIT_TTL_MS = 60_000;
const MISS_TTL_MS = 10_000;

/**
 * The one unauthenticated read in the API: "which school is this address?", so a school's login page can show its name.
 * Deliberately minimal and deliberately boring:
 *  - id, name, subdomain and default language only: no status, dates, contact or counts;
 *  - a malformed name, a reserved name, an unknown school and a SUSPENDED school are indistinguishable (the same 404), so it
 *    can not be used to learn which schools exist beyond what their public address already says, or which are suspended;
 *  - repeated lookups are answered from a short in-memory cache (bounded, so spraying random names cannot grow it or hammer
 *    the database); platform changes to a school clear its entry at once on this instance.
 */
@Injectable()
export class PublicSchoolsService {
  private readonly cache = new Map<string, { value: PublicSchoolDto | null; expires: number }>();

  constructor(@Inject(DATABASE) private readonly db: Database) {}

  protected now(): number {
    return Date.now();
  }

  async bySubdomain(raw: string): Promise<PublicSchoolDto> {
    const sub = raw.toLowerCase();
    if (subdomainProblem(sub)) throw this.notFound(); // never reaches the database or the cache

    const hit = this.cache.get(sub);
    if (hit && hit.expires > this.now()) {
      if (!hit.value) throw this.notFound();
      return hit.value;
    }
    this.cache.delete(sub);

    const row = (await this.db.getSchoolBySubDomain({ subDomain: sub })).data.schools[0];
    const value: PublicSchoolDto | null = row && row.subscriptionStatus !== 'SUSPENDED' ? { id: dashed(row.id), name: row.name, subDomain: row.subDomain, defaultLanguage: row.defaultLanguage } : null;
    if (this.cache.size >= MAX_ENTRIES) this.cache.delete(this.cache.keys().next().value as string);
    this.cache.set(sub, { value, expires: this.now() + (value ? HIT_TTL_MS : MISS_TTL_MS) });
    if (!value) throw this.notFound();
    return value;
  }

  /** Called when a platform administrator creates, renames or suspends a school. */
  invalidate(subDomain: string): void {
    this.cache.delete(subDomain.toLowerCase());
  }

  private notFound() {
    return new ApiException(ErrorCode.NOT_FOUND, 404);
  }
}
