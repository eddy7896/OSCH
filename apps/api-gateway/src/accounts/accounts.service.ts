import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { DATABASE, type Database } from '@oruschools/database';
import { FIREBASE_AUTH, type FirebaseAuth } from '../auth/firebase-auth.js';
import { ApiException, ErrorCode } from '../common/errors.js';
import { MembershipService } from '../tenant/membership.service.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import type { CreateStaffAccountDto } from './dto/create-staff-account.dto.js';
import type { StaffAccountDto } from './dto/staff-account.dto.js';

/**
 * A System Admin creates the accounts of staff and drivers (ADR-0011).
 *  - Email accounts get a password NOBODY knows (32 random bytes, used once and discarded); the person sets their own
 *    through a one-time Firebase link that the client asks Firebase to email. The gateway never returns, stores, logs or
 *    emails a password or a reset link: a link handed to the admin would let the admin take over the account.
 *  - Phone-only accounts have no password: the person signs in by one-time code, and the membership is already waiting.
 *  - An address or number that already has an account is NOT touched (409): that person must consent, so they are invited.
 *  - If anything fails after the Firebase account exists, it is deleted again, so a failed attempt leaves nothing behind.
 */
@Injectable()
export class AccountsService {
  private readonly logger = new Logger('Accounts');

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(FIREBASE_AUTH) private readonly auth: FirebaseAuth,
    private readonly cache: MembershipService,
  ) {}

  async create(tenant: TenantContext, dto: CreateStaffAccountDto): Promise<StaffAccountDto> {
    if (!dto.email && !dto.phoneNumber) throw new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field: 'email', rule: 'emailOrPhoneNumberRequired' }]);

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

    try {
      await this.db.upsertUser({ id: uid, email: dto.email ?? `${uid}@no-email.invalid`, displayName: dto.displayName, phoneNumber: dto.phoneNumber });
      await this.db.addMembership({
        schoolId: tenant.schoolId,
        userId: uid,
        schoolRole: dto.schoolRole as never,
        actorId: tenant.userId,
        details: { userId: uid, schoolRole: dto.schoolRole, via: 'account', signIn: this.signIn(dto) }, // no contact details, never a password or link
      });
    } catch (e) {
      await this.auth.deleteUser(uid).catch((cleanup: unknown) => this.logger.error({ uid, error: cleanup instanceof Error ? cleanup.name : 'unknown' }, 'could not remove the account after a failed creation'));
      throw e;
    }
    this.cache.invalidate(tenant.schoolId, uid);

    return {
      userId: uid,
      displayName: dto.displayName,
      email: dto.email ?? null,
      phoneNumber: dto.phoneNumber ?? null,
      role: dto.schoolRole,
      status: 'ACTIVE',
      signIn: this.signIn(dto),
      nextStep: dto.email ? 'SEND_SET_PASSWORD_EMAIL' : 'NONE',
    };
  }

  private signIn(dto: CreateStaffAccountDto): 'EMAIL' | 'PHONE' | 'BOTH' {
    return dto.email && dto.phoneNumber ? 'BOTH' : dto.email ? 'EMAIL' : 'PHONE';
  }
}
