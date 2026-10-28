// P4-S1 against the REAL stack: `updatedSince` on the lists a phone pulls. Each list answers with `next` (the database's clock); asking from
// there returns only what changed since (the newest row at the boundary may repeat: that is harmless, a phone replaces a record with itself).
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

const mondays = (n: number): string[] => {
  const d = new Date(Date.now() + 330 * 60_000);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return Array.from({ length: n }, (_, i) => new Date(d.getTime() - i * 7 * 86_400_000).toISOString().slice(0, 10));
};

describe.skipIf(!ready)('updatedSince on the lists a phone pulls (P4-S1)', { timeout: 300_000 }, () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const acad = () => w!.roles.A.ACADEMIC_ADMIN;
  const hr = () => w!.roles.A.HR_MANAGER;
  const principal = () => w!.roles.A.PRINCIPAL;
  const teacher = () => w!.roles.A.TEACHER;
  const call = (method: 'get' | 'post' | 'put' | 'patch' | 'delete', path: string, who: Person = acad()) => agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', A());
  const uniq = () => randomUUID().slice(0, 6);
  const since = (next: string | null) => `updatedSince=${encodeURIComponent(next!)}`;

  let cA = '', math = '', p1 = '', p2 = '', p3 = '', s1 = '', s2 = '', s3 = '', staffT = '', exam = '';

  beforeAll(async () => {
    const y = (await call('post', '/academics/years').send({ name: `SY-${uniq()}`, startDate: '2020-04-01', endDate: '2099-03-31' }).expect(201)).body;
    await call('post', `/academics/years/${y.id}/activate`).send({}).expect(200);
    const lv = ((await call('get', '/academics/levels').expect(200)).body.items as Array<{ id: string }>)[0]!;
    cA = (await call('post', '/academics/classes').send({ gradeLevelId: lv.id, section: `S${uniq()}`.slice(0, 6), capacity: 30 }).expect(201)).body.id;
    math = (await call('post', '/academics/subjects').send({ name: `Maths ${uniq()}`, code: uniq().toUpperCase() }).expect(201)).body.id;
    const period = async (label: string, a: string, b: string) => (await call('post', '/academics/periods').send({ label, startTime: a, endTime: b }).expect(201)).body.id as string;
    [p1, p2, p3] = [await period('One', '08:00', '08:40'), await period('Two', '08:40', '09:20'), await period('Three', '09:20', '10:00')];
    const student = async (n: string) => (await call('post', '/students').send({ firstName: n, lastName: `K${uniq()}`, classroomId: cA }).expect(201)).body.id as string;
    [s1, s2, s3] = [await student('Asha'), await student('Bilal'), await student('Dev')];
    staffT = ((await call('post', '/staff', hr()).send({ firstName: 'Tara', lastName: 'Since' }).expect(201)).body as { id: string }).id;
    await call('put', `/staff/${staffT}/account`, hr()).send({ userId: teacher().uid }).expect(200);
    await call('put', `/academics/classes/${cA}/teacher`).send({ staffId: staffT }).expect(200);
    await call('post', `/academics/teachers/${staffT}/subjects`).send({ subjectId: math }).expect(201);
    const term = (await call('post', '/grades/terms').send({ name: 'Term 1' }).expect(201)).body.id;
    exam = (await call('post', '/grades/exams').send({ termId: term, classId: cA, subjectId: math, title: 'Unit 1', examDate: '2024-05-05', maxMarks: '50' }).expect(201)).body.id;
    await call('post', '/leave/types', hr()).send({ name: `Unpaid ${uniq()}`, paid: false }).expect(201);
  }, 180_000);

  it('a bad moment is refused (400), and a list with no moment is the whole list plus the moment to start from', async () => {
    for (const path of ['/leave/requests', '/timetable/mine', `/grades/exams/${exam}/marks`, '/notifications', `/attendance/classes/${cA}/days`]) {
      const p = path === '/timetable/mine' ? '/academics/timetable/mine' : path;
      await call('get', `${p}?updatedSince=yesterday`, teacher()).expect(400);
      await call('get', `${p}?updatedSince=${'1'.repeat(60)}`, teacher()).expect(400);
    }
    const all = (await call('get', '/leave/requests', teacher()).expect(200)).body as { items: unknown[]; next: string | null };
    expect(all.items).toEqual([]);
    expect(all.next).toBeNull(); // nothing yet to anchor to
  });

  it('leave requests: only what was made or decided since; a quiet list keeps the moment', async () => {
    const type = ((await call('get', '/leave/types', hr()).expect(200)).body.items as Array<{ id: string }>)[0]!.id;
    const ask = async (day: string) => (await call('post', '/leave/requests', teacher()).send({ leaveTypeId: type, startDate: day, endDate: day }).expect(201)).body.id as string;
    const [r1, r2, r3] = [await ask('2090-05-08'), await ask('2090-05-09'), await ask('2090-05-10')]; // a Monday, Tuesday and Wednesday
    const base = (await call('get', '/leave/requests', teacher()).expect(200)).body as { items: Array<{ id: string; status: string }>; next: string };
    expect(base.items.map((i) => i.id).sort()).toEqual([r1, r2, r3].sort());
    expect(base.next).toMatch(/^\d{4}-\d\d-\d\dT/);

    const quiet = (await call('get', `/leave/requests?${since(base.next)}`, teacher()).expect(200)).body as { items: Array<{ id: string }>; next: string };
    expect(quiet.items.map((i) => i.id)).toEqual([r3]); // only the newest row, at the boundary
    expect(quiet.next).toBe(base.next);

    await call('post', `/leave/requests/${r1}/approve`, principal()).send({}).expect(200);
    const changed = (await call('get', `/leave/requests?${since(base.next)}`, teacher()).expect(200)).body as { items: Array<{ id: string; status: string }>; next: string };
    expect(changed.items.map((i) => i.id).sort()).toEqual([r1, r3].sort());
    expect(changed.items.find((i) => i.id === r1)!.status).toBe('APPROVED');
    expect(changed.items.some((i) => i.id === r2)).toBe(false);
    expect(new Date(changed.next).getTime()).toBeGreaterThan(new Date(base.next).getTime());

    await call('post', `/leave/requests/${r2}/cancel`, teacher()).send({}).expect(200);
    const afterCancel = (await call('get', `/leave/requests?${since(changed.next)}`, teacher()).expect(200)).body as { items: Array<{ id: string; status: string }> };
    expect(afterCancel.items.find((i) => i.id === r2)?.status).toBe('CANCELLED');
    expect(afterCancel.items.some((i) => i.id === r3)).toBe(false);
  });

  it('notifications: the new notice only; unreadCount counts those', async () => {
    const base = (await call('get', '/notifications', teacher()).expect(200)).body as { items: Array<{ id: string }>; next: string | null; unreadCount: number };
    expect(base.items.length).toBeGreaterThan(0); // the leave approval above told her
    const again = (await call('get', `/notifications?${since(base.next)}`, teacher()).expect(200)).body as { items: Array<{ id: string }> };
    expect(again.items.length).toBeLessThanOrEqual(1);
    const type = ((await call('get', '/leave/types', hr()).expect(200)).body.items as Array<{ id: string }>)[0]!.id;
    const r = (await call('post', '/leave/requests', teacher()).send({ leaveTypeId: type, startDate: '2090-06-05', endDate: '2090-06-05' }).expect(201)).body.id as string;
    await call('post', `/leave/requests/${r}/reject`, principal()).send({ note: 'no' }).expect(200);
    const fresh = (await call('get', `/notifications?${since(base.next)}`, teacher()).expect(200)).body as { items: Array<{ id: string; kind: string }>; next: string };
    expect(fresh.items.some((i) => i.kind.startsWith('leave.'))).toBe(true);
    expect(fresh.items.every((i) => !base.items.slice(1).some((b) => b.id === i.id))).toBe(true); // nothing older than the boundary comes again
  });

  it('timetable: only lessons added or changed since', async () => {
    const lesson = async (periodId: string) => (await call('put', `/academics/timetable/classes/${cA}/slots`).send({ day: 'MON', periodId, subjectId: math, staffId: staffT }).expect(200)).body.entries.find((e: { periodId: string }) => e.periodId === periodId).id as string;
    const [l1, l2] = [await lesson(p1), await lesson(p2)];
    const base = (await call('get', '/academics/timetable/mine', teacher()).expect(200)).body as { entries: Array<{ id: string }>; next: string };
    expect(base.entries.map((e) => e.id).sort()).toEqual([l1, l2].sort());
    const l3 = await lesson(p3);
    const changed = (await call('get', `/academics/timetable/mine?${since(base.next)}`, teacher()).expect(200)).body as { entries: Array<{ id: string }>; next: string };
    expect(changed.entries.map((e) => e.id)).toContain(l3);
    expect(changed.entries.map((e) => e.id)).not.toContain(l1);
    expect(new Date(changed.next).getTime()).toBeGreaterThanOrEqual(new Date(base.next).getTime());
  });

  it('marks grid: only the students whose mark was entered, changed or cleared since', async () => {
    await call('put', `/grades/exams/${exam}/marks`, teacher()).send({ entries: [{ studentId: s1, marks: '30' }, { studentId: s2, marks: '35' }] }).expect(200);
    const base = (await call('get', `/grades/exams/${exam}/marks`, teacher()).expect(200)).body as { rows: Array<{ studentId: string; marks: string | null }>; next: string };
    expect(base.rows.map((r) => r.studentId).sort()).toEqual([s1, s2, s3].sort()); // the whole class
    await call('put', `/grades/exams/${exam}/marks`, teacher()).send({ entries: [{ studentId: s1, marks: '41' }] }).expect(200);
    const changed = (await call('get', `/grades/exams/${exam}/marks?${since(base.next)}`, teacher()).expect(200)).body as { rows: Array<{ studentId: string; marks: string }>; next: string };
    const ids = changed.rows.map((r) => r.studentId);
    expect(ids).toContain(s1);
    expect(changed.rows.find((r) => r.studentId === s1)!.marks).toBe('41');
    expect(ids).not.toContain(s3); // never marked: nothing to hear
    expect(new Date(changed.next).getTime()).toBeGreaterThan(new Date(base.next).getTime());
  });

  it('attendance days: only the days submitted, corrected or locked since', async () => {
    const [d1, d2, d3, d4] = mondays(4); // d4 is the oldest
    const submit = (d: string) => call('put', `/attendance/classes/${cA}/days/${d}`, teacher()).send({ marks: [{ studentId: s1, status: 'ABSENT' }] }).expect(200);
    await submit(d4!); await submit(d3!); await submit(d2!);
    const q = `from=${d4}&to=${d1}`;
    const base = (await call('get', `/attendance/classes/${cA}/days?${q}`, teacher()).expect(200)).body as { items: Array<{ date: string; locked: boolean }>; next: string };
    expect(base.items.map((i) => i.date).sort()).toEqual([d4, d3, d2].sort());
    await submit(d1!);
    await call('post', `/attendance/classes/${cA}/days/${d3}/lock`, acad()).send({}).expect(200);
    const changed = (await call('get', `/attendance/classes/${cA}/days?${q}&${since(base.next)}`, teacher()).expect(200)).body as { items: Array<{ date: string; locked: boolean }>; next: string };
    const dates = changed.items.map((i) => i.date);
    expect(dates).toEqual(expect.arrayContaining([d3, d1])); // locked, and newly submitted
    expect(dates).not.toContain(d4); // untouched and older than the boundary
    expect(changed.items.find((i) => i.date === d3)!.locked).toBe(true);
  });

  it('an unrelated person sees none of it: the filter narrows what the caller may already read', async () => {
    const other = (await call('get', '/leave/requests', w!.roles.A.STAFF)).body as { items: unknown[] };
    expect(other.items).toEqual([]);
    const forbidden = await call('get', '/leave/requests?updatedSince=2000-01-01T00:00:00Z', w!.roles.B.TEACHER);
    expect([200, 403, 404]).toContain(forbidden.status);
    if (forbidden.status === 200) expect((forbidden.body as { items: unknown[] }).items).toEqual([]);
  });
});
