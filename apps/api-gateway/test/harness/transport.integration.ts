// P5-4a against the REAL stack: vehicles, routes and a route's ordered stops (ADR-0015).
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

interface Vehicle { id: string; registration: string; label: string; capacity: number; status: string }
interface Stop { id: string; sequence: number; name: string; lat: number | null; lng: number | null; arrivalTime: string | null }
interface Route { id: string; name: string; direction: string; startTime: string | null; vehicle: Vehicle | null; driver: { id: string; employeeId: string; name: string } | null; stops: Stop[] }

describe.skipIf(!ready)('transport against the real emulators (P5-4a)', { timeout: 240_000 }, () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const B = () => w!.schools.B;
  const manager = () => w!.roles.A.TRANSPORT_MANAGER;
  const hr = () => w!.roles.A.HR_MANAGER;
  const call = (who: Person, method: 'get' | 'post' | 'patch' | 'put' | 'delete', path: string, school = A()) => agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const audit = async (action: string) => (await w!.db.listAuditLog({ schoolId: A().replaceAll('-', ''), limit: 800, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  const uniq = () => randomUUID().slice(0, 6);
  const plate = () => `KA-${uniq().toUpperCase()}`;
  let driverStaffId = '';
  let teacherStaffId = '';

  beforeAll(async () => {
    // a member of staff who signs in as a DRIVER, and one who signs in as a TEACHER (not a driver)
    driverStaffId = ((await call(hr(), 'post', '/staff').send({ firstName: 'Ravi', lastName: `D${uniq()}`, designation: 'Driver' }).expect(201)).body as { id: string }).id;
    await call(hr(), 'put', `/staff/${driverStaffId}/account`).send({ userId: w!.roles.A.DRIVER.uid }).expect(200);
    teacherStaffId = ((await call(hr(), 'post', '/staff').send({ firstName: 'Tara', lastName: `T${uniq()}` }).expect(201)).body as { id: string }).id;
    await call(hr(), 'put', `/staff/${teacherStaffId}/account`).send({ userId: w!.roles.A.TEACHER.uid }).expect(200);
  }, 180_000);

  it('only the Transport manager writes; the Principal reads; roles without the grant are refused', async () => {
    const body = { registration: plate(), label: 'Bus 1', capacity: 40 };
    for (const p of [w!.roles.A.PRINCIPAL, w!.roles.A.OPERATIONS_MANAGER, w!.roles.A.TEACHER, w!.roles.A.BURSAR, w!.roles.A.PARENT, hr()]) expect([403, 404]).toContain((await call(p, 'post', '/transport/vehicles').send(body)).status);
    await call(manager(), 'post', '/transport/vehicles').send(body).expect(201);
    await call(w!.roles.A.PRINCIPAL, 'get', '/transport/vehicles').expect(200);
    for (const p of [w!.roles.A.TEACHER, w!.roles.A.BURSAR, hr()]) expect([403, 404]).toContain((await call(p, 'get', '/transport/routes')).status);
  });

  it('vehicles: checked input, a unique plate in the school, audited; a vehicle in use cannot be deleted', async () => {
    const reg = plate();
    for (const bad of [{ registration: 'X', label: 'a', capacity: 40 }, { registration: reg, label: '', capacity: 40 }, { registration: reg, label: 'a', capacity: 0 }, { registration: reg, label: 'a', capacity: 500 }, { registration: reg, label: 'a', capacity: 40, extra: 1 }]) await call(manager(), 'post', '/transport/vehicles').send(bad).expect(400);
    const v = (await call(manager(), 'post', '/transport/vehicles').send({ registration: reg, label: 'Bus 2', capacity: 30 }).expect(201)).body as Vehicle;
    expect(v).toMatchObject({ registration: reg, label: 'Bus 2', capacity: 30, status: 'ACTIVE' });
    const dup = await call(manager(), 'post', '/transport/vehicles').send({ registration: reg, label: 'Other', capacity: 20 });
    expect(dup.status).toBe(409);
    expect(dup.body.error.details[0].rule).toBe('registrationInUse');
    const up = (await call(manager(), 'patch', `/transport/vehicles/${v.id}`).send({ status: 'OUT_OF_SERVICE', capacity: 32 }).expect(200)).body as Vehicle;
    expect(up).toMatchObject({ status: 'OUT_OF_SERVICE', capacity: 32 });
    await call(manager(), 'patch', `/transport/vehicles/${v.id}`).send({}).expect(400);
    await call(manager(), 'patch', `/transport/vehicles/${randomUUID()}`).send({ label: 'x' }).expect(404);
    expect((await audit('transport.vehicle.create')).length).toBeGreaterThan(0);
    expect((await audit('transport.vehicle.update')).length).toBeGreaterThan(0);

    const route = (await call(manager(), 'post', '/transport/routes').send({ name: `Use ${uniq()}`, direction: 'MORNING', vehicleId: v.id }).expect(201)).body as Route;
    expect((await call(manager(), 'delete', `/transport/vehicles/${v.id}`).expect(409)).body.error.details[0].rule).toBe('vehicleInUse');
    await call(manager(), 'patch', `/transport/routes/${route.id}`).send({ vehicleId: null }).expect(200);
    await call(manager(), 'delete', `/transport/vehicles/${v.id}`).expect(204);
    await call(manager(), 'delete', `/transport/vehicles/${v.id}`).expect(404);
    expect((await audit('transport.vehicle.delete')).length).toBeGreaterThan(0);
  });

  it('routes: made with a vehicle and a driver, changed, unique by name, audited; the driver must hold the DRIVER role', async () => {
    const v = (await call(manager(), 'post', '/transport/vehicles').send({ registration: plate(), label: 'Bus 3', capacity: 35 }).expect(201)).body as Vehicle;
    const name = `North ${uniq()}`;
    const r = (await call(manager(), 'post', '/transport/routes').send({ name, direction: 'MORNING', startTime: '07:15', vehicleId: v.id, driverId: driverStaffId }).expect(201)).body as Route;
    expect(r).toMatchObject({ name, direction: 'MORNING', startTime: '07:15', stops: [] });
    expect(r.vehicle?.id).toBe(v.id);
    expect(r.driver?.id).toBe(driverStaffId);
    expect((await call(manager(), 'post', '/transport/routes').send({ name, direction: 'AFTERNOON' }).expect(409)).body.error.details[0].rule).toBe('routeNameInUse');
    for (const bad of [{ name: '', direction: 'MORNING' }, { name: 'x', direction: 'NOON' }, { name: 'x', direction: 'MORNING', startTime: '25:00' }, { name: 'x', direction: 'MORNING', vehicleId: 'nope' }, { name: 'x', direction: 'MORNING', extra: 1 }]) await call(manager(), 'post', '/transport/routes').send(bad).expect(400);
    // a staff member who is not a DRIVER, and an unknown one, are refused, and no half-made route is left behind
    const before = ((await call(manager(), 'get', '/transport/routes').expect(200)).body as { items: Route[] }).items.length;
    expect((await call(manager(), 'post', '/transport/routes').send({ name: `Bad ${uniq()}`, direction: 'MORNING', driverId: teacherStaffId }).expect(400)).body.error.details[0].rule).toBe('notADriver');
    await call(manager(), 'post', '/transport/routes').send({ name: `Bad ${uniq()}`, direction: 'MORNING', driverId: randomUUID() }).expect(400);
    await call(manager(), 'post', '/transport/routes').send({ name: `Bad ${uniq()}`, direction: 'MORNING', vehicleId: randomUUID() }).expect(400);
    expect(((await call(manager(), 'get', '/transport/routes').expect(200)).body as { items: Route[] }).items.length).toBe(before);

    const up = (await call(manager(), 'patch', `/transport/routes/${r.id}`).send({ direction: 'AFTERNOON', startTime: '15:30', driverId: null }).expect(200)).body as Route;
    expect(up).toMatchObject({ direction: 'AFTERNOON', startTime: '15:30', driver: null });
    expect(up.vehicle?.id).toBe(v.id);
    await call(manager(), 'patch', `/transport/routes/${r.id}`).send({}).expect(400);
    for (const a of ['transport.route.create', 'transport.route.update', 'transport.route.vehicle', 'transport.route.driver']) expect((await audit(a)).length, a).toBeGreaterThan(0);
    expect(((await call(manager(), 'get', `/transport/routes/${r.id}`).expect(200)).body as Route).name).toBe(name);
    await call(manager(), 'get', `/transport/routes/${randomUUID()}`).expect(404);
  });

  it('stops: the whole ordered list replaces the old one; a repeated name is refused; coordinates come in pairs; the order is 1, 2, 3', async () => {
    const r = (await call(manager(), 'post', '/transport/routes').send({ name: `Stops ${uniq()}`, direction: 'MORNING' }).expect(201)).body as Route;
    const put = (stops: unknown[]) => call(manager(), 'put', `/transport/routes/${r.id}/stops`).send({ stops });
    const set = (await put([{ name: 'Lake Road', lat: 12.9716, lng: 77.5946, arrivalTime: '07:20' }, { name: 'Market', arrivalTime: '07:35' }, { name: 'School gate' }]).expect(200)).body as Route;
    expect(set.stops.map((s) => [s.sequence, s.name])).toEqual([[1, 'Lake Road'], [2, 'Market'], [3, 'School gate']]);
    expect(set.stops[0]).toMatchObject({ lat: 12.9716, lng: 77.5946, arrivalTime: '07:20' });
    expect(set.stops[1]).toMatchObject({ lat: null, lng: null });
    const again = (await put([{ name: 'School gate' }, { name: 'Market' }]).expect(200)).body as Route;
    expect(again.stops.map((s) => [s.sequence, s.name])).toEqual([[1, 'School gate'], [2, 'Market']]);
    expect((await put([{ name: 'A' }, { name: 'a' }]).expect(400)).body.error.details[0].rule).toBe('duplicateStop');
    expect((await put([{ name: 'A', lat: 12.9 }]).expect(400)).body.error.details[0].rule).toBe('latAndLngTogether');
    await put([{ name: 'A', lat: 99, lng: 0 }]).expect(400);
    await put([{ name: '' }]).expect(400);
    await put(Array.from({ length: 61 }, (_v, i) => ({ name: `S${i}` }))).expect(400);
    expect(((await call(manager(), 'get', `/transport/routes/${r.id}`).expect(200)).body as Route).stops.length).toBe(2); // the refused lists changed nothing
    const empty = (await put([]).expect(200)).body as Route;
    expect(empty.stops).toEqual([]);
    expect((await audit('transport.route.stops')).length).toBeGreaterThan(0);
  });

  it('deleting a route takes its stops with it; a driver sees only the routes they drive; a parent sees none yet', async () => {
    const mine = (await call(manager(), 'post', '/transport/routes').send({ name: `Mine ${uniq()}`, direction: 'MORNING', driverId: driverStaffId }).expect(201)).body as Route;
    const other = (await call(manager(), 'post', '/transport/routes').send({ name: `Other ${uniq()}`, direction: 'MORNING' }).expect(201)).body as Route;
    await call(manager(), 'put', `/transport/routes/${mine.id}/stops`).send({ stops: [{ name: 'One' }, { name: 'Two' }] }).expect(200);
    const seen = ((await call(w!.roles.A.DRIVER, 'get', '/transport/routes').expect(200)).body as { items: Route[] }).items.map((x) => x.id);
    expect(seen).toContain(mine.id);
    expect(seen).not.toContain(other.id);
    await call(w!.roles.A.DRIVER, 'get', `/transport/routes/${mine.id}`).expect(200);
    await call(w!.roles.A.DRIVER, 'get', `/transport/routes/${other.id}`).expect(404);
    expect(((await call(w!.roles.A.DRIVER, 'get', '/transport/vehicles').expect(200)).body as { items: Vehicle[] }).items).toEqual([]);
    expect(((await call(w!.roles.A.PARENT, 'get', '/transport/routes').expect(200)).body as { items: Route[] }).items).toEqual([]);
    await call(w!.roles.A.DRIVER, 'delete', `/transport/routes/${mine.id}`).expect(403);
    await call(manager(), 'delete', `/transport/routes/${mine.id}`).expect(204);
    await call(manager(), 'get', `/transport/routes/${mine.id}`).expect(404);
    expect((await audit('transport.route.delete')).length).toBeGreaterThan(0);
    // the same name can be used again: the old route and its stops are gone
    await call(manager(), 'post', '/transport/routes').send({ name: mine.name, direction: 'MORNING' }).expect(201);
  });

  it('another school sees none of it, and cannot use this school\'s vehicle or driver', async () => {
    const v = (await call(manager(), 'post', '/transport/vehicles').send({ registration: plate(), label: 'Bus X', capacity: 20 }).expect(201)).body as Vehicle;
    const r = (await call(manager(), 'post', '/transport/routes').send({ name: `Iso ${uniq()}`, direction: 'MORNING' }).expect(201)).body as Route;
    const otherManager = w!.roles.B.TRANSPORT_MANAGER;
    expect(((await call(otherManager, 'get', '/transport/vehicles', B()).expect(200)).body as { items: Vehicle[] }).items.some((x) => x.id === v.id)).toBe(false);
    expect(((await call(otherManager, 'get', '/transport/routes', B()).expect(200)).body as { items: Route[] }).items.some((x) => x.id === r.id)).toBe(false);
    await call(otherManager, 'get', `/transport/routes/${r.id}`, B()).expect(404);
    await call(otherManager, 'patch', `/transport/vehicles/${v.id}`, B()).send({ label: 'mine now' }).expect(404);
    await call(otherManager, 'put', `/transport/routes/${r.id}/stops`, B()).send({ stops: [{ name: 'x' }] }).expect(404);
    await call(otherManager, 'delete', `/transport/routes/${r.id}`, B()).expect(404);
    // a vehicle or driver id from school A named in school B is refused
    expect((await call(otherManager, 'post', '/transport/routes', B()).send({ name: `Cross ${uniq()}`, direction: 'MORNING', vehicleId: v.id }).expect(400)).body.error.details[0].rule).toBe('notFound');
    expect((await call(otherManager, 'post', '/transport/routes', B()).send({ name: `Cross ${uniq()}`, direction: 'MORNING', driverId: driverStaffId }).expect(400)).body.error.details[0].rule).toBe('notFound');
    // and the same plate may exist in each school
    await call(otherManager, 'post', '/transport/vehicles', B()).send({ registration: v.registration, label: 'Same plate', capacity: 20 }).expect(201);
  });

  // ---- P5-4b: seats and manifests
  const academic = () => w!.roles.A.ACADEMIC_ADMIN;
  const student = async (first: string, school = A(), who: Person = academic()) => (await call(who, 'post', '/students', school).send({ firstName: first, lastName: `R${uniq()}` }).expect(201)).body as { id: string; firstName: string };
  const makeRoute = async (direction: 'MORNING' | 'AFTERNOON', over: Record<string, unknown> = {}) => (await call(manager(), 'post', '/transport/routes').send({ name: `${direction} ${uniq()}`, direction, ...over }).expect(201)).body as Route;
  const withStops = async (r: Route, names: string[]) => (await call(manager(), 'put', `/transport/routes/${r.id}/stops`).send({ stops: names.map((name) => ({ name })) }).expect(200)).body as Route & { droppedSeats: number };
  const seat = (studentId: string, routeId: string, stopId: string, who: Person = manager()) => call(who, 'put', `/transport/students/${studentId}/seat`).send({ routeId, stopId });
  interface Seats { studentId: string; items: Array<{ direction: string; route: { id: string; name: string }; stop: { id: string; name: string; sequence: number }; vehicle: { registration: string } | null; driverName: string | null }> }
  interface Manifest { route: Route; capacity: number | null; assigned: number; stops: Array<{ id: string; sequence: number; name: string; students: Array<{ id: string; name: string; enrollmentId: string; className: string | null }> }> }

  it('seating: a student rides one route per direction, at a stop of that route; a second seat in the same direction replaces the first; the manifest lists them by stop', async () => {
    const morning = await withStops(await makeRoute('MORNING', { startTime: '07:00' }), ['Lake Road', 'Market', 'School gate']);
    const afternoon = await withStops(await makeRoute('AFTERNOON'), ['School gate', 'Market']);
    const other = await withStops(await makeRoute('MORNING'), ['Hill Top']);
    const ann = await student('Ann');
    const bob = await student('Bob');
    const stop = (r: Route, name: string) => r.stops.find((s) => s.name === name)!.id;

    const s1 = (await seat(ann.id, morning.id, stop(morning, 'Market')).expect(200)).body as Seats;
    expect(s1.items).toMatchObject([{ direction: 'MORNING', route: { id: morning.id }, stop: { name: 'Market', sequence: 2 } }]);
    await seat(ann.id, afternoon.id, stop(afternoon, 'Market')).expect(200);
    await seat(bob.id, morning.id, stop(morning, 'Lake Road')).expect(200);
    // moving to another route in the same direction replaces the seat; it never leaves two
    const moved = (await seat(ann.id, other.id, stop(other, 'Hill Top')).expect(200)).body as Seats;
    expect(moved.items.map((i) => [i.direction, i.route.id])).toEqual([['AFTERNOON', afternoon.id], ['MORNING', other.id]]);
    const m = (await call(manager(), 'get', `/transport/routes/${morning.id}/manifest`).expect(200)).body as Manifest;
    expect(m.assigned).toBe(1);
    expect(m.stops.map((s) => [s.sequence, s.name, s.students.map((x) => x.name.split(' ')[0])])).toEqual([[1, 'Lake Road', ['Bob']], [2, 'Market', []], [3, 'School gate', []]]);
    expect(m.stops[0]!.students[0]).toMatchObject({ enrollmentId: expect.any(String) });
    // refused: a stop of another route, an unknown student, an unknown route, bad input
    expect((await seat(ann.id, morning.id, stop(other, 'Hill Top')).expect(400)).body.error.details[0].rule).toBe('notOnThisRoute');
    expect((await seat(randomUUID(), morning.id, stop(morning, 'Market')).expect(400)).body.error.details[0].rule).toBe('notFound');
    await seat(ann.id, randomUUID(), stop(morning, 'Market')).expect(404);
    await call(manager(), 'put', `/transport/students/${ann.id}/seat`).send({ routeId: morning.id }).expect(400);
    await call(manager(), 'put', `/transport/students/${ann.id}/seat`).send({ routeId: morning.id, stopId: stop(morning, 'Market'), extra: 1 }).expect(400);
    // taking the seat away
    await call(manager(), 'delete', `/transport/students/${ann.id}/seat/AFTERNOON`).expect(204);
    await call(manager(), 'delete', `/transport/students/${ann.id}/seat/AFTERNOON`).expect(404);
    await call(manager(), 'delete', `/transport/students/${ann.id}/seat/NOON`).expect(400);
    expect(((await call(manager(), 'get', `/transport/students/${ann.id}`).expect(200)).body as Seats).items.map((i) => i.direction)).toEqual(['MORNING']);
    for (const a of ['transport.student.assign', 'transport.student.unassign']) expect((await audit(a)).length, a).toBeGreaterThan(0);
  });

  it('a full vehicle takes no more students; a student who leaves the school drops off the manifest; only the Transport manager seats students', async () => {
    const small = (await call(manager(), 'post', '/transport/vehicles').send({ registration: plate(), label: 'Van', capacity: 1 }).expect(201)).body as Vehicle;
    const r = await withStops(await makeRoute('MORNING', { vehicleId: small.id }), ['Only stop']);
    const [a, b] = [await student('Cap'), await student('Cap')];
    await seat(a.id, r.id, r.stops[0]!.id).expect(200);
    await seat(a.id, r.id, r.stops[0]!.id).expect(200); // the same student again is not a second seat
    expect((await seat(b.id, r.id, r.stops[0]!.id).expect(409)).body.error.details[0].rule).toBe('vehicleFull');
    await call(academic(), 'patch', `/students/${a.id}`).send({ status: 'LEFT' }).expect(200);
    expect(((await call(manager(), 'get', `/transport/routes/${r.id}/manifest`).expect(200)).body as Manifest).assigned).toBe(0);
    for (const p of [w!.roles.A.PRINCIPAL, w!.roles.A.TEACHER, w!.roles.A.PARENT, hr(), w!.roles.A.OPERATIONS_MANAGER]) expect([403, 404], 'seat').toContain((await seat(b.id, r.id, r.stops[0]!.id, p)).status);
    expect([403, 404]).toContain((await call(w!.roles.A.DRIVER, 'delete', `/transport/students/${b.id}/seat/MORNING`)).status);
  });

  it('changing a route\'s stops keeps the seats on stops of the same name and drops the rest, and says how many', async () => {
    const r = await withStops(await makeRoute('MORNING'), ['A', 'B', 'C']);
    const [x, y] = [await student('Keep'), await student('Lose')];
    await seat(x.id, r.id, r.stops[1]!.id).expect(200); // B
    await seat(y.id, r.id, r.stops[2]!.id).expect(200); // C
    const after = await withStops(r, ['B', 'A', 'D']);
    expect(after.droppedSeats).toBe(1);
    const m = (await call(manager(), 'get', `/transport/routes/${r.id}/manifest`).expect(200)).body as Manifest;
    expect(m.stops.map((s) => [s.name, s.students.length])).toEqual([['B', 1], ['A', 0], ['D', 0]]);
    expect(((await call(manager(), 'get', `/transport/students/${y.id}`).expect(200)).body as Seats).items).toEqual([]);
    // deleting the route takes the seats with it
    await call(manager(), 'delete', `/transport/routes/${r.id}`).expect(204);
    expect(((await call(manager(), 'get', `/transport/students/${x.id}`).expect(200)).body as Seats).items).toEqual([]);
  });

  it('a driver sees the manifest of their own route only; a parent sees only their own child\'s ride, never a manifest or another family\'s child', async () => {
    const mine = await withStops(await makeRoute('MORNING', { driverId: driverStaffId }), ['Stop 1']);
    const foreign = await withStops(await makeRoute('MORNING'), ['Stop 9']);
    const [kid, stranger] = [await student('Mine'), await student('Stranger')];
    await seat(kid.id, mine.id, mine.stops[0]!.id).expect(200);
    await seat(stranger.id, mine.id, mine.stops[0]!.id).expect(200);
    await call(w!.roles.A.DRIVER, 'get', `/transport/routes/${mine.id}/manifest`).expect(200);
    await call(w!.roles.A.DRIVER, 'get', `/transport/routes/${foreign.id}/manifest`).expect(404);
    await call(w!.roles.A.DRIVER, 'get', `/transport/students/${kid.id}`).expect(404);
    expect(((await call(w!.roles.A.DRIVER, 'get', '/transport/children').expect(200)).body as { items: unknown[] }).items).toEqual([]);

    const parent = w!.roles.A.PARENT;
    await call(parent, 'get', `/transport/students/${kid.id}`).expect(404); // not linked yet
    expect(((await call(parent, 'get', '/transport/children').expect(200)).body as { items: unknown[] }).items).toEqual([]);
    await call(academic(), 'post', `/students/${kid.id}/parent-accounts`).send({ userId: parent.uid, relationship: 'FATHER' }).expect(201);
    const seen = (await call(parent, 'get', `/transport/students/${kid.id}`).expect(200)).body as Seats;
    expect(seen.items).toMatchObject([{ direction: 'MORNING', route: { id: mine.id }, stop: { name: 'Stop 1' }, driverName: expect.stringContaining('Ravi') }]);
    expect(JSON.stringify(seen)).not.toMatch(/phone|email|address/i);
    const kids = (await call(parent, 'get', '/transport/children').expect(200)).body as { items: Seats[] };
    expect(kids.items.map((k) => k.studentId)).toEqual([kid.id]);
    await call(parent, 'get', `/transport/students/${stranger.id}`).expect(404); // another family's child: the same answer as for a child that does not exist
    await call(parent, 'get', `/transport/students/${randomUUID()}`).expect(404);
    await call(parent, 'get', `/transport/routes/${mine.id}/manifest`).expect(404); // a manifest holds other families' children
    await call(parent, 'get', `/transport/routes/${mine.id}`).expect(404);
    await seat(kid.id, mine.id, mine.stops[0]!.id, parent).expect(403);
  });

  it('another school: its students cannot be seated here, its manager sees no seats of this school', async () => {
    const r = await withStops(await makeRoute('MORNING'), ['X']);
    const mineStudent = await student('Home');
    const foreignStudent = await student('Away', B(), w!.roles.B.ACADEMIC_ADMIN);
    await seat(mineStudent.id, r.id, r.stops[0]!.id).expect(200);
    expect((await seat(foreignStudent.id, r.id, r.stops[0]!.id).expect(400)).body.error.details[0].rule).toBe('notFound');
    const other = w!.roles.B.TRANSPORT_MANAGER;
    await call(other, 'get', `/transport/students/${mineStudent.id}`, B()).expect(404);
    await call(other, 'get', `/transport/routes/${r.id}/manifest`, B()).expect(404);
    await call(other, 'put', `/transport/students/${mineStudent.id}/seat`, B()).send({ routeId: r.id, stopId: r.stops[0]!.id }).expect(404);
    await call(other, 'delete', `/transport/students/${mineStudent.id}/seat/MORNING`, B()).expect(404);
  });
});

