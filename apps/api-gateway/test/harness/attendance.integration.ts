// P3-4 against the REAL stack: student attendance (E-ATT-1) and staff check-in, through the gateway.
import { type INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { agent } from '../support/serve.js';
import { today } from '../../src/attendance/attendance-rules.js';
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

const lastMonday = (): string => { const d = new Date(Date.now() + 330 * 60_000); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
const lastSunday = (): string => { const d = new Date(Date.now() + 330 * 60_000); d.setUTCDate(d.getUTCDate() - d.getUTCDay() - (d.getUTCDay() === 0 ? 7 : 0)); return d.toISOString().slice(0, 10); };

describe.skipIf(!ready)('attendance against the real emulators (P3-4)', { timeout: 180_000 }, () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const B = () => w!.schools.B;
  const acad = () => w!.roles.A.ACADEMIC_ADMIN;
  const hr = () => w!.roles.A.HR_MANAGER;
  const teacher = () => w!.roles.A.TEACHER;
  const call = (method: 'get' | 'post' | 'put' | 'patch' | 'delete', path: string, who: Person = acad(), school = A()) =>
    agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const audit = async (action: string) => (await w!.db.listAuditLog({ schoolId: A().replaceAll('-', ''), limit: 500, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  const uniq = () => randomUUID().slice(0, 6);
  const monday = lastMonday();

  let cA = '', cB = '';
  let s1 = '', s2 = '', s3 = '', s4 = '';
  let staffT = '';
  const submit = (classId: string, date: string, body: object, who: Person = teacher()) => call('put', `/attendance/classes/${classId}/days/${date}`, who).send(body);
  const makeClass = async (levelName: string) => {
    const level = ((await call('get', '/academics/levels').expect(200)).body.items as Array<{ id: string; name: string }>).find((l) => l.name === levelName);
    return (await call('post', '/academics/classes').send({ gradeLevelId: level!.id, section: `T${uniq()}`.slice(0, 6), capacity: 40 }).expect(201)).body as { id: string };
  };
  const makeStudent = async (classroomId: string, first: string) => (await call('post', '/students').send({ firstName: first, lastName: `K${uniq()}`, classroomId }).expect(201)).body as { id: string };

  beforeAll(async () => {
    const y = (await call('post', '/academics/years').send({ name: `AT-${uniq()}`, startDate: '2090-04-01', endDate: '2091-03-31' }).expect(201)).body;
    await call('post', `/academics/years/${y.id}/activate`).send({}).expect(200);
    cA = (await makeClass('1')).id; cB = (await makeClass('1')).id;
    [s1, s2, s3] = [(await makeStudent(cA, 'Asha')).id, (await makeStudent(cA, 'Bilal')).id, (await makeStudent(cA, 'Chitra')).id];
    s4 = (await makeStudent(cB, 'Dev')).id;
    staffT = ((await call('post', '/staff', hr()).send({ firstName: 'Tara', lastName: 'Teach' }).expect(201)).body as { id: string }).id;
    await call('put', `/staff/${staffT}/account`, hr()).send({ userId: teacher().uid }).expect(200);
    await call('put', `/academics/classes/${cA}/teacher`).send({ staffId: staffT }).expect(200);
  }, 120_000);

  it('the seven statuses are fixed: a school may reword one, never add, remove or redefine', async () => {
    const list = (await call('get', '/attendance/statuses').expect(200)).body.items as Array<{ status: string; label: string; isDefault: boolean }>;
    expect(list.map((s) => s.status)).toEqual(['PRESENT', 'ABSENT', 'LATE', 'LEAVE', 'MEDICAL', 'HALF_DAY', 'EXCUSED']);
    expect(list.every((s) => s.isDefault)).toBe(true);
    const after = (await call('put', '/attendance/statuses/LATE').send({ label: 'Tardy' }).expect(200)).body.items as typeof list;
    expect(after.find((s) => s.status === 'LATE')).toEqual({ status: 'LATE', label: 'Tardy', isDefault: false });
    expect(after.map((s) => s.status)).toEqual(list.map((s) => s.status));
    await call('put', '/attendance/statuses/LATE').send({ label: 'Late again' }).expect(200); // again: still one row
    expect((await call('get', '/attendance/statuses').expect(200)).body.items.find((s: { status: string }) => s.status === 'LATE').label).toBe('Late again');
    await call('put', '/attendance/statuses/BUNKING').send({ label: 'x' }).expect(400);
    await call('put', '/attendance/statuses/LATE').send({ label: '' }).expect(400);
    await call('put', '/attendance/statuses/LATE').send({ label: 'x', colour: 'red' }).expect(400);
    await call('put', '/attendance/statuses/LATE', teacher()).send({ label: 'x' }).expect(403);
    expect((await audit('attendance.status.label')).length).toBeGreaterThanOrEqual(2);
  });

  it('before anyone submits, the day is open and everyone is present', async () => {
    const day = (await call('get', `/attendance/classes/${cA}/days/${monday}`).expect(200)).body;
    expect(day).toMatchObject({ classId: cA, date: monday, submitted: false, locked: false, counts: { PRESENT: 3, ABSENT: 0 } });
    expect(day.students.map((s: { id: string; status: string }) => [s.id, s.status])).toEqual([[s1, 'PRESENT'], [s2, 'PRESENT'], [s3, 'PRESENT']]);
  });

  it('the class teacher lists the exceptions; everyone else is present; an edit changes only what differs; each submit is audited once', async () => {
    const before = (await audit('attendance.submit')).length;
    const sid = randomUUID();
    const first = (await submit(cA, monday, { marks: [{ studentId: s1, status: 'ABSENT' }, { studentId: s2, status: 'LATE', note: 'bus' }], submissionId: sid }).expect(200)).body;
    expect(first).toMatchObject({ submitted: true, locked: false, counts: { PRESENT: 1, ABSENT: 1, LATE: 1 } });
    expect(first.students.find((s: { id: string }) => s.id === s2)).toMatchObject({ status: 'LATE', note: 'bus' });
    expect((await audit('attendance.submit')).length).toBe(before + 1);
    // the same submit again (a retry after a lost answer) changes nothing, not even the audit trail
    await submit(cA, monday, { marks: [{ studentId: s1, status: 'ABSENT' }, { studentId: s2, status: 'LATE', note: 'bus' }], submissionId: sid }).expect(200);
    expect((await audit('attendance.submit')).length).toBe(before + 1);
    // an edit: s1 comes in (PRESENT removes the exception), s3 is added
    const second = (await submit(cA, monday, { marks: [{ studentId: s1, status: 'PRESENT' }, { studentId: s2, status: 'LATE', note: 'bus' }, { studentId: s3, status: 'MEDICAL' }], submissionId: randomUUID() }).expect(200)).body;
    expect(second.counts).toMatchObject({ PRESENT: 1, ABSENT: 0, LATE: 1, MEDICAL: 1 });
    expect(second.students.find((s: { id: string }) => s.id === s1).status).toBe('PRESENT');
    expect((await audit('attendance.submit')).length).toBe(before + 2);
    // an empty list means everyone is present
    const empty = (await submit(cA, monday, { marks: [] }).expect(200)).body;
    expect(empty.counts.PRESENT).toBe(3);
    await submit(cA, monday, { marks: [{ studentId: s1, status: 'ABSENT' }, { studentId: s2, status: 'LATE', note: 'bus' }, { studentId: s3, status: 'MEDICAL' }] }).expect(200);
  });

  it('refuses a student of another class, a repeated student, a future day, a day the school does not work, and a made-up status', async () => {
    const bad = (classId: string, date: string, b: object, who?: Person) => submit(classId, date, b, who);
    expect((await bad(cA, monday, { marks: [{ studentId: s4, status: 'ABSENT' }] }).expect(400)).body.error.details).toEqual([{ field: 'marks', rule: 'studentNotInClass' }]);
    expect((await bad(cA, monday, { marks: [{ studentId: s1, status: 'ABSENT' }, { studentId: s1, status: 'LATE' }] }).expect(400)).body.error.details).toEqual([{ field: 'marks', rule: 'duplicateStudent' }]);
    const tomorrow = new Date(Date.parse(`${today()}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    expect((await bad(cA, tomorrow, { marks: [] }).expect(400)).body.error.details).toEqual([{ field: 'date', rule: 'futureDate' }]);
    expect((await bad(cA, lastSunday(), { marks: [] }).expect(400)).body.error.details).toEqual([{ field: 'date', rule: 'notAWorkingDay' }]);
    await bad(cA, '2026-02-30', { marks: [] }).expect(400);
    await bad(cA, monday, { marks: [{ studentId: s1, status: 'SLEEPING' }] }).expect(400);
    await bad(cA, monday, { marks: [{ studentId: s1, status: 'ABSENT', extra: 1 }] }).expect(400);
    await bad(cA, monday, { marks: [], stuff: 1 }).expect(400);
    await bad(cA, monday, { marks: [{ studentId: 'nope', status: 'ABSENT' }] }).expect(400);
  });

  it('a teacher can mark only a class they are class teacher of', async () => {
    await submit(cB, monday, { marks: [{ studentId: s4, status: 'ABSENT' }] }).expect(404);
    await call('get', `/attendance/classes/${cB}/days/${monday}`, teacher()).expect(404);
    await call('post', `/attendance/classes/${cB}/days/${monday}/lock`, teacher()).expect(404);
    await call('get', `/attendance/classes/${cA}/days/${monday}`, teacher()).expect(200);
    await submit(cB, monday, { marks: [{ studentId: s4, status: 'ABSENT' }] }, acad()).expect(200); // the Academic admin may mark any class
  });

  it('E-ATT-1: a locked day refuses the teacher; the Academic admin corrects it, audited with the old value', async () => {
    const lockedBefore = (await audit('attendance.lock')).length;
    await call('post', `/attendance/classes/${cA}/days/${monday}/lock`, teacher()).expect(200);
    await call('post', `/attendance/classes/${cA}/days/${monday}/lock`, teacher()).expect(200); // locking twice is the same
    expect((await audit('attendance.lock')).length).toBe(lockedBefore + 1);
    expect((await call('get', `/attendance/classes/${cA}/days/${monday}`, teacher()).expect(200)).body.locked).toBe(true);
    const refused = await submit(cA, monday, { marks: [] }).expect(409);
    expect(refused.body.error.details).toEqual([{ field: 'date', rule: 'dayLocked' }]);
    expect((await call('get', `/attendance/classes/${cA}/days/${monday}`, teacher()).expect(200)).body.counts.ABSENT).toBe(1); // nothing changed
    // the teacher cannot use the correction route
    await call('put', `/attendance/classes/${cA}/days/${monday}/correction`, teacher()).send({ marks: [] }).expect(403);
    const fixed = (await call('put', `/attendance/classes/${cA}/days/${monday}/correction`).send({ marks: [{ studentId: s2, status: 'LATE', note: 'bus' }, { studentId: s3, status: 'MEDICAL' }] }).expect(200)).body;
    expect(fixed).toMatchObject({ locked: true, counts: { ABSENT: 0, LATE: 1, MEDICAL: 1 } });
    const rows = (await audit('attendance.correct')).filter((r) => (r.details as { classId?: string }).classId === cA);
    expect(rows).toHaveLength(1);
    expect((rows[0]!.details as { changes: unknown[]; wasLocked: boolean })).toMatchObject({ wasLocked: true, changes: [{ studentId: s1, from: 'ABSENT', to: 'PRESENT' }] });
    // a correction of a day nobody took is not found
    await call('put', `/attendance/classes/${cA}/days/2020-01-06/correction`).send({ marks: [] }).expect(404);
  });

  it('two first submits at the same instant make one day', async () => {
    const c = (await makeClass('2')).id;
    const kid = (await makeStudent(c, 'Race')).id;
    const res = await Promise.all([submit(c, monday, { marks: [{ studentId: kid, status: 'ABSENT' }] }, acad()), submit(c, monday, { marks: [{ studentId: kid, status: 'LATE' }] }, acad())]);
    expect(res.map((r) => r.status)).toEqual([200, 200]);
    const days = (await call('get', `/attendance/classes/${c}/days?from=${monday}&to=${monday}`).expect(200)).body.items;
    expect(days).toHaveLength(1);
    const day = (await call('get', `/attendance/classes/${c}/days/${monday}`).expect(200)).body;
    expect(['ABSENT', 'LATE']).toContain(day.students[0].status);
    expect(day.counts.PRESENT).toBe(0);
  });

  it('classes that have not submitted are listed for the school only', async () => {
    const empty = (await makeClass('3')).id;
    const missing = (await call('get', `/attendance/missing?date=${monday}`).expect(200)).body;
    const ids = missing.items.map((c: { id: string }) => c.id);
    expect(ids).toContain(empty);
    expect(ids).not.toContain(cA);
    expect((await call('get', `/attendance/missing?date=${lastSunday()}`).expect(200)).body.items).toEqual([]);
    await call('get', '/attendance/missing', teacher()).expect(404);
  });

  it('a student\'s record: the school sees any, the class teacher their own class, a parent only the linked child', async () => {
    const rec = (await call('get', `/attendance/students/${s3}?from=${monday}&to=${monday}`).expect(200)).body;
    expect(rec).toMatchObject({ studentId: s3, daysTaken: 1, counts: { MEDICAL: 1, PRESENT: 0 }, marks: [{ date: monday, status: 'MEDICAL', note: null }] });
    await call('get', `/attendance/students/${s3}`, teacher()).expect(200);
    await call('get', `/attendance/students/${s4}`, teacher()).expect(404);
    const parent = w!.roles.A.PARENT;
    await call('get', `/attendance/students/${s3}`, parent).expect(404);
    await call('post', `/students/${s3}/parent-accounts`).send({ userId: parent.uid, relationship: 'MOTHER' }).expect(201);
    await call('get', `/attendance/students/${s3}`, parent).expect(200);
    await call('get', `/attendance/students/${s1}`, parent).expect(404);
    await call('get', `/attendance/classes/${cA}/days/${monday}`, parent).expect(404); // a parent never sees the class
    await call('get', `/attendance/students/${s3}?from=2026-02-01&to=2025-01-01`).expect(400);
    await call('get', `/attendance/students/${s3}?from=2020-01-01&to=2026-01-01`).expect(400);
    await call('get', `/attendance/students/${randomUUID()}`).expect(404);
  });

  it('days of a class: counts per day', async () => {
    const list = (await call('get', `/attendance/classes/${cA}/days?from=${monday}&to=${monday}`).expect(200)).body.items;
    expect(list).toEqual([{ date: monday, locked: true, counts: expect.objectContaining({ LATE: 1, MEDICAL: 1, PRESENT: 1 }) }]);
  });

  it('staff check in and out with the server clock; a repeat is the same answer; HR sees everyone and corrects, audited', async () => {
    await call('post', '/attendance/staff/check-out', teacher()).expect(409); // not in yet
    const inn = (await call('post', '/attendance/staff/check-in', teacher()).expect(200)).body;
    expect(inn).toMatchObject({ date: today(), checkOut: null });
    expect(inn.checkIn).toBeTruthy();
    const again = (await call('post', '/attendance/staff/check-in', teacher()).expect(200)).body;
    expect(again.checkIn).toBe(inn.checkIn);
    expect((await audit('attendance.staff.checkin')).length).toBe(1);
    const out = (await call('post', '/attendance/staff/check-out', teacher()).expect(200)).body;
    expect(out.checkOut).toBeTruthy();
    expect((await call('post', '/attendance/staff/check-out', teacher()).expect(200)).body.checkOut).toBe(out.checkOut);
    expect((await call('get', '/attendance/staff/mine', teacher()).expect(200)).body.items[0]).toMatchObject({ date: today() });
    // an account with no staff record cannot check in
    await call('post', '/attendance/staff/check-in', w!.roles.A.STAFF).expect(409);
    await call('post', '/staff', hr()).send({ firstName: 'Absent', lastName: 'Sam' }).expect(201);
    const presence = (await call('get', '/attendance/staff', hr()).expect(200)).body;
    expect(presence.items.find((p: { staff: { id: string } }) => p.staff.id === staffT)).toMatchObject({ state: 'OUT' });
    expect(presence.items.some((p: { state: string }) => p.state === 'NONE')).toBe(true);
    await call('get', '/attendance/staff', teacher()).expect(404);
    const fixed = (await call('put', `/attendance/staff/${staffT}/days/${monday}`, hr()).send({ checkIn: `${monday}T03:30:00.000Z`, checkOut: `${monday}T11:30:00.000Z` }).expect(200)).body;
    expect(fixed).toMatchObject({ date: monday });
    expect((await audit('attendance.staff.correct')).length).toBe(1);
    await call('put', `/attendance/staff/${staffT}/days/${monday}`, hr()).send({ checkOut: `${monday}T01:00:00.000Z` }).expect(400); // before the check-in
    await call('put', `/attendance/staff/${staffT}/days/${monday}`, hr()).send({}).expect(400);
    await call('put', `/attendance/staff/${staffT}/days/${monday}`, teacher()).send({ checkIn: `${monday}T03:30:00.000Z` }).expect(403);
    await call('put', `/attendance/staff/${randomUUID()}/days/${monday}`, hr()).send({ checkIn: `${monday}T03:30:00.000Z` }).expect(404);
  });

  it('who may do what, and another school sees none of it', async () => {
    const r = w!.roles.A;
    for (const who of [r.PRINCIPAL, r.ACADEMIC_ADMIN]) await call('get', `/attendance/classes/${cA}/days/${monday}`, who).expect(200);
    for (const who of [r.BURSAR, r.ACCOUNTANT, r.HR_MANAGER, r.MANAGEMENT]) await call('get', `/attendance/classes/${cA}/days/${monday}`, who).expect(403);
    for (const who of [r.PRINCIPAL, r.BURSAR]) await submit(cA, monday, { marks: [] }, who).expect(403);
    const b = w!.roles.B.ACADEMIC_ADMIN;
    await call('get', `/attendance/classes/${cA}/days/${monday}`, b, B()).expect(404); // A's class does not exist for B
    await call('get', `/attendance/students/${s1}`, b, B()).expect(404);
    expect((await call('get', '/attendance/staff', w!.roles.B.HR_MANAGER, B()).expect(200)).body.items.some((p: { staff: { id: string } }) => p.staff.id === staffT)).toBe(false);
  });
});
