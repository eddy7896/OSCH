// P2-8: salary lines, payroll runs (draft -> approved by the Principal -> paid by the Bursar) and payslips against the real emulator.
import { randomUUID } from 'node:crypto';
import { createDatabase, type Database } from '../src/index.js';

const host = process.env.DATA_CONNECT_EMULATOR_HOST;
const bare = (u: string) => u.replaceAll('-', '');

describe.skipIf(!host)('Payroll operations (P2-8)', () => {
  let db: Database;
  const A = randomUUID();
  const B = randomUUID();
  const tag = A.slice(0, 8);
  const hrA = `hr-${tag}`, principalA = `pr-${tag}`, bursarA = `bu-${tag}`, hrB = `hb-${tag}`, principalB = `pb-${tag}`;
  let staff1: string, staff2: string, staffB: string;
  const audit = async (s: string, action?: string) => (await db.listAuditLog({ schoolId: s, limit: 400, offset: 0 })).data.auditLogs.filter((a) => !action || a.action === action);
  const hire = async (s: string, actor: string, first: string) => {
    const seq = (await db.staffSeqInfo({ schoolId: s })).data.school!.staffSeq;
    const id = randomUUID();
    await db.createStaff({ schoolId: s, id, expectedSeq: seq, employeeId: `E${String(seq + 1).padStart(4, '0')}`, firstName: first, lastName: 'Staff', actorId: actor });
    return id;
  };
  const line = async (staff: string, kind: string, name: string, amount: string, actor = hrA, school = A) => {
    const id = randomUUID();
    await db.addSalaryLine({ schoolId: school, id, staffId: staff, kind: kind as never, name, amountMinor: amount, actorId: actor });
    return id;
  };
  const run = async (year = 2027, month = 4, actor = hrA, school = A) => {
    const id = randomUUID();
    await db.createPayrollRun({ schoolId: school, id, year, month, actorId: actor });
    return id;
  };
  const payslip = async (runId: string, staff: string, actor = hrA, school = A) => {
    const id = randomUUID();
    await db.createPayslip({ schoolId: school, id, runId, staffId: staff, actorId: actor });
    return id;
  };
  const pline = async (runId: string, slip: string, kind: string, name: string, amount: string, manual = false, actor = hrA, school = A) => {
    const id = randomUUID();
    await db.addPayslipLine({ schoolId: school, id, runId, payslipId: slip, kind: kind as never, name, amountMinor: amount, manual, actorId: actor });
    return id;
  };
  const get = async (id: string, school = A) => (await db.getPayrollRun({ schoolId: school, id })).data.payrollRuns[0];
  const sum = async (id: string, kind: string) => (await db.payrollRunSum({ schoolId: A, runId: id, kind: kind as never })).data.payslipLines[0]!;

  beforeAll(async () => {
    db = createDatabase({ projectId: 'demo-oruschools' });
    for (const id of [hrA, principalA, bursarA, hrB, principalB]) await db.upsertUser({ id, email: `${id}@example.com` });
    await db.provisionSchool({ id: A, name: 'School A', subDomain: `a-${tag}`, defaultLanguage: 'en', actorId: hrA });
    await db.provisionSchool({ id: B, name: 'School B', subDomain: `b-${tag}`, defaultLanguage: 'en', actorId: hrB });
    for (const [s, u, r] of [[A, hrA, 'HR_MANAGER'], [A, principalA, 'PRINCIPAL'], [A, bursarA, 'BURSAR'], [B, hrB, 'HR_MANAGER'], [B, principalB, 'PRINCIPAL']] as const)
      await db.createSchoolMember({ schoolId: s, userId: u, schoolRole: r as never });
    staff1 = await hire(A, hrA, 'Asha');
    staff2 = await hire(A, hrA, 'Bilal');
    staffB = await hire(B, hrB, 'Bee');
  });

  it('salary lines: earnings and deductions per person, unique by name, exact in paise, other schools refused', async () => {
    const basic = await line(staff1, 'EARNING', 'Basic pay', '4500000');
    await line(staff1, 'EARNING', 'House rent allowance', '1800000');
    await line(staff1, 'DEDUCTION', 'Advance recovery', '250000');
    await expect(line(staff1, 'EARNING', 'Basic pay', '1')).rejects.toMatchObject({ kind: 'CONFLICT' });
    await line(staff2, 'EARNING', 'Basic pay', '3000000'); // the same name for another person is fine
    expect((await db.listSalaryLines({ schoolId: A, staffId: staff1 })).data.salaryLines.map((l) => [l.kind, l.name, l.amountMinor])).toEqual([['EARNING', 'Basic pay', '4500000'], ['EARNING', 'House rent allowance', '1800000'], ['DEDUCTION', 'Advance recovery', '250000']]);
    await db.updateSalaryLine({ schoolId: A, id: basic, amountMinor: '4600000', actorId: hrA });
    expect((await db.salaryLineById({ schoolId: A, id: basic })).data.salaryLines[0]!.amountMinor).toBe('4600000');
    await expect(line(staff1, 'EARNING', 'Hijack', '1', hrB, B)).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.updateSalaryLine({ schoolId: B, id: basic, amountMinor: '1', actorId: hrB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.removeSalaryLine({ schoolId: B, id: basic, actorId: hrB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    expect((await db.listSalaryLines({ schoolId: B, staffId: staff1 })).data.salaryLines).toEqual([]);
    const staffList = (await db.staffForPayroll({ schoolId: A, limit: 100, offset: 0 })).data.staffProfiles;
    expect(staffList.find((s) => bare(s.id) === bare(staff1))!.lines).toHaveLength(3);
  });

  it('one run per school and month; a draft can be built, edited and deleted', async () => {
    const r = await run(2027, 4);
    await expect(run(2027, 4)).rejects.toMatchObject({ kind: 'CONFLICT' });
    await run(2027, 5);
    await run(2027, 4, hrB, B); // another school, same month: fine
    const slip = await payslip(r, staff1);
    await expect(payslip(r, staff1)).rejects.toMatchObject({ kind: 'CONFLICT' }); // one payslip per person per run
    const basic = await pline(r, slip, 'EARNING', 'Basic pay', '4600000');
    await pline(r, slip, 'EARNING', 'House rent allowance', '1800000');
    await pline(r, slip, 'DEDUCTION', 'Advance recovery', '250000');
    const manual = await pline(r, slip, 'DEDUCTION', 'Unpaid leave (2 days)', '300000', true);
    const got = (await get(r))!;
    expect(got).toMatchObject({ year: 2027, month: 4, status: 'DRAFT' });
    expect(got.payslips[0]!.lines.map((l) => [l.kind, l.name, l.amountMinor, l.manual])).toEqual([['EARNING', 'Basic pay', '4600000', false], ['EARNING', 'House rent allowance', '1800000', false], ['DEDUCTION', 'Advance recovery', '250000', false], ['DEDUCTION', 'Unpaid leave (2 days)', '300000', true]]);
    expect(await sum(r, 'EARNING')).toMatchObject({ _count: 2, amountMinor_sum: '6400000' });
    expect(await sum(r, 'DEDUCTION')).toMatchObject({ _count: 2, amountMinor_sum: '550000' });
    await db.removePayslipLine({ schoolId: A, id: manual, runId: r, actorId: hrA });
    expect((await sum(r, 'DEDUCTION'))).toMatchObject({ _count: 1, amountMinor_sum: '250000' });
    expect((await db.payslipLine({ schoolId: A, id: basic })).data.payslipLines[0]).toMatchObject({ kind: 'EARNING', run: { status: 'DRAFT' } });
    await db.deletePayrollRun({ schoolId: A, id: (await db.listPayrollRuns({ schoolId: A, limit: 50, offset: 0 })).data.payrollRuns.find((x) => x.month === 5)!.id, actorId: hrA });
    expect((await db.listPayrollRuns({ schoolId: A, limit: 50, offset: 0 })).data.payrollRuns.map((x) => x.month)).toEqual([4]);
    expect((await db.findPayrollRun({ schoolId: A, year: 2027, month: 4 })).data.payrollRuns[0]).toMatchObject({ status: 'DRAFT' });
  });

  it('another school cannot touch a run, its payslips or its lines, and nothing is written', async () => {
    const r = await run(2027, 6);
    const slip = await payslip(r, staff2);
    const l = await pline(r, slip, 'EARNING', 'Basic pay', '3000000');
    const before = (await audit(A)).length;
    await expect(payslip(r, staffB, hrB, B)).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(pline(r, slip, 'EARNING', 'x', '1', false, hrB, B)).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.removePayslipLine({ schoolId: B, id: l, runId: r, actorId: hrB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.deletePayrollRun({ schoolId: B, id: r, actorId: hrB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.approvePayrollRun({ schoolId: B, id: r, actorId: principalB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    expect((await get(r, B))).toBeUndefined();
    expect((await get(r))!.payslips[0]!.lines).toHaveLength(1);
    expect((await audit(A)).length).toBe(before);
  });

  it('only the Principal of the school approves, only a draft, once; HR and the Bursar cannot, and the database says so itself', async () => {
    const r = await run(2027, 7);
    const slip = await payslip(r, staff1);
    await pline(r, slip, 'EARNING', 'Basic pay', '4600000');
    for (const who of [hrA, bursarA]) await expect(db.approvePayrollRun({ schoolId: A, id: r, actorId: who })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.approvePayrollRun({ schoolId: A, id: r, actorId: principalB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // a Principal, but of another school
    expect((await get(r))!.status).toBe('DRAFT');
    await db.approvePayrollRun({ schoolId: A, id: r, actorId: principalA, details: { payslips: 1 } });
    const got = (await get(r))!;
    expect(got).toMatchObject({ status: 'APPROVED', approvedBy: { id: principalA }, preparedBy: { id: hrA } });
    expect(got.approvedAt).toBeTruthy();
    await expect(db.approvePayrollRun({ schoolId: A, id: r, actorId: principalA })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // not a draft any more
    expect((await audit(A, 'payroll.run.approve')).filter((a) => a.actor.id === principalA).length).toBeGreaterThan(0);
  });

  it('an approved run is frozen: no payslip, line or deletion can change it', async () => {
    const r = await run(2027, 8);
    const slip = await payslip(r, staff1);
    const l = await pline(r, slip, 'EARNING', 'Basic pay', '4600000');
    await db.approvePayrollRun({ schoolId: A, id: r, actorId: principalA });
    await expect(payslip(r, staff2)).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(pline(r, slip, 'DEDUCTION', 'Late change', '1')).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.removePayslipLine({ schoolId: A, id: l, runId: r, actorId: hrA })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.deletePayrollRun({ schoolId: A, id: r, actorId: hrA })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    expect(await sum(r, 'EARNING')).toMatchObject({ _count: 1, amountMinor_sum: '4600000' });
  });

  it('only the Bursar marks an approved run paid, once; a draft cannot be paid and the Principal cannot pay', async () => {
    const r = await run(2027, 9);
    const slip = await payslip(r, staff1);
    await pline(r, slip, 'EARNING', 'Basic pay', '4600000');
    await expect(db.markPayrollRunPaid({ schoolId: A, id: r, paidOn: '2027-09-30', actorId: bursarA })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // still a draft
    await db.approvePayrollRun({ schoolId: A, id: r, actorId: principalA });
    for (const who of [principalA, hrA]) await expect(db.markPayrollRunPaid({ schoolId: A, id: r, paidOn: '2027-09-30', actorId: who })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await db.markPayrollRunPaid({ schoolId: A, id: r, paidOn: '2027-09-30', paymentReference: 'NEFT-998877', actorId: bursarA });
    expect((await get(r))!).toMatchObject({ status: 'PAID', paidOn: '2027-09-30', paymentReference: 'NEFT-998877', paidBy: { id: bursarA } });
    await expect(db.markPayrollRunPaid({ schoolId: A, id: r, paidOn: '2027-10-01', actorId: bursarA })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // once only
    expect((await db.getPayslip({ schoolId: A, id: slip })).data.payslips[0]).toMatchObject({ run: { status: 'PAID' }, staff: { employeeId: expect.stringMatching(/^E\d{4}$/) } });
    expect((await db.getPayslip({ schoolId: B, id: slip })).data.payslips).toEqual([]);
  });

  it('every change left its audit row and refused ones left none', async () => {
    const actions = (await audit(A)).map((r) => r.action);
    for (const a of ['payroll.salaryline.add', 'payroll.salaryline.update', 'payroll.run.create', 'payroll.payslip.create', 'payroll.payslipline.add', 'payroll.payslipline.remove', 'payroll.run.delete', 'payroll.run.approve', 'payroll.run.pay'])
      expect(actions, a).toContain(a);
    expect((await audit(A)).filter((r) => [hrB, principalB].includes(r.actor.id))).toEqual([]);
  });
});
