// P2-9 against the REAL stack: the fee collections, fees outstanding and payroll summary reports (JSON, CSV, PDF), through the gateway.
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

describe.skipIf(!ready)('reports against the real emulators (P2-9)', { timeout: 120_000 }, () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const B = () => w!.schools.B;
  const bursar = () => w!.roles.A.BURSAR;
  const acad = () => w!.roles.A.ACADEMIC_ADMIN;
  const call = (method: 'get' | 'post' | 'patch' | 'delete', path: string, who: Person = bursar(), school = A()) =>
    agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const file = (path: string, who: Person = bursar(), school = A()) =>
    agent(app!).get(`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school).buffer(true).parse((res, cb) => { const chunks: Buffer[] = []; res.on('data', (c: Buffer) => chunks.push(c)); res.on('end', () => cb(null, Buffer.concat(chunks))); });
  const uniq = () => randomUUID().slice(0, 6);
  const today = () => new Date().toISOString().slice(0, 10);
  const shift = (days: number) => { const d = new Date(`${today()}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };

  /** Manual invoices have no year of their own, so a payment's receipt is numbered in the year its date falls in: one must cover today and the days before. */
  let year: { id: string } | undefined;
  const ensureYear = async () => (year ??= (await call('post', '/academics/years', acad()).send({ name: `RY-${uniq()}`, startDate: shift(-60), endDate: shift(300) }).expect(201)).body);
  const kid = async (first = `Rep${uniq()}`) => (await call('post', '/students', acad()).send({ firstName: first, lastName: 'Payer' }).expect(201)).body as { id: string; enrollmentId: string };
  const invoice = async (studentId: string, title: string, amountMinor: string, dueDate: string) => (await call('post', '/fees/invoices').send({ studentId, title, amountMinor, dueDate }).expect(201)).body as { id: string };
  const pay = async (invoiceId: string, amountMinor: string, method: string, extra: Record<string, unknown> = {}) =>
    (await call('post', `/fees/invoices/${invoiceId}/payments`).send({ amountMinor, method, ...extra }).expect(201)).body.payments.at(-1) as { id: string; receipt: { number: string } };

  it('collections: exact totals by method and day, reversed payments listed apart, paging, and the people only for roles that hold finance', async () => {
    await ensureYear();
    const k1 = await kid('Asha'), k2 = await kid('Bilal');
    const day = shift(-3);
    const win = `from=${day}&to=${today()}`;
    const before = (await call('get', `/reports/finance/collections?${win}`).expect(200)).body;
    const i1 = await invoice(k1.id, 'Tuition', '900000', shift(30)), i2 = await invoice(k2.id, 'Bus', '500000', shift(30));
    const p1 = await pay(i1.id, '300000', 'CASH');
    await pay(i1.id, '123450', 'UPI', { reference: 'UPI-77', paidOn: day });
    const p3 = await pay(i2.id, '200000', 'CASH');
    await pay(i2.id, '1', 'CHEQUE', { reference: '=1+1' });
    await call('post', `/fees/payments/${p3.id}/reverse`).send({ reason: 'Wrong child' }).expect(200);
    const after = (await call('get', `/reports/finance/collections?${win}&pageSize=100`).expect(200)).body;
    const diff = (f: 'collectedMinor' | 'reversedMinor') => BigInt(after[f]) - BigInt(before[f]);
    expect(diff('collectedMinor')).toBe(300000n + 123450n + 1n);
    expect(diff('reversedMinor')).toBe(200000n);
    expect(after.count - before.count).toBe(3);
    expect(after.total - before.total).toBe(4); // the reversed one is listed too
    expect(after).toMatchObject({ from: day, to: today(), detail: true });
    const by = (r: { byMethod: Array<{ method: string; amountMinor: string }> }, m: string) => BigInt(r.byMethod.find((x) => x.method === m)?.amountMinor ?? '0');
    expect(by(after, 'CASH') - by(before, 'CASH')).toBe(300000n);
    expect(by(after, 'UPI') - by(before, 'UPI')).toBe(123450n);
    const dayTotal = (r: typeof after, d: string) => BigInt(r.byDay.find((x: { date: string }) => x.date === d)?.amountMinor ?? '0');
    expect(dayTotal(after, day) - dayTotal(before, day)).toBe(123450n);
    expect(dayTotal(after, today()) - dayTotal(before, today())).toBe(300001n);
    const mine = after.items.filter((r: { student: { id: string } }) => [k1.id, k2.id].includes(r.student.id));
    expect(mine).toHaveLength(4);
    expect(mine.find((r: { paymentId: string }) => r.paymentId === p3.id)).toMatchObject({ reversed: true, amountMinor: '200000', method: 'CASH', receiptNumber: p3.receipt.number });
    expect(mine.find((r: { paymentId: string }) => r.paymentId === p1.id)).toMatchObject({ reversed: false, student: { enrollmentId: k1.enrollmentId, name: expect.stringContaining('Asha') }, invoice: { title: 'Tuition' } });
    // paging covers the same rows
    const p1page = (await call('get', `/reports/finance/collections?${win}&page=1&pageSize=1`).expect(200)).body;
    expect(p1page.items).toHaveLength(1);
    expect(p1page.total).toBe(after.total);
    expect(p1page.collectedMinor).toBe(after.collectedMinor); // the summary is over everything, not the page
    // a window outside the data is all zero
    expect((await call('get', '/reports/finance/collections?from=2001-01-01&to=2001-01-31').expect(200)).body).toMatchObject({ count: 0, collectedMinor: '0', reversedMinor: '0', items: [], total: 0, byMethod: [], byDay: [] });
    // the roles
    for (const who of [w!.roles.A.ACCOUNTANT, w!.roles.A.PRINCIPAL]) expect((await call('get', `/reports/finance/collections?${win}`, who).expect(200)).body.detail).toBe(true);
    const mgmt = (await call('get', `/reports/finance/collections?${win}`, w!.roles.A.MANAGEMENT).expect(200)).body;
    expect(mgmt).toMatchObject({ detail: false, items: [], collectedMinor: after.collectedMinor }); // totals, not people
    for (const who of [w!.roles.A.HR_MANAGER, w!.roles.A.ACADEMIC_ADMIN]) await call('get', `/reports/finance/collections?${win}`, who).expect(403);
    // the window
    for (const bad of ['from=2027-02-30', 'to=nonsense', `from=${today()}&to=${shift(-1)}`, 'from=2020-01-01&to=2021-06-01', 'page=0', 'pageSize=101', 'x=1'])
      await call('get', `/reports/finance/collections?${bad}`).expect(400);
    // another school sees none of it, and a foreign token with this school's header is refused
    expect((await call('get', `/reports/finance/collections?${win}`, w!.roles.B.BURSAR, B()).expect(200)).body).toMatchObject({ collectedMinor: '0', total: 0, items: [] });
    await call('get', `/reports/finance/collections?${win}`, w!.roles.B.BURSAR, A()).expect(403);
  });

  it('collections file: CSV that opens in Excel (BOM, decimals, no formulas), a PDF, labels in the chosen language, finance roles only', async () => {
    await ensureYear();
    const k = await kid('Csv');
    const inv = await invoice(k.id, 'Tuition, term 1', '900000', shift(30));
    const paid = await pay(inv.id, '123450', 'UPI', { reference: '=cmd|calc' });
    const q = `from=${shift(-3)}&to=${today()}`;
    const csv = await file(`/reports/finance/collections/export?${q}&format=csv`).expect(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.headers['content-disposition']).toBe(`attachment; filename="collections-${shift(-3)}_${today()}.csv"`);
    expect(csv.headers['cache-control']).toContain('no-store');
    const text = (csv.body as Buffer).toString('utf8');
    expect(text.charCodeAt(0)).toBe(0xfeff);
    const lines = text.split('\r\n');
    expect(lines[0]).toBe('﻿Date,Receipt no.,Student,Enrolment no.,Payment for,Paid by,Reference,Amount paid,Status');
    const mine = lines.find((l) => l.includes(paid.receipt.number))!;
    expect(mine).toContain(`${today()},${paid.receipt.number},Csv `);
    expect(mine).toContain('"Tuition, term 1",UPI,');
    expect(mine).toContain(`'=cmd|calc,1234.50,`); // never a formula; the amount is a plain number
    expect(lines.at(-2)).toMatch(/^,,,,,,Total,\d+\.\d\d,$/);
    // the language is an explicit choice
    const hi = (await file(`/reports/finance/collections/export?${q}&format=csv&lang=hi`).expect(200)).body.toString('utf8') as string;
    expect(hi.split('\r\n')[0]).toContain('दिनांक');
    expect(hi).toContain(',यूपीआई,');
    await file(`/reports/finance/collections/export?${q}&format=csv&lang=zz`).expect(400);
    // the PDF
    for (const lang of ['', '&lang=ur']) {
      const pdf = await file(`/reports/finance/collections/export?${q}&format=pdf${lang}`).expect(200);
      expect(pdf.headers['content-type']).toBe('application/pdf');
      expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
    }
    // who may
    await file(`/reports/finance/collections/export?${q}&format=csv`, w!.roles.A.ACCOUNTANT).expect(200);
    await file(`/reports/finance/collections/export?${q}&format=csv`, w!.roles.A.PRINCIPAL).expect(200);
    await file(`/reports/finance/collections/export?${q}&format=csv`, w!.roles.A.MANAGEMENT).expect(403); // totals only
    await file(`/reports/finance/collections/export?${q}&format=csv`, w!.roles.A.HR_MANAGER).expect(403);
    for (const bad of ['', '&format=xlsx', '&format=json']) await file(`/reports/finance/collections/export?${q}${bad}`).expect(400);
    await file(`/reports/finance/collections/export?from=2020-01-01&to=2021-06-01&format=csv`).expect(400);
    const other = await file(`/reports/finance/collections/export?${q}&format=csv`, w!.roles.B.BURSAR, B()).expect(200);
    expect((other.body as Buffer).toString('utf8').includes(paid.receipt.number)).toBe(false); // another school's file has none of A's payments
  });

  it('fees outstanding: unpaid invoices that have fallen due, aged into exact bands; settled and not-yet-due ones are out', async () => {
    const k = await kid('Dues');
    const before = (await call('get', '/reports/finance/dues?pageSize=100').expect(200)).body;
    const made = {
      future: await invoice(k.id, 'Not yet', '100000', shift(5)), today: await invoice(k.id, 'Today', '110000', today()), d10: await invoice(k.id, '10 days', '200000', shift(-10)),
      d45: await invoice(k.id, '45 days', '300000', shift(-45)), d75: await invoice(k.id, '75 days', '400000', shift(-75)), d200: await invoice(k.id, '200 days', '500000', shift(-200)),
    };
    await ensureYear();
    await pay(made.d10.id, '50000', 'CASH'); // part-paid: 150000 left
    await pay(made.d75.id, '400000', 'CASH'); // settled: gone
    const after = (await call('get', '/reports/finance/dues?pageSize=100').expect(200)).body;
    expect(after.asOf).toBe(today());
    const band = (r: typeof after, b: string) => BigInt(r.bands.find((x: { band: string }) => x.band === b).outstandingMinor);
    expect(['DUE_TODAY', 'DAYS_1_30', 'DAYS_31_60', 'DAYS_61_90', 'DAYS_OVER_90'].map((b) => band(after, b) - band(before, b))).toEqual([110000n, 150000n, 300000n, 0n, 500000n]);
    expect(BigInt(after.outstandingMinor) - BigInt(before.outstandingMinor)).toBe(110000n + 150000n + 300000n + 500000n);
    expect(after.count - before.count).toBe(4);
    expect(BigInt(after.amountMinor) - BigInt(after.paidMinor)).toBe(BigInt(after.outstandingMinor));
    const mine = (after.items as Array<{ invoiceId: string; title: string; daysOverdue: number; band: string; outstandingMinor: string; paidMinor: string; student: { id: string } }>).filter((r) => r.student.id === k.id);
    expect(mine.map((r) => [r.title, r.daysOverdue, r.band, r.outstandingMinor])).toEqual([['200 days', 200, 'DAYS_OVER_90', '500000'], ['45 days', 45, 'DAYS_31_60', '300000'], ['10 days', 10, 'DAYS_1_30', '150000'], ['Today', 0, 'DUE_TODAY', '110000']]);
    expect(mine.find((r) => r.title === '10 days')!.paidMinor).toBe('50000');
    // an earlier date leaves out what had not fallen due then
    const earlier = (await call('get', `/reports/finance/dues?asOf=${shift(-20)}&pageSize=100`).expect(200)).body;
    expect((earlier.items as Array<{ student: { id: string }; title: string }>).filter((r) => r.student.id === k.id).map((r) => r.title)).toEqual(['200 days', '45 days']);
    expect((earlier.items as Array<{ title: string; daysOverdue: number }>).find((r) => r.title === '45 days')!.daysOverdue).toBe(25);
    // a year that has no invoices
    expect((await call('get', `/reports/finance/dues?academicYearId=${randomUUID()}`).expect(200)).body).toMatchObject({ count: 0, outstandingMinor: '0', items: [] });
    for (const bad of ['asOf=2027-02-30', 'academicYearId=nope', 'page=0']) await call('get', `/reports/finance/dues?${bad}`).expect(400);
    // roles
    expect((await call('get', '/reports/finance/dues', w!.roles.A.MANAGEMENT).expect(200)).body).toMatchObject({ detail: false, items: [], outstandingMinor: after.outstandingMinor });
    await call('get', '/reports/finance/dues', w!.roles.A.HR_MANAGER).expect(403);
    await call('get', '/reports/finance/dues', w!.roles.A.TEACHER).expect(403);
    expect((await call('get', '/reports/finance/dues', w!.roles.B.BURSAR, B()).expect(200)).body).toMatchObject({ count: 0, outstandingMinor: '0' });
    // the files
    const csv = (await file('/reports/finance/dues/export?format=csv').expect(200)).body.toString('utf8') as string;
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('﻿Student,Enrolment no.,Payment for,Due date,Amount due,Amount paid,Outstanding,Days overdue');
    expect(lines.find((l) => l.includes(',10 days,'))).toBe(`Dues Payer,${k.enrollmentId},10 days,${shift(-10)},2000.00,500.00,1500.00,10`);
    expect(lines.at(-2)).toMatch(/^,,,Total,[\d.]+,[\d.]+,[\d.]+,$/);
    const pdf = await file('/reports/finance/dues/export?format=pdf&lang=hi').expect(200);
    expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
    await file('/reports/finance/dues/export?format=csv', w!.roles.A.MANAGEMENT).expect(403);
    await file('/reports/finance/dues/export?format=csv', w!.roles.A.HR_MANAGER).expect(403);
  });

  it('payroll summary: approved and paid runs by month and department, drafts left out, totals exact, no individual pay, HR-side roles only', async () => {
    const person = async (first: string, department: string | undefined, lines: Array<[string, string, string]>) => {
      const s = (await call('post', '/staff', w!.roles.A.SYSTEM_ADMIN).send({ firstName: first, lastName: `S${uniq()}`, ...(department ? { department } : {}) }).expect(201)).body;
      for (const [kind, name, amountMinor] of lines) await call('post', `/payroll/staff/${s.id}/salary-lines`, w!.roles.A.HR_MANAGER).send({ kind, name, amountMinor }).expect(201);
      return s as { id: string };
    };
    await person('Sci', 'Science', [['EARNING', 'Basic pay', '4600000'], ['DEDUCTION', 'Advance recovery', '250000']]);
    await person('Art', 'Arts', [['EARNING', 'Basic pay', '3000000']]);
    await person('Nod', undefined, [['EARNING', 'Basic pay', '1000001']]);
    const hr = w!.roles.A.HR_MANAGER, principal = w!.roles.A.PRINCIPAL;
    const run = async (month: number) => (await call('post', '/payroll/runs', hr).send({ year: 2005, month }).expect(201)).body as { id: string };
    const r1 = await run(1), r2 = await run(2);
    await run(3); // stays a draft
    for (const r of [r1, r2]) await call('post', `/payroll/runs/${r.id}/approve`, principal).send({}).expect(200);
    await call('post', `/payroll/runs/${r2.id}/pay`, bursar()).send({ reference: 'NEFT-9', paidOn: '2005-03-01' }).expect(200);
    const s = (await call('get', '/reports/hr/payroll-summary?year=2005', hr).expect(200)).body;
    expect(s.year).toBe(2005);
    expect(s.months.map((m: { month: number; status: string }) => [m.month, m.status])).toEqual([[1, 'APPROVED'], [2, 'PAID']]); // the draft is not in it
    expect(s.months[0]).toMatchObject({ headcount: 3, grossMinor: '8600001', deductionsMinor: '250000', netMinor: '8350001', paidOn: null });
    expect(s.months[1]).toMatchObject({ paidOn: '2005-03-01' });
    expect(s).toMatchObject({ grossMinor: '17200002', deductionsMinor: '500000', netMinor: '16700002' });
    expect(s.byDepartment).toEqual([
      { department: 'Arts', headcount: 1, grossMinor: '6000000', deductionsMinor: '0', netMinor: '6000000' },
      { department: 'Science', headcount: 1, grossMinor: '9200000', deductionsMinor: '500000', netMinor: '8700000' },
      { department: null, headcount: 1, grossMinor: '2000002', deductionsMinor: '0', netMinor: '2000002' },
    ]);
    expect(JSON.stringify(s)).not.toMatch(/firstName|employeeId|Basic pay/); // totals, no individual's pay
    expect((await call('get', '/reports/hr/payroll-summary?year=2006', hr).expect(200)).body).toMatchObject({ months: [], byDepartment: [], grossMinor: '0' });
    await call('get', '/reports/hr/payroll-summary').expect(403); // the Bursar has payroll but not HR reports
    for (const who of [principal, w!.roles.A.MANAGEMENT]) await call('get', '/reports/hr/payroll-summary?year=2005', who).expect(200);
    for (const who of [w!.roles.A.ACCOUNTANT, w!.roles.A.TEACHER]) await call('get', '/reports/hr/payroll-summary?year=2005', who).expect(403);
    for (const bad of ['year=1999', 'year=abc', 'year=2005.5', 'x=1']) await call('get', `/reports/hr/payroll-summary?${bad}`, hr).expect(400);
    expect((await call('get', '/reports/hr/payroll-summary?year=2005', w!.roles.B.HR_MANAGER, B()).expect(200)).body).toMatchObject({ months: [], grossMinor: '0' });
    // files
    const csv = (await file('/reports/hr/payroll-summary/export?year=2005&format=csv', hr).expect(200)).body.toString('utf8') as string;
    expect(csv.split('\r\n')).toEqual([
      '﻿Month,Status,Paid on,Staff,Gross pay,Total deductions,Net pay', '01/2005,Approved,,3,86000.01,2500.00,83500.01', '02/2005,Paid,2005-03-01,3,86000.01,2500.00,83500.01', 'Total,,,,172000.02,5000.00,167000.02', '',
    ]);
    const pdf = await file('/reports/hr/payroll-summary/export?year=2005&format=pdf&lang=ur', principal).expect(200);
    expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
    await file('/reports/hr/payroll-summary/export?year=2005&format=csv', w!.roles.A.MANAGEMENT).expect(200); // aggregates only, so management may export it
    await file('/reports/hr/payroll-summary/export?year=2005&format=csv', bursar()).expect(403);
    await file('/reports/hr/payroll-summary/export?year=2005&format=csv', w!.roles.B.HR_MANAGER, A()).expect(403);
  });
});
