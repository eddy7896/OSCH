// P2-7b against the REAL stack: invoice generation (idempotent), payments, reversals and what is still owed, through the gateway.
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

// Most tests here make 15 to 40 requests; a slow CI emulator needs more than the default 30 seconds.
describe.skipIf(!ready)('invoices and payments against the real emulators (P2-7b)', { timeout: 120_000 }, () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const B = () => w!.schools.B;
  const bursar = () => w!.roles.A.BURSAR;
  const acad = () => w!.roles.A.ACADEMIC_ADMIN;
  const call = (method: 'get' | 'post' | 'patch' | 'delete', path: string, who: Person = bursar(), school = A()) =>
    agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const audit = async (school: string, action: string) => (await w!.db.listAuditLog({ schoolId: school.replaceAll('-', ''), limit: 1000, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  const uniq = () => randomUUID().slice(0, 6);
  const today = () => new Date().toISOString().slice(0, 10);
  const shift = (days: number) => { const d = new Date(`${today()}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };

  /** A year, a class level with a class, a fee structure with a tuition fee of the given instalments, and students placed in the class. */
  const school = async (levelName: string, instalments: Array<{ label: string; amountMinor: string; dueDate: string }>, students = 2) => {
    const year = (await call('post', '/academics/years', acad()).send({ name: `IY-${uniq()}`, startDate: '2090-04-01', endDate: '2091-03-31' }).expect(201)).body;
    const level = ((await call('get', '/academics/levels', acad()).expect(200)).body.items as Array<{ id: string; name: string }>).find((l) => l.name === levelName)!;
    const room = (await call('post', '/academics/classes', acad()).send({ gradeLevelId: level.id, section: `I${uniq()}`.slice(0, 6), capacity: 60 }).expect(201)).body;
    const structure = (await call('post', '/fees/structures').send({ gradeLevelId: level.id, academicYearId: year.id }).expect(201)).body;
    const withFee = (await call('post', `/fees/structures/${structure.id}/items`).send({ name: 'Tuition', instalments }).expect(201)).body;
    const kids: Array<{ id: string; enrollmentId: string }> = [];
    for (let i = 0; i < students; i++) {
      const k = (await call('post', '/students', acad()).send({ firstName: `Inv${uniq()}`, lastName: 'Payer' }).expect(201)).body;
      await call('post', `/students/${k.id}/placement`, acad()).send({ classroomId: room.id, academicYearId: year.id }).expect(201);
      kids.push(k);
    }
    return { year, level, room, structure: withFee, kids };
  };
  const two = (a = '1250000', b = '1250000') => [{ label: 'Apr', amountMinor: a, dueDate: '2090-04-10' }, { label: 'Jul', amountMinor: b, dueDate: '2090-07-10' }];

  /** A manual invoice has no academic year of its own, so its receipt is numbered in the year the payment date falls in: make sure one covers today. */
  let currentYear: { id: string; name: string } | undefined;
  const ensureCurrentYear = async () => (currentYear ??= (await call('post', '/academics/years', acad()).send({ name: `CY-${uniq()}`, startDate: shift(-30), endDate: shift(300) }).expect(201)).body);
  const pdf = (id: string, who: Person = bursar(), school = A(), query = '') =>
    agent(app!).get(`/v1/fees/receipts/${id}/pdf${query}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school).buffer(true).parse((res, cb) => { const chunks: Buffer[] = []; res.on('data', (c: Buffer) => chunks.push(c)); res.on('end', () => cb(null, Buffer.concat(chunks))); });

  it('a dry run counts and writes nothing; the real run bills exactly once; running again changes nothing', async () => {
    const s = await school('4', two());
    const before = { invoices: (await call('get', `/fees/invoices?academicYearId=${s.year.id}`).expect(200)).body.total, audit: (await audit(A(), 'fees.invoice.create')).length };
    const body = { academicYearId: s.year.id, gradeLevelId: s.level.id, dueOnOrBefore: '2090-04-30' };
    const dry = (await call('post', '/fees/invoices/generate/preview').send(body).expect(200)).body;
    expect(dry).toMatchObject({ dryRun: true, students: 2, created: 2, alreadyInvoiced: 0, fullyWaived: 0, studentsWithoutStructure: 0, truncated: false });
    expect(dry.sample[0]).toMatchObject({ title: 'Tuition - Apr', dueDate: '2090-04-10', amountMinor: '1250000' });
    expect({ invoices: (await call('get', `/fees/invoices?academicYearId=${s.year.id}`).expect(200)).body.total, audit: (await audit(A(), 'fees.invoice.create')).length }).toEqual(before);
    const run = (await call('post', '/fees/invoices/generate').send(body).expect(200)).body;
    expect(run).toMatchObject({ dryRun: false, created: 2, alreadyInvoiced: 0 });
    const again = (await call('post', '/fees/invoices/generate').send(body).expect(200)).body;
    expect(again).toMatchObject({ created: 0, alreadyInvoiced: 2 });
    const later = (await call('post', '/fees/invoices/generate').send({ ...body, dueOnOrBefore: '2090-12-31' }).expect(200)).body; // now July too
    expect(later).toMatchObject({ created: 2, alreadyInvoiced: 2 });
    const list = (await call('get', `/fees/invoices?academicYearId=${s.year.id}&pageSize=100`).expect(200)).body;
    expect(list.total).toBe(4);
    expect(list.totals).toMatchObject({ count: 4, amountMinor: '5000000', paidMinor: '0', outstandingMinor: '5000000' });
    expect((await audit(A(), 'fees.invoice.create')).length - before.audit).toBe(4);
  });

  it('concessions flow into the invoices; a fully waived instalment makes none; levels without a structure are reported', async () => {
    const s = await school('5', two('1000000', '3333'), 2);
    const paying = s.kids[0]!, waived = s.kids[1]!;
    await call('post', '/fees/concessions').send({ studentId: paying.id, academicYearId: s.year.id, name: 'Sibling', kind: 'PERCENT', basisPoints: 1250 }).expect(201);
    await call('post', '/fees/concessions').send({ studentId: waived.id, academicYearId: s.year.id, name: 'Scholarship', kind: 'PERCENT', basisPoints: 10000 }).expect(201);
    const res = (await call('post', '/fees/invoices/generate').send({ academicYearId: s.year.id, gradeLevelId: s.level.id, dueOnOrBefore: '2091-01-01' }).expect(200)).body;
    expect(res).toMatchObject({ created: 2, fullyWaived: 2 });
    const mine = (await call('get', `/fees/invoices?studentId=${paying.id}&academicYearId=${s.year.id}`).expect(200)).body.items;
    expect(mine.map((i: { title: string; grossMinor: string; discountMinor: string; amountMinor: string }) => [i.title, i.grossMinor, i.discountMinor, i.amountMinor])).toEqual([
      ['Tuition - Apr', '1000000', '125000', '875000'],
      ['Tuition - Jul', '3333', '417', '2916'], // 12.5% of 3333 is 416.625, rounded to 417
    ]);
    expect((await call('get', `/fees/invoices?studentId=${waived.id}`).expect(200)).body.total).toBe(0);
    // a level with no structure
    const lone = (await call('post', '/students', acad()).send({ firstName: `Lone${uniq()}`, lastName: 'Kid' }).expect(201)).body;
    const lv = ((await call('get', '/academics/levels', acad()).expect(200)).body.items as Array<{ id: string; name: string }>).find((l) => l.name === '2')!;
    const room = (await call('post', '/academics/classes', acad()).send({ gradeLevelId: lv.id, section: `L${uniq()}`.slice(0, 6), capacity: 30 }).expect(201)).body;
    await call('post', `/students/${lone.id}/placement`, acad()).send({ classroomId: room.id, academicYearId: s.year.id }).expect(201);
    expect((await call('post', '/fees/invoices/generate/preview').send({ academicYearId: s.year.id, studentId: lone.id, dueOnOrBefore: '2091-01-01' }).expect(200)).body).toMatchObject({ students: 1, created: 0, studentsWithoutStructure: 1 });
  });

  it('a fee that has been billed cannot be deleted, but its amounts can still be changed for future instalments', async () => {
    const s = await school('11', two(), 1);
    await call('post', '/fees/invoices/generate').send({ academicYearId: s.year.id, studentId: s.kids[0]!.id, dueOnOrBefore: '2090-04-30' }).expect(200); // April billed, July not
    const [apr, jul] = s.structure.items[0].instalments;
    await call('delete', `/fees/instalments/${apr.id}`).expect(409);
    await call('delete', `/fees/items/${s.structure.items[0].id}`).expect(409);
    await call('delete', `/fees/structures/${s.structure.id}`).expect(409);
    await call('delete', `/fees/instalments/${jul.id}`).expect(200); // never billed: fine
    expect((await call('get', `/fees/structures/${s.structure.id}`).expect(200)).body.items[0].instalments).toHaveLength(1);
    expect((await call('get', `/fees/invoices?studentId=${s.kids[0]!.id}`).expect(200)).body.total).toBe(1);
  });

  it('bad input and other schools: nothing is billed to another school, and filters outside the school find nothing', async () => {
    const s = await school('6', two(), 1);
    await call('post', '/fees/invoices/generate').send({ dueOnOrBefore: '2090-02-30' }).expect(400);
    await call('post', '/fees/invoices/generate').send({ dueOnOrBefore: '2090-12-31', schoolId: B() }).expect(400);
    await call('post', '/fees/invoices/generate').send({ dueOnOrBefore: '2090-12-31', academicYearId: randomUUID() }).expect(400);
    await call('post', '/fees/invoices/generate').send({ dueOnOrBefore: '2090-12-31', academicYearId: s.year.id, studentId: randomUUID() }).expect(404);
    const b = w!.roles.B.BURSAR;
    expect((await call('post', '/fees/invoices/generate', b, B()).send({ dueOnOrBefore: '2090-12-31', academicYearId: s.year.id }).expect(400)).body.error.code).toBe('INVALID_REQUEST'); // A's year looks like nothing to B
    const bRun = (await call('post', '/fees/invoices/generate', b, B()).send({ dueOnOrBefore: '2090-12-31', academicYearId: undefined }).expect(400)); // B has no active year
    expect(bRun.status).toBe(400);
    expect((await call('get', `/fees/invoices?academicYearId=${s.year.id}`, b, B()).expect(200)).body.total).toBe(0);
    await call('get', '/fees/invoices', b, A()).expect(403); // B's token with A's header
  });

  it('payments: part payments add up exactly; PAID when settled; an overpayment is refused; the status follows the due date', async () => {
    const s = await school('7', [{ label: 'Past', amountMinor: '1000000', dueDate: '2000-01-10' }, { label: 'Future', amountMinor: '1000000', dueDate: '2999-01-10' }], 1);
    await call('post', '/fees/invoices/generate').send({ academicYearId: s.year.id, studentId: s.kids[0]!.id, dueOnOrBefore: '2999-12-31' }).expect(200);
    const [past, future] = (await call('get', `/fees/invoices?studentId=${s.kids[0]!.id}`).expect(200)).body.items;
    expect(past.status).toBe('OVERDUE');
    expect(future.status).toBe('PENDING');
    const pay = (id: string, body: object) => call('post', `/fees/invoices/${id}/payments`).send(body);
    let inv = (await pay(future.id, { amountMinor: '400000', method: 'CASH' }).expect(201)).body;
    expect(inv).toMatchObject({ paidMinor: '400000', outstandingMinor: '600000', status: 'PARTIAL' });
    inv = (await pay(future.id, { amountMinor: '350000', method: 'UPI', reference: 'UPI-123' }).expect(201)).body;
    expect(inv).toMatchObject({ paidMinor: '750000', status: 'PARTIAL' });
    const over = await pay(future.id, { amountMinor: '250001', method: 'CASH' }).expect(409);
    expect(over.body.error.details).toEqual([{ field: 'amountMinor', rule: 'moreThanOutstanding' }]);
    inv = (await pay(future.id, { amountMinor: '250000', method: 'CHEQUE', reference: '000123', paidOn: today() }).expect(201)).body;
    expect(inv).toMatchObject({ paidMinor: '1000000', outstandingMinor: '0', status: 'PAID' });
    expect(inv.payments.map((p: { method: string; amountMinor: string }) => [p.method, p.amountMinor])).toEqual([['CASH', '400000'], ['UPI', '350000'], ['CHEQUE', '250000']]);
    expect(inv.payments[1]).toMatchObject({ reference: 'UPI-123', recordedBy: { id: bursar().uid } });
    await pay(future.id, { amountMinor: '1', method: 'CASH' }).expect(409); // already settled
    // an overdue invoice stays overdue until it is settled
    expect((await pay(past.id, { amountMinor: '999999', method: 'CASH' }).expect(201)).body.status).toBe('OVERDUE');
    expect((await pay(past.id, { amountMinor: '1', method: 'CASH' }).expect(201)).body.status).toBe('PAID');
    // bad payments
    for (const bad of [{ amountMinor: '0', method: 'CASH' }, { amountMinor: '12.5', method: 'CASH' }, { amountMinor: '100', method: 'BITCOIN' }, { amountMinor: '100', method: 'CASH', paidOn: '2999-01-01' }, { amountMinor: '100', method: 'CASH', paidOn: '2020-02-30' }, { amountMinor: '100' }])
      await pay(past.id, bad).expect(400);
  });

  it('two cashiers paying the same invoice at once can never overpay it', async () => {
    const s = await school('8', [{ label: 'Only', amountMinor: '1000000', dueDate: '2999-01-10' }], 1);
    await call('post', '/fees/invoices/generate').send({ academicYearId: s.year.id, studentId: s.kids[0]!.id, dueOnOrBefore: '2999-12-31' }).expect(200);
    const [inv] = (await call('get', `/fees/invoices?studentId=${s.kids[0]!.id}`).expect(200)).body.items;
    const results = await Promise.all(Array.from({ length: 6 }, (_, i) => call('post', `/fees/invoices/${inv.id}/payments`, i % 2 ? bursar() : w!.roles.A.ACCOUNTANT).send({ amountMinor: '300000', method: 'CASH' })));
    const ok = results.filter((r) => r.status === 201).length;
    expect(ok).toBe(3); // 3 x 300000 fits in 1000000, a fourth would not
    expect(results.filter((r) => r.status === 409)).toHaveLength(3);
    const final = (await call('get', `/fees/invoices/${inv.id}`).expect(200)).body;
    expect(final.paidMinor).toBe('900000');
    expect(final.payments).toHaveLength(3);
    // each of the 3 payments has its own receipt, and the numbers are consecutive: no duplicate, no gap, even though 6 cashiers raced
    const numbers = final.payments.map((p: { receipt: { number: string } }) => Number(p.receipt.number.split('-').pop())).sort((a: number, b: number) => a - b);
    expect(new Set(numbers).size).toBe(3);
    expect(numbers[2] - numbers[0]).toBe(2);
  });

  it('a reversal keeps the payment, marks it, and reopens the invoice; only the Bursar, only once', async () => {
    const s = await school('9', [{ label: 'Only', amountMinor: '500000', dueDate: '2999-01-10' }], 1);
    await call('post', '/fees/invoices/generate').send({ academicYearId: s.year.id, studentId: s.kids[0]!.id, dueOnOrBefore: '2999-12-31' }).expect(200);
    const [inv] = (await call('get', `/fees/invoices?studentId=${s.kids[0]!.id}`).expect(200)).body.items;
    const paid = (await call('post', `/fees/invoices/${inv.id}/payments`).send({ amountMinor: '500000', method: 'CASH' }).expect(201)).body;
    expect(paid.status).toBe('PAID');
    const pid = paid.payments[0].id;
    await call('post', `/fees/payments/${pid}/reverse`, w!.roles.A.ACCOUNTANT).send({ reason: 'Wrong child' }).expect(403); // the Accountant cannot delete from the books
    await call('post', `/fees/payments/${pid}/reverse`).send({ reason: 'x' }).expect(400); // a real reason, please
    const rev = (await call('post', `/fees/payments/${pid}/reverse`).send({ reason: 'Entered against the wrong child' }).expect(200)).body;
    expect(rev).toMatchObject({ paidMinor: '0', outstandingMinor: '500000', status: 'PENDING' });
    expect(rev.payments).toHaveLength(1);
    expect(rev.payments[0]).toMatchObject({ amountMinor: '500000', reversalReason: 'Entered against the wrong child' });
    expect(rev.payments[0].reversedAt).toBeTruthy();
    await call('post', `/fees/payments/${pid}/reverse`).send({ reason: 'Again please' }).expect(409);
    const again = (await call('post', `/fees/invoices/${inv.id}/payments`).send({ amountMinor: '500000', method: 'UPI' }).expect(201)).body;
    expect(again).toMatchObject({ paidMinor: '500000', status: 'PAID' });
    expect(again.payments).toHaveLength(2);
    await call('post', `/fees/payments/${randomUUID()}/reverse`).send({ reason: 'Not there' }).expect(404);
  });

  it("another school's cashier cannot see, pay or reverse A's invoices and payments", async () => {
    const s = await school('10', [{ label: 'Only', amountMinor: '500000', dueDate: '2999-01-10' }], 1);
    await call('post', '/fees/invoices/generate').send({ academicYearId: s.year.id, studentId: s.kids[0]!.id, dueOnOrBefore: '2999-12-31' }).expect(200);
    const [inv] = (await call('get', `/fees/invoices?studentId=${s.kids[0]!.id}`).expect(200)).body.items;
    const paid = (await call('post', `/fees/invoices/${inv.id}/payments`).send({ amountMinor: '100000', method: 'CASH' }).expect(201)).body;
    const b = w!.roles.B.BURSAR;
    await call('get', `/fees/invoices/${inv.id}`, b, B()).expect(404);
    await call('post', `/fees/invoices/${inv.id}/payments`, b, B()).send({ amountMinor: '1', method: 'CASH' }).expect(404);
    await call('post', `/fees/payments/${paid.payments[0].id}/reverse`, b, B()).send({ reason: 'Not mine to touch' }).expect(404);
    await call('get', `/fees/students/${s.kids[0]!.id}/statement`, b, B()).expect(404);
    expect((await call('get', `/fees/invoices/${inv.id}`).expect(200)).body.paidMinor).toBe('100000');
  });

  it('manual invoices; statements add up; the outstanding report ages unpaid money into exact bands', async () => {
    await ensureCurrentYear();
    const kid = (await call('post', '/students', acad()).send({ firstName: `Age${uniq()}`, lastName: 'Ing' }).expect(201)).body;
    const make = (title: string, amountMinor: string, dueDate: string) => call('post', '/fees/invoices').send({ studentId: kid.id, title, amountMinor, dueDate }).expect(201);
    await call('post', '/fees/invoices').send({ studentId: kid.id, title: 'x', amountMinor: '0', dueDate: shift(1) }).expect(400);
    await call('post', '/fees/invoices').send({ studentId: kid.id, title: 'x', amountMinor: '100', dueDate: '2020-02-30' }).expect(400);
    await call('post', '/fees/invoices').send({ studentId: randomUUID(), title: 'x', amountMinor: '100', dueDate: shift(1) }).expect(400);
    const before = (await call('get', `/fees/outstanding`).expect(200)).body;
    const bandOf = (r: { bands: Array<{ band: string; count: number; amountMinor: string; outstandingMinor: string }> }, k: string) => r.bands.find((x) => x.band === k)!;
    const created = {
      notDue: (await make('Not due', '100000', shift(5))).body, d10: (await make('10 days', '200000', shift(-10))).body, d45: (await make('45 days', '300000', shift(-45))).body,
      d75: (await make('75 days', '400000', shift(-75))).body, d200: (await make('200 days', '500000', shift(-200))).body,
    };
    await call('post', `/fees/invoices/${created.d10.id}/payments`).send({ amountMinor: '50000', method: 'CASH' }).expect(201); // part-paid: outstanding 150000
    await call('post', `/fees/invoices/${created.d75.id}/payments`).send({ amountMinor: '400000', method: 'CASH' }).expect(201); // settled: leaves the report
    const after = (await call('get', `/fees/outstanding`).expect(200)).body;
    const diff = (k: string, f: 'count' | 'outstandingMinor') => BigInt(bandOf(after, k)[f]) - BigInt(bandOf(before, k)[f]);
    expect([diff('NOT_DUE', 'outstandingMinor'), diff('DAYS_1_30', 'outstandingMinor'), diff('DAYS_31_60', 'outstandingMinor'), diff('DAYS_61_90', 'outstandingMinor'), diff('DAYS_OVER_90', 'outstandingMinor')]).toEqual([100000n, 150000n, 300000n, 0n, 500000n]);
    expect([diff('NOT_DUE', 'count'), diff('DAYS_1_30', 'count'), diff('DAYS_31_60', 'count'), diff('DAYS_61_90', 'count'), diff('DAYS_OVER_90', 'count')]).toEqual([1n, 1n, 1n, 0n, 1n]);
    expect(after.totals.outstandingMinor).toBe(String(after.bands.reduce((t: bigint, b: { outstandingMinor: string }) => t + BigInt(b.outstandingMinor), 0n)));
    // the same report as of a later date moves money into older bands
    const later = (await call('get', `/fees/outstanding?asOf=${shift(60)}`).expect(200)).body;
    expect(BigInt(bandOf(later, 'NOT_DUE').outstandingMinor)).toBeLessThan(BigInt(bandOf(after, 'NOT_DUE').outstandingMinor) + 1n);
    await call('get', '/fees/outstanding?asOf=2020-13-01').expect(400);
    // a statement: invoices of one student with totals
    const st = (await call('get', `/fees/students/${kid.id}/statement`).expect(200)).body;
    expect(st.invoices).toHaveLength(5);
    expect(st.totals).toMatchObject({ count: 5, amountMinor: '1500000', paidMinor: '450000', outstandingMinor: '1050000' });
    expect(st.invoices.map((i: { status: string }) => i.status).sort()).toEqual(['OVERDUE', 'OVERDUE', 'OVERDUE', 'PAID', 'PENDING']);
    const overdue = (await call('get', `/fees/invoices?studentId=${kid.id}&state=OVERDUE`).expect(200)).body;
    expect(overdue.total).toBe(3);
    expect((await call('get', `/fees/invoices?studentId=${kid.id}&state=UNPAID`).expect(200)).body.total).toBe(4);
    expect((await call('get', `/fees/invoices?studentId=${kid.id}&state=PAID`).expect(200)).body.total).toBe(1);
    // the outstanding report is per school
    expect(BigInt((await call('get', '/fees/outstanding', w!.roles.B.BURSAR, B()).expect(200)).body.totals.outstandingMinor)).toBe(0n);
  });

  it('every payment makes a numbered receipt in the same breath; numbers run per academic year; a refused payment leaves no gap', async () => {
    const s = await school('3', [{ label: 'Only', amountMinor: '1000000', dueDate: '2999-01-10' }, { label: 'Second', amountMinor: '1000000', dueDate: '2999-02-10' }], 1);
    await call('post', '/fees/invoices/generate').send({ academicYearId: s.year.id, studentId: s.kids[0]!.id, dueOnOrBefore: '2999-12-31' }).expect(200);
    const [one, two2] = (await call('get', `/fees/invoices?studentId=${s.kids[0]!.id}`).expect(200)).body.items;
    const pay = (id: string, amountMinor: string) => call('post', `/fees/invoices/${id}/payments`).send({ amountMinor, method: 'CASH' });
    const p1 = (await pay(one.id, '300000').expect(201)).body.payments[0];
    await pay(one.id, '9999999').expect(409); // refused: more than is owed
    await pay(one.id, '0').expect(400); // refused: not valid
    const p2 = (await pay(one.id, '200000').expect(201)).body.payments[1];
    const p3 = (await pay(two2.id, '500000').expect(201)).body.payments[0];
    const nums = [p1, p2, p3].map((p) => p.receipt.number as string);
    expect(nums).toEqual([`R-${s.year.name}-00001`, `R-${s.year.name}-00002`, `R-${s.year.name}-00003`]); // refused payments used no number
    expect(p1.receipt.cancelled).toBe(false);
    const r = (await call('get', `/fees/payments/${p2.id}/receipt`).expect(200)).body;
    expect(r).toMatchObject({ number: nums[1], cancelled: false, amountMinor: '200000', balanceAfterMinor: '500000', method: 'CASH', receivedBy: expect.any(String), student: { id: s.kids[0]!.id }, invoice: { id: one.id, title: 'Tuition - Only' }, academicYear: { id: s.year.id } });
    expect(r.className).toBe(s.room.name);
    expect(r.school).toMatchObject({ name: expect.any(String), language: 'en' });
    expect((await call('get', `/fees/receipts/${r.id}`).expect(200)).body.number).toBe(nums[1]);
    const list = (await call('get', `/fees/receipts?studentId=${s.kids[0]!.id}`).expect(200)).body;
    expect(list.items.map((i: { number: string }) => i.number)).toEqual([nums[2], nums[1], nums[0]]); // newest first
    expect(list).toMatchObject({ total: 3, totalAmountMinor: '1000000' });
    // a second academic year starts again at 00001
    const s2 = await school('2', [{ label: 'Only', amountMinor: '100000', dueDate: '2999-01-10' }], 1);
    await call('post', '/fees/invoices/generate').send({ academicYearId: s2.year.id, studentId: s2.kids[0]!.id, dueOnOrBefore: '2999-12-31' }).expect(200);
    const [inv2] = (await call('get', `/fees/invoices?studentId=${s2.kids[0]!.id}`).expect(200)).body.items;
    expect((await pay(inv2.id, '100000').expect(201)).body.payments[0].receipt.number).toBe(`R-${s2.year.name}-00001`);
  });

  it('a manual invoice is receipted in the year the payment date falls in; with no academic year at all there is nothing to number it in (409)', async () => {
    const year = await ensureCurrentYear();
    const kid = (await call('post', '/students', acad()).send({ firstName: `Man${uniq()}`, lastName: 'Ual' }).expect(201)).body;
    const inv = (await call('post', '/fees/invoices').send({ studentId: kid.id, title: 'Trip', amountMinor: '50000', dueDate: shift(7) }).expect(201)).body;
    const paid = (await call('post', `/fees/invoices/${inv.id}/payments`).send({ amountMinor: '50000', method: 'UPI', reference: 'U1' }).expect(201)).body;
    expect(paid.payments[0].receipt.number).toMatch(new RegExp(`^R-${year.name}-\\d{5}$`));
    // school B has no academic year in this test
    const b = w!.roles.B.BURSAR;
    const bKid = (await call('post', '/students', w!.roles.B.ACADEMIC_ADMIN, B()).send({ firstName: 'Bee', lastName: 'Man' }).expect(201)).body;
    const bInv = (await call('post', '/fees/invoices', b, B()).send({ studentId: bKid.id, title: 'Trip', amountMinor: '50000', dueDate: shift(7) }).expect(201)).body;
    const refused = await call('post', `/fees/invoices/${bInv.id}/payments`, b, B()).send({ amountMinor: '50000', method: 'CASH' }).expect(409);
    expect(refused.body.error.details).toEqual([{ field: 'paidOn', rule: 'noAcademicYearForReceipt' }]);
    expect((await call('get', `/fees/invoices/${bInv.id}`, b, B()).expect(200)).body).toMatchObject({ paidMinor: '0', payments: [] }); // nothing was recorded
  });

  it('the receipt PDF is a real PDF in the school language (or the one asked for), cancelled receipts are stamped, other schools and roles are refused', async () => {
    const s = await school('1', [{ label: 'Only', amountMinor: '250000', dueDate: '2999-01-10' }], 1);
    await call('post', '/fees/invoices/generate').send({ academicYearId: s.year.id, studentId: s.kids[0]!.id, dueOnOrBefore: '2999-12-31' }).expect(200);
    const [inv] = (await call('get', `/fees/invoices?studentId=${s.kids[0]!.id}`).expect(200)).body.items;
    const paid = (await call('post', `/fees/invoices/${inv.id}/payments`).send({ amountMinor: '250000', method: 'CHEQUE', reference: '000123' }).expect(201)).body;
    const receipt = (await call('get', `/fees/payments/${paid.payments[0].id}/receipt`).expect(200)).body;
    const en = await pdf(receipt.id);
    expect(en.status).toBe(200);
    expect(en.headers['content-type']).toMatch(/application\/pdf/);
    expect(en.headers['content-disposition']).toContain(`receipt-${receipt.number}.pdf`);
    expect(en.headers['cache-control']).toMatch(/no-store/);
    const bytes = en.body as Buffer;
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(5_000);
    const hi = (await pdf(receipt.id, bursar(), A(), '?lang=hi')).body as Buffer;
    const ur = (await pdf(receipt.id, bursar(), A(), '?lang=ur')).body as Buffer;
    expect(hi.equals(bytes)).toBe(false);
    expect(ur.equals(hi)).toBe(false);
    expect(ur.toString('latin1')).toMatch(/Nastaliq/i);
    expect(hi.toString('latin1')).toMatch(/Devanagari/i);
    await pdf(receipt.id, bursar(), A(), '?lang=zz').expect(400);
    await pdf(receipt.id, bursar(), A(), '?lang=english').expect(400);
    // reversing the payment cancels the receipt: it stays, with the same number, stamped
    await call('post', `/fees/payments/${paid.payments[0].id}/reverse`).send({ reason: 'Cheque bounced' }).expect(200);
    const cancelled = (await call('get', `/fees/receipts/${receipt.id}`).expect(200)).body;
    expect(cancelled).toMatchObject({ number: receipt.number, cancelled: true, cancelReason: 'Cheque bounced' });
    expect(((await pdf(receipt.id)).body as Buffer).equals(bytes)).toBe(false);
    expect((await call('get', `/fees/invoices/${inv.id}`).expect(200)).body.payments[0].receipt).toMatchObject({ number: receipt.number, cancelled: true });
    // other schools and roles
    const b = w!.roles.B.BURSAR;
    await call('get', `/fees/receipts/${receipt.id}`, b, B()).expect(404);
    await call('get', `/fees/payments/${paid.payments[0].id}/receipt`, b, B()).expect(404);
    expect((await pdf(receipt.id, b, B())).status).toBe(404);
    expect((await call('get', `/fees/receipts?studentId=${s.kids[0]!.id}`, b, B()).expect(200)).body.total).toBe(0);
    expect((await pdf(receipt.id, w!.roles.A.PRINCIPAL)).status).toBe(200);
    for (const who of [acad(), w!.roles.A.TEACHER, w!.roles.A.DRIVER]) expect((await pdf(receipt.id, who)).status).toBe(403);
    expect((await pdf(receipt.id, w!.roles.A.PARENT)).status).toBe(404);
  });

  it('roles: Bursar full; Accountant bills and takes payments but cannot reverse; Principal reads; others get nothing', async () => {
    await ensureCurrentYear();
    const acct = w!.roles.A.ACCOUNTANT;
    const kid = (await call('post', '/students', acad()).send({ firstName: `Rol${uniq()}`, lastName: 'Es' }).expect(201)).body;
    const inv = (await call('post', '/fees/invoices', acct).send({ studentId: kid.id, title: 'Fine', amountMinor: '10000', dueDate: shift(3) }).expect(201)).body;
    await call('post', `/fees/invoices/${inv.id}/payments`, acct).send({ amountMinor: '10000', method: 'CASH' }).expect(201);
    await call('get', `/fees/invoices/${inv.id}`, w!.roles.A.PRINCIPAL).expect(200);
    await call('get', '/fees/outstanding', w!.roles.A.PRINCIPAL).expect(200);
    await call('post', `/fees/invoices/${inv.id}/payments`, w!.roles.A.PRINCIPAL).send({ amountMinor: '1', method: 'CASH' }).expect(403);
    await call('post', '/fees/invoices', w!.roles.A.PRINCIPAL).send({ studentId: kid.id, title: 'x', amountMinor: '1', dueDate: shift(3) }).expect(403);
    await call('post', '/fees/invoices/generate', w!.roles.A.PRINCIPAL).send({ dueOnOrBefore: shift(3) }).expect(403);
    await call('get', '/fees/invoices', acad()).expect(403);
    await call('get', '/fees/invoices', w!.roles.A.TEACHER).expect(403);
    await call('get', '/fees/invoices', w!.roles.A.DRIVER).expect(403);
    expect((await call('get', '/fees/invoices', w!.roles.A.PARENT).expect(200)).body).toMatchObject({ items: [], total: 0 }); // linked scope: nothing until parents are served
    await call('get', `/fees/invoices/${inv.id}`, w!.roles.A.PARENT).expect(404);
  });

  it('audit: every bill, payment and reversal left a row with the verified actor', async () => {
    for (const a of ['fees.invoice.create', 'fees.payment.record', 'fees.payment.reverse']) expect((await audit(A(), a)).length, a).toBeGreaterThan(0);
    expect((await audit(A(), 'fees.payment.record')).every((r) => [bursar().uid, w!.roles.A.ACCOUNTANT.uid].includes(r.actor.id))).toBe(true);
    expect((await audit(B(), 'fees.payment.record')).length).toBe(0); // B's only attempt was refused (no academic year to number the receipt in)
    expect((await audit(B(), 'fees.invoice.create')).every((r) => r.actor.id === w!.roles.B.BURSAR.uid)).toBe(true);
  });
});
