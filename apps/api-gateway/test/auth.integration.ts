// P1-3a runtime proof: the real AuthGuard and the real Firebase Admin SDK against the Auth emulator, with emulator-issued tokens.
import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import request from 'supertest';
import { CurrentUser, type AuthenticatedUser } from '../src/auth/authenticated-user.js';
import { UserScoped } from '../src/tenant/tenant.decorators.js';

const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const identity = `http://${host}/identitytoolkit.googleapis.com/v1/accounts`;

@Controller()
class WhoAmI {
  @UserScoped() // signed in, no school: otherwise the tenant guard (default for routes) wants X-School-Id
  @Get('whoami')
  whoami(@CurrentUser() u: AuthenticatedUser) {
    return u;
  }
}

async function signUp(email: string) {
  const res = await fetch(`${identity}:signUp?key=fake`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'pw123456', returnSecureToken: true }) });
  return (await res.json()) as { localId: string; idToken: string; email: string };
}
async function signIn(email: string) {
  const res = await fetch(`${identity}:signInWithPassword?key=fake`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'pw123456', returnSecureToken: true }) });
  return ((await res.json()) as { idToken: string }).idToken;
}

describe.skipIf(!host)('AuthGuard with the Firebase Auth emulator', () => {
  let app: INestApplication;
  const get = (token?: string) => {
    const r = request(app.getHttpServer()).get('/v1/whoami');
    return token ? r.set('Authorization', `Bearer ${token}`) : r;
  };

  beforeAll(async () => {
    Object.assign(process.env, { NODE_ENV: 'test', LOG_LEVEL: 'silent', CORS_ORIGINS: 'http://localhost:3002', THROTTLE_LIMIT: '1000', FIREBASE_PROJECT_ID: 'demo-oruschools' });
    const { AppModule } = await import('../src/app.module.js');
    const { configureApp } = await import('../src/configure-app.js');
    const { DATABASE } = await import('@oruschools/database');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule], controllers: [WhoAmI] }).overrideProvider(DATABASE).useValue({}).compile();
    app = moduleRef.createNestApplication({ bufferLogs: true });
    configureApp(app);
    await app.init();
  });
  afterAll(async () => app.close());

  it('accepts a real emulator-issued ID token and returns the verified identity', async () => {
    const u = await signUp(`ok-${Date.now()}@example.com`);
    const res = await get(u.idToken).expect(200);
    expect(res.body).toEqual({ uid: u.localId, email: u.email, emailVerified: false, globalRole: 'USER' });
  });

  it('rejects no token, garbage and a truncated token with 401 AUTH_REQUIRED', async () => {
    const u = await signUp(`trunc-${Date.now()}@example.com`);
    for (const t of [undefined, 'not.a.jwt', u.idToken.slice(0, -5)]) expect((await get(t).expect(401)).body.error.code).toBe('AUTH_REQUIRED');
  });

  it('the globalRole custom claim reaches the guard only after the user signs in again', async () => {
    const email = `claim-${Date.now()}@example.com`;
    const u = await signUp(email);
    await getAuth(getApps()[0]).setCustomUserClaims(u.localId, { globalRole: 'SUPER_ADMIN' });
    expect((await get(u.idToken).expect(200)).body.globalRole).toBe('USER'); // old token: claim not in it yet
    expect((await get(await signIn(email)).expect(200)).body.globalRole).toBe('SUPER_ADMIN');
  });

  it('a disabled user is refused even with a token that has not expired (AUTH_CHECK_REVOKED)', async () => {
    const u = await signUp(`dis-${Date.now()}@example.com`);
    await get(u.idToken).expect(200);
    await getAuth(getApps()[0]).updateUser(u.localId, { disabled: true });
    expect((await get(u.idToken).expect(401)).body.error.code).toBe('AUTH_REQUIRED');
  });

  it('a user deleted from Firebase is refused', async () => {
    const u = await signUp(`del-${Date.now()}@example.com`);
    await getAuth(getApps()[0]).deleteUser(u.localId);
    await get(u.idToken).expect(401);
  });
});
