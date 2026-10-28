// P4-S2 against the REAL stack: a phone's push address, and a push for a notice that carries only ids. The provider is a recording fake
// (there is no FCM emulator); everything else, including who a notice is for and who muted it, is the real database.
import { type INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { agent } from '../support/serve.js';
import { bootRealApp } from './app.js';
import { requireEmulatorsOrSkip } from './emulators.js';
import { buildWorld, type Person, type World } from './fixtures.js';

const ready = requireEmulatorsOrSkip();
let app: INestApplication | undefined;
let w: World | undefined;
const sent: Array<{ token: string; platform: string; data: Record<string, string> }> = [];
const behaviour: { fail: boolean; dead: string[] } = { fail: false, dead: [] };
if (ready) {
  const { PUSH_SENDER } = await import('../../src/push/push.types.js');
  const fake = {
    async send(messages: typeof sent) {
      if (behaviour.fail) throw new Error('provider down');
      sent.push(...messages);
      return { invalidTokens: messages.map((m) => m.token).filter((t) => behaviour.dead.includes(t)) };
    },
  };
  app = await bootRealApp([], { PUSH_ENABLED: 'true' }, [[PUSH_SENDER, fake]]);
  w = await buildWorld();
}

const tok = (tag: string) => `${tag}-${randomUUID()}`;
const waitFor = async (check: () => boolean | Promise<boolean>, ms = 20000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await check()) return true; await new Promise((r) => setTimeout(r, 100)); }
  return false;
};

describe.skipIf(!ready)('devices and push against the real emulators (P4-S2)', { timeout: 180_000 }, () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const hr = () => w!.roles.A.HR_MANAGER;
  const principal = () => w!.roles.A.PRINCIPAL;
  const teacher = () => w!.roles.A.TEACHER;
  const bare = (who: Person, method: 'get' | 'post' | 'delete', path: string) => agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`);
  const call = (who: Person, method: 'get' | 'post' | 'put' | 'delete', path: string) => agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', A());
  const devices = async (who: Person) => ((await bare(who, 'get', '/devices').expect(200)).body as { items: Array<{ id: string; platform: string }> }).items;
  const uniq = () => randomUUID().slice(0, 6);

  describe('the phone\'s push address', () => {
    it('is kept for the signed-in account without a school, never shown back, and a repeat is one row', async () => {
      const t = tok('phone-a');
      await bare(principal(), 'post', '/devices').send({ token: t, platform: 'ANDROID' }).expect(204);
      await bare(principal(), 'post', '/devices').send({ token: t, platform: 'ANDROID' }).expect(204);
      const mine = await devices(principal());
      expect(mine).toHaveLength(1);
      expect(JSON.stringify(mine)).not.toContain(t);
      expect(await devices(teacher())).toHaveLength(0);
      await bare(principal(), 'delete', '/devices').send({ token: t }).expect(204);
      expect(await devices(principal())).toHaveLength(0);
    });

    it('a phone that changes hands moves to the new account; the old account no longer has it', async () => {
      const t = tok('phone-b');
      await bare(teacher(), 'post', '/devices').send({ token: t, platform: 'IOS' }).expect(204);
      await bare(principal(), 'post', '/devices').send({ token: t, platform: 'IOS' }).expect(204);
      expect(await devices(teacher())).toHaveLength(0);
      expect(await devices(principal())).toHaveLength(1);
      await bare(principal(), 'delete', '/devices').send({ token: t }).expect(204);
    });

    it('nobody can remove another account\'s phone, and removing one that is not there is not an error', async () => {
      const t = tok('phone-c');
      await bare(principal(), 'post', '/devices').send({ token: t, platform: 'ANDROID' }).expect(204);
      await bare(teacher(), 'delete', '/devices').send({ token: t }).expect(204);
      expect(await devices(principal())).toHaveLength(1);
      await bare(teacher(), 'delete', '/devices').send({ token: tok('never-registered') }).expect(204);
      await bare(principal(), 'delete', '/devices').send({ token: t }).expect(204);
    });

    it('is refused for a bad token, a bad platform, or no sign-in; a person with no school may register', async () => {
      await bare(principal(), 'post', '/devices').send({ token: 'short', platform: 'ANDROID' }).expect(400);
      await bare(principal(), 'post', '/devices').send({ token: 'has spaces and !!', platform: 'ANDROID' }).expect(400);
      await bare(principal(), 'post', '/devices').send({ token: tok('x'), platform: 'WINDOWS' }).expect(400);
      await bare(principal(), 'post', '/devices').send({ token: tok('x'), platform: 'ANDROID', school: 'x' }).expect(400);
      await agent(app!).post('/v1/devices').send({ token: tok('x'), platform: 'ANDROID' }).expect(401);
      const t = tok('phone-outsider');
      await bare(w!.outsider, 'post', '/devices').send({ token: t, platform: 'IOS' }).expect(204);
      await bare(w!.outsider, 'delete', '/devices').send({ token: t }).expect(204);
    });
  });

  describe('a push for a notice', () => {
    let type = '';
    let ptoken = '';
    let ttoken = '';

    const ask = async (day: string) => (await call(teacher(), 'post', '/leave/requests').send({ leaveTypeId: type, startDate: day, endDate: day }).expect(201)).body.id as string;

    beforeAll(async () => {
      const acad = w!.roles.A.ACADEMIC_ADMIN;
      const y = (await call(acad, 'post', '/academics/years').send({ name: `SY-${uniq()}`, startDate: '2020-04-01', endDate: '2099-03-31' }).expect(201)).body;
      await call(acad, 'post', `/academics/years/${y.id}/activate`).send({}).expect(200);
      const staff = ((await call(hr(), 'post', '/staff').send({ firstName: 'Tara', lastName: 'Push' }).expect(201)).body as { id: string }).id;
      await call(hr(), 'put', `/staff/${staff}/account`).send({ userId: teacher().uid }).expect(200);
      await call(hr(), 'post', '/leave/types').send({ name: `Unpaid ${uniq()}`, paid: false }).expect(201);
      type = ((await call(hr(), 'get', '/leave/types').expect(200)).body.items as Array<{ id: string }>)[0]!.id;
      ptoken = tok('principal-phone');
      ttoken = tok('teacher-phone');
      await bare(principal(), 'post', '/devices').send({ token: ptoken, platform: 'ANDROID' }).expect(204);
      await bare(teacher(), 'post', '/devices').send({ token: ttoken, platform: 'IOS' }).expect(204);
    }, 120_000); // the shared runners are slower than a laptop: this sets up a year, a staff member and a leave type

    it('reaches the phones of the people the notice is for, carries only ids, and does not reach anyone else', async () => {
      sent.length = 0;
      await ask('2090-05-08');
      expect(await waitFor(() => sent.length > 0)).toBe(true);
      expect(sent.map((m) => m.token)).toEqual([ptoken]); // the notice is for the Principal; the teacher who asked is not told
      const m = sent[0]!;
      expect(Object.keys(m.data).sort()).toEqual(['noticeId', 'schoolId', 'type']);
      expect(m.data['schoolId']).toBe(A());
      expect(m.data['type']).toBe('notice');
      const inbox = (await call(principal(), 'get', '/notifications').expect(200)).body.items as Array<{ id: string; kind: string }>;
      expect(inbox.map((n) => n.id)).toContain(m.data['noticeId']);
    });

    it('is sent once: more activity does not send the same notice again', async () => {
      const before = sent.length;
      await call(hr(), 'get', '/leave/types').expect(200);
      await call(hr(), 'post', '/leave/types').send({ name: `Another ${uniq()}`, paid: true, quotaDays: '5' }).catch(() => undefined);
      await new Promise((r) => setTimeout(r, 2500));
      expect(sent.length).toBe(before);
    });

    it('a provider that is down costs the push and nothing else: the request succeeds and the notice is in the inbox', async () => {
      behaviour.fail = true;
      const before = sent.length;
      const id = await ask('2090-05-09');
      await new Promise((r) => setTimeout(r, 2500));
      expect(sent.length).toBe(before);
      const mine = (await call(teacher(), 'get', '/leave/requests').expect(200)).body.items as Array<{ id: string }>;
      expect(mine.some((r) => r.id === id)).toBe(true);
      const inbox = (await call(principal(), 'get', '/notifications').expect(200)).body.items as Array<{ entityId: string | null }>;
      expect(inbox.some((n) => n.entityId?.replaceAll('-', '') === id.replaceAll('-', ''))).toBe(true);
      behaviour.fail = false;
    });

    it('someone who switched that kind of notice off is not pushed', async () => {
      await call(principal(), 'put', '/notifications/preferences/leave').send({ enabled: false }).expect(200);
      const before = sent.length;
      await ask('2090-05-10');
      await new Promise((r) => setTimeout(r, 2500));
      expect(sent.length).toBe(before);
      await call(principal(), 'put', '/notifications/preferences/leave').send({ enabled: true }).expect(200);
    });

    it('a token the provider says is dead is forgotten', async () => {
      const dead = tok('dead-phone');
      await bare(principal(), 'post', '/devices').send({ token: dead, platform: 'ANDROID' }).expect(204);
      behaviour.dead = [dead];
      const before = (await devices(principal())).length;
      await ask('2090-05-11');
      expect(await waitFor(async () => (await devices(principal())).length === before - 1)).toBe(true);
      behaviour.dead = [];
    });

    it('signing out stops the pushes to that phone', async () => {
      await bare(principal(), 'delete', '/devices').send({ token: ptoken }).expect(204);
      sent.length = 0;
      await ask('2090-05-12');
      await new Promise((r) => setTimeout(r, 2500));
      expect(sent.map((m) => m.token)).not.toContain(ptoken);
    });
  });
});
