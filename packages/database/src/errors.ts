export type DatabaseErrorKind = 'FORBIDDEN_REFERENCE' | 'INVALID_ARGUMENT' | 'CONFLICT' | 'UNAVAILABLE' | 'INTERNAL';

const HTTP_STATUS: Record<DatabaseErrorKind, number> = {
  FORBIDDEN_REFERENCE: 403,
  INVALID_ARGUMENT: 400,
  CONFLICT: 409,
  UNAVAILABLE: 502,
  INTERNAL: 500,
};

/**
 * What the rest of the gateway sees when a Data Connect call fails.
 * The message is fixed text per kind: Data Connect's own messages and `debugDetails` contain SQL, table names and the
 * reason a cross-tenant reference was refused, none of which may reach a client. The original error is kept in `cause`
 * for the server log only.
 */
export class DatabaseError extends Error {
  readonly httpStatus: number;
  constructor(
    readonly kind: DatabaseErrorKind,
    options?: { cause?: unknown },
  ) {
    super(`database ${kind}`, options);
    this.name = 'DatabaseError';
    this.httpStatus = HTTP_STATUS[kind];
  }
}

interface GraphqlErrorLike {
  extensions?: { code?: string };
}

/** Verified against the emulator (firebase-admin 14.5): a failed @check surfaces as PERMISSION_DENIED + ABORTED, a bad enum or uuid as INVALID_ARGUMENT, a unique violation as ALREADY_EXISTS, and an unreachable server as `app/network-error`. */
export function mapDataConnectError(error: unknown): DatabaseError {
  if (error instanceof DatabaseError) return error;
  const e = error as { code?: string; httpResponse?: { data?: { errors?: GraphqlErrorLike[] } } } | null;
  const codes = new Set((e?.httpResponse?.data?.errors ?? []).map((g) => g.extensions?.code).filter((c): c is string => typeof c === 'string'));
  // Order matters: a rolled-back @transaction adds ABORTED next to the real cause (PERMISSION_DENIED from a failed @check,
  // ALREADY_EXISTS from a unique violation), so ABORTED alone is the weakest signal and is checked last.
  if (codes.has('PERMISSION_DENIED')) return new DatabaseError('FORBIDDEN_REFERENCE', { cause: error });
  if (codes.has('ALREADY_EXISTS')) return new DatabaseError('CONFLICT', { cause: error });
  if (codes.has('INVALID_ARGUMENT')) return new DatabaseError('INVALID_ARGUMENT', { cause: error });
  if (codes.has('ABORTED')) return new DatabaseError('FORBIDDEN_REFERENCE', { cause: error });
  if (codes.size === 0 && typeof e?.code === 'string' && /^app\/(network-error|invalid-credential)|unavailable|timeout/i.test(e.code)) return new DatabaseError('UNAVAILABLE', { cause: error });
  return new DatabaseError('INTERNAL', { cause: error });
}
