// P2-7a against the REAL stack: fee structures, fees and instalments, concessions and the student schedule through the gateway.
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

describe.skipIf(!ready)('fees against the real emulators (P2-7a)', () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const B = () => w!.schools.B;
  const bursar = () => w!.roles.A.BURSAR;
  const acad = () => w!.roles.A.ACADEMIC_ADMIN;
  const call = (method: 'get' | 'post' | 'patch' | 'delete', path: string, who: Person = bursar(), school = A()) =>
    agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const audit = async (school: string, action: string) => (await w!.db.listAuditLog({ schoolId: school.replaceAll('-', ''), limit: 400, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  const uniq = () => randomUUID().slice(0, 6);
  /** A fresh academic year and a class level, so tests never collide on "one structure per level and year". */
  const setup = async (levelName = '7') => {
    const year = (await call('post', '/academics/years', acad()).send({ name: `FY-${uniq()}`, startDate: '2090-04-01', endDate: '2091-03-31' }).expect(201)).body;
    const levels = (await call('get', '/academics/levels', acad()).expect(200)).body.items as Array<{ id: string; name: string }>;
    return { year, level: levels.find((l) => l.name === levelName)! };
  };
  const monthly = (n: number, each = '100000') => Array.from({ length: n }, (_, i) => ({ label: `M${i + 1}`, amountMinor: each, dueDate: `2090-${String(i + 4 > 12 ? i - 8 : i + 4).padStart(2, '0')}-10` }));

  it('creates a structure for a level and year (defaults to the active year and a readable name); one per level and year', async () => {
    const { year, level } = await setup();
    const s = (await call('post', '/fees/structures').send({ gradeLevelId: level.id, academicYearId: year.id }).expect(201)).body;
    expect(s).toMatchObject({ name: `${level.name} fees ${year.name}`, academicYear: { id: year.id }, gradeLevel: { id: level.id }, items: [], totalMinor: '0' });
    await call('post', '/fees/structures').send({ gradeLevelId: level.id, academicYearId: year.id }).expect(409);
    await call('post', '/fees/structures').send({ gradeLevelId: level.id, academicYearId: year.id, name: 'Other name' }).expect(409);
    const active = (await call('post', '/academics/years/' + year.id + '/activate', acad()).expect(200)).body;
    expect(active.status).toBe('ACTIVE');
    const other = (await setup('8')).level;
    const dflt = (await call('post', '/fees/structures').send({ gradeLevelId: other.id }).expect(201)).body; // year defaults to the active one
    expect(dflt.academicYear.id).toBe(year.id);
    const bLevel = (await call('get', '/academics/levels', w!.roles.B.ACADEMIC_ADMIN, B()).expect(200)).body.items[0];
    await call('post', '/fees/structures').send({ gradeLevelId: bLevel.id, academicYearId: year.id }).expect(400); // another school's level
    await call('post', '/fees/structures').send({ gradeLevelId: level.id, academicYearId: randomUUID() }).expect(400);
  });

  it('a fee with its instalments is created all or nothing; totals are exact; a duplicate fee name is refused', async () => {
    const { year, level } = await setup('9');
    const s = (await call('post', '/fees/structures').send({ gradeLevelId: level.id, academicYearId: year.id }).expect(201)).body;
    const withTuition = (await call('post', `/fees/structures/${s.id}/items`).send({ name: 'Tuition', instalments: monthly(12, '1250000') }).expect(201)).body;
    expect(withTuition.items[0]).toMatchObject({ name: 'Tuition', totalMinor: '15000000' }); // 12 x Rs 12,500
    expect(withTuition.items[0].instalments.map((i: { sequence: number }) => i.sequence)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    const annual = (await call('post', `/fees/structures/${s.id}/items`).send({ name: 'Annual charges', instalments: [{ amountMinor: '123456789012345', dueDate: '2090-04-01' }] }).expect(201)).body;
    expect(annual.items[1].totalMinor).toBe('123456789012345'); // exact beyond a JavaScript number
    expect(annual.totalMinor).toBe(String(15_000_000n + 123_456_789_012_345n));
    await call('post', `/fees/structures/${s.id}/items`).send({ name: 'tuition', instalments: monthly(1) }).expect(409);
    // bad input leaves no half-made fee behind
    for (const bad of [[], monthly(25), [{ amountMinor: '0', dueDate: '2090-04-01' }], [{ amountMinor: '12.5', dueDate: '2090-04-01' }], [{ amountMinor: '1000', dueDate: '2090-02-30' }], [{ amountMinor: '1000000000000000', dueDate: '2090-04-01' }], [{ amountMinor: '100', dueDate: '2090-04-01' }, { amountMinor: 'abc', dueDate: '2090-05-01' }]])
      await call('post', `/fees/structures/${s.id}/items`).send({ name: 'Bad fee', instalments: bad }).expect(400);
    expect((await call('get', `/fees/structures/${s.id}`).expect(200)).body.items.map((i: { name: string }) => i.name)).toEqual(['Tuition', 'Annual charges']);
  });

  it('instalments: add the next one, change an amount or date, delete; the totals follow', async () => {
    const { year, level } = await setup('10');
    const s = (await call('post', '/fees/structures').send({ gradeLevelId: level.id, academicYearId: year.id }).expect(201)).body;
    const st = (await call('post', `/fees/structures/${s.id}/items`).send({ name: 'Term fee', instalments: [{ label: 'Term 1', amountMinor: '500000', dueDate: '2090-04-10' }, { label: 'Term 2', amountMinor: '500000', dueDate: '2090-08-10' }] }).expect(201)).body;
    const item = st.items[0];
    const added = (await call('post', `/fees/items/${item.id}/instalments`).send({ label: 'Term 3', amountMinor: '500000', dueDate: '2090-12-10' }).expect(201)).body;
    expect(added.items[0].instalments.map((i: { sequence: number; label: string }) => [i.sequence, i.label])).toEqual([[1, 'Term 1'], [2, 'Term 2'], [3, 'Term 3']]);
    expect(added.totalMinor).toBe('1500000');
    const upd = (await call('patch', `/fees/instalments/${item.instalments[0].id}`).send({ amountMinor: '600000', dueDate: '2090-04-15' }).expect(200)).body;
    expect(upd.items[0].instalments[0]).toMatchObject({ amountMinor: '600000', dueDate: '2090-04-15', label: 'Term 1' });
    expect(upd.totalMinor).toBe('1600000');
    await call('patch', `/fees/instalments/${item.instalments[0].id}`).send({}).expect(400);
    await call('patch', `/fees/instalments/${item.instalments[0].id}`).send({ amountMinor: '-5' }).expect(400);
    const del = (await call('delete', `/fees/instalments/${item.instalments[1].id}`).expect(200)).body;
    expect(del.items[0].instalments.map((i: { sequence: number }) => i.sequence)).toEqual([1, 3]);
    const next = (await call('post', `/fees/items/${item.id}/instalments`).send({ amountMinor: '100', dueDate: '2091-01-10' }).expect(201)).body;
    expect(next.items[0].instalments.map((i: { sequence: number }) => i.sequence)).toEqual([1, 3, 4]); // numbers are never reused
    const renamed = (await call('patch', `/fees/items/${item.id}`).send({ name: 'Term fees' }).expect(200)).body;
    expect(renamed.items[0].name).toBe('Term fees');
    expect((await call('delete', `/fees/items/${item.id}`).expect(200)).body.items).toEqual([]);
  });

  it("another school's staff cannot read or change a structure, fee, instalment or concession; B's token with A's header is refused", async () => {
    const { year, level } = await setup('11');
    const s = (await call('post', '/fees/structures').send({ gradeLevelId: level.id, academicYearId: year.id }).expect(201)).body;
    const st = (await call('post', `/fees/structures/${s.id}/items`).send({ name: 'Tuition', instalments: monthly(2) }).expect(201)).body;
    const b = w!.roles.B.BURSAR;
    await call('get', `/fees/structures/${s.id}`, b, B()).expect(404);
    await call('patch', `/fees/structures/${s.id}`, b, B()).send({ name: 'Mine' }).expect(404);
    await call('delete', `/fees/structures/${s.id}`, b, B()).expect(404);
    await call('post', `/fees/structures/${s.id}/items`, b, B()).send({ name: 'X', instalments: monthly(1) }).expect(404);
    await call('patch', `/fees/items/${st.items[0].id}`, b, B()).send({ name: 'Mine' }).expect(404);
    await call('post', `/fees/items/${st.items[0].id}/instalments`, b, B()).send({ amountMinor: '1', dueDate: '2090-04-10' }).expect(404);
    await call('patch', `/fees/instalments/${st.items[0].instalments[0].id}`, b, B()).send({ amountMinor: '1' }).expect(404);
    await call('delete', `/fees/instalments/${st.items[0].instalments[0].id}`, b, B()).expect(404);
    await call('get', '/fees/structures', b, A()).expect(403);
    expect((await call('get', '/fees/structures', b, B()).expect(200)).body.items.some((x: { id: string }) => x.id === s.id)).toBe(false);
    expect((await call('get', `/fees/structures/${s.id}`).expect(200)).body.items[0].instalments).toHaveLength(2);
  });

  it('concessions validate their shape and are listed per student; the student and fee must be this school\'s', async () => {
    const { year, level } = await setup('12');
    const s = (await call('post', '/fees/structures').send({ gradeLevelId: level.id, academicYearId: year.id }).expect(201)).body;
    const st = (await call('post', `/fees/structures/${s.id}/items`).send({ name: 'Tuition', instalments: monthly(1, '1000000') }).expect(201)).body;
    const kid = (await call('post', '/students', acad()).send({ firstName: `Con${uniq()}`, lastName: 'Cession' }).expect(201)).body;
    const post = (body: object) => call('post', '/fees/concessions').send({ studentId: kid.id, academicYearId: year.id, name: 'Sibling', ...body });
    await post({ kind: 'PERCENT' }).expect(400); // needs basis points
    await post({ kind: 'PERCENT', basisPoints: 0 }).expect(400);
    await post({ kind: 'PERCENT', basisPoints: 10001 }).expect(400);
    await post({ kind: 'PERCENT', basisPoints: 500, amountMinor: '100' }).expect(400); // not both
    await post({ kind: 'FIXED' }).expect(400);
    await post({ kind: 'FIXED', amountMinor: '100', basisPoints: 5 }).expect(400);
    await post({ kind: 'BOGUS', basisPoints: 5 }).expect(400);
    const all = (await post({ kind: 'PERCENT', basisPoints: 500 }).expect(201)).body;
    expect(all).toMatchObject({ kind: 'PERCENT', basisPoints: 500, amountMinor: null, feeItem: null, student: { id: kid.id }, academicYear: { id: year.id } });
    const one = (await post({ kind: 'FIXED', amountMinor: '25000', feeItemId: st.items[0].id, name: 'Staff child' }).expect(201)).body;
    expect(one).toMatchObject({ kind: 'FIXED', amountMinor: '25000', feeItem: { id: st.items[0].id } });
    expect((await call('get', `/fees/concessions?studentId=${kid.id}`).expect(200)).body.items.map((c: { name: string }) => c.name)).toEqual(['Sibling', 'Staff child']);
    const bKid = (await call('post', '/students', w!.roles.B.ACADEMIC_ADMIN, B()).send({ firstName: 'Bee', lastName: 'Kid' }).expect(201)).body;
    await call('post', '/fees/concessions').send({ studentId: bKid.id, academicYearId: year.id, name: 'x', kind: 'PERCENT', basisPoints: 100 }).expect(400); // not this school's student
    await call('post', '/fees/concessions').send({ studentId: kid.id, academicYearId: year.id, feeItemId: randomUUID(), name: 'x', kind: 'FIXED', amountMinor: '1' }).expect(400);
    expect((await call('get', `/fees/concessions?studentId=${kid.id}`, w!.roles.B.BURSAR, B()).expect(200)).body.items).toEqual([]);
    await call('delete', `/fees/concessions/${all.id}`, w!.roles.B.BURSAR, B()).expect(404);
    await call('delete', `/fees/concessions/${all.id}`).expect(204);
    expect((await call('get', `/fees/concessions?studentId=${kid.id}`).expect(200)).body.items).toHaveLength(1);
  });

  it('the student schedule: fees by due date, concessions applied exactly, totals add up; clear statuses when there is nothing to show', async () => {
    const { year, level } = await setup('6');
    const room = (await call('post', '/academics/classes', acad()).send({ gradeLevelId: level.id, section: `F${uniq()}`.slice(0, 6), capacity: 30 }).expect(201)).body;
    const s = (await call('post', '/fees/structures').send({ gradeLevelId: level.id, academicYearId: year.id }).expect(201)).body;
    const st = await call('post', `/fees/structures/${s.id}/items`).send({ name: 'Tuition', instalments: [{ label: 'Apr', amountMinor: '12500000', dueDate: '2090-04-10' }, { label: 'Jul', amountMinor: '3333', dueDate: '2090-07-10' }] }).expect(201);
    await call('post', `/fees/structures/${s.id}/items`).send({ name: 'Transport', instalments: [{ amountMinor: '200000', dueDate: '2090-04-10' }] }).expect(201);
    const kid = (await call('post', '/students', acad()).send({ firstName: `Sch${uniq()}`, lastName: 'Edule' }).expect(201)).body;
    const sched = (q = '') => call('get', `/fees/students/${kid.id}/schedule?academicYearId=${year.id}${q}`);
    expect((await sched().expect(200)).body).toMatchObject({ status: 'NO_PLACEMENT', lines: [], netMinor: '0' });
    await call('post', `/students/${kid.id}/placement`, acad()).send({ classroomId: room.id, academicYearId: year.id }).expect(201);
    await call('post', '/fees/concessions').send({ studentId: kid.id, academicYearId: year.id, name: 'Sibling', kind: 'PERCENT', basisPoints: 1250 }).expect(201); // 12.5% of everything
    await call('post', '/fees/concessions').send({ studentId: kid.id, academicYearId: year.id, feeItemId: st.body.items[0].id, name: 'Waiver', kind: 'FIXED', amountMinor: '500000' }).expect(201); // Rs 5,000 off each tuition instalment
    const res = (await sched().expect(200)).body;
    expect(res.status).toBe('OK');
    const line = (item: string, label: string | null) => res.lines.find((l: { feeItem: { name: string }; label: string | null }) => l.feeItem.name === item && l.label === label);
    expect(line('Tuition', 'Apr')).toMatchObject({ grossMinor: '12500000', discountMinor: String(1_562_500n + 500_000n), netMinor: String(12_500_000n - 2_062_500n) });
    // 12.5% of 3333 is 416.625 -> 417; the fixed 500000 is capped at what is left of the instalment after the gross: 3333 - 417 would be 2916 but each is worked out on the full 3333, then the sum is capped at 3333
    expect(line('Tuition', 'Jul')).toMatchObject({ grossMinor: '3333', discountMinor: '3333', netMinor: '0' });
    expect(line('Transport', null)).toMatchObject({ grossMinor: '200000', discountMinor: '25000', netMinor: '175000' });
    expect(res.lines.map((l: { dueDate: string }) => l.dueDate)).toEqual([...res.lines.map((l: { dueDate: string }) => l.dueDate)].sort());
    const sum = (k: string) => res.lines.reduce((t: bigint, l: Record<string, string>) => t + BigInt(l[k]!), 0n);
    expect([res.grossMinor, res.discountMinor, res.netMinor]).toEqual([String(sum('grossMinor')), String(sum('discountMinor')), String(sum('netMinor'))]);
    expect(BigInt(res.grossMinor) - BigInt(res.discountMinor)).toBe(BigInt(res.netMinor));
    // a level with no structure
    const kid2 = (await call('post', '/students', acad()).send({ firstName: `Nos${uniq()}`, lastName: 'Tructure' }).expect(201)).body;
    const lv5 = (await call('get', '/academics/levels', acad()).expect(200)).body.items.find((l: { name: string }) => l.name === '3');
    const room2 = (await call('post', '/academics/classes', acad()).send({ gradeLevelId: lv5.id, section: `G${uniq()}`.slice(0, 6), capacity: 30 }).expect(201)).body;
    await call('post', `/students/${kid2.id}/placement`, acad()).send({ classroomId: room2.id, academicYearId: year.id }).expect(201);
    expect((await call('get', `/fees/students/${kid2.id}/schedule?academicYearId=${year.id}`).expect(200)).body).toMatchObject({ status: 'NO_STRUCTURE', structure: null, lines: [] });
    await call('get', `/fees/students/${randomUUID()}/schedule`).expect(404);
    await call('get', `/fees/students/${kid.id}/schedule`, w!.roles.B.BURSAR, B()).expect(404); // B cannot see A's student
  });

  it('roles: Bursar full; Accountant reads, creates and updates but cannot delete; Principal reads; Academic Admin, Teacher, Parent, Driver get nothing', async () => {
    const { year, level } = await setup('3');
    const acct = w!.roles.A.ACCOUNTANT;
    const s = (await call('post', '/fees/structures', acct).send({ gradeLevelId: level.id, academicYearId: year.id }).expect(201)).body;
    await call('patch', `/fees/structures/${s.id}`, acct).send({ name: 'Accountant edit' }).expect(200);
    await call('delete', `/fees/structures/${s.id}`, acct).expect(403);
    await call('get', `/fees/structures/${s.id}`, w!.roles.A.PRINCIPAL).expect(200);
    await call('post', '/fees/structures', w!.roles.A.PRINCIPAL).send({ gradeLevelId: level.id }).expect(403);
    await call('get', '/fees/structures', acad()).expect(403);
    await call('post', '/fees/structures', w!.roles.A.TEACHER).send({ gradeLevelId: level.id }).expect(403);
    await call('get', '/fees/structures', w!.roles.A.DRIVER).expect(403);
    expect((await call('get', '/fees/structures', w!.roles.A.PARENT).expect(200)).body.items).toEqual([]); // linked scope: nothing until parents are served
    await call('get', `/fees/structures/${s.id}`, w!.roles.A.PARENT).expect(404);
    await call('delete', `/fees/structures/${s.id}`).expect(204);
  });

  it('audit: each change left a row with the verified actor', async () => {
    for (const a of ['fees.structure.create', 'fees.structure.update', 'fees.structure.delete', 'fees.item.create', 'fees.item.update', 'fees.item.delete', 'fees.instalment.add', 'fees.instalment.update', 'fees.instalment.delete', 'fees.concession.create', 'fees.concession.delete'])
      expect((await audit(A(), a)).length, a).toBeGreaterThan(0);
    expect((await audit(A(), 'fees.structure.create')).every((r) => [bursar().uid, w!.roles.A.ACCOUNTANT.uid].includes(r.actor.id))).toBe(true);
    expect((await audit(B(), 'fees.structure.create')).length).toBe(0);
  });
});
