import { type CallHandler, type ExecutionContext, Injectable, Logger, type NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { catchError, type Observable, tap, throwError } from 'rxjs';
import type { PermissionRequest } from '../permission/permission.decorator.js';
import { AUDIT, type AuditDecl } from './audit.decorators.js';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * One structured line per state-changing request that got past the guards: who (uid), where (school), what (route template
 * and declared audit action), and the outcome. It carries no body, query, token or header, so it can be kept long-term.
 * (The durable record of the change itself is the audit row written inside the operation's transaction.)
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Audit');

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<PermissionRequest>();
    if (!MUTATING.has(req.method)) return next.handle();

    const decl = this.reflector.getAllAndOverride<AuditDecl | undefined>(AUDIT, [context.getHandler(), context.getClass()]);
    const started = Date.now();
    const line = (outcome: 'success' | 'error', status: number) =>
      this.logger.log(
        { event: 'request.audited', outcome, status, ms: Date.now() - started, uid: req.user?.uid, schoolId: req.tenant?.schoolId, role: req.tenant?.schoolRole, method: req.method, route: req.route?.path, action: decl?.action, requestId: http.getResponse<Response>().getHeader('x-request-id') },
        'request audited',
      );

    return next.handle().pipe(
      tap(() => line('success', http.getResponse<Response>().statusCode)),
      catchError((error: unknown) => {
        line('error', (error as { getStatus?: () => number }).getStatus?.() ?? 500);
        return throwError(() => error);
      }),
    );
  }
}
