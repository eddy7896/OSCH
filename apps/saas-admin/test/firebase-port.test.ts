import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ listener: null as null | ((u: unknown) => Promise<void> | void), claims: {} as Record<string, unknown>, signIn: vi.fn(), token: vi.fn() }));

vi.mock("firebase/app", () => {
  class FirebaseError extends Error {
    constructor(readonly code: string) {
      super(code);
    }
  }
  return { FirebaseError, getApps: () => [], getApp: () => ({}), initializeApp: () => ({}) };
});
vi.mock("firebase/auth", () => ({
  getAuth: () => ({ currentUser: { getIdToken: state.token } }),
  onAuthStateChanged: (_auth: unknown, cb: (u: unknown) => Promise<void> | void) => {
    state.listener = cb;
    return () => undefined;
  },
  signInWithEmailAndPassword: (...args: unknown[]) => state.signIn(...args),
  signInWithPopup: vi.fn(),
  signInWithPhoneNumber: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: class {},
  RecaptchaVerifier: class {},
}));

import { FirebaseError } from "firebase/app";
import { AuthFailure, createFirebaseAuthPort, type AuthState } from "@/lib/auth-port";

const user = (claims: Record<string, unknown>) => ({ uid: "u1", email: "a@b.co", displayName: null, getIdTokenResult: async () => ({ claims }) });

async function stateFor(u: unknown): Promise<AuthState> {
  const port = createFirebaseAuthPort();
  let last: AuthState = { status: "loading" };
  port.subscribe((s) => (last = s));
  await state.listener!(u);
  return last;
}

beforeEach(() => {
  state.signIn.mockReset();
  state.token.mockReset();
});

describe("Firebase port", () => {
  it("no user: signed out", async () => {
    expect(await stateFor(null)).toEqual({ status: "out" });
  });
  it("only the SUPER_ADMIN claim in the verified token makes someone the owner", async () => {
    expect(await stateFor(user({ globalRole: "SUPER_ADMIN" }))).toMatchObject({ status: "in", isOwner: true });
    expect(await stateFor(user({ globalRole: "SOMETHING_ELSE" }))).toMatchObject({ status: "in", isOwner: false });
    expect(await stateFor(user({}))).toMatchObject({ status: "in", isOwner: false });
  });
  it("sign-in failures become closed codes, never Firebase's text", async () => {
    const port = createFirebaseAuthPort();
    state.signIn.mockRejectedValueOnce(new FirebaseError("auth/invalid-credential", "x"));
    await expect(port.signInWithEmail("a@b.co", "x")).rejects.toMatchObject({ code: "CREDENTIALS" });
    state.signIn.mockRejectedValueOnce(new Error("weird"));
    await expect(port.signInWithEmail("a@b.co", "x")).rejects.toBeInstanceOf(AuthFailure);
  });
  it("the token comes from the signed-in user and can be force-refreshed", async () => {
    state.token.mockResolvedValue("abc");
    const port = createFirebaseAuthPort();
    expect(await port.getToken(true)).toBe("abc");
    expect(state.token).toHaveBeenCalledWith(true);
  });
});
