import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ApiError } from "@oruschools/api-client";
import { MESSAGES } from "@oruschools/i18n";
import { AuthFailure, mapFirebaseAuthError } from "@/lib/auth-port";
import { errorKey, invalidFields } from "@/lib/errors";

const EN = MESSAGES.en as Record<string, string>;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sources(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

describe("messages", () => {
  it("every message key the app refers to exists in the English catalogue", () => {
    const used = new Set<string>();
    for (const file of sources("src")) for (const m of readFileSync(file, "utf8").matchAll(/["']((?:saas|auth|action|error|status|settings|app)[A-Z][A-Za-z]*)["']/g)) used.add(m[1]!);
    expect(used.size).toBeGreaterThan(30);
    expect([...used].filter((k) => !(k in EN))).toEqual([]);
  });
});

describe("errorKey", () => {
  it("maps every gateway and client error code to an existing message", () => {
    const codes = ["AUTH_REQUIRED", "FORBIDDEN", "SCHOOL_SUSPENDED", "CANNOT_CHANGE_OWN_MEMBERSHIP", "INVITATION_INVALID", "ACCOUNT_EXISTS", "EMAIL_NOT_VERIFIED", "NOT_FOUND", "INVALID_REQUEST", "CONFLICT", "RATE_LIMITED", "TENANT_REFERENCE_FORBIDDEN", "UPSTREAM_UNAVAILABLE", "INTERNAL", "NETWORK_ERROR", "TIMEOUT", "ABORTED", "SCHOOL_REQUIRED", "UNEXPECTED_RESPONSE"] as const;
    for (const code of codes) expect(EN[errorKey(new ApiError(code, 0, "x"))], code).toBeTruthy();
  });
  it("says the right thing for the common ones", () => {
    expect(errorKey(new ApiError("CONFLICT", 409, "x"))).toBe("errorConflict");
    expect(errorKey(new ApiError("NETWORK_ERROR", 0, "x"))).toBe("errorNetwork");
    expect(errorKey(new ApiError("RATE_LIMITED", 429, "x"))).toBe("errorRateLimited");
  });
  it("never leaks the raw text of an unknown error", () => {
    expect(errorKey(new Error("secret internals"))).toBe("errorInternal");
    expect(errorKey("boom")).toBe("errorInternal");
  });
  it("sign-in failures have their own messages", () => {
    for (const code of ["CREDENTIALS", "TOO_MANY", "NETWORK", "POPUP_CLOSED", "CODE", "PHONE", "GENERIC"] as const) expect(EN[errorKey(new AuthFailure(code))], code).toBeTruthy();
    expect(errorKey(new AuthFailure("CREDENTIALS"))).toBe("authErrorCredentials");
  });
});

describe("invalidFields", () => {
  it("lists the fields of an INVALID_REQUEST, and nothing for other errors", () => {
    const bad = new ApiError("INVALID_REQUEST", 400, "x", "req", [{ field: "subDomain", rule: "matches" }]);
    expect([...invalidFields(bad)]).toEqual(["subDomain"]);
    expect(invalidFields(new ApiError("CONFLICT", 409, "x", "req", [{ field: "name", rule: "x" }])).size).toBe(0);
    expect(invalidFields(new Error("x")).size).toBe(0);
  });
});

describe("mapFirebaseAuthError", () => {
  it.each([
    ["auth/invalid-credential", "CREDENTIALS"],
    ["auth/wrong-password", "CREDENTIALS"],
    ["auth/user-not-found", "CREDENTIALS"],
    ["auth/too-many-requests", "TOO_MANY"],
    ["auth/network-request-failed", "NETWORK"],
    ["auth/popup-closed-by-user", "POPUP_CLOSED"],
    ["auth/invalid-verification-code", "CODE"],
    ["auth/code-expired", "CODE"],
    ["auth/invalid-phone-number", "PHONE"],
    ["auth/something-new", "GENERIC"],
    [undefined, "GENERIC"],
  ] as const)("%s -> %s", (input, expected) => {
    expect(mapFirebaseAuthError(input)).toBe(expected);
  });
  it("a wrong password and an unknown email look the same, so the form cannot be used to find accounts", () => {
    expect(mapFirebaseAuthError("auth/wrong-password")).toBe(mapFirebaseAuthError("auth/user-not-found"));
  });
});
