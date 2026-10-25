// P3-6 against the REAL stack: leave types, allowances and requests, and E-ACAD-4 (only the Principal approves), through the gateway.
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

/** The n-th Monday on or after 1 May 2090, plus `plus` days. */
const monday = (n: number, plus = 0): string => {
  const d = new Date('2090-05-01T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7) + 7 * n + plus);
  return d.toISOString().slice(0, 10);
};

describe.skipIf(!ready)('leave against the real emulators (P3-6)', { timeout: 180_000 }, () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const B = () => w!.schools.B;
  const hr = () => w!.roles.A.HR_MANAGER;
  const teacher = () => w!.roles.A.TEACHER;
  const principal = () => w!.roles.A.PRINCIPAL;
  const call = (method: 'get' | 'post' | 'put' | 'patch' | 'delete', path: string, who: Person = hr(), school = A()) =>
    agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const audit = async (action: string) => (await w!.db.listAuditLog({ schoolId: A().replaceAll('-', ''), limit: 500, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  const uniq = () => randomUUID().slice(0, 6);

  let casual = '', unpaid = '', staffT = '', year = '';
  const ask = (b: object, who: Person = teacher()) => call('post', '/leave/requests', who).send({ leaveTypeId: casual, startDate: monday(1), endDate: monday(1), ...b });
  const mine = async (status?: string) => (await call('get', `/leave/requests${status ? `?status=${status}` : ''}`, teacher()).expect(200)).body.items as Array<{ id: string; status: string; days: string }>;
  const remaining = async () => (await call('get', '/leave/balances', teacher()).expect(200)).body.items.find((b: { type: { id: string } }) => b.type.id === casual).remainingDays as string;

  beforeAll(async () => {
    const y = (await call('post', '/academics/years', w!.roles.A.ACADEMIC_ADMIN).send({ name: `LV-${uniq()}`, startDate: '2090-04-01', endDate: '2091-03-31' }).expect(201)).body;
    await call('post', `/academics/years/${y.id}/activate`, w!.roles.A.ACADEMIC_ADMIN).send({}).expect(200);
    year = y.id;
    casual = (await call('post', '/leave/types').send({ name: 'Casual', paid: true, quotaDays: '3' }).expect(201)).body.id;
    unpaid = (await call('post', '/leave/types').send({ name: 'Unpaid', paid: false }).expect(201)).body.id;
    staffT = ((await call('post', '/staff').send({ firstName: 'Tara', lastName: 'Teach' }).expect(201)).body as { id: string }).id;
    await call('put', `/staff/${staffT}/account`).send({ userId: teacher().uid }).expect(200);
  }, 120_000);

  it('types: HR keeps them; a paid type needs a yearly allowance; names are unique; everyone can read them', async () => {
    expect((await call('get', '/leave/types', teacher()).expect(200)).body.items).toEqual(expect.arrayContaining([{ id: casual, name: 'Casual', paid: true, quotaDays: '3' }, { id: unpaid, name: 'Unpaid', paid: false, quotaDays: '0' }]));
    await call('post', '/leave/types').send({ name: 'Casual', paid: true, quotaDays: '3' }).expect(409);
    for (const bad of [{ name: 'X', paid: true }, { name: 'X', paid: true, quotaDays: '0' }, { name: 'X', paid: true, quotaDays: '2.3' }, { name: '', paid: false }, { name: 'X' }, { name: 'X', paid: false, extra: 1 }]) await call('post', '/leave/types').send(bad).expect(400);
    const sick = (await call('post', '/leave/types').send({ name: 'Sick', paid: true, quotaDays: '7.5' }).expect(201)).body;
    expect(sick.quotaDays).toBe('7.5');
    expect((await call('patch', `/leave/types/${sick.id}`).send({ quotaDays: '9' }).expect(200)).body.quotaDays).toBe('9');
    await call('patch', `/leave/types/${sick.id}`).send({}).expect(400);
    await call('delete', `/leave/types/${sick.id}`).expect(204);
    await call('delete', `/leave/types/${sick.id}`).expect(404);
    for (const who of [teacher(), principal(), w!.roles.A.ACADEMIC_ADMIN, w!.roles.A.BURSAR]) await call('post', '/leave/types', who).send({ name: `No ${uniq()}`, paid: false }).expect(403);
    expect((await audit('leave.type.create')).length).toBeGreaterThanOrEqual(3);
  });

  it('an employee asks for their own leave; the request is counted in working days and half days; a person cannot ask twice for the same time', async () => {
    const a = (await ask({}).expect(201)).body;
    expect(a).toMatchObject({ status: 'PENDING', days: '1', half: null, staff: { id: staffT }, type: { id: casual, paid: true }, decision: null });
    expect((await ask({ startDate: monday(1), endDate: monday(1, 2) }).expect(409)).body.error.details).toEqual([{ field: 'startDate', rule: 'overlapsAnotherRequest' }]);
    const b = (await ask({ startDate: monday(1, 1), endDate: monday(1, 1), half: 'MORNING' }).expect(201)).body;
    expect(b.days).toBe('0.5');
    await ask({ startDate: monday(1, 1), endDate: monday(1, 1), half: 'AFTERNOON' }).expect(201); // the other half of that day is free
    await ask({ startDate: monday(1, 1), endDate: monday(1, 1), half: 'MORNING' }).expect(409);
    await ask({ startDate: monday(1, 1), endDate: monday(1, 1) }).expect(409);
    const week = (await ask({ leaveTypeId: unpaid, startDate: monday(2), endDate: monday(2, 6) }).expect(201)).body; // Monday to Sunday: six working days
    await ask({ startDate: monday(7), endDate: monday(7, 1) }).expect(201); // two days: fits the three a year now, not after the others are approved
    expect(week.days).toBe('6');
    expect((await call('get', '/leave/requests', teacher()).expect(200)).body.items).toHaveLength(5);
    expect((await audit('leave.request.create')).length).toBeGreaterThanOrEqual(4);
    // cancelling frees the time
    await call('post', `/leave/requests/${week.id}/cancel`, teacher()).expect(200);
    expect((await mine('CANCELLED')).map((r) => r.id)).toEqual([week.id]);
    await call('post', `/leave/requests/${week.id}/cancel`, teacher()).expect(409);
  });

  it('refuses a bad request with the rule named: half over two days, a Sunday, outside the year, backwards, over the balance, a stranger\'s type, no staff record', async () => {
    const rule = async (b: object, status = 400) => (await ask(b).expect(status)).body.error.details[0];
    expect(await rule({ half: 'MORNING', endDate: monday(1, 1) })).toEqual({ field: 'startDate', rule: 'halfNeedsOneDay' });
    expect(await rule({ startDate: monday(1, 6), endDate: monday(1, 6) })).toEqual({ field: 'startDate', rule: 'noWorkingDays' });
    expect(await rule({ startDate: monday(1, 6), endDate: monday(1, 6), half: 'MORNING' })).toEqual({ field: 'startDate', rule: 'notAWorkingDay' });
    expect(await rule({ startDate: monday(3), endDate: monday(2) })).toEqual({ field: 'endDate', rule: 'endBeforeStart' });
    expect(await rule({ startDate: '2089-01-05', endDate: '2089-01-05' })).toEqual({ field: 'startDate', rule: 'withinOneAcademicYear' });
    expect(await rule({ startDate: '2091-03-30', endDate: '2091-04-03' })).toEqual({ field: 'startDate', rule: 'withinOneAcademicYear' });
    expect(await rule({ startDate: monday(5), endDate: monday(5, 5) }, 409)).toEqual({ field: 'endDate', rule: 'overBalance' }); // 6 days asked, 3 a year
    await ask({ leaveTypeId: randomUUID() }).expect(400);
    await ask({ startDate: '2090-02-30', endDate: '2090-03-01' }).expect(400);
    await ask({ half: 'EVENING' }).expect(400);
    await ask({ extra: 1 }).expect(400);
    await ask({ startDate: monday(6), endDate: monday(6) }, w!.roles.A.BURSAR).expect(409); // an account with no staff record
  });

  it('E-ACAD-4: only the Principal approves; HR, Bursar, Academic admin, Management and the requester are refused and nothing changes', async () => {
    const pending = (await mine('PENDING')).find((r) => r.days === '1')!;
    const r = w!.roles.A;
    for (const who of [r.HR_MANAGER, r.BURSAR, r.ACADEMIC_ADMIN, r.MANAGEMENT, r.ACCOUNTANT, r.SYSTEM_ADMIN, r.ADMISSIONS_OFFICER, teacher()]) {
      await call('post', `/leave/requests/${pending.id}/approve`, who).expect(403);
      await call('post', `/leave/requests/${pending.id}/reject`, who).send({}).expect(403);
    }
    expect((await mine()).find((x) => x.id === pending.id)!.status).toBe('PENDING');
    expect(await remaining()).toBe('3');
    const ok = (await call('post', `/leave/requests/${pending.id}/approve`, principal()).expect(200)).body;
    expect(ok).toMatchObject({ status: 'APPROVED', decision: { by: expect.any(String), note: null } });
    expect(await remaining()).toBe('2'); // one day taken in the same step
    expect((await audit('leave.request.approve')).length).toBeGreaterThanOrEqual(1);
    await call('post', `/leave/requests/${pending.id}/approve`, principal()).expect(409); // not pending any more
    await call('post', `/leave/requests/${pending.id}/cancel`, teacher()).expect(409); // an approved request is not cancelled by its requester
    expect(await remaining()).toBe('2');
  });

  it('the Principal rejects with a note; a half day uses half a day; leave over the balance cannot be approved; unpaid leave takes nothing', async () => {
    const halves = (await mine('PENDING')).filter((r) => r.days === '0.5');
    const [m, aft] = halves as [typeof halves[number], typeof halves[number]];
    const rej = (await call('post', `/leave/requests/${m.id}/reject`, principal()).send({ note: 'Exams that day' }).expect(200)).body;
    expect(rej).toMatchObject({ status: 'REJECTED', decision: { note: 'Exams that day' } });
    await call('post', `/leave/requests/${m.id}/reject`, principal()).send({}).expect(409);
    expect(await remaining()).toBe('2');
    await call('post', `/leave/requests/${aft.id}/approve`, principal()).expect(200);
    expect(await remaining()).toBe('1.5');
    const big = (await mine('PENDING')).find((r) => r.days === '2')!; // asked for when it fitted; 1.5 days are left now
    await call('post', `/leave/requests/${big.id}/approve`, principal()).expect(409);
    expect((await mine()).find((x) => x.id === big.id)!.status).toBe('PENDING');
    expect(await remaining()).toBe('1.5');
    const u = (await ask({ leaveTypeId: unpaid, startDate: monday(8), endDate: monday(8, 4) }).expect(201)).body;
    expect(u.type.paid).toBe(false);
    await call('post', `/leave/requests/${u.id}/approve`, principal()).expect(200);
    expect(await remaining()).toBe('1.5'); // unpaid leave takes nothing from a balance
    expect((await audit('leave.request.reject')).length).toBeGreaterThanOrEqual(1);
  });

  it('allowances: HR changes what a person may take, never below what is taken; the person reads their own, never another\'s', async () => {
    const put = (allowedDays: string, who: Person = hr()) => call('put', `/leave/balances/${staffT}/${casual}`, who).send({ allowedDays });
    expect((await put('1').expect(409)).body.error.details).toEqual([{ field: 'allowedDays', rule: 'belowDaysTaken' }]); // 1.5 days are taken
    const set = (await put('5').expect(200)).body.items.find((b: { type: { id: string } }) => b.type.id === casual);
    expect(set).toMatchObject({ allowedDays: '5', remainingDays: '3.5', recorded: true });
    await put('abc').expect(400);
    await put('2.25').expect(400);
    await call('put', `/leave/balances/${staffT}/${unpaid}`, hr()).send({ allowedDays: '5' }).expect(400); // unpaid has no allowance
    await call('put', `/leave/balances/${randomUUID()}/${casual}`, hr()).send({ allowedDays: '5' }).expect(404);
    for (const who of [teacher(), principal(), w!.roles.A.BURSAR]) await put('9', who).expect(403);
    expect(await remaining()).toBe('3.5');
    await call('get', `/leave/balances?staffId=${randomUUID()}`, teacher()).expect(404);
    expect((await call('get', `/leave/balances?staffId=${staffT}`, principal()).expect(200)).body.items.length).toBeGreaterThan(0);
    expect((await audit('leave.balance.set')).length).toBe(1);
  });

  it('who sees which requests, and another school sees none of it', async () => {
    const r = w!.roles.A;
    expect((await mine()).length).toBeGreaterThanOrEqual(5);
    for (const who of [r.PRINCIPAL, r.HR_MANAGER, r.BURSAR, r.ACADEMIC_ADMIN]) expect((await call('get', '/leave/requests', who).expect(200)).body.items.length, who.email).toBeGreaterThanOrEqual(5);
    expect((await call('get', '/leave/requests', r.STAFF).expect(200)).body.items).toEqual([]); // no staff record, no leave
    await call('get', `/leave/requests?staffId=${randomUUID()}`, teacher()).expect(404);
    const some = (await mine())[0]!;
    const bP = w!.roles.B.PRINCIPAL;
    await call('post', `/leave/requests/${some.id}/approve`, bP, B()).expect(404);
    await call('post', `/leave/requests/${some.id}/reject`, bP, B()).send({}).expect(404);
    await call('post', `/leave/requests/${some.id}/cancel`, w!.roles.B.TEACHER, B()).expect(404);
    expect((await call('get', '/leave/requests', bP, B()).expect(200)).body.items).toEqual([]);
    expect((await call('get', '/leave/types', bP, B()).expect(200)).body.items).toEqual([]);
    expect(year).toBeTruthy();
  });
});
