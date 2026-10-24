// P2-7b: invoices (one per student per instalment), payments, reversals and unpaid totals against the real emulator.
import { randomUUID } from 'node:crypto';
import { createDatabase, type Database } from '../src/index.js';

const host = process.env.DATA_CONNECT_EMULATOR_HOST;
const bare = (u: string) => u.replaceAll('-', '');

describe.skipIf(!host)('Invoice and payment operations (P2-7b)', () => {
  let db: Database;
  const A = randomUUID();
  const B = randomUUID();
  const tag = A.slice(0, 8);
  const cashierA = `ca-${tag}`;
  const cashierB = `cb-${tag}`;
  let yearA: string, studentA: string, studentA2: string, studentB: string, instalmentA: string, instalment2A: string;
  const audit = async (s: string, action?: string) => (await db.listAuditLog({ schoolId: s, limit: 400, offset: 0 })).data.auditLogs.filter((a) => !action || a.action === action);
  const invoice = async (s: string, id: string) => (await db.getInvoice({ schoolId: s, id })).data.invoices[0];
  const make = async (student: string, inst: string, amount = '1000000', due = '2027-04-10', gross = '1250000', discount = '250000') => {
    const id = randomUUID();
    await db.createInstalmentInvoice({ schoolId: A, id, studentId: student, instalmentId: inst, academicYearId: yearA, title: 'Tuition - April', grossMinor: gross, discountMinor: discount, amountMinor: amount, dueDate: due, actorId: cashierA });
    return id;
  };
  const pay = async (id: string, student: string, amount: string, paidBefore: string, newTotal: string, status = 'PENDING', method = 'CASH') => {
    const pid = randomUUID();
    await db.recordPayment({ schoolId: A, id: pid, invoiceId: id, studentId: student, amountMinor: amount, method: method as never, reference: 'REF1', paidOn: '2027-04-12', expectedPaidMinor: paidBefore, newPaidMinor: newTotal, newStatus: status as never, actorId: cashierA });
    return pid;
  };
  const student = async (s: string, actor: string, first: string) => {
    const seq = (await db.applicationSeqInfo({ schoolId: s })).data.school!.studentSeq;
    const id = randomUUID();
    await db.createStudent({ schoolId: s, id, expectedSeq: seq, enrollmentId: `S${String(seq + 1).padStart(4, '0')}`, firstName: first, lastName: 'Payer', actorId: actor });
    return id;
  };

  beforeAll(async () => {
    db = createDatabase({ projectId: 'demo-oruschools' });
    for (const id of [cashierA, cashierB]) await db.upsertUser({ id, email: `${id}@example.com` });
    await db.provisionSchool({ id: A, name: 'School A', subDomain: `a-${tag}`, defaultLanguage: 'en', actorId: cashierA });
    await db.provisionSchool({ id: B, name: 'School B', subDomain: `b-${tag}`, defaultLanguage: 'en', actorId: cashierB });
    await db.createSchoolMember({ schoolId: A, userId: cashierA, schoolRole: 'BURSAR' as never });
    await db.createSchoolMember({ schoolId: B, userId: cashierB, schoolRole: 'BURSAR' as never });
    yearA = randomUUID();
    await db.createAcademicYear({ schoolId: A, id: yearA, name: '2027-2028', startDate: '2027-04-01', endDate: '2028-03-31', actorId: cashierA });
    const level = (await db.listGradeLevels({ schoolId: A })).data.gradeLevels.find((l) => l.name === '1')!.id;
    const structure = randomUUID();
    await db.createFeeStructure({ schoolId: A, id: structure, academicYearId: yearA, gradeLevelId: level, name: 'Fees', actorId: cashierA });
    const item = randomUUID();
    await db.createFeeItem({ schoolId: A, id: item, structureId: structure, name: 'Tuition', actorId: cashierA });
    instalmentA = randomUUID(); instalment2A = randomUUID();
    await db.addFeeInstalment({ schoolId: A, id: instalmentA, itemId: item, sequence: 1, amountMinor: '1250000', dueDate: '2027-04-10', actorId: cashierA });
    await db.addFeeInstalment({ schoolId: A, id: instalment2A, itemId: item, sequence: 2, amountMinor: '1250000', dueDate: '2027-07-10', actorId: cashierA });
    studentA = await student(A, cashierA, 'Pay');
    studentA2 = await student(A, cashierA, 'Pay2');
    studentB = await student(B, cashierB, 'Bee');
  });

  it('one invoice per student per instalment: a second is refused, another student or instalment is fine', async () => {
    const id = await make(studentA, instalmentA);
    await expect(make(studentA, instalmentA)).rejects.toMatchObject({ kind: 'CONFLICT' });
    await make(studentA2, instalmentA);
    await make(studentA, instalment2A, '1250000', '2027-07-10', '1250000', '0');
    const got = (await invoice(A, id))!;
    expect(got).toMatchObject({ title: 'Tuition - April', amountMinor: '1000000', grossMinor: '1250000', discountMinor: '250000', paidMinor: '0', status: 'PENDING', dueDate: '2027-04-10' });
    expect(got.student).toMatchObject({ enrollmentId: expect.stringMatching(/^S\d{4}$/) });
    expect((await db.invoicedInstalments({ schoolId: A, studentId: studentA })).data.invoices.map((i) => bare(i.instalmentId!)).sort()).toEqual([bare(instalmentA), bare(instalment2A)].sort());
    expect((await audit(A, 'fees.invoice.create')).length).toBe(3);
  });

  it('student, instalment and year must belong to the school; a refused invoice writes nothing', async () => {
    const before = (await audit(A)).length;
    await expect(db.createInstalmentInvoice({ schoolId: B, id: randomUUID(), studentId: studentA2, instalmentId: instalment2A, academicYearId: yearA, title: 'x', grossMinor: '1', discountMinor: '0', amountMinor: '1', dueDate: '2027-04-10', actorId: cashierB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.createInstalmentInvoice({ schoolId: A, id: randomUUID(), studentId: studentB, instalmentId: instalmentA, academicYearId: yearA, title: 'x', grossMinor: '1', discountMinor: '0', amountMinor: '1', dueDate: '2027-04-10', actorId: cashierA })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.createInvoice({ schoolId: A, id: randomUUID(), studentId: studentA, title: 'x', amountMinor: '1', dueDate: '2027-04-10', actorId: cashierB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // not a member
    expect((await audit(A)).length).toBe(before);
    expect((await db.listInvoices({ schoolId: B, limit: 50, offset: 0 })).data.invoices).toEqual([]);
  });

  it('a payment moves the paid total and status together; part payments add up exactly', async () => {
    const id = await make(studentA2, instalment2A, '1250000', '2027-07-10');
    await pay(id, studentA2, '400000', '0', '400000');
    await pay(id, studentA2, '350000', '400000', '750000', 'PENDING', 'UPI');
    let got = (await invoice(A, id))!;
    expect(got).toMatchObject({ paidMinor: '750000', status: 'PENDING' });
    expect(got.payments.map((p) => [p.amountMinor, p.method, p.reversedAt])).toEqual([['400000', 'CASH', null], ['350000', 'UPI', null]]);
    await pay(id, studentA2, '500000', '750000', '1250000', 'PAID', 'CHEQUE');
    got = (await invoice(A, id))!;
    expect(got).toMatchObject({ paidMinor: '1250000', status: 'PAID' });
    expect(got.payments[2]!.recordedBy.id).toBe(cashierA);
  });

  it('two cashiers cannot both pay from the same starting total: the second is refused and writes nothing', async () => {
    const s = await student(A, cashierA, 'Race');
    const inv = await make(s, instalmentA, '1000000');
    await pay(inv, s, '600000', '0', '600000');
    const before = (await audit(A, 'fees.payment.record')).length;
    await expect(pay(inv, s, '600000', '0', '600000')).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // saw 0 paid, but 600000 is paid now
    expect((await invoice(A, inv))!).toMatchObject({ paidMinor: '600000' });
    expect((await invoice(A, inv))!.payments).toHaveLength(1);
    expect((await audit(A, 'fees.payment.record')).length).toBe(before);
  });

  it('another school cannot pay or read an invoice, and a payment must name the invoice\'s own student', async () => {
    const s = await student(A, cashierA, 'Own');
    const inv = await make(s, instalmentA);
    await expect(db.recordPayment({ schoolId: B, id: randomUUID(), invoiceId: inv, studentId: s, amountMinor: '1', method: 'CASH' as never, paidOn: '2027-04-12', expectedPaidMinor: '0', newPaidMinor: '1', newStatus: 'PENDING' as never, actorId: cashierB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.recordPayment({ schoolId: A, id: randomUUID(), invoiceId: inv, studentId: studentA, amountMinor: '1', method: 'CASH' as never, paidOn: '2027-04-12', expectedPaidMinor: '0', newPaidMinor: '1', newStatus: 'PENDING' as never, actorId: cashierA })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // another student's name on it
    expect((await db.getInvoice({ schoolId: B, id: inv })).data.invoices).toEqual([]);
    expect((await invoice(A, inv))!).toMatchObject({ paidMinor: '0' });
  });

  it('a reversal keeps the payment, marks it, and takes it out of the invoice; once only', async () => {
    const s = await student(A, cashierA, 'Rev');
    const inv = await make(s, instalmentA, '1000000');
    const p1 = await pay(inv, s, '1000000', '0', '1000000', 'PAID');
    await expect(db.reversePayment({ schoolId: B, id: p1, invoiceId: inv, reason: 'x', expectedPaidMinor: '1000000', newPaidMinor: '0', newStatus: 'PENDING' as never, actorId: cashierB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await db.reversePayment({ schoolId: A, id: p1, invoiceId: inv, reason: 'Entered against the wrong child', expectedPaidMinor: '1000000', newPaidMinor: '0', newStatus: 'PENDING' as never, actorId: cashierA });
    const got = (await invoice(A, inv))!;
    expect(got).toMatchObject({ paidMinor: '0', status: 'PENDING' });
    expect(got.payments).toHaveLength(1);
    expect(got.payments[0]).toMatchObject({ amountMinor: '1000000', reversalReason: 'Entered against the wrong child' });
    expect(got.payments[0]!.reversedAt).toBeTruthy();
    await expect(db.reversePayment({ schoolId: A, id: p1, invoiceId: inv, reason: 'again', expectedPaidMinor: '0', newPaidMinor: '-1000000', newStatus: 'PENDING' as never, actorId: cashierA })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    expect((await audit(A, 'fees.payment.reverse')).length).toBe(1);
  });

  it('lists and counts with filters, exact sums, and unpaid totals by due-date window', async () => {
    const list = async (o: Record<string, unknown> = {}) => (await db.listInvoices({ schoolId: A, limit: 100, offset: 0, ...o })).data.invoices;
    const all = await list();
    const count = (await db.countInvoices({ schoolId: A })).data.invoices[0]!;
    expect(count._count).toBe(all.length);
    expect(count.amountMinor_sum).toBe(String(all.reduce((t, i) => t + BigInt(i.amountMinor), 0n)));
    expect(count.paidMinor_sum).toBe(String(all.reduce((t, i) => t + BigInt(i.paidMinor), 0n)));
    expect((await list({ studentId: studentA })).every((i) => bare(i.student.id) === bare(studentA))).toBe(true);
    expect((await list({ status: 'PAID' as never })).every((i) => i.status === 'PAID')).toBe(true);
    expect((await list({ dueOnOrAfter: '2027-07-01' })).every((i) => i.dueDate >= '2027-07-01')).toBe(true);
    const unpaid = (await db.unpaidTotals({ schoolId: A, dueOnOrBefore: '2027-04-30', dueOnOrAfter: '2027-04-01' })).data.invoices[0]!;
    const expected = all.filter((i) => i.status === 'PENDING' && i.dueDate >= '2027-04-01' && i.dueDate <= '2027-04-30');
    expect(unpaid._count).toBe(expected.length);
    expect(unpaid.amountMinor_sum).toBe(String(expected.reduce((t, i) => t + BigInt(i.amountMinor), 0n)));
    expect((await db.unpaidTotals({ schoolId: B })).data.invoices[0]).toMatchObject({ _count: 0 });
  });

  it('placed students can be listed by level or class, active ones only, inside the school', async () => {
    const level = (await db.listGradeLevels({ schoolId: A })).data.gradeLevels.find((l) => l.name === '1')!.id;
    const room = randomUUID();
    await db.createClassroom({ schoolId: A, id: room, gradeLevelId: level, section: 'Z', name: '1 Z', capacity: 30, actorId: cashierA });
    await db.placeStudent({ schoolId: A, studentId: studentA, academicYearId: yearA, classroomId: room, actorId: cashierA });
    await db.placeStudent({ schoolId: A, studentId: studentA2, academicYearId: yearA, classroomId: room, actorId: cashierA });
    await db.updateStudent({ schoolId: A, id: studentA2, status: 'LEFT' as never, actorId: cashierA });
    const byLevel = (await db.placedStudents({ schoolId: A, academicYearId: yearA, gradeLevelId: level, limit: 100, offset: 0 })).data.studentEnrollments.map((e) => bare(e.studentId));
    expect(byLevel).toEqual([bare(studentA)]);
    expect((await db.placedStudents({ schoolId: A, academicYearId: yearA, classroomId: room, limit: 100, offset: 0 })).data.studentEnrollments).toHaveLength(1);
    expect((await db.placedStudents({ schoolId: B, academicYearId: yearA, limit: 100, offset: 0 })).data.studentEnrollments).toEqual([]);
  });

  it('every change left its audit row; refused ones left none', async () => {
    const actions = (await audit(A)).map((r) => r.action);
    for (const a of ['fees.invoice.create', 'fees.payment.record', 'fees.payment.reverse']) expect(actions, a).toContain(a);
    expect((await audit(A)).filter((r) => r.actor.id === cashierB)).toEqual([]);
  });
});
