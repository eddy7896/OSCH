import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import { type Observable, tap } from 'rxjs';
import type { TenantRequest } from '../tenant/tenant.decorators.js';
import { PushService } from './push.service.js';

/** After a successful write in a school, ask for a push flush for that school. It only schedules: the response has already been decided. */
@Injectable()
export class PushAfterWriteInterceptor implements NestInterceptor {
  constructor(private readonly push: PushService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<TenantRequest>();
    const write = req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS';
    return next.handle().pipe(
      tap(() => {
        const schoolId = req.tenant?.schoolId;
        if (write && schoolId) this.push.schedule(schoolId);
      }),
    );
  }
}
