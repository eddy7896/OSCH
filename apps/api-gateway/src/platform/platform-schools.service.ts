import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DATABASE, type Database } from '@oruschools/database';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import { MembershipService } from '../tenant/membership.service.js';
import { UserSyncService } from '../users/user-sync.service.js';
import type { CreateSchoolDto } from './dto/create-school.dto.js';
import type { SchoolDto, SchoolPageDto } from './dto/school.dto.js';
import type { UpdateSchoolDto } from './dto/update-school.dto.js';

type Row = { id: string; name: string; subDomain: string; subscriptionStatus: string; defaultLanguage: string; createdAt: string };
const view = (r: Row): SchoolDto => ({ id: dashed(r.id), name: r.name, subDomain: r.subDomain, status: r.subscriptionStatus, defaultLanguage: r.defaultLanguage, createdAt: r.createdAt });

/**
 * Platform-level school management (SUPER_ADMIN, `/v1/platform/schools`). Every state change is one audited Data Connect
 * mutation (the audit row is written in the same transaction); the actor's User row is made sure of first because the
 * audit insert references it.
 */
@Injectable()
export class PlatformSchoolsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly users: UserSyncService,
    private readonly memberships: MembershipService,
  ) {}

  async list(limit = 25, offset = 0): Promise<SchoolPageDto> {
    const rows = (await this.db.listSchools({ limit, offset })).data.schools;
    return { items: rows.map(view), limit, offset };
  }

  async get(id: string): Promise<SchoolDto> {
    const row = (await this.db.getSchool({ schoolId: id })).data.school;
    if (!row) throw new ApiException(ErrorCode.NOT_FOUND, 404);
    return view(row);
  }

  async create(actor: AuthenticatedUser, dto: CreateSchoolDto): Promise<SchoolDto> {
    await this.users.sync(actor);
    const id = randomUUID();
    // A taken subdomain is a unique violation inside the transaction: DatabaseError CONFLICT -> 409, and no audit row is left behind.
    await this.db.provisionSchool({ id, name: dto.name, subDomain: dto.subDomain, defaultLanguage: dto.defaultLanguage, actorId: actor.uid, details: { name: dto.name, subDomain: dto.subDomain, defaultLanguage: dto.defaultLanguage } });
    return this.get(id);
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateSchoolDto): Promise<SchoolDto> {
    if (dto.name === undefined && dto.defaultLanguage === undefined) throw new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field: 'name', rule: 'atLeastOneField' }]);
    const current = await this.get(id);
    await this.users.sync(actor);
    await this.db.updateSchool({
      schoolId: id,
      name: dto.name ?? current.name,
      defaultLanguage: dto.defaultLanguage ?? current.defaultLanguage,
      actorId: actor.uid,
      details: { ...(dto.name !== undefined && { name: dto.name }), ...(dto.defaultLanguage !== undefined && { defaultLanguage: dto.defaultLanguage }) },
    });
    return this.get(id);
  }

  /** Suspending denies every tenant route of the school (403 SCHOOL_SUSPENDED); activating restores it. Idempotent: no change, no audit row. */
  async setStatus(actor: AuthenticatedUser, id: string, status: 'SUSPENDED' | 'ACTIVE', reason: string | undefined): Promise<SchoolDto> {
    const current = await this.get(id);
    if (current.status === status) return current;
    await this.users.sync(actor);
    await this.db.setSubscriptionStatus({ schoolId: id, status: status as never, actorId: actor.uid, details: { status, from: current.status, ...(reason && { reason }) } });
    this.memberships.invalidateSchool(id); // this instance stops honouring cached allows at once; other instances within TENANT_CACHE_TTL_MS
    return this.get(id);
  }
}
