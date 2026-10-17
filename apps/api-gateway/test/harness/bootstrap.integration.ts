// The SUPER_ADMIN bootstrap script, end to end against the real emulators: the only way to become platform owner.
import type { INestApplication } from '@nestjs/common';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { agent } from '../support/serve.js';
import { bootRealApp } from './app.js';
import { requireEmulatorsOrSkip } from './emulators.js';
import { buildWorld, signIn, signUp, type Person, type World } from './fixtures.js';

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../tools/bootstrap-super-admin.mjs');
const ready = requireEmulatorsOrSkip();
let app: INestApplication | undefined;
let w: World | undefined;
if (ready) {
  app = await bootRealApp();
  w = await buildWorld();
}

const run = (args: string[], env: NodeJS.ProcessEnv = process.env) => spawnSync('node', [SCRIPT, ...args], { env, encoding: 'utf8' });

describe.skipIf(!ready)('tools/bootstrap-super-admin.mjs against the real emulators', () => {
  afterAll(async () => app?.close());
  const platform = (p: Person) => agent(app!).get('/v1/platform/schools?limit=1').set('Authorization', `Bearer ${p.token}`);

  it('dry run changes nothing; --apply makes the account SUPER_ADMIN after its next sign-in; --revoke takes it away', async () => {
    const email = `owner-${randomUUID().slice(0, 8)}@example.com`;
    const { uid, token } = await signUp(email);
    let me: Person = { uid, email, token };
    await platform(me).expect(403);

    const dry = run(['--email', email, '--project', 'demo-oruschools']);
    expect(dry.status).toBe(0);
    expect(dry.stdout).toMatch(/dry run: nothing changed/);
    expect(dry.stdout).toMatch(/\[EMULATOR\]/);
    me = { ...me, token: await signIn(email) };
    await platform(me).expect(403); // still nobody

    const applied = run(['--email', email, '--project', 'demo-oruschools', '--apply']);
    expect(applied.status, applied.stderr).toBe(0);
    expect(applied.stdout).toMatch(/SUPER_ADMIN granted/);
    me = { ...me, token: await signIn(email) }; // the role travels in the token
    expect((await platform(me).expect(200)).body).toMatchObject({ items: expect.any(Array) });
    expect((await agent(app!).get('/v1/me').set('Authorization', `Bearer ${me.token}`).expect(200)).body.user.globalRole).toBe('SUPER_ADMIN');
    expect((await w!.db.getUser({ id: uid })).data.user).toMatchObject({ id: uid, email }); // the User row exists, so the first platform action can be audited

    // And the first thing a platform owner does works end to end, audited under their uid.
    const created = await agent(app!).post('/v1/platform/schools').set('Authorization', `Bearer ${me.token}`).send({ name: 'First School', subDomain: `first-${randomUUID().slice(0, 8)}`, defaultLanguage: 'en' }).expect(201);
    const rows = (await w!.db.listAuditLog({ schoolId: created.body.id.replaceAll('-', ''), limit: 10, offset: 0 })).data.auditLogs;
    expect(rows.find((r) => r.action === 'platform.school.create')?.actor.id).toBe(uid);

    const revoked = run(['--email', email, '--project', 'demo-oruschools', '--apply', '--revoke']);
    expect(revoked.status).toBe(0);
    me = { ...me, token: await signIn(email) };
    await platform(me).expect(403);
  });

  it('keeps the account\'s other claims', async () => {
    const email = `claims-${randomUUID().slice(0, 8)}@example.com`;
    const { uid } = await signUp(email);
    const { getAuth } = await import('firebase-admin/auth');
    const { getApps } = await import('firebase-admin/app');
    const auth = getAuth(getApps()[0]);
    await auth.setCustomUserClaims(uid, { theme: 'sepia' });
    expect(run(['--email', email, '--project', 'demo-oruschools', '--apply']).status).toBe(0);
    expect((await auth.getUser(uid)).customClaims).toEqual({ theme: 'sepia', globalRole: 'SUPER_ADMIN' });
  });

  it('refuses an account that does not exist (it never creates accounts) and bad arguments', () => {
    const missing = run(['--email', `nobody-${randomUUID().slice(0, 8)}@example.com`, '--project', 'demo-oruschools', '--apply']);
    expect(missing.status).toBe(1);
    expect(missing.stderr).toMatch(/no account/);
    expect(run(['--email', 'a@b.co']).status).toBe(2);
    expect(run([]).status).toBe(2);
  });

  it('refuses to run against a real project without credentials', () => {
    const { FIREBASE_AUTH_EMULATOR_HOST: _a, DATA_CONNECT_EMULATOR_HOST: _b, GOOGLE_APPLICATION_CREDENTIALS: _c, ...clean } = process.env;
    const res = run(['--email', 'owner@example.com', '--project', 'my-school-prod', '--apply'], clean);
    expect(res.status).toBe(2);
    expect(res.stderr).toMatch(/no credentials/);
  });

  it('is a command-line tool: nothing in the running API can grant the role', async () => {
    const outsider = w!.outsider;
    for (const path of ['/v1/me/preferences', '/v1/platform/schools']) {
      const res = await agent(app!).patch(path).set('Authorization', `Bearer ${outsider.token}`).send({ globalRole: 'SUPER_ADMIN', language: 'en' });
      expect([400, 403, 404]).toContain(res.status);
    }
    expect((await agent(app!).get('/v1/me').set('Authorization', `Bearer ${outsider.token}`).expect(200)).body.user.globalRole).toBe('USER');
  });
});
