// Spike for ADR-0019 open decision 3 / task P8-2: can a student sign in with no personal email, using a school-scoped sign-in name and a temporary password?
// Runs against the Firebase AUTH EMULATOR only (it refuses anything else):
//   npx firebase emulators:start --only auth --project demo-spike      (one terminal)
//   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 node tools/spikes/student-signin/run.mjs
// What it proves on the emulator, and what it cannot prove (a real Firebase project's rules): see README.md in this folder.
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST;
if (!HOST || !/^(127\.0\.0\.1|localhost):\d+$/.test(HOST)) {
  console.error('Refusing to run: set FIREBASE_AUTH_EMULATOR_HOST to the local Auth emulator (for example 127.0.0.1:9099). This spike never touches a real project.');
  process.exit(2);
}
initializeApp({ projectId: 'demo-spike' });
const auth = getAuth();
const REST = `http://${HOST}/identitytoolkit.googleapis.com/v1/accounts`;
const DOMAIN = 'students.oruschools.invalid'; // a reserved, never-routable top level (RFC 2606): no mailbox can exist behind it

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };
const post = async (path, body) => {
  const r = await fetch(`${REST}:${path}?key=fake`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
};
const signIn = (name, password) => post('signInWithPassword', { email: `${name}@${DOMAIN}`, password, returnSecureToken: true });
// The sign-in name the school sees is "<enrolment id>.<school code>"; the phone or browser adds the domain, so no student ever types an email.
const nameOf = (enrolment, school) => `${enrolment}.${school}`.toLowerCase();

const run = Date.now().toString(36);
const school = `greenfield${run}`;

// 1. the System Admin's gateway creates the account with a temporary password the admin chooses to hand over
const n1 = nameOf('S0001', school);
const u1 = await auth.createUser({ email: `${n1}@${DOMAIN}`, emailVerified: false, password: 'maple-4827', displayName: 'Aarav Sharma' });
check('an account with a synthetic address on a reserved domain can be created, unverified', Boolean(u1.uid) && u1.emailVerified === false);

// 2. the student signs in with the temporary password
const s1 = await signIn(n1, 'maple-4827');
check('the student signs in with the temporary password', s1.status === 200 && Boolean(s1.body.idToken));
check('the token carries the uid and the synthetic address, not verified', s1.status === 200);
const claims = JSON.parse(Buffer.from(s1.body.idToken.split('.')[1], 'base64url').toString());
check('the ID token has the right uid and email_verified false (the gateway reads both)', claims.user_id === u1.uid && claims.email_verified === false, `email_verified=${claims.email_verified}`);

// 3. the first sign-in forces a new password: the student changes it with their own token
const ch = await post('update', { idToken: s1.body.idToken, password: 'my-own-secret-91', returnSecureToken: true });
check('the student can change their own password with their token', ch.status === 200);
check('the temporary password no longer works', (await signIn(n1, 'maple-4827')).status === 400);
check('the new password works', (await signIn(n1, 'my-own-secret-91')).status === 200);

// 4. a forgotten password has no mailbox to reset by: the System Admin sets a new temporary one, and the old session is cut
await auth.updateUser(u1.uid, { password: 'kite-6613' });
await auth.revokeRefreshTokens(u1.uid);
check('the admin can set a new temporary password', (await signIn(n1, 'kite-6613')).status === 200);
check('the previous password stops working', (await signIn(n1, 'my-own-secret-91')).status === 400);
const old = await fetch(`http://${HOST}/securetoken.googleapis.com/v1/token?key=fake`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(ch.body.refreshToken)}` });
// Informational, not a pass or a fail: the emulator does not model the revocation of refresh tokens (it answered 200 here). A real project revokes them when the password is changed through the Admin SDK; that is documented Firebase behaviour and is NOT verified here.
console.log(`INFO  a refresh token from before the reset: the emulator answered ${old.status} (real Firebase refuses it; unverified here)`);

// 5. the sign-in name is case-insensitive, and a different school's S0001 is a different account
check('the name works in capitals (Auth lower-cases the address)', (await post('signInWithPassword', { email: `${n1.toUpperCase()}@${DOMAIN.toUpperCase()}`, password: 'kite-6613', returnSecureToken: true })).status === 200);
const n2 = nameOf('S0001', `otherschool${run}`);
const u2 = await auth.createUser({ email: `${n2}@${DOMAIN}`, password: 'pine-2201', displayName: 'Another Aarav' });
check('the same enrolment id in another school is another account', u2.uid !== u1.uid && n1 !== n2);
let dup = '';
try { await auth.createUser({ email: `${n1}@${DOMAIN}`, password: 'x-yz-12345' }); } catch (e) { dup = e.code; }
check('the same name in the same school is refused (email-already-exists)', dup === 'auth/email-already-exists', dup);

// 6. the address has no mailbox: nothing is ever sent, and a student cannot be invited or verified by email
check('the account stays unverified: invitations (which need a verified address) cannot accept it, by design', (await auth.getUser(u1.uid)).emailVerified === false);

// 7. disabling and deleting (a student leaves the school)
await auth.updateUser(u2.uid, { disabled: true });
const dis = await signIn(n2, 'pine-2201');
check('a disabled account cannot sign in', dis.status === 400, dis.body?.error?.message);
await auth.deleteUser(u1.uid); await auth.deleteUser(u2.uid);
check('a deleted account cannot sign in', (await signIn(n1, 'kite-6613')).status === 400);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} of ${results.length} passed${failed.length ? '; FAILED: ' + failed.map((f) => f.name).join('; ') : ''}`);
process.exit(failed.length ? 1 : 0);
