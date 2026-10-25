// P3-6: leave in the database itself, and E-ACAD-4: nobody but an active Principal reaches APPROVED. Run: npm run test:database
import { randomUUID } from 'node:crypto';
import { createDatabase, type Database } from '../src/index.js';

const host = process.env.DATA_CONNECT_EMULATOR_HOST;

describe.skipIf(!host)('Leave (P3-6)', () => {
  let db: Database;
  const A = randomUUID();
  const B = randomUUID();
  const tag = A.slice(0, 8);
  const principal = `lp-${tag}`, hrUser = `lh-${tag}`, bursar = `lb-${tag}`, academic = `la-${tag}`, teacher = `lt-${tag}`, other = `lo-${tag}`, principalB = `lq-${tag}`, outsider = `lx-${tag}`;
  const audit = async (s: string, action: string) => (await db.listAuditLog({ schoolId: s, limit: 300, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  let year = '', paid = '', unpaid = '', staffT = '', staffO = '', staffB = '', paidB = '';
  const date = '2090-06-01';

  const staff = async (school: string, actor: string, userId?: string) => {
    const seq = (await db.staffSeqInfo({ schoolId: school })).data.school!.staffSeq;
    const id = randomUUID();
    await db.createStaff({ schoolId: school, id, expectedSeq: seq, employeeId: `E${seq + 1}`, firstName: 'T', lastName: id.slice(0, 4), actorId: actor });
    if (userId) await db.linkStaffAccount({ schoolId: school, id, userId, actorId: actor, details: {} });
    return id;
  };
  const ask = (o: { type?: string; staff?: string; actor?: string; school?: string; halfDays?: number } = {}) => {
    const id = randomUUID();
    return db.createLeaveRequest({ schoolId: o.school ?? A, id, staffId: o.staff ?? staffT, leaveTypeId: o.type ?? paid, startDate: date, endDate: date, halfDays: o.halfDays ?? 2, actorId: o.actor ?? teacher, details: {} }).then(() => id);
  };
  const status = async (id: string) => (await db.listLeaveRequests({ schoolId: A })).data.leaveRequests.find((r) => r.id.replaceAll('-', '') === id.replaceAll('-', ''))!.status;
  const balanceId = randomUUID();

  beforeAll(async () => {
    db = createDatabase({ projectId: 'demo-oruschools' });
    for (const id of [principal, hrUser, bursar, academic, teacher, other, principalB, outsider]) await db.upsertUser({ id, email: `${id}@example.com` });
    await db.provisionSchool({ id: A, name: 'School A', subDomain: `la-${tag}`, defaultLanguage: 'en', actorId: principal });
    await db.provisionSchool({ id: B, name: 'School B', subDomain: `lb-${tag}`, defaultLanguage: 'en', actorId: principalB });
    for (const [school, user, role] of [[A, principal, 'PRINCIPAL'], [A, hrUser, 'HR_MANAGER'], [A, bursar, 'BURSAR'], [A, academic, 'ACADEMIC_ADMIN'], [A, teacher, 'TEACHER'], [A, other, 'TEACHER'], [B, principalB, 'PRINCIPAL']] as const)
      await db.createSchoolMember({ schoolId: school, userId: user, schoolRole: role as never });
    year = randomUUID();
    await db.createAcademicYear({ schoolId: A, id: year, name: 'Y', startDate: '2090-04-01', endDate: '2091-03-31', actorId: principal });
    staffT = await staff(A, hrUser, teacher); staffO = await staff(A, hrUser, other); staffB = await staff(B, principalB);
    [paid, unpaid, paidB] = [randomUUID(), randomUUID(), randomUUID()];
    await db.createLeaveType({ schoolId: A, id: paid, name: 'Casual', paid: true, quotaHalfDays: 6, actorId: hrUser, details: {} });
    await db.createLeaveType({ schoolId: A, id: unpaid, name: 'Unpaid', paid: false, quotaHalfDays: 0, actorId: hrUser, details: {} });
    await db.createLeaveType({ schoolId: B, id: paidB, name: 'Casual', paid: true, quotaHalfDays: 6, actorId: principalB, details: {} });
    await db.createLeaveBalance({ schoolId: A, id: balanceId, staffId: staffT, leaveTypeId: paid, academicYearId: year, allowedHalfDays: 6, actorId: hrUser });
  }, 120_000);

  it('a request is the requester\'s own: someone else\'s staff record, an unknown type and another school\'s type are refused', async () => {
    await expect(ask({ staff: staffO })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // teacher asking for other's record
    await expect(ask({ actor: hrUser })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // HR asking for the teacher's
    await expect(ask({ type: randomUUID() })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(ask({ type: paidB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(ask({ staff: staffB, school: B, type: paid, actor: principalB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(ask({ actor: outsider })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    expect((await db.listLeaveRequests({ schoolId: A })).data.leaveRequests).toHaveLength(0);
  });

  it('E-ACAD-4: only an active Principal of this school reaches APPROVED or REJECTED; every other actor is refused and nothing changes', async () => {
    const id = await ask();
    const approve = (actor: string, school = A) => db.approveLeaveRequest({ schoolId: school, id, staffId: staffT, balanceId, halfDays: 2, expectedRemaining: 6, newRemaining: 4, actorId: actor, details: {} });
    for (const actor of [hrUser, bursar, academic, teacher, other, outsider]) {
      await expect(approve(actor), actor).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
      await expect(db.rejectLeaveRequest({ schoolId: A, id, staffId: staffT, actorId: actor, details: {} }), actor).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    }
    await expect(approve(principalB, B)).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // another school's Principal
    await expect(approve(principalB)).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // not a member of this school
    expect(await status(id)).toBe('PENDING');
    expect((await db.listLeaveBalances({ schoolId: A, staffId: staffT })).data.leaveBalances[0]!.remainingHalfDays).toBe(6);
    expect((await audit(A, 'leave.request.approve')).length).toBe(0);
    await approve(principal);
    expect(await status(id)).toBe('APPROVED');
    expect((await db.listLeaveBalances({ schoolId: A, staffId: staffT })).data.leaveBalances[0]!.remainingHalfDays).toBe(4); // taken in the same step
    expect((await audit(A, 'leave.request.approve')).length).toBe(1);
    await expect(approve(principal)).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // not pending any more
    expect((await db.listLeaveBalances({ schoolId: A, staffId: staffT })).data.leaveBalances[0]!.remainingHalfDays).toBe(4);
  });

  it('a stale balance is refused, so two approvals cannot both spend the same days; unpaid approval takes nothing; a suspended Principal is refused', async () => {
    const id = await ask({ halfDays: 2 });
    const spend = (expected: number) => db.approveLeaveRequest({ schoolId: A, id, staffId: staffT, balanceId, halfDays: 2, expectedRemaining: expected, newRemaining: expected - 2, actorId: principal, details: {} });
    await expect(spend(6)).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // the balance is 4 now, not 6
    expect(await status(id)).toBe('PENDING');
    const wrongSize = db.approveLeaveRequest({ schoolId: A, id, staffId: staffT, balanceId, halfDays: 4, expectedRemaining: 4, newRemaining: 0, actorId: principal, details: {} });
    await expect(wrongSize).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // the request is 2 half-days, not 4
    await expect(db.approveUnpaidLeaveRequest({ schoolId: A, id, staffId: staffT, actorId: principal, details: {} })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // a paid request is not an unpaid one
    const u = await ask({ type: unpaid });
    await expect(db.approveLeaveRequest({ schoolId: A, id: u, staffId: staffT, balanceId, halfDays: 2, expectedRemaining: 4, newRemaining: 2, actorId: principal, details: {} })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // unpaid never touches a balance
    await db.approveUnpaidLeaveRequest({ schoolId: A, id: u, staffId: staffT, actorId: principal, details: {} });
    expect(await status(u)).toBe('APPROVED');
    expect((await db.listLeaveBalances({ schoolId: A, staffId: staffT })).data.leaveBalances[0]!.remainingHalfDays).toBe(4);
    // a Principal whose membership is suspended can no longer decide
    await db.updateMembership({ schoolId: A, userId: principal, schoolRole: 'PRINCIPAL' as never, status: 'SUSPENDED' as never, actorId: hrUser, details: {} });
    await expect(db.rejectLeaveRequest({ schoolId: A, id, staffId: staffT, note: 'No cover', actorId: principal, details: {} })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await db.updateMembership({ schoolId: A, userId: principal, schoolRole: 'PRINCIPAL' as never, status: 'ACTIVE' as never, actorId: hrUser, details: {} });
    await db.rejectLeaveRequest({ schoolId: A, id, staffId: staffT, note: 'No cover', actorId: principal, details: {} });
    expect(await status(id)).toBe('REJECTED');
  });

  it('only the requester cancels, only while pending; types in use cannot be deleted; balances are one per person, type and year', async () => {
    const id = await ask({ halfDays: 1 });
    await expect(db.cancelLeaveRequest({ schoolId: A, id, staffId: staffT, actorId: other, details: {} })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.cancelLeaveRequest({ schoolId: A, id, staffId: staffT, actorId: principal, details: {} })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await db.cancelLeaveRequest({ schoolId: A, id, staffId: staffT, actorId: teacher, details: {} });
    expect(await status(id)).toBe('CANCELLED');
    await expect(db.cancelLeaveRequest({ schoolId: A, id, staffId: staffT, actorId: teacher, details: {} })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.deleteLeaveType({ schoolId: A, id: paid, actorId: hrUser, details: {} })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.createLeaveBalance({ schoolId: A, id: randomUUID(), staffId: staffT, leaveTypeId: paid, academicYearId: year, allowedHalfDays: 2, actorId: hrUser })).rejects.toMatchObject({ kind: 'CONFLICT' });
    await expect(db.createLeaveBalance({ schoolId: A, id: randomUUID(), staffId: staffT, leaveTypeId: unpaid, academicYearId: year, allowedHalfDays: 2, actorId: hrUser })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // unpaid has none
    await expect(db.createLeaveBalance({ schoolId: A, id: randomUUID(), staffId: staffB, leaveTypeId: paid, academicYearId: year, allowedHalfDays: 2, actorId: hrUser })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // another school's staff
    await expect(db.setLeaveBalance({ schoolId: A, id: balanceId, expectedRemaining: 99, allowedHalfDays: 8, remainingHalfDays: 6, actorId: hrUser, details: {} })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await db.setLeaveBalance({ schoolId: A, id: balanceId, expectedRemaining: 4, allowedHalfDays: 8, remainingHalfDays: 6, actorId: hrUser, details: { was: 6, now: 8 } });
    expect((await audit(A, 'leave.balance.set')).length).toBe(1);
    expect((await audit(A, 'leave.request.cancel')).length).toBe(1);
  });
});
