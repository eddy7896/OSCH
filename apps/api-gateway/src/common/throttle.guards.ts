import { type ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { ThrottlerRequest } from '@nestjs/throttler/dist/throttler.guard.interface.js';

/**
 * Two named limits (config in app.module.ts): `ip` for everyone, `user` for signed-in callers. A guard runs only its own
 * limit, so the IP limit applies before authentication (it is what slows token guessing and floods of garbage) and the
 * user limit after it, keyed by the verified uid, so one noisy user behind a shared school network cannot lock out the others.
 */
abstract class NamedThrottlerGuard extends ThrottlerGuard {
  protected abstract readonly throttlerName: string;

  protected override async handleRequest(props: ThrottlerRequest): Promise<boolean> {
    if (props.throttler.name !== this.throttlerName) return true;
    return super.handleRequest(props);
  }
}

@Injectable()
export class IpThrottlerGuard extends NamedThrottlerGuard {
  protected readonly throttlerName = 'ip';
}

@Injectable()
export class UserThrottlerGuard extends NamedThrottlerGuard {
  protected readonly throttlerName = 'user';

  /** Anonymous requests (public routes) are covered by the IP limit alone; counting them here too would double-count. */
  protected override async shouldSkip(context: ExecutionContext): Promise<boolean> {
    return !(context.switchToHttp().getRequest<{ user?: { uid?: string } }>().user?.uid);
  }

  protected override async getTracker(req: Record<string, any>): Promise<string> {
    return `user:${(req['user'] as { uid: string }).uid}`;
  }
}
