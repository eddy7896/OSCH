// P5-6c against the REAL stack: a parent reads the invoices and receipts of their own linked children and nobody else's (finance read at linked scope).
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

describe.skipIf(!ready)('a parent reads their own children\'s fees against the real emulators (P5-6c)', { timeout: 180_000 }, () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const bursar = () => w!.roles.A.BURSAR;
  const acad = () => w!.roles.A.ACADEMIC_ADMIN;
  const parent = () => w!.roles.A.PARENT;
  const call = (method: 'get' | 'post', path: string, who: Person = bursar(), school = A()) => agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const uniq = () => randomUUID().slice(0, 6);
  const today = () => new Date().toISOString().slice(0, 10);
  const shift = (days: number) => { const d = new Date(`${today()}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };

  let mine = '', other = '', mine2 = '';
  let invMine = '', invMine2 = '', invOther = '', rcMine = '', rcOther = '';

  beforeAll(async () => {
    await call('post', '/academics/years', acad()).send({ name: `PF-${uniq()}`, startDate: shift(-30), endDate: shift(300) }).expect(201); // a year covers today, so receipts can be numbered
    const kid = async (name: string) => ((await call('post', '/students', acad()).send({ firstName: name, lastName: `L${uniq()}` }).expect(201)).body as { id: string }).id;
    mine = await kid('Asha');
    mine2 = await kid('Dev');
    other = await kid('Bilal'); // another family's child
    await call('post', `/students/${mine}/parent-accounts`, acad()).send({ userId: parent().uid, relationship: 'MOTHER' }).expect(201);
    await call('post', `/students/${mine2}/parent-accounts`, acad()).send({ userId: parent().uid, relationship: 'MOTHER' }).expect(201);
    const invoice = async (studentId: string, title: string, amountMinor: string, due: number) => ((await call('post', '/fees/invoices').send({ studentId, title, amountMinor, dueDate: shift(due) }).expect(201)).body as { id: string }).id;
    invMine = await invoice(mine, 'Tuition Term 1', '1250000', 10);
    invMine2 = await invoice(mine2, 'Bus fee', '300000', -5);
    invOther = await invoice(other, 'Tuition Term 1', '1250000', 10);
    const paid = (await call('post', `/fees/invoices/${invMine}/payments`).send({ amountMinor: '500000', method: 'CASH' }).expect(201)).body;
    rcMine = paid.payments[0].receipt.id;
    rcOther = (await call('post', `/fees/invoices/${invOther}/payments`).send({ amountMinor: '100000', method: 'UPI', reference: 'UTR1' }).expect(201)).body.payments[0].receipt.id;
  }, 120_000);

  it('the list holds only the parent\'s own children\'s invoices, due date first, with totals that add up', async () => {
    const r = (await call('get', '/fees/invoices', parent()).expect(200)).body;
    const ids = (r.items as Array<{ id: string }>).map((i) => i.id);
    expect(ids).toEqual([invMine2, invMine]); // Dev's bus fee is due first
    expect(ids).not.toContain(invOther);
    expect(r.totals).toMatchObject({ count: 2, amountMinor: '1550000', paidMinor: '500000', outstandingMinor: '1050000' });
    expect((await call('get', `/fees/invoices?studentId=${mine}`, parent()).expect(200)).body.items.map((i: { id: string }) => i.id)).toEqual([invMine]);
    expect((await call('get', `/fees/invoices?studentId=${other}`, parent()).expect(200)).body.items).toEqual([]);
  });

  it('one invoice: a child of theirs with its payment and receipt; another family\'s invoice looks like it does not exist', async () => {
    const inv = (await call('get', `/fees/invoices/${invMine}`, parent()).expect(200)).body;
    expect(inv).toMatchObject({ outstandingMinor: '750000', payments: [{ amountMinor: '500000', receipt: { id: rcMine } }] });
    await call('get', `/fees/invoices/${invOther}`, parent()).expect(404);
  });

  it('receipts: theirs are listed and open (also as a PDF); another family\'s are not', async () => {
    const list = (await call('get', '/fees/receipts', parent()).expect(200)).body;
    expect((list.items as Array<{ id: string }>).map((x) => x.id)).toEqual([rcMine]);
    expect(list.totalAmountMinor).toBe('500000');
    expect((await call('get', `/fees/receipts/${rcMine}`, parent()).expect(200)).body).toMatchObject({ balanceAfterMinor: '750000', student: { id: mine } });
    await call('get', `/fees/receipts/${rcOther}`, parent()).expect(404);
    const pdf = await agent(app!).get(`/v1/fees/receipts/${rcMine}/pdf`).set('Authorization', `Bearer ${parent().token}`).set('X-School-Id', A()).buffer(true).parse((res, cb) => { const c: Buffer[] = []; res.on('data', (d: Buffer) => c.push(d)); res.on('end', () => cb(null, Buffer.concat(c))); });
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
    await agent(app!).get(`/v1/fees/receipts/${rcOther}/pdf`).set('Authorization', `Bearer ${parent().token}`).set('X-School-Id', A()).expect(404);
  });

  it('a parent only reads: no billing, no payment, no ageing report, no staff views; other schools and other roles are closed', async () => {
    await call('post', '/fees/invoices', parent()).send({ studentId: mine, title: 'x', amountMinor: '100', dueDate: shift(1) }).expect(403);
    await call('post', `/fees/invoices/${invMine}/payments`, parent()).send({ amountMinor: '100', method: 'CASH' }).expect(403);
    await call('get', '/fees/outstanding', parent()).expect(404);
    await call('get', '/fees/structures', parent()).expect(200).then((r) => expect(r.body.items).toEqual([]));
    await call('get', `/fees/invoices/${invMine}`, w!.roles.B.PARENT, w!.schools.B).expect(404);
    expect((await call('get', '/fees/invoices', w!.roles.B.PARENT, w!.schools.B).expect(200)).body.items).toEqual([]);
    await call('get', '/fees/invoices', w!.roles.A.HR_MANAGER).expect(403);
    // the bursar still sees everything
    expect((await call('get', `/fees/invoices?studentId=${other}`).expect(200)).body.items.length).toBeGreaterThan(0);
  });
});
