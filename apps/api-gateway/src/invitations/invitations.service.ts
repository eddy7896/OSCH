import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, DatabaseError, type Database } from '@oruschools/database';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import { MembershipService } from '../tenant/membership.service.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import { UserSyncService } from '../users/user-sync.service.js';
import type { AcceptedInvitationDto, CreatedInvitationDto, InvitationDto, InvitationListDto } from './dto/invitation.dto.js';
import type { CreateInvitationDto } from './dto/invitation-requests.dto.js';
import { hashInvitationToken, newInvitationToken } from './token.js';

type Row = { id: string; email: string; phoneNumber?: string | null; schoolRole: string; status: string; expiresAt: string; createdAt: string; acceptedAt?: string | null; createdBy: { id: string; displayName?: string | null } };
const DAY_MS = 86_400_000;

/**
 * Invitations bring a person who has no role in a school into it. Security properties:
 *  - the secret is 256 random bits, returned once to the inviter, and only its SHA-256 hash is stored;
 *  - accepting needs the secret AND a signed-in user whose VERIFIED email equals the invited address, so a leaked link
 *    alone is not enough;
 *  - the role is fixed at creation; the accepter sends nothing but the secret;
 *  - single use, expiring, revocable, and the database re-checks all of that inside the accepting transaction;
 *  - every way an invitation can be unusable (unknown, used, revoked, expired, wrong person, suspended school) gives the
 *    same answer, so the endpoint cannot be used to learn anything about schools or invitations.
 */
@Injectable()
export class InvitationsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly users: UserSyncService,
    private readonly cache: MembershipService,
  ) {}

  protected now(): Date {
    return new Date();
  }

  private view(r: Row): InvitationDto {
    const expired = r.status === 'PENDING' && new Date(r.expiresAt).getTime() <= this.now().getTime();
    return { id: dashed(r.id), email: r.email, phoneNumber: r.phoneNumber ?? null, role: r.schoolRole, status: expired ? 'EXPIRED' : r.status, expiresAt: r.expiresAt, createdAt: r.createdAt, acceptedAt: r.acceptedAt ?? null, createdBy: { id: r.createdBy.id, displayName: r.createdBy.displayName ?? null } };
  }

  private async rows(schoolId: string): Promise<Row[]> {
    return (await this.db.listInvitations({ schoolId })).data.invitations as Row[];
  }

  async list(tenant: TenantContext): Promise<InvitationListDto> {
    return { items: (await this.rows(tenant.schoolId)).map((r) => this.view(r)) };
  }

  async create(tenant: TenantContext, dto: CreateInvitationDto): Promise<CreatedInvitationDto> {
    const now = this.now();
    const open = (await this.rows(tenant.schoolId)).find((r) => r.email === dto.email && this.view(r).status === 'PENDING');
    if (open) throw new ApiException(ErrorCode.CONFLICT, 409); // revoke the open one first; no silent second link for the same person
    const token = newInvitationToken();
    const expiresAt = new Date(now.getTime() + (dto.expiresInDays ?? 7) * DAY_MS).toISOString();
    await this.db.createInvitation({
      schoolId: tenant.schoolId,
      email: dto.email,
      phoneNumber: dto.phoneNumber ?? null,
      schoolRole: dto.schoolRole as never,
      tokenHash: hashInvitationToken(token),
      expiresAt,
      actorId: tenant.userId,
      details: { email: dto.email, schoolRole: dto.schoolRole, expiresAt }, // never the token or its hash
    });
    const created = (await this.rows(tenant.schoolId)).find((r) => r.email === dto.email && this.view(r).status === 'PENDING')!;
    const view = this.view(created);
    return Object.assign({}, view, { token });
  }

  async revoke(tenant: TenantContext, id: string): Promise<InvitationDto> {
    const row = (await this.rows(tenant.schoolId)).find((r) => dashed(r.id) === id.toLowerCase());
    if (!row) throw new ApiException(ErrorCode.NOT_FOUND, 404); // another school's invitation looks the same
    if (this.view(row).status !== 'PENDING') throw new ApiException(ErrorCode.CONFLICT, 409);
    await this.db.revokeInvitation({ schoolId: tenant.schoolId, invitationId: id, actorId: tenant.userId, details: { invitationId: id, email: row.email } });
    return this.view((await this.rows(tenant.schoolId)).find((r) => dashed(r.id) === id.toLowerCase())!);
  }

  async accept(user: AuthenticatedUser, token: string): Promise<AcceptedInvitationDto> {
    // Depends only on the caller, never on the invitation, so it reveals nothing about it.
    if (!user.emailVerified || !user.email) throw new ApiException(ErrorCode.EMAIL_NOT_VERIFIED, 403);

    const row = (await this.db.getInvitationByTokenHash({ tokenHash: hashInvitationToken(token) })).data.invitations[0];
    const now = this.now();
    const usable = row && row.status === 'PENDING' && new Date(row.expiresAt).getTime() > now.getTime() && row.school.subscriptionStatus !== 'SUSPENDED' && row.email.toLowerCase() === user.email.toLowerCase();
    if (!usable) throw new ApiException(ErrorCode.INVITATION_INVALID, 400);

    await this.users.sync(user); // the accepting user is the actor of the audit row
    try {
      await this.db.acceptInvitation({ schoolId: row.school.id, invitationId: row.id, userId: user.uid, schoolRole: row.schoolRole, now: now.toISOString(), details: { invitationId: dashed(row.id), email: row.email } });
    } catch (e) {
      // The database re-checks inside the transaction; losing a race (revoked or used a moment ago) is "not valid", not a tenant violation.
      if (e instanceof DatabaseError && e.kind === 'FORBIDDEN_REFERENCE') throw new ApiException(ErrorCode.INVITATION_INVALID, 400);
      throw e; // CONFLICT (already a member) stays a 409
    }
    this.cache.invalidate(dashed(row.school.id), user.uid);
    return { school: { id: dashed(row.school.id), name: row.school.name }, role: row.schoolRole };
  }
}
