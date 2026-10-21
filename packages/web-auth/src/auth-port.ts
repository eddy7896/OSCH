import { FirebaseError, getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export type AuthState =
  | { status: "loading" }
  | { status: "out" }
  /** `isOwner`: the verified token carries the SUPER_ADMIN claim. The gateway enforces it again on every call. */
  | { status: "in"; user: AuthUser; isOwner: boolean };

export type AuthFailureCode = "CREDENTIALS" | "TOO_MANY" | "NETWORK" | "POPUP_CLOSED" | "CODE" | "PHONE" | "GENERIC";

/** A sign-in problem reduced to a closed list, so screens translate from the code and never show Firebase's own text. */
export class AuthFailure extends Error {
  override readonly name = "AuthFailure";
  constructor(readonly code: AuthFailureCode) {
    super(code);
  }
}

export function mapFirebaseAuthError(code: string | undefined): AuthFailureCode {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
    case "auth/user-disabled":
      return "CREDENTIALS";
    case "auth/too-many-requests":
      return "TOO_MANY";
    case "auth/network-request-failed":
      return "NETWORK";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "POPUP_CLOSED";
    case "auth/invalid-verification-code":
    case "auth/code-expired":
      return "CODE";
    case "auth/invalid-phone-number":
    case "auth/missing-phone-number":
      return "PHONE";
    default:
      return "GENERIC";
  }
}

export interface PhoneChallenge {
  confirm(code: string): Promise<void>;
}

/** Everything the screens need from Firebase Auth, so they can be tested without it. */
export interface AuthPort {
  subscribe(listener: (state: AuthState) => void): () => void;
  signInWithEmail(email: string, password: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  /** Sends a code by SMS. `container` hosts the invisible reCAPTCHA check. */
  startPhoneSignIn(phoneNumber: string, container: HTMLElement): Promise<PhoneChallenge>;
  /** Asks Firebase to email a link to set a new password. Used for "forgot password" and after an account is created for someone (ADR-0011: the gateway never handles the link). */
  sendPasswordReset(email: string): Promise<void>;
  signOut(): Promise<void>;
  getToken(forceRefresh: boolean): Promise<string | null>;
}

const fail = (e: unknown): never => {
  throw new AuthFailure(e instanceof FirebaseError ? mapFirebaseAuthError(e.code) : "GENERIC");
};

export function createFirebaseAuthPort(firebase: FirebaseOptions): AuthPort {
  const app = getApps().length ? getApp() : initializeApp(firebase);
  const auth = getAuth(app);

  return {
    subscribe(listener) {
      return onAuthStateChanged(auth, async (user) => {
        if (!user) return listener({ status: "out" });
        // The claim is read from the verified token, never from anything the page can edit.
        const result = await user.getIdTokenResult();
        listener({ status: "in", user: { uid: user.uid, email: user.email, displayName: user.displayName }, isOwner: result.claims["globalRole"] === "SUPER_ADMIN" });
      });
    },
    async signInWithEmail(email, password) {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (e) {
        fail(e);
      }
    },
    async signInWithGoogle() {
      try {
        await signInWithPopup(auth, new GoogleAuthProvider());
      } catch (e) {
        fail(e);
      }
    },
    async startPhoneSignIn(phoneNumber, container) {
      const verifier = new RecaptchaVerifier(auth, container, { size: "invisible" });
      try {
        const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
        return {
          async confirm(code) {
            try {
              await confirmation.confirm(code);
            } catch (e) {
              fail(e);
            }
          },
        };
      } catch (e) {
        verifier.clear();
        return fail(e);
      }
    },
    async sendPasswordReset(email) {
      try {
        await sendPasswordResetEmail(auth, email);
      } catch (e) {
        fail(e);
      }
    },
    signOut: () => firebaseSignOut(auth),
    async getToken(forceRefresh) {
      return (await auth.currentUser?.getIdToken(forceRefresh)) ?? null;
    },
  };
}
