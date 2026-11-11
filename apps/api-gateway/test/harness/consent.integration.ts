// P6-5c against the REAL stack: a parent reaches no school data until they have consented to the current privacy notice (E-PRIV-3); withdrawing closes it again; staff are not affected; the
// answers are appended, never changed; the school reads an overview; another school's parent and the parent themselves cannot read the overview.
import { type INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { CONSENT_NOTICE_VERSION } from '../../src/consent/consent.constants.js';
import { agent } from '../support/serve.js';
import { bootRealApp } from './app.js';
import { requireEmulatorsOrSkip } from './emulators.js';
import { buildWorld, signIn, signUp, type Person, type World } from './fixtures.js';

const ready = requireEmulatorsOrSkip();
let app: INestApplication | undefined;
let w: World | undefined;
if (ready) {
  app = await bootRealApp([], {});
  w = await buildWorld();
}

describe.skipIf(!ready)('parent consent against the real emulators (P6-5c)', { timeout: 240_000 }, () => {
  afterAll(async () => { vi.restoreAllMocks(); await app?.close(); });
  const A = () => w!.schools.A;
  const call = (method: 'get' | 'post', path: string, who: Person, school = A()) => agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const audit = async (action: string) => (await w!.db.listAuditLog({ schoolId: A().replaceAll('-', ''), limit: 800, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  const newParent = async (label: string): Promise<Person> => {
    const email = `${label}-${randomUUID().slice(0, 6)}@example.com`;
    const { uid } = await signUp(email);
    await w!.db.upsertUser({ id: uid, email });
    await w!.db.createSchoolMember({ schoolId: A(), userId: uid, schoolRole: 'PARENT' as never });
    return { uid, email, token: await signIn(email) };
  };
  const consent = (who: Person, given: boolean, over: Record<string, unknown> = {}) => call('post', '/consent', who).send({ noticeVersion: CONSENT_NOTICE_VERSION, language: 'hi', given, ...over });
  const refused = (res: { status: number; body: { error?: { code?: string } } }) => { expect(res.status).toBe(403); expect(res.body.error?.code).toBe('CONSENT_REQUIRED'); };

  it('the notice version in the gateway is the one the apps show', () => {
    const en = JSON.parse(readFileSync(new URL('../../../../packages/i18n/messages/en.json', import.meta.url), 'utf8')) as Record<string, string>;
    expect(Number(en['privNoticeVersion'])).toBe(CONSENT_NOTICE_VERSION);
  });

  it('a parent who has not consented reaches nothing but the consent routes', async () => {
    const p = await newParent('fresh');
    const st = await call('get', '/consent', p).expect(200);
    expect(st.body).toMatchObject({ noticeVersion: CONSENT_NOTICE_VERSION, current: false, purposes: [{ purpose: 'SCHOOL_USE', required: true, given: false, noticeVersion: null }] });
    for (const path of ['/notice-board', '/fees/invoices', '/notifications', '/messages/threads', '/broadcasts', '/transport/children']) refused(await call('get', path, p));
    await call('get', '/me', p).expect(200); // not a school route
  });

  it('consenting opens the routes; withdrawing closes them again at once; each answer is a new record', async () => {
    const p = await newParent('flip');
    const given = await consent(p, true).expect(200);
    expect(given.body).toMatchObject({ current: true, purposes: [{ given: true, noticeVersion: CONSENT_NOTICE_VERSION }] });
    await call('get', '/notice-board', p).expect(200);
    const withdrawn = await consent(p, false).expect(200);
    expect(withdrawn.body).toMatchObject({ current: false, purposes: [{ given: false }] });
    refused(await call('get', '/notice-board', p));
    await consent(p, true).expect(200);
    await call('get', '/notice-board', p).expect(200);
    const rows = (await audit('consent.record')).filter((a) => a.actor.id === p.uid);
    expect(rows).toHaveLength(3); // given, withdrawn, given: nothing was overwritten
  });

  it('consent to an earlier notice no longer counts, and a wrong version is refused', async () => {
    const p = await newParent('old');
    await w!.db.recordConsent({ schoolId: A(), userId: p.uid, purpose: 'SCHOOL_USE', noticeVersion: CONSENT_NOTICE_VERSION - 1 || 0, language: 'en', given: true, students: [], details: {} });
    refused(await call('get', '/notice-board', p));
    expect((await call('get', '/consent', p).expect(200)).body.current).toBe(false);
    await consent(p, true, { noticeVersion: CONSENT_NOTICE_VERSION + 1 }).expect(409);
    await consent(p, true, { language: 'x' }).expect(400);
    await consent(p, true).expect(200);
    await call('get', '/notice-board', p).expect(200);
  });

  it('the gate is for parents only: staff and the other roles reach their routes as before', async () => {
    await call('get', '/notice-board', w!.roles.A.ACADEMIC_ADMIN).expect(200);
    await call('get', '/notifications', w!.roles.A.TEACHER).expect(200);
    // and a parent of the world (consented in the fixture) is served
    await call('get', '/notice-board', w!.roles.A.PARENT).expect(200);
  });

  it('only a parent consents; the overview is read by the System Admin and the Principal only; another school sees nothing of this one', async () => {
    for (const who of [w!.roles.A.TEACHER, w!.roles.A.PRINCIPAL, w!.roles.A.SYSTEM_ADMIN, w!.roles.A.BURSAR]) await consent(who, true).expect(403);
    for (const who of [w!.roles.A.PARENT, w!.roles.A.TEACHER, w!.roles.A.BURSAR, w!.roles.A.HR_MANAGER]) await call('get', '/consent/overview', who).expect(403);
    const mine = await call('get', '/consent/overview', w!.roles.A.SYSTEM_ADMIN).expect(200);
    const theirs = await call('get', '/consent/overview', w!.roles.B.SYSTEM_ADMIN, w!.schools.B).expect(200);
    const names = new Set((theirs.body.items as Array<{ id: string }>).map((i) => i.id));
    for (const i of mine.body.items as Array<{ id: string }>) expect(names.has(i.id)).toBe(false);
    await call('get', '/consent/overview', w!.roles.A.PRINCIPAL).expect(200);
    await call('get', '/consent/overview', w!.roles.B.PARENT, w!.schools.A).expect(403); // not a member of A
    await consent(w!.roles.B.PARENT, true).set('X-School-Id', A()).expect(403);
  });

  it('the overview counts each state and names no child', async () => {
    const none = await newParent('nothing');
    const wd = await newParent('wd');
    await consent(wd, true).expect(200);
    await consent(wd, false).expect(200);
    const res = (await call('get', '/consent/overview', w!.roles.A.PRINCIPAL).expect(200)).body as { noticeVersion: number; counts: Record<string, number>; items: Array<{ id: string; state: string; recordedAt: string | null }> };
    expect(res.items.find((i) => i.id === none.uid)?.state).toBe('NONE');
    expect(res.items.find((i) => i.id === wd.uid)?.state).toBe('WITHDRAWN');
    expect(res.items.find((i) => i.id === w!.roles.A.PARENT.uid)?.state).toBe('CURRENT');
    expect(res.counts.parents).toBe(res.items.length);
    expect(res.counts.current + res.counts.withdrawn + res.counts.oldVersion + res.counts.none).toBe(res.counts.parents);
    expect(JSON.stringify(res)).not.toMatch(/student/i);
  });
});
