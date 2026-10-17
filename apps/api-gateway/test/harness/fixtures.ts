import { randomUUID } from 'node:crypto';
import { createDatabase, FIREBASE_APP_NAME, type Database } from '@oruschools/database';
import { ROLES, type Role } from '@oruschools/rbac';
import { getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { AUTH_HOST } from './emulators.js';

const identity = () => `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts`;
const JSON_HEADERS = { 'content-type': 'application/json' };

export interface Person {
  uid: string;
  email: string;
  token: string;
}

async function signUp(email: string): Promise<{ uid: string; token: string }> {
  const res = await fetch(`${identity()}:signUp?key=fake`, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ email, password: 'pw123456', returnSecureToken: true }) });
  const body = (await res.json()) as { localId: string; idToken: string };
  return { uid: body.localId, token: body.idToken };
}

/** A fresh ID token, needed after custom claims change (claims ride in the token). */
export async function signIn(email: string): Promise<string> {
  const res = await fetch(`${identity()}:signInWithPassword?key=fake`, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ email, password: 'pw123456', returnSecureToken: true }) });
  return ((await res.json()) as { idToken: string }).idToken;
}

export interface World {
  db: Database;
  tag: string;
  /** Two ordinary schools with one member per role each, a school that is suspended, and the people around them. */
  schools: { A: string; B: string; SUSPENDED: string };
  roles: Record<'A' | 'B', Record<Role, Person>>;
  superAdmin: Person;
  /** Signed in, member of nothing. */
  outsider: Person;
  /** A member of A whose membership is suspended. */
  suspendedMember: Person;
  /** An active ADMIN-type member of the suspended school. */
  memberOfSuspendedSchool: Person;
}

/**
 * Builds the world through the REAL operations and the REAL Auth emulator: nothing is faked. Random per-run tags keep
 * it idempotent against a persistent emulator database.
 */
export async function buildWorld(): Promise<World> {
  const tag = randomUUID().slice(0, 8);
  const db = createDatabase({ projectId: process.env.FIREBASE_PROJECT_ID ?? 'demo-oruschools' });
  const person = async (label: string): Promise<Person> => {
    const email = `${label}-${tag}@example.com`;
    const { uid, token } = await signUp(email);
    await db.upsertUser({ id: uid, email });
    return { uid, email, token };
  };

  const superAdmin = await person('superadmin');
  await getAuth(getApps().find((a) => a.name === FIREBASE_APP_NAME)).setCustomUserClaims(superAdmin.uid, { globalRole: 'SUPER_ADMIN' });
  superAdmin.token = await signIn(superAdmin.email);

  const schools = { A: randomUUID(), B: randomUUID(), SUSPENDED: randomUUID() };
  for (const [name, id] of Object.entries(schools)) await db.provisionSchool({ id, name: `School ${name}`, subDomain: `${name.toLowerCase()}-${tag}`, defaultLanguage: 'en', actorId: superAdmin.uid });

  const roles = { A: {} as Record<Role, Person>, B: {} as Record<Role, Person> };
  for (const key of ['A', 'B'] as const)
    for (const role of ROLES) {
      const p = await person(`${role.toLowerCase()}-${key.toLowerCase()}`);
      await db.createSchoolMember({ schoolId: schools[key], userId: p.uid, schoolRole: role as never }); // bootstrap seed operation: the first admin has no actor
      roles[key][role] = p;
    }

  const outsider = await person('outsider');
  const suspendedMember = await person('suspended-member');
  await db.createSchoolMember({ schoolId: schools.A, userId: suspendedMember.uid, schoolRole: 'TEACHER' as never });
  await db.updateMembership({ schoolId: schools.A, userId: suspendedMember.uid, schoolRole: 'TEACHER' as never, status: 'SUSPENDED' as never, actorId: roles.A.SYSTEM_ADMIN.uid });

  const memberOfSuspendedSchool = await person('in-suspended-school');
  await db.createSchoolMember({ schoolId: schools.SUSPENDED, userId: memberOfSuspendedSchool.uid, schoolRole: 'PRINCIPAL' as never });
  await db.setSubscriptionStatus({ schoolId: schools.SUSPENDED, status: 'SUSPENDED' as never, actorId: superAdmin.uid });

  return { db, tag, schools, roles, superAdmin, outsider, suspendedMember, memberOfSuspendedSchool };
}
