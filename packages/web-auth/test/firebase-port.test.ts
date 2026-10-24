import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ listener: null as null | ((u: unknown) => Promise<void> | void), claims: {} as Record<string, unknown>, signIn: vi.fn(), token: vi.fn(), reset: vi.fn(), connect: vi.fn() }));

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
  connectAuthEmulator: (...args: unknown[]) => state.connect(...args),
  onAuthStateChanged: (_auth: unknown, cb: (u: unknown) => Promise<void> | void) => {
    state.listener = cb;
    return () => undefined;
  },
  signInWithEmailAndPassword: (...args: unknown[]) => state.signIn(...args),
  signInWithPopup: vi.fn(),
  signInWithPhoneNumber: vi.fn(),
  sendPasswordResetEmail: (...args: unknown[]) => state.reset(...args),
  signOut: vi.fn(),
  GoogleAuthProvider: class {},
  RecaptchaVerifier: class {},
}));

import { FirebaseError } from "firebase/app";
import { AuthFailure, createFirebaseAuthPort, type AuthState } from "../src/auth-port.js";

const user = (claims: Record<string, unknown>) => ({ uid: "u1", email: "a@b.co", displayName: null, getIdTokenResult: async () => ({ claims }) });

async function stateFor(u: unknown): Promise<AuthState> {
  const port = createFirebaseAuthPort({ apiKey: 'k' });
  let last: AuthState = { status: "loading" };
  port.subscribe((s) => (last = s));
  await state.listener!(u);
  return last;
}

beforeEach(() => {
  state.signIn.mockReset();
  state.token.mockReset();
  state.reset.mockReset();
  state.connect.mockReset();
});

describe("Auth emulator (local development only)", () => {
  it("connects to the emulator only when a host is given, with the warning banner off", () => {
    createFirebaseAuthPort({ apiKey: "k" });
    expect(state.connect).not.toHaveBeenCalled();
    createFirebaseAuthPort({ apiKey: "k" }, { authEmulatorHost: "127.0.0.1:9099" });
    expect(state.connect).toHaveBeenCalledTimes(1);
    expect(state.connect).toHaveBeenCalledWith(expect.anything(), "http://127.0.0.1:9099", { disableWarnings: true });
  });
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
    const port = createFirebaseAuthPort({ apiKey: 'k' });
    state.signIn.mockRejectedValueOnce(new FirebaseError("auth/invalid-credential", "x"));
    await expect(port.signInWithEmail("a@b.co", "x")).rejects.toMatchObject({ code: "CREDENTIALS" });
    state.signIn.mockRejectedValueOnce(new Error("weird"));
    await expect(port.signInWithEmail("a@b.co", "x")).rejects.toBeInstanceOf(AuthFailure);
  });
  it("the token comes from the signed-in user and can be force-refreshed", async () => {
    state.token.mockResolvedValue("abc");
    const port = createFirebaseAuthPort({ apiKey: 'k' });
    expect(await port.getToken(true)).toBe("abc");
    expect(state.token).toHaveBeenCalledWith(true);
  });
  it("sends the set-password email through Firebase, and a failure becomes a closed code", async () => {
    const port = createFirebaseAuthPort({ apiKey: 'k' });
    state.reset.mockResolvedValueOnce(undefined);
    await port.sendPasswordReset("a@b.co");
    expect(state.reset).toHaveBeenCalledWith(expect.anything(), "a@b.co");
    state.reset.mockRejectedValueOnce(new FirebaseError("auth/network-request-failed", "x"));
    await expect(port.sendPasswordReset("a@b.co")).rejects.toMatchObject({ code: "NETWORK" });
  });
});
