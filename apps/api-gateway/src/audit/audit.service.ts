import { Inject, Injectable, Logger } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { SCHOOL_HEADER } from '../tenant/tenant.guard.js';
import type { DeniedRequest, SecurityEvents } from './security-events.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_DB_EVENTS_PER_ACTOR_PER_MINUTE = 30;

/**
 * Records security events. Every one is a structured log line; a 403 for an AUTHENTICATED caller on a matched route is also
 * stored in the audit log (action `security.denied`) so a System Admin can see attempts such as a role-change by someone
 * who may not. Rules:
 *  - never payloads, tokens or headers: only request id, route template, status, code and (for permission denials) the
 *    resource and action that were required;
 *  - the school on the row is the VERIFIED tenant, if the request got that far; a school id the client merely claimed goes
 *    into `details.attemptedSchoolId` (only if it is a UUID), never into the school column;
 *  - best effort and off the response path: a failing write is logged, never turns a 403 into a 500;
 *  - capped per actor per minute so a flood of denied calls cannot fill the table (the log line is still written).
 */
@Injectable()
export class AuditService implements SecurityEvents {
  private readonly logger = new Logger('Audit');
  private readonly windows = new Map<string, { start: number; count: number }>();

  constructor(@Inject(DATABASE) private readonly db: Database) {}

  protected now(): number {
    return Date.now();
  }

  securityEvent(req: DeniedRequest, status: number, code: string): void {
    try {
      this.record(req, status, code);
    } catch (error) {
      // Auditing must never change the answer to the client: a broken audit path is logged, the 401/403 still goes out.
      this.logger.error({ error: error instanceof Error ? error.name : 'unknown' }, 'security event failed');
    }
  }

  private record(req: DeniedRequest, status: number, code: string): void {
    const route = typeof req.route?.path === 'string' ? req.route.path : undefined;
    const base = { event: 'security', uid: req.user?.uid, schoolId: req.tenant?.schoolId, method: req.method, route, status, code, resource: req.denial?.resource, action: req.denial?.action };
    this.logger.warn(base, 'security event');

    if (status !== 403 || !req.user || !route) return;
    if (!this.underCap(req.user.uid)) return;

    const claimed = req.headers?.[SCHOOL_HEADER];
    void this.db
      .createAuditLog({
        schoolId: req.tenant?.schoolId ?? null,
        actorId: req.user.uid,
        action: 'security.denied',
        entityType: 'Route',
        entityId: `${req.method} ${route}`.slice(0, 200),
        details: { code, status, resource: req.denial?.resource, requiredAction: req.denial?.action, attemptedSchoolId: typeof claimed === 'string' && UUID.test(claimed) ? claimed.toLowerCase() : undefined },
      })
      .catch((error: unknown) => this.logger.error({ uid: req.user?.uid, error: error instanceof Error ? error.name : 'unknown' }, 'could not store security event'));
  }

  private underCap(actor: string): boolean {
    const t = this.now();
    const w = this.windows.get(actor);
    if (!w || t - w.start >= 60_000) {
      if (this.windows.size > 5_000) this.windows.clear();
      this.windows.set(actor, { start: t, count: 1 });
      return true;
    }
    w.count += 1;
    return w.count <= MAX_DB_EVENTS_PER_ACTOR_PER_MINUTE;
  }
}
