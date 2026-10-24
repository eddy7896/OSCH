/**
 * Public configuration, inlined into the browser bundle at build time. Every value is public by design: the Firebase web
 * key identifies the project and is not a secret. Next only inlines `process.env.NEXT_PUBLIC_*` written out in full.
 */
export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "",
  /**
   * Local development only: `host:port` of the Firebase Auth emulator, so a demo school can be clicked through on this machine.
   * Always empty in a production build (NODE_ENV is "production" there), whatever the environment says.
   */
  authEmulatorHost: process.env.NODE_ENV === "production" ? "" : (process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ?? ""),
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  },
} as const;
