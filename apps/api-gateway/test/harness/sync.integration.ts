// P3-10 against the REAL stack: tombstones for removed records, and replay-safety of every submission a device may send twice.
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
const LEAVE_DAY = '2090-05-08'; // a Monday
const EPOCH = '2000-01-01T00:00:00Z';

describe.skipIf(!ready)('sync groundwork against the real emulators (P3-10)', { timeout: 240_000 }, () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const acad = () => w!.roles.A.ACADEMIC_ADMIN;
  const hr = () => w!.roles.A.HR_MANAGER;
  const principal = () => w!.roles.A.PRINCIPAL;
  const teacher = () => w!.roles.A.TEACHER; // class teacher of cA and the teacher of the lesson
  const call = (method: 'get' | 'post' | 'put' | 'patch' | 'delete', path: string, who: Person = acad(), school = A()) =>
    agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const audit = async (action: string) => (await w!.db.listAuditLog({ schoolId: A().replaceAll('-', ''), limit: 800, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  const uniq = () => randomUUID().slice(0, 6);
  const monday = lastMonday();
  const stones = async (who: Person = acad(), q = '') => (await call('get', `/sync/tombstones?since=${EPOCH}${q}`, who).expect(200)).body as { items: Array<{ id: string; entityType: string; entityId: string; classId: string | null; staffId: string | null; deletedAt: string }>; next: string; more: boolean };

  let cA = '', cB = '', math = '', period = '', periodB = '', s1 = '', s2 = '', s3 = '', staffT = '', staffS = '', term = '', exam = '';

  beforeAll(async () => {
    const y = (await call('post', '/academics/years').send({ name: `SY-${uniq()}`, startDate: '2090-04-01', endDate: '2091-03-31' }).expect(201)).body;
    await call('post', `/academics/years/${y.id}/activate`).send({}).expect(200);
    const klass = async () => { const lv = ((await call('get', '/academics/levels').expect(200)).body.items as Array<{ id: string }>)[0]!; return (await call('post', '/academics/classes').send({ gradeLevelId: lv.id, section: `S${uniq()}`.slice(0, 6), capacity: 30 }).expect(201)).body.id as string; };
    [cA, cB] = [await klass(), await klass()];
    math = (await call('post', '/academics/subjects').send({ name: `Maths ${uniq()}`, code: uniq().toUpperCase() }).expect(201)).body.id;
    period = (await call('post', '/academics/periods').send({ label: 'One', startTime: '08:00', endTime: '08:40' }).expect(201)).body.id;
    periodB = (await call('post', '/academics/periods').send({ label: 'Two', startTime: '08:40', endTime: '09:20' }).expect(201)).body.id;
    const student = async (c: string, n: string) => (await call('post', '/students').send({ firstName: n, lastName: `K${uniq()}`, classroomId: c }).expect(201)).body.id as string;
    [s1, s2, s3] = [await student(cA, 'Asha'), await student(cA, 'Bilal'), await student(cB, 'Dev')];
    const staff = async (n: string, user: Person) => { const id = ((await call('post', '/staff', hr()).send({ firstName: n, lastName: 'Sync' }).expect(201)).body as { id: string }).id; await call('put', `/staff/${id}/account`, hr()).send({ userId: user.uid }).expect(200); return id; };
    staffT = await staff('Tara', teacher());
    staffS = await staff('Sunil', w!.roles.A.STAFF);
    await call('put', `/academics/classes/${cA}/teacher`).send({ staffId: staffT }).expect(200);
    for (const s of [staffT, staffS]) await call('post', `/academics/teachers/${s}/subjects`).send({ subjectId: math }).expect(201);
    term = (await call('post', '/grades/terms').send({ name: 'Term 1' }).expect(201)).body.id;
    exam = (await call('post', '/grades/exams').send({ termId: term, classId: cA, subjectId: math, title: 'Unit 1', examDate: '2090-05-05', maxMarks: '50' }).expect(201)).body.id;
  }, 120_000);

  it('a removal leaves a tombstone: a lesson, an attendance mark, a mark; the teacher hears of their own class only', async () => {
    expect((await stones()).items).toEqual([]);
    // an attendance mark is made and then taken away (the student came in after all)
    await call('put', `/attendance/classes/${cA}/days/${monday}`, teacher()).send({ marks: [{ studentId: s1, status: 'ABSENT' }] }).expect(200);
    await call('put', `/attendance/classes/${cA}/days/${monday}`, teacher()).send({ marks: [] }).expect(200);
    // a mark is entered and cleared
    await call('put', `/grades/exams/${exam}/marks`, teacher()).send({ entries: [{ studentId: s1, marks: '40' }] }).expect(200);
    await call('put', `/grades/exams/${exam}/marks`, teacher()).send({ entries: [{ studentId: s1 }] }).expect(200);
    // a lesson in each class, removed
    const lessonA = (await call('put', `/academics/timetable/classes/${cA}/slots`).send({ day: 'MON', periodId: period, subjectId: math, staffId: staffT }).expect(200)).body.entries[0].id as string;
    const lessonB = (await call('put', `/academics/timetable/classes/${cB}/slots`).send({ day: 'MON', periodId: periodB, subjectId: math, staffId: staffS }).expect(200)).body.entries[0].id as string;
    await call('delete', `/academics/timetable/entries/${lessonA}`).expect(204);
    await call('delete', `/academics/timetable/entries/${lessonB}`).expect(204);
    const all = await stones();
    expect(all.items.map((i) => i.entityType).sort()).toEqual(['AttendanceMark', 'Mark', 'TimetableEntry', 'TimetableEntry']);
    expect(all.items.find((i) => i.entityId === lessonA)).toMatchObject({ entityType: 'TimetableEntry', classId: cA, staffId: staffT });
    expect(all.items.find((i) => i.entityType === 'AttendanceMark')).toMatchObject({ classId: cA });
    expect(all.items.every((i) => !!i.deletedAt)).toBe(true);
    // in order, and a later `since` shows only what is newer
    expect(all.items.map((i) => i.deletedAt)).toEqual([...all.items.map((i) => i.deletedAt)].sort());
    expect((await stones(acad(), '&limit=1')).items).toHaveLength(1);
    const page1 = await stones(acad(), '&limit=2');
    expect(page1.more).toBe(true);
    const page2 = (await call('get', `/sync/tombstones?since=${encodeURIComponent(page1.next)}&limit=10`).expect(200)).body;
    expect(page1.items.length + page2.items.length).toBeGreaterThanOrEqual(4);
    expect(page2.items.some((i: { id: string }) => page1.items.some((j) => j.id === i.id))).toBe(false);
    // the teacher hears about their own class and their own lesson, not about the other class
    const mine = await stones(teacher());
    expect(mine.items.map((i) => i.entityType).sort()).toEqual(['AttendanceMark', 'Mark', 'TimetableEntry']);
    expect(mine.items.some((i) => i.entityId === lessonB)).toBe(false);
    expect((await stones(acad(), '&entityType=Mark')).items.map((i) => i.entityType)).toEqual(['Mark']);
    // the school-wide roles that may not read marks do not hear about them
    expect((await stones(principal())).items.map((i) => i.entityType).sort()).toEqual(['AttendanceMark', 'Mark', 'TimetableEntry', 'TimetableEntry']);
    await call('get', `/sync/tombstones?since=${EPOCH}`, w!.roles.A.BURSAR).expect(403);
  });

  it('a substitute that is cleared leaves a tombstone for that teacher only', async () => {
    await call('post', '/leave/types', hr()).send({ name: 'Unpaid', paid: false }).expect(201);
    const type = (await call('get', '/leave/types', hr()).expect(200)).body.items[0].id;
    const lesson = (await call('put', `/academics/timetable/classes/${cA}/slots`).send({ day: 'MON', periodId: period, subjectId: math, staffId: staffT }).expect(200)).body.entries[0].id as string;
    const req = (await call('post', '/leave/requests', teacher()).send({ leaveTypeId: type, startDate: LEAVE_DAY, endDate: LEAVE_DAY }).expect(201)).body.id;
    await call('post', `/leave/requests/${req}/approve`, principal()).send({}).expect(200);
    await call('put', '/substitutions').send({ entryId: lesson, date: LEAVE_DAY, substituteStaffId: staffS }).expect(200);
    const duty = (await call('get', `/substitutions/needs?from=${LEAVE_DAY}&to=${LEAVE_DAY}`).expect(200)).body.items[0].cover.id;
    await call('delete', `/substitutions/${duty}`).expect(204);
    const heard = (await stones(w!.roles.A.TEACHER, '&entityType=Substitution')).items;
    expect(heard).toHaveLength(1); // the lesson is in her own class, so the class teacher hears that its cover was taken away
    expect(heard[0]).toMatchObject({ entityType: 'Substitution', classId: cA, staffId: staffS });
    expect((await stones(acad(), '&entityType=Substitution')).items).toHaveLength(1);
  });

  it('input is checked: since must be a UTC moment, the type a known one, the limit sensible', async () => {
    for (const bad of ['', '?since=yesterday', `?since=${EPOCH}&entityType=Student`, `?since=${EPOCH}&limit=0`, `?since=${EPOCH}&limit=5000`, '?since=2020-01-01']) await call('get', `/sync/tombstones${bad}`).expect(400);
    await call('get', `/sync/tombstones?since=${EPOCH}`, w!.roles.B.ACADEMIC_ADMIN, w!.schools.B).expect(200);
    expect((await call('get', `/sync/tombstones?since=${EPOCH}`, w!.roles.B.ACADEMIC_ADMIN, w!.schools.B).expect(200)).body.items).toEqual([]);
  });

  it('replaying any submission any number of times leaves one result', async () => {
    const x3 = async <T>(f: () => Promise<T>): Promise<T[]> => [await f(), await f(), await f()];
    const date = lastMonday();
    // attendance with the device's id: one audit row, the same day three times
    const attendanceBefore = (await audit('attendance.submit')).length;
    const sid = randomUUID();
    const days = await x3(async () => (await call('put', `/attendance/classes/${cB}/days/${date}`, acad()).send({ marks: [{ studentId: s3, status: 'LATE' }], submissionId: sid }).expect(200)).body);
    expect(days[0]).toEqual(days[1]); expect(days[1]).toEqual(days[2]);
    expect((await audit('attendance.submit')).length).toBe(attendanceBefore + 1);
    // attendance without an id: the same state each time
    const plain = await x3(async () => (await call('put', `/attendance/classes/${cA}/days/${date}`, teacher()).send({ marks: [{ studentId: s2, status: 'ABSENT' }] }).expect(200)).body.counts);
    expect(plain[0]).toEqual(plain[2]);
    // marks with an id
    const marksBefore = (await audit('grades.marks.save')).length;
    const mid = randomUUID();
    const grids = await x3(async () => (await call('put', `/grades/exams/${exam}/marks`, teacher()).send({ entries: [{ studentId: s2, marks: '33.5' }], submissionId: mid }).expect(200)).body.rows);
    expect(grids[0]).toEqual(grids[2]);
    expect((await audit('grades.marks.save')).length).toBe(marksBefore + 1);
    // a timetable slot, a status label, a check-in: the same answer three times
    const slot = await x3(async () => (await call('put', `/academics/timetable/classes/${cB}/slots`).send({ day: 'TUE', periodId: period, subjectId: math, staffId: staffS }).expect(200)).body.entries.length);
    expect(slot).toEqual([1, 1, 1]);
    const labels = await x3(async () => (await call('put', '/attendance/statuses/LATE').send({ label: 'Tardy' }).expect(200)).body.items.filter((i: { status: string }) => i.status === 'LATE'));
    expect(labels[0]).toEqual(labels[2]);
    const checkIns = await x3(async () => (await call('post', '/attendance/staff/check-in', teacher()).expect(200)).body.checkIn);
    expect(new Set(checkIns).size).toBe(1);
    expect((await audit('attendance.staff.checkin')).length).toBe(1);
    // a leave request with the device's id: one request, one audit row
    const type = (await call('get', '/leave/types', hr()).expect(200)).body.items[0].id;
    const leaveBefore = (await audit('leave.request.create')).length;
    const cid = `dev-${uniq()}`;
    const ids = await x3(async () => (await call('post', '/leave/requests', teacher()).send({ leaveTypeId: type, startDate: '2090-06-05', endDate: '2090-06-05', clientId: cid }).expect(201)).body.id);
    expect(new Set(ids).size).toBe(1);
    expect((await audit('leave.request.create')).length).toBe(leaveBefore + 1);
    expect(((await call('get', '/leave/requests', teacher()).expect(200)).body.items as Array<{ startDate: string }>).filter((r) => r.startDate === '2090-06-05')).toHaveLength(1);
    // two at the same instant
    const cid2 = `dev-${uniq()}`;
    const both = await Promise.all([1, 2].map(() => call('post', '/leave/requests', teacher()).send({ leaveTypeId: type, startDate: '2090-06-12', endDate: '2090-06-12', clientId: cid2 })));
    expect(both.map((r) => r.status).every((s) => s === 201 || s === 409)).toBe(true);
    expect(((await call('get', '/leave/requests', teacher()).expect(200)).body.items as Array<{ startDate: string }>).filter((r) => r.startDate === '2090-06-12')).toHaveLength(1);
    expect(today()).toBeTruthy();
  });
});
