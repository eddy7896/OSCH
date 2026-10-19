import type { ErrorEnvelope } from './generated/types.gen.js';

/** Machine codes the gateway can send (generated from the contract) plus the ones the client itself can produce. */
export type GatewayErrorCode = ErrorEnvelope['error']['code'];
export type ClientErrorCode =
  | 'NETWORK_ERROR' // the request never got an answer (offline, DNS, refused)
  | 'TIMEOUT' // no answer within the time limit
  | 'ABORTED' // the caller cancelled
  | 'SCHOOL_REQUIRED' // a school route was called with no active school; nothing was sent
  | 'UNEXPECTED_RESPONSE'; // an error status without the gateway's JSON envelope (for example a proxy page)
export type ApiErrorCode = GatewayErrorCode | ClientErrorCode;

export interface FieldProblem {
  field: string;
  rule: string;
}

/**
 * Every failure of the client is an ApiError. UI code switches on `code` (and translates it; the English `message` is a
 * fallback only) and never on the message text or on `status`.
 */
export class ApiError extends Error {
  override readonly name = 'ApiError';
  constructor(
    readonly code: ApiErrorCode,
    readonly status: number,
    message: string,
    readonly requestId?: string,
    readonly details?: readonly FieldProblem[],
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }

  is(...codes: ApiErrorCode[]): boolean {
    return codes.includes(this.code);
  }

  /** The person has to sign in again. */
  get needsSignIn(): boolean {
    return this.code === 'AUTH_REQUIRED';
  }

  /** Worth showing a "try again" button for. */
  get retryable(): boolean {
    return ['NETWORK_ERROR', 'TIMEOUT', 'UPSTREAM_UNAVAILABLE', 'RATE_LIMITED', 'INTERNAL'].includes(this.code) || (this.code === 'UNEXPECTED_RESPONSE' && this.status >= 502);
  }
}

/** Exhaustive on purpose: when the contract gains an error code, this stops compiling until the client knows it. */
const GATEWAY_CODES: Record<GatewayErrorCode, true> = {
  AUTH_REQUIRED: true,
  FORBIDDEN: true,
  SCHOOL_SUSPENDED: true,
  CANNOT_CHANGE_OWN_MEMBERSHIP: true,
  INVITATION_INVALID: true,
  ACCOUNT_EXISTS: true,
  EMAIL_NOT_VERIFIED: true,
  NOT_FOUND: true,
  INVALID_REQUEST: true,
  CONFLICT: true,
  RATE_LIMITED: true,
  TENANT_REFERENCE_FORBIDDEN: true,
  UPSTREAM_UNAVAILABLE: true,
  INTERNAL: true,
};

/** Reads the gateway's error envelope from a failed response; anything else is UNEXPECTED_RESPONSE (never throws). */
export async function toApiError(response: Response): Promise<ApiError> {
  const retry = Number(response.headers.get('retry-after'));
  const retryAfterSeconds = Number.isFinite(retry) && retry > 0 ? retry : undefined;
  try {
    const body = (await response.clone().json()) as Partial<ErrorEnvelope>;
    const e = body?.error;
    if (e && typeof e.code === 'string' && Object.hasOwn(GATEWAY_CODES, e.code)) {
      return new ApiError(e.code, response.status, typeof e.message === 'string' ? e.message : e.code, typeof e.requestId === 'string' ? e.requestId : undefined, Array.isArray(e.details) ? e.details : undefined, retryAfterSeconds);
    }
  } catch {
    /* not JSON */
  }
  return new ApiError('UNEXPECTED_RESPONSE', response.status, `Unexpected response (${response.status})`, response.headers.get('x-request-id') ?? undefined, undefined, retryAfterSeconds);
}
