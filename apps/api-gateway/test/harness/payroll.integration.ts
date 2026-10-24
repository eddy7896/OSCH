// P2-8 against the REAL stack: salary lines, payroll runs (draft, approved by the Principal, paid by the Bursar) and payslips, through the gateway.
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

describe.skipIf(!ready)('payroll against the real emulators (P2-8)', { timeout: 120_000 }, () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const B = () => w!.schools.B;
  const hr = () => w!.roles.A.HR_MANAGER;
  const principal = () => w!.roles.A.PRINCIPAL;
  const bursar = () => w!.roles.A.BURSAR;
  const call = (method: 'get' | 'post' | 'patch' | 'delete', path: string, who: Person = hr(), school = A()) =>
    agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const pdf = (id: string, who: Person = hr(), school = A(), query = '') =>
    agent(app!).get(`/v1/payroll/payslips/${id}/pdf${query}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school).buffer(true).parse((res, cb) => { const chunks: Buffer[] = []; res.on('data', (c: Buffer) => chunks.push(c)); res.on('end', () => cb(null, Buffer.concat(chunks))); });
  const audit = async (school: string, action: string) => (await w!.db.listAuditLog({ schoolId: school.replaceAll('-', ''), limit: 1000, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  const uniq = () => randomUUID().slice(0, 6);

  /** A run period nobody else in this file uses: each test takes the next month, counting up from January 2003. */
  let periods = 0;
  const nextPeriod = () => { const n = periods++; return { year: 2003 + Math.floor(n / 12), month: (n % 12) + 1 }; };
  const person = async (first: string, lines: Array<[string, string, string]>, extra: Record<string, unknown> = {}) => {
    const s = (await call('post', '/staff', w!.roles.A.SYSTEM_ADMIN).send({ firstName: first, lastName: `P${uniq()}`, department: 'Science', designation: 'Teacher', ...extra }).expect(201)).body;
    for (const [kind, name, amountMinor] of lines) await call('post', `/payroll/staff/${s.id}/salary-lines`).send({ kind, name, amountMinor }).expect(201);
    return s as { id: string; employeeId: string; firstName: string; lastName: string };
  };
  /** Only the staff made in this test are in the run, because the run takes every active person with salary lines: park everybody else first. */
  const parkOthers = async (keep: string[]) => {
    const all = (await call('get', '/staff?pageSize=100', w!.roles.A.SYSTEM_ADMIN).expect(200)).body.items as Array<{ id: string; status: string }>;
    for (const s of all) if (s.status === 'ACTIVE' && !keep.includes(s.id)) await call('patch', `/staff/${s.id}`, w!.roles.A.SYSTEM_ADMIN).send({ status: 'INACTIVE' }).expect(200);
  };

  it('salary lines: earnings and deductions per person, totals exact, a name once per person, validation, other schools see nothing', async () => {
    const s = await person('Asha', [['EARNING', 'Basic pay', '4600000'], ['EARNING', 'House rent allowance', '1800000'], ['DEDUCTION', 'Advance recovery', '250000']]);
    const sal = (await call('get', `/payroll/staff/${s.id}/salary`).expect(200)).body;
    expect(sal.lines.map((l: { kind: string; name: string }) => [l.kind, l.name])).toEqual([['EARNING', 'Basic pay'], ['EARNING', 'House rent allowance'], ['DEDUCTION', 'Advance recovery']]);
    expect(sal).toMatchObject({ grossMinor: '6400000', deductionsMinor: '250000', netMinor: '6150000', staff: { employeeId: s.employeeId } });
    await call('post', `/payroll/staff/${s.id}/salary-lines`).send({ kind: 'EARNING', name: 'Basic pay', amountMinor: '1' }).expect(409);
    for (const bad of [{ kind: 'BONUS', name: 'x', amountMinor: '100' }, { kind: 'EARNING', name: 'x', amountMinor: '0' }, { kind: 'EARNING', name: 'x', amountMinor: '12.5' }, { kind: 'EARNING', name: '', amountMinor: '100' }, { kind: 'EARNING', name: 'x', amountMinor: '1000000000000000' }, { kind: 'EARNING', name: 'x' }])
      await call('post', `/payroll/staff/${s.id}/salary-lines`).send(bad).expect(400);
    const basic = sal.lines[0];
    const upd = (await call('patch', `/payroll/salary-lines/${basic.id}`).send({ amountMinor: '4700000' }).expect(200)).body;
    expect(upd.grossMinor).toBe('6500000');
    await call('patch', `/payroll/salary-lines/${basic.id}`).send({}).expect(400);
    await call('delete', `/payroll/salary-lines/${sal.lines[2].id}`).expect(403); // HR prepares, only the Bursar deletes
    expect((await call('delete', `/payroll/salary-lines/${sal.lines[2].id}`, bursar()).expect(200)).body.lines).toHaveLength(2);
    const b = w!.roles.B.HR_MANAGER;
    await call('get', `/payroll/staff/${s.id}/salary`, b, B()).expect(404);
    await call('post', `/payroll/staff/${s.id}/salary-lines`, b, B()).send({ kind: 'EARNING', name: 'x', amountMinor: '100' }).expect(404);
    await call('patch', `/payroll/salary-lines/${basic.id}`, b, B()).send({ amountMinor: '1' }).expect(404);
    await call('delete', `/payroll/salary-lines/${basic.id}`, w!.roles.B.BURSAR, B()).expect(404);
    await call('get', `/payroll/staff/${s.id}/salary`, b, A()).expect(403);
  });

  it('a run copies the salary lines of every active person who has them; the month rules and one run per month hold', async () => {
    const asha = await person('Asha', [['EARNING', 'Basic pay', '4600000'], ['DEDUCTION', 'Advance recovery', '250000']]);
    const bilal = await person('Bilal', [['EARNING', 'Basic pay', '3000000']]);
    const left = await person('Left', [['EARNING', 'Basic pay', '2000000']]);
    await person('NoSalary', []);
    await call('patch', `/staff/${left.id}`, w!.roles.A.SYSTEM_ADMIN).send({ status: 'LEFT' }).expect(200);
    await parkOthers([asha.id, bilal.id]);
    const p = nextPeriod();
    const run = (await call('post', '/payroll/runs').send(p).expect(201)).body;
    expect(run).toMatchObject({ year: p.year, month: p.month, status: 'DRAFT', approvedBy: null, paidBy: null, preparedBy: { id: hr().uid } });
    expect(run.payslips.map((s: { staff: { id: string } }) => s.staff.id).sort()).toEqual([asha.id, bilal.id].sort());
    expect(run.totals).toEqual({ payslips: 2, grossMinor: '7600000', deductionsMinor: '250000', netMinor: '7350000' });
    const ashaSlip = run.payslips.find((s: { staff: { id: string } }) => s.staff.id === asha.id);
    expect(ashaSlip).toMatchObject({ grossMinor: '4600000', deductionsMinor: '250000', netMinor: '4350000' });
    expect(ashaSlip.lines.map((l: { name: string; manual: boolean }) => [l.name, l.manual])).toEqual([['Basic pay', false], ['Advance recovery', false]]);
    await call('post', '/payroll/runs').send(p).expect(409); // that month already has a run
    const far = new Date(); far.setUTCMonth(far.getUTCMonth() + 3);
    await call('post', '/payroll/runs').send({ year: far.getUTCFullYear(), month: far.getUTCMonth() + 1 }).expect(400); // too far ahead
    await call('post', '/payroll/runs').send({ year: 2030, month: 13 }).expect(400);
    await call('post', '/payroll/runs').send({ year: 2030 }).expect(400);
    await call('post', '/payroll/runs').send({ ...nextPeriod(), staffId: asha.id }).expect(400); // nothing else can be sent
    expect((await call('get', '/payroll/runs').expect(200)).body.items.some((r: { id: string }) => r.id === run.id)).toBe(true);
    // a later change of a salary does not alter a draft that was already made
    const sal = (await call('get', `/payroll/staff/${asha.id}/salary`).expect(200)).body;
    await call('patch', `/payroll/salary-lines/${sal.lines[0].id}`).send({ amountMinor: '9999999' }).expect(200);
    expect((await call('get', `/payroll/runs/${run.id}`).expect(200)).body.totals.grossMinor).toBe('7600000');
  });

  it('a draft is edited by hand (extra lines), totals follow exactly, and the draft can be deleted by the Bursar', async () => {
    const s = await person('Edit', [['EARNING', 'Basic pay', '3000000']]);
    await parkOthers([s.id]);
    const run = (await call('post', '/payroll/runs').send(nextPeriod()).expect(201)).body;
    const slip = run.payslips[0];
    let after = (await call('post', `/payroll/payslips/${slip.id}/lines`).send({ kind: 'DEDUCTION', name: 'Unpaid leave (2 days)', amountMinor: '200000' }).expect(201)).body;
    after = (await call('post', `/payroll/payslips/${slip.id}/lines`).send({ kind: 'EARNING', name: 'Overtime', amountMinor: '150000' }).expect(201)).body;
    expect(after.totals).toEqual({ payslips: 1, grossMinor: '3150000', deductionsMinor: '200000', netMinor: '2950000' });
    const manual = after.payslips[0].lines.filter((l: { manual: boolean }) => l.manual);
    expect(manual.map((l: { name: string }) => l.name).sort()).toEqual(['Overtime', 'Unpaid leave (2 days)']);
    after = (await call('delete', `/payroll/payslip-lines/${manual[0].id}`).expect(200)).body;
    expect(after.payslips[0].lines).toHaveLength(2);
    for (const bad of [{ kind: 'X', name: 'a', amountMinor: '1' }, { kind: 'EARNING', name: 'a', amountMinor: '-5' }]) await call('post', `/payroll/payslips/${slip.id}/lines`).send(bad).expect(400);
    await call('delete', `/payroll/runs/${run.id}`).expect(403); // HR cannot delete
    await call('delete', `/payroll/runs/${run.id}`, bursar()).expect(204);
    await call('get', `/payroll/runs/${run.id}`).expect(404);
  });

  it('only the Principal approves: HR and the Bursar are refused; once approved the run is frozen; a second approval is a conflict', async () => {
    const s = await person('Approve', [['EARNING', 'Basic pay', '3000000']]);
    await parkOthers([s.id]);
    const run = (await call('post', '/payroll/runs').send(nextPeriod()).expect(201)).body;
    await call('post', `/payroll/runs/${run.id}/approve`).send({}).expect(403); // HR prepared it
    await call('post', `/payroll/runs/${run.id}/approve`, bursar()).send({}).expect(403);
    await call('post', `/payroll/runs/${run.id}/approve`, w!.roles.A.SYSTEM_ADMIN).send({}).expect(403);
    await call('post', `/payroll/runs/${run.id}/approve`, w!.roles.A.MANAGEMENT).send({}).expect(403);
    expect((await call('get', `/payroll/runs/${run.id}`).expect(200)).body.status).toBe('DRAFT');
    const ok = (await call('post', `/payroll/runs/${run.id}/approve`, principal()).send({}).expect(200)).body;
    expect(ok).toMatchObject({ status: 'APPROVED', approvedBy: { id: principal().uid }, preparedBy: { id: hr().uid } });
    expect(ok.approvedAt).toBeTruthy();
    await call('post', `/payroll/runs/${run.id}/approve`, principal()).send({}).expect(409);
    const slip = ok.payslips[0];
    await call('post', `/payroll/payslips/${slip.id}/lines`).send({ kind: 'DEDUCTION', name: 'Late', amountMinor: '1' }).expect(409);
    await call('delete', `/payroll/payslip-lines/${slip.lines[0].id}`).expect(409);
    await call('delete', `/payroll/runs/${run.id}`, bursar()).expect(409);
    expect((await call('get', `/payroll/runs/${run.id}`).expect(200)).body.totals.netMinor).toBe('3000000');
  });

  it('simultaneous approvals: exactly one wins, the rest are conflicts', async () => {
    const s = await person('Race', [['EARNING', 'Basic pay', '3000000']]);
    await parkOthers([s.id]);
    const run = (await call('post', '/payroll/runs').send(nextPeriod()).expect(201)).body;
    const res = await Promise.all(Array.from({ length: 4 }, () => call('post', `/payroll/runs/${run.id}/approve`, principal()).send({})));
    expect(res.filter((r) => r.status === 200)).toHaveLength(1);
    expect(res.filter((r) => r.status === 409)).toHaveLength(3);
    expect((await audit(A(), 'payroll.run.approve')).filter((r) => String(JSON.stringify(r.details)).includes('"payslips":1')).length).toBeGreaterThan(0);
  });

  it('a payslip with deductions above its earnings blocks approval until it is fixed; an empty run cannot be approved', async () => {
    const s = await person('Negative', [['EARNING', 'Basic pay', '100000'], ['DEDUCTION', 'Loan recovery', '150000']]);
    await parkOthers([s.id]);
    const run = (await call('post', '/payroll/runs').send(nextPeriod()).expect(201)).body;
    const refused = await call('post', `/payroll/runs/${run.id}/approve`, principal()).send({}).expect(409);
    expect(refused.body.error.details).toEqual([{ field: `${s.firstName} ${s.lastName}`, rule: 'negativeNetPay' }]);
    const deduction = run.payslips[0].lines.find((l: { kind: string }) => l.kind === 'DEDUCTION');
    await call('delete', `/payroll/payslip-lines/${deduction.id}`).expect(200);
    await call('post', `/payroll/runs/${run.id}/approve`, principal()).send({}).expect(200);
  });

  it('only the Bursar marks an approved run paid, once; a draft cannot be paid; HR and the Principal are refused', async () => {
    const s = await person('Pay', [['EARNING', 'Basic pay', '3000000']]);
    await parkOthers([s.id]);
    const run = (await call('post', '/payroll/runs').send(nextPeriod()).expect(201)).body;
    await call('post', `/payroll/runs/${run.id}/pay`, bursar()).send({}).expect(409); // still a draft
    await call('post', `/payroll/runs/${run.id}/approve`, principal()).send({}).expect(200);
    await call('post', `/payroll/runs/${run.id}/pay`).send({}).expect(403); // HR prepares and edits, it cannot pay
    await call('post', `/payroll/runs/${run.id}/pay`, principal()).send({}).expect(403);
    await call('post', `/payroll/runs/${run.id}/pay`, bursar()).send({ paidOn: '2999-01-01' }).expect(400);
    await call('post', `/payroll/runs/${run.id}/pay`, bursar()).send({ paidOn: '2020-02-30' }).expect(400);
    const paid = (await call('post', `/payroll/runs/${run.id}/pay`, bursar()).send({ paidOn: '2020-04-30', reference: 'NEFT-998877' }).expect(200)).body;
    expect(paid).toMatchObject({ status: 'PAID', paidOn: '2020-04-30', paymentReference: 'NEFT-998877', paidBy: { id: bursar().uid }, approvedBy: { id: principal().uid } });
    await call('post', `/payroll/runs/${run.id}/pay`, bursar()).send({}).expect(409);
  });

  it('payslips: JSON, and a PDF in the school language (or the one asked for) once the run is approved; not for a draft; other schools and roles refused', async () => {
    const s = await person('Slip', [['EARNING', 'Basic pay', '4600000'], ['EARNING', 'House rent allowance', '1800000'], ['DEDUCTION', 'Advance recovery', '250000']]);
    await parkOthers([s.id]);
    const run = (await call('post', '/payroll/runs').send(nextPeriod()).expect(201)).body;
    const slipId = run.payslips[0].id;
    expect((await call('get', `/payroll/payslips/${slipId}`).expect(200)).body).toMatchObject({ grossMinor: '6400000', deductionsMinor: '250000', netMinor: '6150000', staff: { employeeId: s.employeeId, department: 'Science' } });
    expect((await pdf(slipId)).status).toBe(409); // a draft is a working paper, not a payslip
    await call('post', `/payroll/runs/${run.id}/approve`, principal()).send({}).expect(200);
    const en = await pdf(slipId);
    expect(en.status).toBe(200);
    expect(en.headers['content-type']).toMatch(/application\/pdf/);
    expect(en.headers['content-disposition']).toContain('payslip-');
    const bytes = en.body as Buffer;
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(5_000);
    const hi = (await pdf(slipId, hr(), A(), '?lang=hi')).body as Buffer;
    const ur = (await pdf(slipId, hr(), A(), '?lang=ur')).body as Buffer;
    expect(hi.equals(bytes)).toBe(false);
    expect(ur.toString('latin1')).toMatch(/Nastaliq/i);
    expect(hi.toString('latin1')).toMatch(/Devanagari/i);
    expect((await pdf(slipId, hr(), A(), '?lang=zz')).status).toBe(400);
    const b = w!.roles.B.HR_MANAGER;
    await call('get', `/payroll/payslips/${slipId}`, b, B()).expect(404);
    expect((await pdf(slipId, b, B())).status).toBe(404);
    await call('get', `/payroll/runs/${run.id}`, b, B()).expect(404);
    for (const who of [w!.roles.A.ACADEMIC_ADMIN, w!.roles.A.ACCOUNTANT, w!.roles.A.TEACHER, w!.roles.A.MANAGEMENT, w!.roles.A.DRIVER]) expect((await pdf(slipId, who)).status, who.uid).toBe(403);
    expect((await pdf(slipId, principal())).status).toBe(200);
    expect((await pdf(slipId, bursar())).status).toBe(200);
  });

  it('roles: HR prepares, Bursar prepares and pays, Principal reads and approves; everyone else is refused or sees nothing', async () => {
    const run = (await call('get', '/payroll/runs', principal()).expect(200)).body.items[0];
    await call('get', '/payroll/runs', bursar()).expect(200);
    for (const who of [w!.roles.A.ACADEMIC_ADMIN, w!.roles.A.ACCOUNTANT, w!.roles.A.TEACHER, w!.roles.A.MANAGEMENT, w!.roles.A.DRIVER, w!.roles.A.ADMISSIONS_OFFICER]) {
      await call('get', '/payroll/runs', who).expect(403);
      await call('post', '/payroll/runs', who).send(nextPeriod()).expect(403);
    }
    await call('get', '/payroll/runs', w!.roles.A.PARENT).expect(403); // parents have no payroll grant at all
    await call('get', `/payroll/runs/${run.id}`, w!.roles.A.PARENT).expect(403);
    await call('post', '/payroll/runs', principal()).send(nextPeriod()).expect(403); // the Principal approves, it does not prepare
  });

  it('audit: every step left a row with the verified actor; approval by the Principal, payment by the Bursar', async () => {
    for (const a of ['payroll.salaryline.add', 'payroll.salaryline.update', 'payroll.salaryline.remove', 'payroll.run.create', 'payroll.payslip.create', 'payroll.payslipline.add', 'payroll.payslipline.remove', 'payroll.run.delete', 'payroll.run.approve', 'payroll.run.pay'])
      expect((await audit(A(), a)).length, a).toBeGreaterThan(0);
    expect((await audit(A(), 'payroll.run.approve')).every((r) => r.actor.id === principal().uid)).toBe(true);
    expect((await audit(A(), 'payroll.run.pay')).every((r) => r.actor.id === bursar().uid)).toBe(true);
    expect((await audit(B(), 'payroll.run.create')).length).toBe(0);
  });
});
