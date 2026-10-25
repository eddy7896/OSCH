// P3-8 against the REAL stack (E-ACAD-3): approved unpaid leave raises a substitution need AND a payroll proposal; paid leave only the substitution. Nothing is applied silently.
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

// October 2026: 31 days, 1 Oct is a Thursday, Sundays on 4, 11, 18, 25: the school (Monday to Saturday) works 27 days. Gross 30,000.00 = 3,000,000 paise.
const MON_12 = '2026-10-12', MON_19 = '2026-10-19', TUE_13 = '2026-10-13', NOV_2 = '2026-11-02';

describe.skipIf(!ready)('unpaid leave and payroll against the real emulators (P3-8)', { timeout: 180_000 }, () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const B = () => w!.schools.B;
  const acad = () => w!.roles.A.ACADEMIC_ADMIN;
  const hr = () => w!.roles.A.HR_MANAGER;
  const principal = () => w!.roles.A.PRINCIPAL;
  const call = (method: 'get' | 'post' | 'put' | 'patch' | 'delete', path: string, who: Person = hr(), school = A()) =>
    agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const uniq = () => randomUUID().slice(0, 6);

  let unpaid = '', casual = '', X = '', Y = '', runId = '', slipX = '', entryX = '', entryY = '';
  const xUser = () => w!.roles.A.STAFF;
  const yUser = () => w!.roles.A.TEACHER;
  const ask = async (who: Person, leaveTypeId: string, startDate: string, endDate: string, extra: object = {}) => (await call('post', '/leave/requests', who).send({ leaveTypeId, startDate, endDate, ...extra }).expect(201)).body.id as string;
  const approve = (id: string) => call('post', `/leave/requests/${id}/approve`, principal()).send({}).expect(200);
  const proposals = async (id = runId, who: Person = hr()) => (await call('get', `/payroll/runs/${id}/leave-proposals`, who).expect(200)).body;
  const needs = async (d: string) => (await call('get', `/substitutions/needs?from=${d}&to=${d}`, acad()).expect(200)).body.items as Array<{ absent: { id: string } }>;

  beforeAll(async () => {
    const y = (await call('post', '/academics/years', acad()).send({ name: `PL-${uniq()}`, startDate: '2026-04-01', endDate: '2027-03-31' }).expect(201)).body;
    await call('post', `/academics/years/${y.id}/activate`, acad()).send({}).expect(200);
    unpaid = (await call('post', '/leave/types').send({ name: 'Unpaid', paid: false }).expect(201)).body.id;
    casual = (await call('post', '/leave/types').send({ name: 'Casual', paid: true, quotaDays: '12' }).expect(201)).body.id;
    const staff = async (first: string, user: Person) => { const id = ((await call('post', '/staff').send({ firstName: first, lastName: 'Pay' }).expect(201)).body as { id: string }).id; await call('put', `/staff/${id}/account`).send({ userId: user.uid }).expect(200); return id; };
    [X, Y] = [await staff('Xavier', xUser()), await staff('Yash', yUser())];
    for (const s of [X, Y]) await call('post', `/payroll/staff/${s}/salary-lines`).send({ kind: 'EARNING', name: 'Basic pay', amountMinor: '3000000' }).expect(201);
    // a Monday lesson each, so there is something to cover
    const period = (await call('post', '/academics/periods', acad()).send({ label: 'One', startTime: '08:00', endTime: '08:40' }).expect(201)).body.id;
    const subject = (await call('post', '/academics/subjects', acad()).send({ name: `Maths ${uniq()}`, code: uniq().toUpperCase() }).expect(201)).body.id;
    const klass = async (i: number) => { const lv = ((await call('get', '/academics/levels', acad()).expect(200)).body.items as Array<{ id: string; name: string }>).find((l) => l.name === String(i))!; return (await call('post', '/academics/classes', acad()).send({ gradeLevelId: lv.id, section: `T${uniq()}`.slice(0, 6), capacity: 30 }).expect(201)).body.id as string; };
    for (const s of [X, Y]) await call('post', `/academics/teachers/${s}/subjects`, acad()).send({ subjectId: subject }).expect(201);
    const slot = async (c: string, s: string, day: string) => (await call('put', `/academics/timetable/classes/${c}/slots`, acad()).send({ day, periodId: period, subjectId: subject, staffId: s }).expect(200)).body.entries.find((e: { day: string }) => e.day === day).id as string;
    entryX = await slot(await klass(1), X, 'MON');
    entryY = await slot(await klass(2), Y, 'TUE');
    runId = (await call('post', '/payroll/runs').send({ year: 2026, month: 10 }).expect(201)).body.id;
    slipX = (await call('get', `/payroll/runs/${runId}`).expect(200)).body.payslips.find((p: { staff: { id: string } }) => p.staff.id === X).id;
  }, 120_000);

  it('before approval there is no proposal and no need; approval raises BOTH for unpaid leave, and only the substitution for paid leave (E-ACAD-3)', async () => {
    const unpaidId = await ask(xUser(), unpaid, MON_12, MON_12);
    const paidId = await ask(yUser(), casual, TUE_13, TUE_13);
    expect((await proposals()).items).toEqual([]);
    expect(await needs(MON_12)).toEqual([]);
    await approve(unpaidId);
    await approve(paidId);
    // the unpaid leave: a substitution need for Xavier's lesson AND a payroll proposal for his payslip
    expect((await needs(MON_12)).map((n) => n.absent.id)).toEqual([X]);
    const list = await proposals();
    expect(list).toMatchObject({ run: { id: runId, year: 2026, month: 10, status: 'DRAFT' }, workingDays: 27, withoutPayslip: [] });
    expect(list.items).toHaveLength(1);
    expect(list.items[0]).toMatchObject({ staff: { id: X }, payslipId: slipX, monthlyGrossMinor: '3000000', days: '1', proposedMinor: '111111', applied: null, leaves: [{ id: unpaidId, startDate: MON_12, endDate: MON_12, half: null, days: '1' }] });
    // the paid leave: a substitution need for Yash's lesson, no proposal
    expect((await needs(TUE_13)).map((n) => n.absent.id)).toEqual([Y]);
    expect(list.items.some((i: { staff: { id: string } }) => i.staff.id === Y)).toBe(false);
    // and the payslip is untouched: a proposal is not a deduction
    const slip = (await call('get', `/payroll/payslips/${slipX}`).expect(200)).body;
    expect(slip.lines.map((l: { name: string }) => l.name)).toEqual(['Basic pay']);
    expect(slip.netMinor).toBe('3000000');
  });

  it('pending and rejected unpaid leave raise nothing; leave in another month is not in this month\'s run; a half day is half the cut, rounded down', async () => {
    await ask(xUser(), unpaid, MON_19, MON_19, { half: 'MORNING' }); // pending
    expect((await proposals()).items[0].days).toBe('1');
    const rejected = await ask(xUser(), unpaid, '2026-10-26', '2026-10-26');
    await call('post', `/leave/requests/${rejected}/reject`, principal()).send({}).expect(200);
    await approve(await ask(xUser(), unpaid, NOV_2, NOV_2)); // November
    expect((await proposals()).items[0]).toMatchObject({ days: '1', proposedMinor: '111111' });
    const pendingHalf = (await call('get', '/leave/requests?status=PENDING', principal()).expect(200)).body.items.find((r: { startDate: string }) => r.startDate === MON_19).id;
    await approve(pendingHalf);
    expect((await proposals()).items[0]).toMatchObject({ days: '1.5', proposedMinor: '166666', leaves: expect.arrayContaining([expect.objectContaining({ half: 'MORNING', days: '0.5' })]) }); // 3,000,000 x 3 / 54 = 166,666.6: down
  });

  it('HR applies the proposal as a deduction line, at the proposed amount or an edited one; once; only on a DRAFT run; nobody else can', async () => {
    for (const who of [principal(), w!.roles.A.TEACHER, w!.roles.A.ACADEMIC_ADMIN, w!.roles.A.STAFF]) await call('post', `/payroll/payslips/${slipX}/leave-deduction`, who).send({}).expect(403);
    expect((await proposals()).items[0].applied).toBeNull(); // still only a proposal
    await call('post', `/payroll/payslips/${slipX}/leave-deduction`).send({ amountMinor: '3000001' }).expect(400); // more than the month's gross
    await call('post', `/payroll/payslips/${slipX}/leave-deduction`).send({ amountMinor: '0' }).expect(400); // a deduction is a positive amount
    await call('post', `/payroll/payslips/${slipX}/leave-deduction`).send({ amountMinor: '12.5' }).expect(400);
    await call('post', `/payroll/payslips/${slipX}/leave-deduction`).send({ extra: 1 }).expect(400);
    const applied = (await call('post', `/payroll/payslips/${slipX}/leave-deduction`).send({}).expect(200)).body;
    expect(applied.items[0].applied).toMatchObject({ amountMinor: '166666' });
    await call('post', `/payroll/payslips/${slipX}/leave-deduction`).send({}).expect(409); // once
    const slip = (await call('get', `/payroll/payslips/${slipX}`).expect(200)).body;
    expect(slip.lines.find((l: { name: string }) => l.name === 'Unpaid leave')).toMatchObject({ kind: 'DEDUCTION', amountMinor: '166666', manual: true });
    expect(slip).toMatchObject({ grossMinor: '3000000', deductionsMinor: '166666', netMinor: '2833334' });
    // HR removes it and applies a smaller amount of their own choosing
    await call('delete', `/payroll/payslip-lines/${applied.items[0].applied.lineId}`).expect(200);
    expect((await proposals()).items[0].applied).toBeNull();
    expect((await call('post', `/payroll/payslips/${slipX}/leave-deduction`).send({ amountMinor: '100000' }).expect(200)).body.items[0].applied.amountMinor).toBe('100000');
    // the Principal approves the run; after that nothing can be applied or changed
    await call('post', `/payroll/runs/${runId}/approve`, principal()).send({}).expect(200);
    expect((await proposals()).run.status).toBe('APPROVED');
    expect((await proposals()).items[0].applied.amountMinor).toBe('100000');
    await call('post', `/payroll/payslips/${slipX}/leave-deduction`).send({}).expect(409);
  });

  it('who sees the proposals, and another school sees none of it', async () => {
    const r = w!.roles.A;
    for (const who of [r.HR_MANAGER, r.PRINCIPAL, r.BURSAR]) await call('get', `/payroll/runs/${runId}/leave-proposals`, who).expect(200);
    for (const who of [r.TEACHER, r.ACADEMIC_ADMIN, r.STAFF]) await call('get', `/payroll/runs/${runId}/leave-proposals`, who).expect(403);
    await call('get', `/payroll/runs/${runId}/leave-proposals`, w!.roles.B.HR_MANAGER, B()).expect(404);
    await call('post', `/payroll/payslips/${slipX}/leave-deduction`, w!.roles.B.HR_MANAGER, B()).send({}).expect(404);
    await call('get', `/payroll/runs/${randomUUID()}/leave-proposals`).expect(404);
    expect(entryX && entryY).toBeTruthy();
  });
});
