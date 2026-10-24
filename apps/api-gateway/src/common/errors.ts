import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Inject, Logger, Optional } from '@nestjs/common';
import { DatabaseError } from '@oruschools/database';
import { type DeniedRequest, SECURITY_EVENTS, type SecurityEvents } from '../audit/security-events.js';
import type { Request, Response } from 'express';
import { REQUEST_ID_HEADER } from './request-id.js';

/**
 * Closed registry of machine-readable error codes (ADR-0008 decision 5). Clients localise the text from the code;
 * the English `message` is a fallback only.
 */
export const ErrorCode = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  FORBIDDEN: 'FORBIDDEN',
  SCHOOL_SUSPENDED: 'SCHOOL_SUSPENDED',
  CANNOT_CHANGE_OWN_MEMBERSHIP: 'CANNOT_CHANGE_OWN_MEMBERSHIP',
  INVITATION_INVALID: 'INVITATION_INVALID',
  ACCOUNT_EXISTS: 'ACCOUNT_EXISTS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  NOT_FOUND: 'NOT_FOUND',
  INVALID_REQUEST: 'INVALID_REQUEST',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  TENANT_REFERENCE_FORBIDDEN: 'TENANT_REFERENCE_FORBIDDEN',
  UPSTREAM_UNAVAILABLE: 'UPSTREAM_UNAVAILABLE',
  INTERNAL: 'INTERNAL',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

const MESSAGES: Record<ErrorCode, string> = {
  AUTH_REQUIRED: 'Sign in to continue.',
  FORBIDDEN: 'You do not have access to this.',
  SCHOOL_SUSPENDED: 'This school is suspended. Contact the platform administrator.',
  CANNOT_CHANGE_OWN_MEMBERSHIP: 'You cannot change your own role or access. Ask another System Admin.',
  INVITATION_INVALID: 'This invitation is not valid, or it has expired. Ask the school for a new one.',
  ACCOUNT_EXISTS: 'A person with these details already has an account. Invite them instead.',
  EMAIL_NOT_VERIFIED: 'Verify your email address first, then open the invitation again.',
  NOT_FOUND: 'Not found.',
  INVALID_REQUEST: 'The request is not valid.',
  CONFLICT: 'This conflicts with existing data.',
  RATE_LIMITED: 'Too many requests. Try again shortly.',
  TENANT_REFERENCE_FORBIDDEN: 'You do not have access to this.',
  UPSTREAM_UNAVAILABLE: 'The service is temporarily unavailable.',
  INTERNAL: 'Something went wrong.',
};

const STATUS_CODE: Record<number, ErrorCode> = {
  400: ErrorCode.INVALID_REQUEST,
  401: ErrorCode.AUTH_REQUIRED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  409: ErrorCode.CONFLICT,
  429: ErrorCode.RATE_LIMITED,
  502: ErrorCode.UPSTREAM_UNAVAILABLE,
};

const DB_CODE = {
  FORBIDDEN_REFERENCE: ErrorCode.TENANT_REFERENCE_FORBIDDEN,
  INVALID_ARGUMENT: ErrorCode.INVALID_REQUEST,
  CONFLICT: ErrorCode.CONFLICT,
  UNAVAILABLE: ErrorCode.UPSTREAM_UNAVAILABLE,
  INTERNAL: ErrorCode.INTERNAL,
} as const;

/** Throw this from guards and handlers to produce a specific code. */
export class ApiException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    status: number,
    /** Field-level reasons for INVALID_REQUEST: field path and rule name only, never the submitted value. */
    readonly details?: ErrorDetail[],
  ) {
    super({ code }, status);
  }
}

export interface ErrorDetail {
  field: string;
  rule: string;
}

export interface ErrorEnvelope {
  error: { code: ErrorCode; message: string; requestId?: string; details?: ErrorDetail[] };
}

/**
 * Every error leaves the gateway as `{ error: { code, message, requestId } }`. Nothing else is ever sent: no stack,
 * no database text, no exception class. Unknown errors are logged with the request id and become INTERNAL.
 * Health endpoints keep their own body so load balancers and monitors read it unchanged.
 */
@Catch()
export class ErrorEnvelopeFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errors');

  constructor(@Optional() @Inject(SECURITY_EVENTS) private readonly audit?: SecurityEvents) {}

  private standardRetryAfter(res: Response): void {
    const wait = longestRetryAfter((n) => res.getHeader(n));
    if (wait !== undefined) res.setHeader('Retry-After', String(wait));
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const requestId = (res.getHeader(REQUEST_ID_HEADER) as string | undefined) ?? undefined;

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: ErrorCode = ErrorCode.INTERNAL;
    let details: ErrorDetail[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      if (req.path.startsWith('/health')) {
        res.status(status).json(exception.getResponse());
        return;
      }
      if (exception instanceof ApiException) details = exception.details;
      const body = exception.getResponse();
      const named = typeof body === 'object' && body !== null ? (body as { code?: unknown }).code : undefined;
      code = typeof named === 'string' && named in ErrorCode ? (named as ErrorCode) : (STATUS_CODE[status] ?? (status >= 500 ? ErrorCode.INTERNAL : ErrorCode.INVALID_REQUEST));
    } else if (exception instanceof DatabaseError) {
      status = exception.httpStatus;
      code = DB_CODE[exception.kind];
      if (exception.kind === 'INTERNAL' || exception.kind === 'UNAVAILABLE') this.logger.error({ requestId, kind: exception.kind, cause: describe(exception.cause) }, 'database error');
    } else if (isClientHttpError(exception)) {
      // Errors raised by the body parser before any route runs: malformed JSON (400), a body over the limit (413), an unsupported charset (415).
      status = exception.status;
      code = STATUS_CODE[status] ?? ErrorCode.INVALID_REQUEST;
    } else {
      this.logger.error({ requestId, error: describe(exception) }, 'unhandled error');
    }

    if (status === 401 || status === 403) this.audit?.securityEvent(req as DeniedRequest, status, code);

    if (status === 429) this.standardRetryAfter(res);

    const envelope: ErrorEnvelope = { error: { code, message: MESSAGES[code], ...(requestId ? { requestId } : {}), ...(details?.length ? { details } : {}) } };
    res.status(status).json(envelope);
  }
}

/** An `http-errors` style error (what Express middleware throws) that is the client's fault and safe to report as such. */
function isClientHttpError(e: unknown): e is { status: number } {
  const status = (e as { status?: unknown } | null)?.status;
  return typeof status === 'number' && status >= 400 && status < 500 && (e as { expose?: unknown }).expose === true;
}

/** The throttler writes `Retry-After-<limit name>` for named limits; clients and browsers look for the standard header. */
export function longestRetryAfter(read: (name: string) => unknown): number | undefined {
  const seconds = ['ip', 'user', 'strict'].map((n) => Number(read(`Retry-After-${n}`))).filter((n) => Number.isFinite(n) && n > 0);
  return seconds.length ? Math.max(...seconds) : undefined;
}

function describe(e: unknown): string {
  return e instanceof Error ? `${e.name}: ${e.message}` : String(e);
}
