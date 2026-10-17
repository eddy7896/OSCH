// The public subdomain lookup against the REAL stack: the one unauthenticated read in the API.
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { agent } from '../support/serve.js';
import { bootRealApp } from './app.js';
import { requireEmulatorsOrSkip } from './emulators.js';
import { buildWorld, type World } from './fixtures.js';

const ready = requireEmulatorsOrSkip();
let app: INestApplication | undefined;
let w: World | undefined;
if (ready) {
  app = await bootRealApp();
  w = await buildWorld();
}

describe.skipIf(!ready)('GET /v1/public/schools/by-subdomain/:sub against the real emulators (P1-6e)', () => {
  afterAll(async () => app?.close());
  const lookup = (sub: string) => agent(app!).get(`/v1/public/schools/by-subdomain/${sub}`);
  const platform = (method: 'post', path: string, body: object = {}) => agent(app!)[method](`/v1/platform/schools${path}`).set('Authorization', `Bearer ${w!.superAdmin.token}`).send(body);
  const strip = (b: { error: { requestId?: string } }) => JSON.stringify({ ...b.error, requestId: undefined });

  let sub: string;
  let id: string;
  beforeAll(async () => {
    sub = `public-${randomUUID().slice(0, 8)}`;
    const created = await platform('post', '', { name: 'Lakeside Public School', subDomain: sub, defaultLanguage: 'ur' }).expect(201);
    id = created.body.id;
  });

  it('needs no sign-in, ignores any credentials sent, and returns exactly four fields', async () => {
    const anon = await lookup(sub).expect(200);
    expect(anon.body).toEqual({ id, name: 'Lakeside Public School', subDomain: sub, defaultLanguage: 'ur' });
    // a broken or stranger's token changes nothing: the route is public, not "optional auth"
    expect((await lookup(sub).set('Authorization', 'Bearer not.a.jwt').expect(200)).body).toEqual(anon.body);
    expect((await lookup(sub).set('Authorization', `Bearer ${w!.roles.B.PRINCIPAL.token}`).expect(200)).body).toEqual(anon.body);
  });

  it('leaks nothing else: no status, dates, currency, locale, member counts or internal ids', async () => {
    const text = JSON.stringify((await lookup(sub).expect(200)).body);
    for (const field of ['subscriptionStatus', 'status', 'createdAt', 'currency', 'locale', 'members', 'count', 'email']) expect(text).not.toContain(field);
  });

  it('is case-insensitive and cacheable by browsers', async () => {
    const res = await lookup(sub.toUpperCase()).expect(200);
    expect(res.body.subDomain).toBe(sub);
    expect(res.headers['cache-control']).toBe('public, max-age=60');
  });

  it('unknown, malformed, reserved and SUSPENDED all give the byte-identical 404, so the endpoint cannot be used to explore', async () => {
    const bodies: string[] = [];
    for (const s of [`nosuch-${randomUUID().slice(0, 8)}`, 'www', 'ab', 'bad_name', 'a--b', 'x'.repeat(80)]) bodies.push(strip((await lookup(s).expect(404)).body));
    const suspendedSub = `susp-${randomUUID().slice(0, 8)}`;
    const s = await platform('post', '', { name: 'Soon Suspended', subDomain: suspendedSub, defaultLanguage: 'en' }).expect(201);
    await lookup(suspendedSub).expect(200);
    await platform('post', `/${s.body.id}/suspend`).expect(200);
    bodies.push(strip((await lookup(suspendedSub).expect(404)).body)); // gone at once, even though a 200 was just cached
    expect(new Set(bodies).size).toBe(1);
    expect(JSON.parse(bodies[0]!)).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('a rename shows at once, and a reactivated school comes back', async () => {
    await agent(app!).patch(`/v1/platform/schools/${id}`).set('Authorization', `Bearer ${w!.superAdmin.token}`).send({ name: 'Lakeside Senior School' }).expect(200);
    expect((await lookup(sub).expect(200)).body.name).toBe('Lakeside Senior School');
    await platform('post', `/${id}/suspend`).expect(200);
    await lookup(sub).expect(404);
    await platform('post', `/${id}/activate`).expect(200);
    await lookup(sub).expect(200);
  });

  it('is rate limited per IP like every route', async () => {
    const limited = await bootRealApp([], { THROTTLE_LIMIT: '5' });
    try {
      const codes: number[] = [];
      for (let i = 0; i < 7; i++) codes.push((await agent(limited).get(`/v1/public/schools/by-subdomain/${sub}`)).status);
      expect(codes.slice(0, 5).every((c) => c === 200)).toBe(true);
      expect(codes.slice(5)).toEqual([429, 429]);
    } finally {
      await limited.close();
    }
  });

  it('is a read only: nothing else under /public is exposed and writes are not routed', async () => {
    await agent(app!).post(`/v1/public/schools/by-subdomain/${sub}`).send({}).expect(404);
    await agent(app!).delete(`/v1/public/schools/by-subdomain/${sub}`).expect(404);
    await agent(app!).get('/v1/public/schools').expect(404);
  });
});
