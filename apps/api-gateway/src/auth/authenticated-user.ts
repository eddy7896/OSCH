import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export type GlobalRole = 'SUPER_ADMIN' | 'USER';

/** Who is calling, taken only from a verified Firebase ID token. */
export interface AuthenticatedUser {
  uid: string;
  email?: string;
  emailVerified: boolean;
  /** Set only from the `globalRole` custom claim, which only the bootstrap script writes (ADR-0009). */
  globalRole: GlobalRole;
}

export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

/** `@CurrentUser() user: AuthenticatedUser` in a handler. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const user = ctx.switchToHttp().getRequest<AuthenticatedRequest>().user;
  if (!user) throw new Error('CurrentUser used on a route that is not authenticated'); // programmer error, not a client error
  return user;
});
