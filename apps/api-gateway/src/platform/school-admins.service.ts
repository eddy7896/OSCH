import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { DATABASE, type Database } from '@oruschools/database';
import type { StaffAccountDto } from '../accounts/dto/staff-account.dto.js';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import { FIREBASE_AUTH, type FirebaseAuth } from '../auth/firebase-auth.js';
import { ApiException, ErrorCode } from '../common/errors.js';
import { MembershipService } from '../tenant/membership.service.js';
import { UserSyncService } from '../users/user-sync.service.js';
import type { CreateSchoolAdminDto } from './dto/create-school-admin.dto.js';

/**
 * The platform owner gives a school its first System Admin (ADR-0011 addendum). Same account rules as staff accounts: an
 * email account gets a password nobody knows and sets its own through a Firebase link the client asks Firebase to send; an
 * existing address is never touched (409); a failure after the account exists deletes it again.
 *
 * Allowed only while the school has no active System Admin. The database enforces that, the actor's platform role and the
 * school's existence inside the same transaction; the checks here only give clean errors before an account is created.
 */
@Injectable()
export class SchoolAdminsService {
  private readonly logger = new Logger('SchoolAdmins');

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(FIREBASE_AUTH) private readonly auth: FirebaseAuth,
    private readonly users: UserSyncService,
    private readonly cache: MembershipService,
  ) {}

  async create(actor: AuthenticatedUser, schoolId: string, dto: CreateSchoolAdminDto): Promise<StaffAccountDto> {
    if (!dto.email && !dto.phoneNumber) throw new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field: 'email', rule: 'emailOrPhoneNumberRequired' }]);

    if (!(await this.db.getSchool({ schoolId })).data.school) throw new ApiException(ErrorCode.NOT_FOUND, 404);
    const members = (await this.db.listMemberships({ schoolId })).data.schoolMembers;
    if (members.some((m) => m.schoolRole === 'SYSTEM_ADMIN' && m.status === 'ACTIVE')) throw new ApiException(ErrorCode.CONFLICT, 409);

    await this.users.sync(actor);

    let uid: string;
    try {
      const created = await this.auth.createUser({
        displayName: dto.displayName,
        ...(dto.email && { email: dto.email, password: randomBytes(32).toString('base64url'), emailVerified: false }),
        ...(dto.phoneNumber && { phoneNumber: dto.phoneNumber }),
      });
      uid = created.uid;
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'auth/email-already-exists' || code === 'auth/phone-number-already-exists') throw new ApiException(ErrorCode.ACCOUNT_EXISTS, 409);
      throw e;
    }

    const signIn = dto.email && dto.phoneNumber ? 'BOTH' : dto.email ? 'EMAIL' : 'PHONE';
    try {
      await this.db.upsertUser({ id: uid, email: dto.email ?? `${uid}@no-email.invalid`, displayName: dto.displayName, phoneNumber: dto.phoneNumber });
      await this.db.provisionSchoolAdmin({ schoolId, userId: uid, actorId: actor.uid, details: { userId: uid, schoolRole: 'SYSTEM_ADMIN', signIn } }); // no contact details, never a password or link
    } catch (e) {
      await this.auth.deleteUser(uid).catch((cleanup: unknown) => this.logger.error({ uid, error: cleanup instanceof Error ? cleanup.name : 'unknown' }, 'could not remove the account after a failed creation'));
      throw e;
    }
    this.cache.invalidate(schoolId, uid);

    return { userId: uid, displayName: dto.displayName, email: dto.email ?? null, phoneNumber: dto.phoneNumber ?? null, role: 'SYSTEM_ADMIN', status: 'ACTIVE', signIn, nextStep: dto.email ? 'SEND_SET_PASSWORD_EMAIL' : 'NONE' };
  }
}
