import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { ApiException, ErrorCode } from '../common/errors.js';
import { MembershipService } from '../tenant/membership.service.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import type { AddMembershipDto, UpdateMembershipDto } from './dto/membership-requests.dto.js';
import type { MembershipDto, MembershipListDto } from './dto/membership.dto.js';

type Row = { schoolRole: string; status: string; createdAt: string; user: { id: string; email: string; displayName?: string | null; phoneNumber?: string | null } };
const view = (r: Row): MembershipDto => ({ userId: r.user.id, email: r.user.email, displayName: r.user.displayName ?? null, phoneNumber: r.user.phoneNumber ?? null, role: r.schoolRole, status: r.status, since: r.createdAt });

/**
 * Who may sign in to this school, and as what. Only `memberships` holders reach this (SYSTEM_ADMIN, ADR-0007: HR can
 * onboard staff profiles but cannot promote anyone). Every change is one audited mutation, scoped to the verified school.
 * Extra guard that the role matrix cannot express: nobody changes their OWN membership (no self-promotion, no self-lockout),
 * which also guarantees a school never loses its last System Admin through this API: the actor is always one.
 */
@Injectable()
export class MembershipsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly cache: MembershipService,
  ) {}

  private async rows(schoolId: string): Promise<Row[]> {
    return (await this.db.listMemberships({ schoolId })).data.schoolMembers as Row[];
  }

  async list(tenant: TenantContext): Promise<MembershipListDto> {
    return { items: (await this.rows(tenant.schoolId)).map(view) };
  }

  private async find(tenant: TenantContext, userId: string): Promise<Row> {
    const row = (await this.rows(tenant.schoolId)).find((r) => r.user.id === userId);
    if (!row) throw new ApiException(ErrorCode.NOT_FOUND, 404); // not a member of THIS school (a member of another school looks the same)
    return row;
  }

  async add(tenant: TenantContext, dto: AddMembershipDto): Promise<MembershipDto> {
    if (dto.userId === tenant.userId) throw new ApiException(ErrorCode.CANNOT_CHANGE_OWN_MEMBERSHIP, 403);
    if (!(await this.db.getUser({ id: dto.userId })).data.user) throw new ApiException(ErrorCode.NOT_FOUND, 404);
    // Already a member: unique violation inside the transaction -> DatabaseError CONFLICT -> 409, no audit row.
    await this.db.addMembership({ schoolId: tenant.schoolId, userId: dto.userId, schoolRole: dto.schoolRole as never, actorId: tenant.userId, details: { userId: dto.userId, schoolRole: dto.schoolRole } });
    this.cache.invalidate(tenant.schoolId, dto.userId);
    return view(await this.find(tenant, dto.userId));
  }

  async update(tenant: TenantContext, userId: string, dto: UpdateMembershipDto): Promise<MembershipDto> {
    if (dto.schoolRole === undefined && dto.status === undefined) throw new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field: 'schoolRole', rule: 'atLeastOneField' }]);
    if (userId === tenant.userId) throw new ApiException(ErrorCode.CANNOT_CHANGE_OWN_MEMBERSHIP, 403);
    const current = await this.find(tenant, userId);
    const next = { role: dto.schoolRole ?? current.schoolRole, status: dto.status ?? current.status };
    if (next.role === current.schoolRole && next.status === current.status) return view(current); // nothing to change: no write, no audit row
    await this.db.updateMembership({ schoolId: tenant.schoolId, userId, schoolRole: next.role as never, status: next.status as never, actorId: tenant.userId, details: { userId, from: { role: current.schoolRole, status: current.status }, to: next } });
    this.cache.invalidate(tenant.schoolId, userId); // role or suspension applies to the very next request on this instance
    return view(await this.find(tenant, userId));
  }

  async remove(tenant: TenantContext, userId: string): Promise<void> {
    if (userId === tenant.userId) throw new ApiException(ErrorCode.CANNOT_CHANGE_OWN_MEMBERSHIP, 403);
    const current = await this.find(tenant, userId);
    await this.db.removeMembership({ schoolId: tenant.schoolId, userId, actorId: tenant.userId, details: { userId, role: current.schoolRole, status: current.status } });
    this.cache.invalidate(tenant.schoolId, userId);
  }
}
