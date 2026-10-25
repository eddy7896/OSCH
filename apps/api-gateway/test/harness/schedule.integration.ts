// P3-1 against the REAL stack: the bell schedule and working days, through the gateway.
import { type INestApplication } from '@nestjs/common';
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

describe.skipIf(!ready)('bell schedule and working days against the real emulators (P3-1)', { timeout: 120_000 }, () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const B = () => w!.schools.B;
  const acad = () => w!.roles.A.ACADEMIC_ADMIN;
  const call = (method: 'get' | 'post' | 'patch' | 'delete', path: string, who: Person = acad(), school = A()) =>
    agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const audit = async (school: string, action: string) => (await w!.db.listAuditLog({ schoolId: school.replaceAll('-', ''), limit: 500, offset: 0 })).data.auditLogs.filter((a) => a.action === action);

  it('a new school works Monday to Saturday and has no periods', async () => {
    const s = (await call('get', '/academics/schedule').expect(200)).body;
    expect(s).toEqual({ workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], periods: [] });
  });

  it('periods are made one by one, numbered in time order (breaks have no number), and the school can change and remove them', async () => {
    const mk = (label: string, startTime: string, endTime: string, isBreak?: boolean) => call('post', '/academics/periods').send({ label, startTime, endTime, ...(isBreak === undefined ? {} : { isBreak }) });
    const p2 = (await mk('Period 2', '09:10', '09:50').expect(201)).body;
    const p1 = (await mk('Period 1', '08:30', '09:10').expect(201)).body;
    const br = (await mk('Break', '09:50', '10:10', true).expect(201)).body;
    expect(p2).toMatchObject({ label: 'Period 2', startTime: '09:10', endTime: '09:50', isBreak: false, number: 1 }); // the only teaching period when it was made; numbers follow time order as others arrive
    const s = (await call('get', '/academics/schedule').expect(200)).body;
    expect(s.periods.map((p: { label: string; number: number | null }) => [p.label, p.number])).toEqual([['Period 1', 1], ['Period 2', 2], ['Break', null]]);
    const renamed = (await call('patch', `/academics/periods/${p1.id}`).send({ label: 'Assembly', endTime: '09:05' }).expect(200)).body;
    expect(renamed).toMatchObject({ label: 'Assembly', startTime: '08:30', endTime: '09:05' });
    await call('delete', `/academics/periods/${br.id}`).expect(204);
    expect((await call('get', '/academics/schedule').expect(200)).body.periods).toHaveLength(2);
    expect((await audit(A(), 'academic.period.create')).length).toBeGreaterThanOrEqual(3);
  });

  it('overlaps, a taken label or start, an end that is not after the start, and malformed times are refused with the rule named', async () => {
    const mk = (b: object) => call('post', '/academics/periods').send(b);
    expect((await mk({ label: 'Clash', startTime: '08:45', endTime: '09:00' }).expect(409)).body.error.details).toEqual([{ field: 'startTime', rule: 'overlaps' }]);
    expect((await mk({ label: 'Clash', startTime: '09:00', endTime: '09:30' }).expect(409)).body.error.details).toEqual([{ field: 'startTime', rule: 'overlaps' }]);
    expect((await mk({ label: 'period 2', startTime: '15:00', endTime: '15:40' }).expect(409)).body.error.details).toEqual([{ field: 'label', rule: 'labelTaken' }]);
    expect((await mk({ label: 'Same start', startTime: '09:10', endTime: '09:20' }).expect(409)).body.error.details).toEqual([{ field: 'startTime', rule: 'startTaken' }]);
    expect((await mk({ label: 'Backwards', startTime: '11:00', endTime: '10:00' }).expect(400)).body.error.details).toEqual([{ field: 'endTime', rule: 'endNotAfterStart' }]);
    for (const bad of [{ label: 'x', startTime: '8:30', endTime: '09:00' }, { label: 'x', startTime: '25:00', endTime: '26:00' }, { label: '', startTime: '12:00', endTime: '12:40' }, { label: 'x', startTime: '12:00' }, { label: 'x', startTime: '12:00', endTime: '12:40', extra: 1 }])
      await mk(bad).expect(400);
    // touching is fine
    await mk({ label: 'Period 3', startTime: '09:50', endTime: '10:30' }).expect(201);
    // an edit that would overlap is refused too
    const list = (await call('get', '/academics/schedule').expect(200)).body.periods as Array<{ id: string; label: string }>;
    const first = list.find((p) => p.label === 'Assembly')!;
    await call('patch', `/academics/periods/${first.id}`).send({ endTime: '09:30' }).expect(409);
    await call('patch', `/academics/periods/${first.id}`).send({}).expect(400);
  });

  it('working days: any non-empty set of real days, kept in week order; an empty set or an unknown day is refused', async () => {
    const set = (days: unknown) => call('patch', '/academics/schedule/working-days').send({ days });
    expect((await set(['SAT', 'MON', 'MON', 'WED']).expect(200)).body.workingDays).toEqual(['MON', 'WED', 'SAT']);
    expect((await call('get', '/academics/schedule').expect(200)).body.workingDays).toEqual(['MON', 'WED', 'SAT']);
    for (const bad of [[], ['FUNDAY'], ['mon'], 'MON', null, ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN', 'MON']]) await set(bad).expect(400);
    expect((await call('get', '/academics/schedule').expect(200)).body.workingDays).toEqual(['MON', 'WED', 'SAT']);
    expect((await audit(A(), 'academic.workingdays.set')).length).toBeGreaterThanOrEqual(1);
  });

  it('a starting schedule fills an empty school once, in one step; a school with periods is told no', async () => {
    const adminB = w!.roles.B.ACADEMIC_ADMIN;
    const res = (await call('post', '/academics/schedule/template', adminB, B()).send({ template: 'STANDARD' }).expect(201)).body;
    expect(res.periods).toHaveLength(10);
    expect(res.periods.filter((p: { number: number | null }) => p.number !== null).map((p: { number: number }) => p.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect((await call('post', '/academics/schedule/template', adminB, B()).send({ template: 'SHORT_DAY' }).expect(409)).body.error.details).toEqual([{ field: 'template', rule: 'scheduleNotEmpty' }]);
    await call('post', '/academics/schedule/template', adminB, B()).send({ template: 'NOPE' }).expect(400);
    expect((await call('get', '/academics/schedule').expect(200)).body.periods.length).not.toBe(10); // A is unaffected by B
    expect((await audit(B(), 'academic.schedule.template')).length).toBe(1);
  });

  it('who may read and who may change: the Academic admin changes, the Principal and field roles read, finance roles are refused', async () => {
    const r = w!.roles.A;
    for (const who of [r.PRINCIPAL, r.TEACHER, r.PARENT, r.ADMISSIONS_OFFICER, r.ACADEMIC_ADMIN]) await call('get', '/academics/schedule', who).expect(200);
    for (const who of [r.BURSAR, r.ACCOUNTANT, r.HR_MANAGER, r.MANAGEMENT]) await call('get', '/academics/schedule', who).expect(403);
    const body = { label: 'Nope', startTime: '17:00', endTime: '17:40' };
    for (const who of [r.PRINCIPAL, r.TEACHER, r.PARENT, r.ADMISSIONS_OFFICER, r.BURSAR]) {
      await call('post', '/academics/periods', who).send(body).expect(403);
      await call('patch', '/academics/schedule/working-days', who).send({ days: ['MON'] }).expect(403);
      await call('post', '/academics/schedule/template', who).send({ template: 'STANDARD' }).expect(403);
    }
    expect((await call('get', '/academics/schedule').expect(200)).body.workingDays).toEqual(['MON', 'WED', 'SAT']);
  });

  it('another school sees none of it, cannot touch it, and its own token with this school\'s header is refused', async () => {
    const adminB = w!.roles.B.ACADEMIC_ADMIN;
    const mine = (await call('get', '/academics/schedule').expect(200)).body.periods as Array<{ id: string }>;
    const theirs = (await call('get', '/academics/schedule', adminB, B()).expect(200)).body;
    expect(theirs.workingDays).toEqual(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);
    expect(theirs.periods.some((p: { id: string }) => mine.some((m) => m.id === p.id))).toBe(false);
    await call('patch', `/academics/periods/${mine[0]!.id}`, adminB, B()).send({ label: 'Stolen' }).expect(404);
    await call('delete', `/academics/periods/${mine[0]!.id}`, adminB, B()).expect(404);
    await call('get', '/academics/schedule', adminB, A()).expect(403);
  });
});
