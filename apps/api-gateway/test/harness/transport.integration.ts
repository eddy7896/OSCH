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
});
