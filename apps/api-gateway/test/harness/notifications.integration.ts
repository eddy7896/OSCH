// P3-9 against the REAL stack: the in-app inbox. A notification is made by the same step as its cause; a user reads only their own; the words come in the reader's language.
import { type INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { agent } from '../support/serve.js';
import { bootRealApp } from './app.js';
import { requireEmulatorsOrSkip } from './emulators.js';
import { buildWorld, type Person, type World } from './fixtures.js';

const ready = requireEmulatorsOrSkip();
let app: INestApplication | undefined;
let w: World | undefined;
if (ready) {
  app = await bootRealApp([], {});
  w = await buildWorld();
}

const DATE = '2090-05-08'; // a Monday

describe.skipIf(!ready)('notifications against the real emulators (P3-9)', { timeout: 180_000 }, () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const B = () => w!.schools.B;
  const acad = () => w!.roles.A.ACADEMIC_ADMIN;
  const hr = () => w!.roles.A.HR_MANAGER;
  const principal = () => w!.roles.A.PRINCIPAL;
  const teacher = () => w!.roles.A.TEACHER;
  const subUser = () => w!.roles.A.STAFF; // the substitute
  const call = (method: 'get' | 'post' | 'put' | 'patch' | 'delete', path: string, who: Person = hr(), school: string | null = A()) => {
    const r = agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`);
    return school ? r.set('X-School-Id', school) : r;
  };
  const uniq = () => randomUUID().slice(0, 6);
  const inbox = async (who: Person, q = '') => (await call('get', `/notifications${q}`, who).expect(200)).body as { unreadCount: number; items: Array<{ id: string; kind: string; category: string; title: string; body: string; read: boolean }> };

  let unpaid = '', requestId = '', entryId = '', subStaff = '';

  beforeAll(async () => {
    const y = (await call('post', '/academics/years', acad()).send({ name: `NT-${uniq()}`, startDate: '2090-04-01', endDate: '2091-03-31' }).expect(201)).body;
    await call('post', `/academics/years/${y.id}/activate`, acad()).send({}).expect(200);
    unpaid = (await call('post', '/leave/types').send({ name: 'Unpaid', paid: false }).expect(201)).body.id;
    const staff = async (first: string, user: Person) => { const id = ((await call('post', '/staff').send({ firstName: first, lastName: 'Note' }).expect(201)).body as { id: string }).id; await call('put', `/staff/${id}/account`).send({ userId: user.uid }).expect(200); return id; };
    const teacherStaff = await staff('Tara', teacher());
    subStaff = await staff('Sunil', subUser());
    const period = (await call('post', '/academics/periods', acad()).send({ label: 'One', startTime: '08:00', endTime: '08:40' }).expect(201)).body.id;
    const subject = (await call('post', '/academics/subjects', acad()).send({ name: `Maths ${uniq()}`, code: uniq().toUpperCase() }).expect(201)).body.id;
    const level = ((await call('get', '/academics/levels', acad()).expect(200)).body.items as Array<{ id: string; name: string }>)[0]!;
    const klass = (await call('post', '/academics/classes', acad()).send({ gradeLevelId: level.id, section: `N${uniq()}`.slice(0, 6), capacity: 30 }).expect(201)).body.id;
    for (const s of [teacherStaff, subStaff]) await call('post', `/academics/teachers/${s}/subjects`, acad()).send({ subjectId: subject }).expect(201);
    entryId = (await call('put', `/academics/timetable/classes/${klass}/slots`, acad()).send({ day: 'MON', periodId: period, subjectId: subject, staffId: teacherStaff }).expect(200)).body.entries[0].id;
  }, 120_000);

  it('asking for leave tells the Principal, and only the Principal role', async () => {
    const resp = await call('post', '/leave/requests', teacher()).send({ leaveTypeId: unpaid, startDate: DATE, endDate: DATE, reason: 'Family' }); if (resp.status !== 201) throw new Error(JSON.stringify(resp.body)); requestId = resp.body.id;
    const p = await inbox(principal());
    expect(p.unreadCount).toBe(1);
    expect(p.items[0]).toMatchObject({ kind: 'leave.requested', category: 'leave', title: 'Leave to decide', read: false });
    expect(p.items[0]!.body).toBe('Tara Note asked for 1 day(s) of Unpaid leave from 08-05-2090 to 08-05-2090.');
    for (const who of [teacher(), hr(), acad(), subUser(), w!.roles.A.BURSAR]) expect((await inbox(who)).items, who.email).toEqual([]);
  });

  it('approving unpaid leave tells the requester, the Academic admin (substitutes) and HR (payroll); a refused approval tells nobody', async () => {
    await call('post', `/leave/requests/${requestId}/approve`, hr()).send({}).expect(403);
    expect((await inbox(teacher())).items).toEqual([]);
    await call('post', `/leave/requests/${requestId}/approve`, principal()).send({}).expect(200);
    const t = await inbox(teacher());
    expect(t.items.map((n) => n.kind)).toEqual(['leave.approved']);
    expect(t.items[0]).toMatchObject({ title: 'Your leave was approved', body: 'Unpaid, 08-05-2090 to 08-05-2090 (1 day(s)).' });
    expect((await inbox(acad())).items.map((n) => [n.kind, n.category])).toEqual([['leave.substitution', 'substitution']]);
    expect((await inbox(acad())).items[0]!.body).toBe('Tara Note is on leave from 08-05-2090 to 08-05-2090. Choose substitutes on the substitution board.');
    expect((await inbox(hr())).items.map((n) => [n.kind, n.category])).toEqual([['leave.payroll', 'payroll']]);
    expect((await inbox(principal())).items.map((n) => n.kind)).toEqual(['leave.requested']); // the Principal's own list did not grow
    expect((await inbox(w!.roles.A.BURSAR)).items).toEqual([]);
  });

  it('choosing and clearing a substitute tells that teacher', async () => {
    await call('put', '/substitutions', acad()).send({ entryId, date: DATE, substituteStaffId: subStaff }).expect(200);
    const s = await inbox(subUser());
    expect(s.items[0]).toMatchObject({ kind: 'substitution.assigned', title: 'You are covering a class' });
    expect(s.items[0]!.body).toMatch(/^.+, Maths .+, One on 08-05-2090, covering for Tara Note\.$/);
    const duty = (await call('get', `/substitutions/needs?from=${DATE}&to=${DATE}`, acad()).expect(200)).body.items[0].cover.id;
    await call('delete', `/substitutions/${duty}`, acad()).expect(204);
    expect((await inbox(subUser())).items.map((n) => n.kind)).toEqual(['substitution.cleared', 'substitution.assigned']); // newest first
    expect((await inbox(teacher())).items.map((n) => n.kind)).toEqual(['leave.approved']); // not the absent teacher
  });

  it('reading is yours alone: mark one, mark all, the count falls; nobody else\'s can be marked; the Principal role\'s notice is read per person', async () => {
    const s = await inbox(subUser());
    expect(s.unreadCount).toBe(2);
    await call('post', `/notifications/${s.items[0]!.id}/read`, subUser()).expect(204);
    await call('post', `/notifications/${s.items[0]!.id}/read`, subUser()).expect(204); // again is the same
    expect((await inbox(subUser())).unreadCount).toBe(1);
    expect((await inbox(subUser(), '?unread=true')).items.map((n) => n.id)).toEqual([s.items[1]!.id]);
    await call('post', `/notifications/${s.items[1]!.id}/read`, teacher()).expect(404); // someone else's
    await call('post', `/notifications/${s.items[1]!.id}/read`, w!.roles.B.ACADEMIC_ADMIN, B()).expect(404);
    await call('post', `/notifications/${randomUUID()}/read`, subUser()).expect(404);
    await call('post', '/notifications/nope/read', subUser()).expect(400);
    expect((await call('post', '/notifications/read-all', subUser()).expect(200)).body).toEqual({ marked: 1 });
    expect((await inbox(subUser())).unreadCount).toBe(0);
    expect((await call('post', '/notifications/read-all', subUser()).expect(200)).body).toEqual({ marked: 0 });
    expect((await inbox(principal())).unreadCount).toBe(1); // reading elsewhere did not touch it
  });

  it('preferences hide a category from your inbox without deleting anything', async () => {
    expect((await call('get', '/notifications/preferences', acad()).expect(200)).body.items).toEqual([{ category: 'leave', enabled: true }, { category: 'substitution', enabled: true }, { category: 'payroll', enabled: true }, { category: 'announcement', enabled: true }, { category: 'studentleave', enabled: true }, { category: 'resourcecomment', enabled: true }]);
    await call('put', '/notifications/preferences/substitution', acad()).send({ enabled: false }).expect(200);
    expect((await inbox(acad())).items).toEqual([]);
    expect((await inbox(hr())).items).toHaveLength(1); // somebody else's preference
    expect((await call('get', '/notifications/preferences', acad()).expect(200)).body.items.find((i: { category: string }) => i.category === 'substitution')).toEqual({ category: 'substitution', enabled: false });
    await call('put', '/notifications/preferences/substitution', acad()).send({ enabled: true }).expect(200);
    expect((await inbox(acad())).items).toHaveLength(1);
    await call('put', '/notifications/preferences/other', acad()).send({ enabled: false }).expect(400);
    await call('put', '/notifications/preferences/leave', acad()).send({ enabled: 'no' }).expect(400);
  });

  it('the words come in the reader\'s own language (Hindi and Urdu drafts), with English for anything missing', async () => {
    await call('patch', '/me/preferences', hr(), null).send({ language: 'hi' }).expect(200);
    const hi = (await inbox(hr())).items[0]!;
    expect(hi.kind).toBe('leave.payroll');
    expect(hi.title).toBe('कटौती के लिए बिना वेतन की छुट्टी');
    expect(hi.body).toContain('08-05-2090');
    expect(hi.body).not.toMatch(/\{/);
    await call('patch', '/me/preferences', hr(), null).send({ language: 'ur' }).expect(200);
    expect((await inbox(hr())).items[0]!.title).toBe('کٹوتی کے لیے بلا تنخواہ رخصت');
    await call('patch', '/me/preferences', hr(), null).send({ language: null }).expect(200);
    expect((await inbox(hr())).items[0]!.title).toBe('Unpaid leave to deduct');
  });

  it('every role has an inbox, a parent too; another school has none of this', async () => {
    for (const who of [w!.roles.A.PARENT, w!.roles.A.DRIVER, w!.roles.A.MANAGEMENT, w!.roles.A.ACCOUNTANT]) expect((await call('get', '/notifications', who)).status, who.email).toBe(200);
    expect((await inbox(w!.roles.A.PARENT)).items).toEqual([]);
    await call('get', '/notifications', w!.roles.B.ACADEMIC_ADMIN).expect(403); // B's admin has no membership in A
    const r = await call('get', '/notifications', w!.roles.B.ACADEMIC_ADMIN, B()).expect(200);
    expect(r.body.items).toEqual([]);
    await call('get', '/notifications?limit=0').expect(400);
    await call('get', '/notifications?limit=500').expect(400);
    await call('get', '/notifications?unread=maybe').expect(400);
  });
});
