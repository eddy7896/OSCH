export { AuthProvider, useSession, type AuthProviderProps } from "./AuthProvider.js";
export { AuthFailure, createFirebaseAuthPort, mapFirebaseAuthError, type AuthFailureCode, type AuthPort, type AuthState, type AuthUser, type PhoneChallenge } from "./auth-port.js";
export { errorKey, invalidFields } from "./errors.js";
export { SignIn, type SignInProps } from "./SignIn.js";
export type { FirebaseOptions as FirebaseConfig } from "firebase/app";
