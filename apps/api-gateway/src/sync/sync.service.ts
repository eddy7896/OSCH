import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { authorize, type Resource, type Scope } from '@oruschools/rbac';
import { dashed } from '../common/uuid.js';
import { TeachingScope } from '../teaching/teaching-scope.service.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import type { TombstoneListDto } from './dto/sync.dto.js';
import { TOMBSTONE_TYPES } from './dto/sync.dto.js';

/** The resource whose read grant lets a caller hear that a record of this type was removed. */
const RESOURCE_OF: Record<string, Resource> = { TimetableEntry: 'academics', Substitution: 'academics', AttendanceMark: 'attendance', Mark: 'grades' };

/**
 * Sync groundwork (P3-10, ADR-0013 decision 9): what a device that was offline needs to learn that a record is gone. A removal leaves a tombstone, written in the same
 * transaction. A caller hears only about types they may read, and at own or linked scope only about their own classes and cover duties. The engine itself is Phase 4.
 */
@Injectable()
export class SyncService {
  constructor(@Inject(DATABASE) private readonly db: Database, private readonly scope: TeachingScope) {}

  async tombstones(t: TenantContext, since: string, entityType: string | undefined, limit = 500): Promise<TombstoneListDto> {
    const allowed = TOMBSTONE_TYPES.filter((type) => (!entityType || entityType === type) && authorize({ schoolRole: t.schoolRole }, RESOURCE_OF[type]!, 'read').allowed);
    const rows = (await this.db.listTombstones({ schoolId: t.schoolId, since, ...(entityType ? { entityType } : {}), limit: limit + 1 })).data.tombstones.filter((r) => (allowed as readonly string[]).includes(r.entityType));
    const scopeOf = (type: string): Scope => { const d = authorize({ schoolRole: t.schoolRole }, RESOURCE_OF[type]!, 'read'); return d.allowed ? d.scope : 'own'; };
    const mine = (await this.scope.mine(t)).staff?.id ?? null;
    const classes = new Map<Scope, Set<string> | null>();
    for (const sc of new Set(allowed.map(scopeOf))) classes.set(sc, await this.scope.visibleClassIds(t, sc));
    const visible = rows.filter((r) => {
      const sc = scopeOf(r.entityType);
      if (sc === 'school') return true;
      const ok = classes.get(sc);
      const inClass = !!r.classroomId && !!ok && ok.has(dashed(r.classroomId));
      const mineDuty = sc === 'own' && !!mine && !!r.staffId && dashed(r.staffId) === dashed(mine);
      return inClass || mineDuty;
    });
    const page = visible.slice(0, limit);
    // a page ends where its last row ends in the database, so a filtered-out row is never skipped over twice
    const read = rows.length > limit ? rows.slice(0, limit) : rows;
    const next = read.length ? read[read.length - 1]!.deletedAt : since;
    return { items: page.map((r) => ({ id: dashed(r.id), entityType: r.entityType, entityId: dashed(r.entityId), classId: r.classroomId ? dashed(r.classroomId) : null, staffId: r.staffId ? dashed(r.staffId) : null, deletedAt: r.deletedAt })), next, more: rows.length > limit };
  }
}
