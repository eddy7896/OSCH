// P1-13 against the REAL stack: school logo upload addresses (signed locally with fake R2 keys; no request leaves this machine).
import type { INestApplication } from '@nestjs/common';
import { agent } from '../support/serve.js';
import { bootRealApp } from './app.js';
import { requireEmulatorsOrSkip } from './emulators.js';
import { buildWorld, type World } from './fixtures.js';

const ready = requireEmulatorsOrSkip();
const ACCOUNT = 'abcdef0123456789abcdef0123456789';
const R2 = { R2_ACCOUNT_ID: ACCOUNT, R2_ACCESS_KEY: 'AKIDTESTKEY', R2_SECRET_KEY: 'test-secret-key-that-must-never-leak', R2_BUCKET_NAME: 'test-bucket', R2_PUBLIC_URL: 'https://files.test.example/' };
let app: INestApplication | undefined;
let unconfigured: INestApplication | undefined;
let w: World | undefined;
if (ready) {
  app = await bootRealApp([], R2);
  w = await buildWorld();
}

describe.skipIf(!ready)('POST /v1/uploads/school-logo against the real emulators (P1-13)', () => {
  afterAll(async () => {
    await app?.close();
    await unconfigured?.close();
    for (const k of Object.keys(R2)) delete process.env[k];
  });
  const post = (body: object | undefined, token: string, school: string, target: INestApplication = app!) =>
    agent(target).post('/v1/uploads/school-logo').set('Authorization', `Bearer ${token}`).set('X-School-Id', school).send(body);
  const admin = () => w!.roles.A.SYSTEM_ADMIN.token;
  const png = { contentType: 'image/png', sizeBytes: 123_456 };

  it('a System Admin gets an upload address under their own school, signed for this type and size, valid five minutes', async () => {
    const res = await post(png, admin(), w!.schools.A).expect(200);
    const { uploadUrl, key, publicUrl, headers, expiresInSeconds, method } = res.body;
    expect(method).toBe('PUT');
    expect(expiresInSeconds).toBe(300);
    expect(headers).toEqual({ 'Content-Type': 'image/png', 'Content-Length': '123456' });
    expect(key).toMatch(new RegExp(`^schools/${w!.schools.A}/logo/[0-9a-f-]{36}\\.png$`));
    expect(publicUrl).toBe(`https://files.test.example/${key}`);
    const url = new URL(uploadUrl);
    expect(url.hostname).toContain(`${ACCOUNT}.r2.cloudflarestorage.com`);
    expect(url.pathname).toContain(key);
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300');
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toMatch(/content-length.*content-type|content-type.*content-length/);
    expect(JSON.stringify(res.body)).not.toContain(R2.R2_SECRET_KEY);
  });

  it('every call is a fresh key, and school B gets its own prefix, never A\'s', async () => {
    const a1 = (await post(png, admin(), w!.schools.A).expect(200)).body.key;
    const a2 = (await post(png, admin(), w!.schools.A).expect(200)).body.key;
    const b = (await post({ contentType: 'image/webp', sizeBytes: 10 }, w!.roles.B.SYSTEM_ADMIN.token, w!.schools.B).expect(200)).body.key;
    expect(a1).not.toBe(a2);
    expect(b.startsWith(`schools/${w!.schools.B}/`)).toBe(true);
    expect(b.endsWith('.webp')).toBe(true);
    expect(b).not.toContain(w!.schools.A);
  });

  it('cross-tenant: a System Admin of A cannot get an address under B by naming B (403), and no body field can choose the key', async () => {
    expect((await post(png, admin(), w!.schools.B).expect(403)).body.error.code).toBe('FORBIDDEN');
    for (const extra of [{ key: `schools/${w!.schools.B}/logo/evil.png` }, { schoolId: w!.schools.B }, { bucket: 'other' }, { path: '../x' }])
      expect((await post({ ...png, ...extra }, admin(), w!.schools.A).expect(400)).body.error.code).toBe('INVALID_REQUEST');
  });

  it('only whoever may update settings: Principal (read-only), Teacher, Parent and outsiders are refused', async () => {
    for (const token of [w!.roles.A.PRINCIPAL.token, w!.roles.A.TEACHER.token, w!.roles.A.PARENT.token]) await post(png, token, w!.schools.A).expect(403);
    await post(png, w!.outsider.token, w!.schools.A).expect(403);
    await agent(app!).post('/v1/uploads/school-logo').send(png).expect(401);
  });

  it.each([
    ['an SVG (can carry script)', { contentType: 'image/svg+xml', sizeBytes: 100 }],
    ['a PDF', { contentType: 'application/pdf', sizeBytes: 100 }],
    ['an HTML page', { contentType: 'text/html', sizeBytes: 100 }],
    ['over 2 MB', { contentType: 'image/png', sizeBytes: 2 * 1024 * 1024 + 1 }],
    ['zero bytes', { contentType: 'image/png', sizeBytes: 0 }],
    ['a negative size', { contentType: 'image/png', sizeBytes: -5 }],
    ['a fractional size', { contentType: 'image/png', sizeBytes: 10.5 }],
    ['a size as text', { contentType: 'image/png', sizeBytes: '100' }],
    ['no size', { contentType: 'image/png' }],
    ['no type', { sizeBytes: 100 }],
  ])('refuses %s with 400', async (_name, body) => {
    expect((await post(body as object, admin(), w!.schools.A).expect(400)).body.error.code).toBe('INVALID_REQUEST');
  });

  it('exactly 2 MB is allowed', async () => {
    await post({ contentType: 'image/jpeg', sizeBytes: 2 * 1024 * 1024 }, admin(), w!.schools.A).expect(200);
  });

  it('a suspended school cannot get upload addresses', async () => {
    await post(png, w!.memberOfSuspendedSchool.token, w!.schools.SUSPENDED).expect(403);
  });

  it('storage not configured on a deployment: 503 with the standard envelope, not a crash', async () => {
    unconfigured = await bootRealApp([], { R2_ACCOUNT_ID: '', R2_ACCESS_KEY: '', R2_SECRET_KEY: '', R2_BUCKET_NAME: '', R2_PUBLIC_URL: '' });
    const res = await post(png, admin(), w!.schools.A, unconfigured).expect(503);
    expect(res.body.error.code).toBe('UPSTREAM_UNAVAILABLE');
  });
});
