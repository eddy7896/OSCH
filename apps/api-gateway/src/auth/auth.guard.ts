import { type CanActivate, type ExecutionContext, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Env } from '../config/env.js';
import { ApiException, ErrorCode } from '../common/errors.js';
import type { AuthenticatedRequest, AuthenticatedUser } from './authenticated-user.js';
import { FIREBASE_AUTH, type FirebaseAuth } from './firebase-auth.js';
import { IS_PUBLIC } from './public.decorator.js';

const MAX_TOKEN_LENGTH = 4096; // Firebase ID tokens are well under 2 KB; refuse anything absurd before parsing it
const BEARER = /^Bearer ([A-Za-z0-9._-]+)$/i;

/**
 * First gate of the pipeline (ADR-0008): every route needs a valid Firebase ID token unless it is `@Public()`.
 * All failures look identical to the client (401 AUTH_REQUIRED) so the response never says why a token was refused;
 * the reason class is logged server-side without the token.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger('Auth');

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService<Env, true>,
    @Inject(FIREBASE_AUTH) private readonly auth: FirebaseAuth,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()])) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.bearerToken(req.headers.authorization);
    if (!token) this.deny(req, 'missing_or_malformed');

    try {
      const decoded = await this.auth.verifyIdToken(token!, this.config.get('AUTH_CHECK_REVOKED', { infer: true }));
      const user: AuthenticatedUser = {
        uid: decoded.uid,
        email: decoded.email,
        emailVerified: decoded.email_verified === true,
        globalRole: decoded['globalRole'] === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'USER', // exact match only: any other value is a normal user
      };
      req.user = user;
      return true;
    } catch (error) {
      this.deny(req, (error as { code?: string }).code ?? 'verify_failed');
    }
  }

  private bearerToken(header: string | undefined): string | undefined {
    if (!header || header.length > MAX_TOKEN_LENGTH + 7) return undefined;
    return BEARER.exec(header)?.[1];
  }

  private deny(req: AuthenticatedRequest, reason: string): never {
    this.logger.warn({ reason, method: req.method, path: req.path }, 'authentication failed');
    throw new ApiException(ErrorCode.AUTH_REQUIRED, 401);
  }
}
