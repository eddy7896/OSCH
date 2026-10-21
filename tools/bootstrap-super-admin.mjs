#!/usr/bin/env node
// Makes ONE existing account the platform owner (SUPER_ADMIN), or removes the role. It sets the custom claim
// `globalRole=SUPER_ADMIN` with the Admin SDK and makes sure the account has a User row. It is a deliberate command-line
// step run by the project owner, never an HTTP endpoint (ADR-0009): nobody can obtain the role by calling the API.
//
//   node tools/bootstrap-super-admin.mjs --email you@example.com --project <firebase-project-id>            (dry run)
//   node tools/bootstrap-super-admin.mjs --email you@example.com --project <firebase-project-id> --apply    (does it)
//   ... --revoke                                                                                            (removes the role)
//
// The account must already exist: sign in once (email + password, Google or phone). Real projects need credentials:
// GOOGLE_APPLICATION_CREDENTIALS pointing at a service-account key that stays on your machine. Against the emulators set
// FIREBASE_AUTH_EMULATOR_HOST and DATA_CONNECT_EMULATOR_HOST instead. After applying, sign out and in again: the role
// travels inside the ID token.
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { describePlan, nextClaims, parseArgs } from "./lib/bootstrap-super-admin.mjs";

let args;
try {
  args = parseArgs(process.argv.slice(2));
} catch (e) {
  console.error(`error: ${e.message}\n\nusage: node tools/bootstrap-super-admin.mjs --email <address> --project <firebase-project-id> [--apply] [--revoke]`);
  process.exit(2);
}

// Master env file at the repo root (missing file is fine).
try { process.loadEnvFile(new URL('../.env.local', import.meta.url)); } catch {}
const emulator = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
if (!emulator && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error("error: no credentials. Set GOOGLE_APPLICATION_CREDENTIALS to a service-account key for this project (or use the emulators).");
  process.exit(2);
}
if (emulator && !args.project.startsWith("demo-")) console.error(`note: the Auth emulator is configured, so this changes the EMULATOR only, not project ${args.project}.`);

const app = getApps()[0] ?? initializeApp({ projectId: args.project });
const auth = getAuth(app);

let user;
try {
  user = await auth.getUserByEmail(args.email);
} catch (e) {
  if (e.code === "auth/user-not-found") {
    console.error(`error: no account with ${args.email} in project ${args.project}. Sign in once first, then run this again.`);
    process.exit(1);
  }
  throw e;
}
if (user.disabled) {
  console.error("error: that account is disabled.");
  process.exit(1);
}

console.log(describePlan({ ...args, existingClaims: user.customClaims, uid: user.uid, emulator }));
if (!args.apply) {
  console.log("\ndry run: nothing changed. Add --apply to do it.");
  process.exit(0);
}

await auth.setCustomUserClaims(user.uid, nextClaims(user.customClaims, args.revoke));
await auth.revokeRefreshTokens(user.uid); // old tokens (without the new claim) stop working; the next sign-in carries it

if (!args.revoke) {
  // The User row is the actor of every audit entry; create it now so the first platform action can be audited.
  const { createDatabase } = await import("@oruschools/database");
  const db = createDatabase({ projectId: args.project });
  await db.upsertUser({ id: user.uid, email: args.email, displayName: user.displayName ?? undefined });
}
console.log(`\ndone. ${args.revoke ? "Role removed" : "SUPER_ADMIN granted"}. Sign out and sign in again to refresh the token.`);
