import { ApiError, type ApiErrorCode } from "@oruschools/api-client";
import { AuthFailure, type AuthFailureCode } from "./auth-port.js";

/** The message key for every error the gateway or the client can produce. A new code in the contract fails the build here. */
const API_ERROR_KEY: Record<ApiErrorCode, string> = {
  AUTH_REQUIRED: "errorAuthRequired",
  FORBIDDEN: "errorForbidden",
  SCHOOL_SUSPENDED: "errorForbidden",
  CANNOT_CHANGE_OWN_MEMBERSHIP: "errorForbidden",
  INVITATION_INVALID: "errorInternal",
  ACCOUNT_EXISTS: "errorAccountExists",
  EMAIL_NOT_VERIFIED: "errorForbidden",
  NOT_FOUND: "errorNotFound",
  INVALID_REQUEST: "errorInvalidRequest",
  CONFLICT: "errorConflict",
  RATE_LIMITED: "errorRateLimited",
  TENANT_REFERENCE_FORBIDDEN: "errorForbidden",
  UPSTREAM_UNAVAILABLE: "errorUpstream",
  INTERNAL: "errorInternal",
  NETWORK_ERROR: "errorNetwork",
  TIMEOUT: "errorTimeout",
  ABORTED: "errorInternal",
  SCHOOL_REQUIRED: "errorInternal",
  UNEXPECTED_RESPONSE: "errorInternal",
};

const AUTH_FAILURE_KEY: Record<AuthFailureCode, string> = {
  CREDENTIALS: "authErrorCredentials",
  TOO_MANY: "authErrorTooMany",
  NETWORK: "authErrorNetwork",
  POPUP_CLOSED: "authErrorPopupClosed",
  CODE: "authErrorCode",
  PHONE: "authErrorPhone",
  GENERIC: "authErrorGeneric",
};

/** The message key to show for any thrown value. Never the raw error text. */
export function errorKey(error: unknown): string {
  if (error instanceof ApiError) return API_ERROR_KEY[error.code];
  if (error instanceof AuthFailure) return AUTH_FAILURE_KEY[error.code];
  return "errorInternal";
}

/** Names of the fields the gateway says are invalid (field names only, never values). */
export function invalidFields(error: unknown): ReadonlySet<string> {
  return new Set(error instanceof ApiError && error.code === "INVALID_REQUEST" ? (error.details ?? []).map((d) => d.field) : []);
}
