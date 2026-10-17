import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';

/**
 * Makes sure the global User row exists and matches the VERIFIED token. The row is the actor of every audit entry, so
 * anything that writes an audited operation must call this first (an audit insert for an unknown actor would fail).
 */
@Injectable()
export class UserSyncService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async sync(user: AuthenticatedUser) {
    const email = user.email ?? `${user.uid}@no-email.invalid`; // phone-only sign-in has no email; User.email is required; .invalid is reserved (RFC 2606)
    const row = (await this.db.getUser({ id: user.uid })).data.user;
    if (row && row.email === email) return row;
    await this.db.upsertUser({ id: user.uid, email }); // preserves fields it is not given (display name, language)
    return (await this.db.getUser({ id: user.uid })).data.user!;
  }
}
