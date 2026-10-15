import { type Auth, getAuth } from 'firebase-admin/auth';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { FIREBASE_APP_NAME } from '@oruschools/database';

/** Injection token for the Firebase Admin `Auth` (tests replace it with a fake). */
export const FIREBASE_AUTH = Symbol('FIREBASE_AUTH');
export type FirebaseAuth = Pick<Auth, 'verifyIdToken'>;

/** Shares the named Firebase app with the data layer, whichever initialises first. */
export function createFirebaseAuth(projectId: string): Auth {
  const app = getApps().some((a) => a.name === FIREBASE_APP_NAME) ? getApp(FIREBASE_APP_NAME) : initializeApp({ projectId }, FIREBASE_APP_NAME);
  return getAuth(app);
}
