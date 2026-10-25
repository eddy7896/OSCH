// P3-7 against the REAL stack: the substitution board (E-ACAD-2): needs come from approved leave, suggestions are free and qualified, nothing is assigned automatically.
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

/** The n-th Monday on or after 1 May 2090. */
const monday = (n: number): string => {
  const d = new Date('2090-05-01T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7) + 7 * n);
  return d.toISOString().slice(0, 10);
};

describe.skipIf(!ready)('substitution board against the real emulators (P3-7)', { timeout: 180_000 }, () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const B = () => w!.schools.B;
  const acad = () => w!.roles.A.ACADEMIC_ADMIN;
  const hr = () => w!.roles.A.HR_MANAGER;
  const principal = () => w!.roles.A.PRINCIPAL;
  const substituteUser = () => w!.roles.A.TEACHER; // Y
  const absentUser = () => w!.roles.A.STAFF; // X
  const absent2User = () => hr(); // X2
  const call = (method: 'get' | 'post' | 'put' | 'patch' | 'delete', path: string, who: Person = acad(), school = A()) =>
    agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const audit = async (action: string) => (await w!.db.listAuditLog({ schoolId: A().replaceAll('-', ''), limit: 500, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  const uniq = () => randomUUID().slice(0, 6);

  let math = '', sci = '', p1 = '', p2 = '', cA = '', cB = '', X = '', X2 = '', Y = '', Z = '', W = '', unpaid = '';
  let entryXp1 = '', entryXp2 = '', entryX2p1 = '';
  const date = monday(1);
  const makeClass = async (levelName: string) => {
    const level = ((await call('get', '/academics/levels').expect(200)).body.items as Array<{ id: string; name: string }>).find((l) => l.name === levelName);
    return (await call('post', '/academics/classes').send({ gradeLevelId: level!.id, section: `T${uniq()}`.slice(0, 6), capacity: 40 }).expect(201)).body as { id: string };
  };
  const makeStaff = async (first: string, account?: Person) => {
    const s = (await call('post', '/staff', hr()).send({ firstName: first, lastName: 'Teach' }).expect(201)).body as { id: string };
    if (account) await call('put', `/staff/${s.id}/account`, hr()).send({ userId: account.uid }).expect(200);
    return s.id;
  };
  const teach = (staff: string, subject: string) => call('post', `/academics/teachers/${staff}/subjects`).send({ subjectId: subject }).expect(201);
  const lesson = async (classId: string, day: string, periodId: string, subjectId: string, staffId: string) =>
    (await call('put', `/academics/timetable/classes/${classId}/slots`).send({ day, periodId, subjectId, staffId }).expect(200)).body.entries.find((e: { day: string; periodId: string }) => e.day === day && e.periodId === periodId).id as string;
  const leave = async (who: Person, status: 'approve' | 'reject' | 'pending', b: object = {}) => {
    const r = (await call('post', '/leave/requests', who).send({ leaveTypeId: unpaid, startDate: date, endDate: date, ...b }).expect(201)).body;
    if (status !== 'pending') await call('post', `/leave/requests/${r.id}/${status}`, principal()).send({}).expect(200);
    return r.id as string;
  };
  const needs = async (from = date, to = date) => (await call('get', `/substitutions/needs?from=${from}&to=${to}`).expect(200)).body.items as Array<{ date: string; absent: { id: string }; slot: { entryId: string; period: { id: string }; class: { id: string } }; cover: { id: string; substitute: { id: string } } | null }>;
  const assign = (entryId: string, substituteStaffId: string, d = date, who: Person = acad()) => call('put', '/substitutions', who).send({ entryId, date: d, substituteStaffId });

  beforeAll(async () => {
    const y = (await call('post', '/academics/years').send({ name: `SB-${uniq()}`, startDate: '2090-04-01', endDate: '2091-03-31' }).expect(201)).body;
    await call('post', `/academics/years/${y.id}/activate`).send({}).expect(200);
    p1 = (await call('post', '/academics/periods').send({ label: 'One', startTime: '08:00', endTime: '08:40' }).expect(201)).body.id;
    p2 = (await call('post', '/academics/periods').send({ label: 'Two', startTime: '08:40', endTime: '09:20' }).expect(201)).body.id;
    [math, sci] = [(await call('post', '/academics/subjects').send({ name: `Maths ${uniq()}`, code: uniq().toUpperCase() }).expect(201)).body.id, (await call('post', '/academics/subjects').send({ name: `Sci ${uniq()}`, code: uniq().toUpperCase() }).expect(201)).body.id];
    [cA, cB] = [(await makeClass('1')).id, (await makeClass('1')).id];
    X = await makeStaff('Xavier', absentUser()); X2 = await makeStaff('Xena', absent2User()); Y = await makeStaff('Yash', substituteUser()); Z = await makeStaff('Zoya'); W = await makeStaff('Wasim');
    for (const s of [X, X2, Y, W]) await teach(s, math);
    await teach(Z, sci);
    entryXp1 = await lesson(cA, 'MON', p1, math, X);
    entryXp2 = await lesson(cA, 'MON', p2, math, X);
    entryX2p1 = await lesson(cB, 'MON', p1, math, X2);
    await lesson(await (async () => (await makeClass('2')).id)(), 'MON', p1, math, W); // Wasim has a lesson of his own in period one
    unpaid = (await call('post', '/leave/types', hr()).send({ name: 'Unpaid', paid: false }).expect(201)).body.id;
  }, 120_000);

  it('a need exists only for APPROVED leave: pending and rejected leave raise nothing; approval raises the absent teacher\'s lessons of that day', async () => {
    await leave(absentUser(), 'pending');
    expect(await needs()).toEqual([]);
    await leave(absentUser(), 'reject', { startDate: monday(3), endDate: monday(3) });
    expect(await needs(monday(3), monday(3))).toEqual([]);
    // the pending one is cancelled by approving it: approve the first request
    const pending = (await call('get', '/leave/requests?status=PENDING', principal()).expect(200)).body.items.find((r: { staff: { id: string } }) => r.staff.id === X).id;
    await call('post', `/leave/requests/${pending}/approve`, principal()).expect(200);
    const list = await needs();
    expect(list.map((n) => [n.slot.entryId, n.cover])).toEqual([[entryXp1, null], [entryXp2, null]]);
    expect(list.every((n) => n.absent.id === X && n.date === date)).toBe(true);
    expect(await needs(monday(0), monday(0))).toEqual([]); // the week before: nothing
    expect((await needs(date, monday(2))).length).toBe(2); // Tuesday to Sunday of that week has no lessons of Xavier
    await call('get', `/substitutions/needs?from=${date}&to=2095-01-01`).expect(400);
    await call('get', `/substitutions/needs?from=${date}&to=2000-01-01`).expect(400);
  });

  it('E-ACAD-2: suggestions are only people who are free and qualified, fewest substitutions this month first', async () => {
    const s = (await call('get', `/substitutions/suggestions?entryId=${entryXp1}&date=${date}`).expect(200)).body;
    expect(s.need.slot.entryId).toBe(entryXp1);
    const ids = s.candidates.map((c: { staff: { id: string } }) => c.staff.id);
    expect(ids).toContain(Y);
    // Xena has her own lesson in period one, so she is NOT free; Wasim too; Zoya does not teach maths; Xavier is the absent one
    expect(ids).not.toContain(X2);
    expect(ids).not.toContain(W);
    expect(ids).not.toContain(Z);
    expect(ids).not.toContain(X);
    expect(s.candidates.every((c: { substitutionsThisMonth: number }) => c.substitutionsThisMonth === 0)).toBe(true);
    // a lesson nobody is absent for
    await call('get', `/substitutions/suggestions?entryId=${entryX2p1}&date=${date}`).expect(409);
    await call('get', `/substitutions/suggestions?entryId=${entryXp1}&date=${monday(2)}`).expect(409);
    await call('get', `/substitutions/suggestions?entryId=nope&date=${date}`).expect(400);
    await call('get', `/substitutions/suggestions?entryId=${entryXp1}&date=2090-02-30`).expect(400);
  });

  it('the Academic admin confirms or changes the substitute; the reason is named when a person cannot cover; every change is audited', async () => {
    const reason = async (staff: string, status = 409) => (await assign(entryXp1, staff).expect(status)).body.error.details;
    expect(await reason(W)).toEqual([{ field: 'substituteStaffId', rule: 'hasOwnLesson' }]);
    expect(await reason(Z)).toEqual([{ field: 'substituteStaffId', rule: 'notQualified' }]);
    expect(await reason(X)).toEqual([{ field: 'substituteStaffId', rule: 'sameAsAbsent' }]);
    expect(await reason(X2)).toEqual([{ field: 'substituteStaffId', rule: 'hasOwnLesson' }]);
    expect(await reason(randomUUID(), 400)).toEqual([{ field: 'substituteStaffId', rule: 'activeStaffOfThisSchool' }]);
    expect((await needs()).every((n) => n.cover === null)).toBe(true); // nothing was assigned by the refusals
    const set = (await assign(entryXp1, Y).expect(200)).body;
    expect(set.cover).toMatchObject({ substitute: { id: Y } });
    expect((await audit('academic.substitution.set')).length).toBe(1);
    // Yash covers period two as well (a different period), and his count for the month rises
    await assign(entryXp2, Y).expect(200);
    const ranked = (await call('get', `/substitutions/suggestions?entryId=${entryXp1}&date=${date}`).expect(200)).body.candidates;
    expect(ranked.find((c: { staff: { id: string } }) => c.staff.id === Y)).toMatchObject({ substitutionsThisMonth: 2 });
    // changing the substitute is one row, not two
    const other = await makeStaff('Omar'); await teach(other, math);
    expect((await assign(entryXp1, other).expect(200)).body.cover.substitute.id).toBe(other);
    expect((await needs()).filter((n) => n.cover).length).toBe(2);
    await assign(entryXp1, Y).expect(200); // and back
    await call('put', '/substitutions', principal()).send({ entryId: entryXp1, date, substituteStaffId: Y }).expect(403);
    await call('put', '/substitutions', substituteUser()).send({ entryId: entryXp1, date, substituteStaffId: Y }).expect(403);
  });

  it('E-ACAD-2: two requests at the same instant cannot put one substitute in two places in one period', async () => {
    await leave(absent2User(), 'approve');
    expect((await needs()).some((n) => n.slot.entryId === entryX2p1)).toBe(true);
    // Yash covers Xavier's period two; period one of Xavier is covered by Yash too, so use a fresh substitute for the race
    const racer = await makeStaff('Racer'); await teach(racer, math);
    const res = await Promise.all([assign(entryXp1, racer), assign(entryX2p1, racer)]);
    expect(res.map((r) => r.status).sort((a, b) => a - b)).toEqual([200, 409]);
    const covered = (await needs()).filter((n) => n.cover?.substitute.id === racer);
    expect(covered).toHaveLength(1);
    // a sequential second try is refused with the reason
    const loser = res.findIndex((r) => r.status === 409) === 0 ? entryXp1 : entryX2p1;
    expect((await assign(loser, racer).expect(409)).body.error.details).toEqual([{ field: 'substituteStaffId', rule: 'alreadySubstituting' }]);
  });

  it('the cover duty shows on the substitute\'s own list, and the board is not a teacher\'s', async () => {
    const mine = (await call('get', `/substitutions/mine?from=${date}&to=${date}`, substituteUser()).expect(200)).body;
    const duty = mine.items.find((d: { period: { id: string } }) => d.period.id === p2);
    expect(duty).toMatchObject({ date, class: { id: cA }, covering: { id: X } }); // Yash covers Xavier's period two (period one went to whoever won the race above)
    await call('get', `/substitutions/mine?from=${date}&to=${date}`, absentUser()).expect(403); // the Staff role holds no academics grant
    await call('get', `/substitutions/needs`, substituteUser()).expect(404); // the board is not a teacher's
    await call('get', `/substitutions/suggestions?entryId=${entryXp1}&date=${date}`, substituteUser()).expect(404);
  });

  it('clearing a substitute, and clearing the lesson itself, removes the cover', async () => {
    const dutyId = (await needs()).find((n) => n.slot.entryId === entryXp2)!.cover!.id;
    await call('delete', `/substitutions/${dutyId}`).expect(204);
    await call('delete', `/substitutions/${dutyId}`).expect(404);
    expect((await needs()).find((n) => n.slot.entryId === entryXp2)!.cover).toBeNull();
    expect((await audit('academic.substitution.clear')).length).toBe(1);
    // Xavier's period-one lesson is removed from the timetable: its need and its cover go with it
    await call('delete', `/academics/timetable/entries/${entryXp1}`).expect(204);
    expect((await needs()).some((n) => n.slot.entryId === entryXp1)).toBe(false);
    await call('delete', `/substitutions/${dutyId}`, principal()).expect(403);
  });

  it('another school sees none of it', async () => {
    const bAdmin = w!.roles.B.ACADEMIC_ADMIN;
    expect((await call('get', `/substitutions/needs?from=${date}&to=${date}`, bAdmin, B()).expect(200)).body.items).toEqual([]);
    await call('put', '/substitutions', bAdmin, B()).send({ entryId: entryXp2, date, substituteStaffId: Y }).expect(409);
    const duty = (await needs()).find((n) => n.cover);
    if (duty?.cover) await call('delete', `/substitutions/${duty.cover.id}`, bAdmin, B()).expect(404);
  });
});
