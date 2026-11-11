// P5-5a against the REAL stack: a driver starts, reports positions of and ends a trip of their own route; the school sees every bus in progress; a parent sees only a bus that carries their own child,
// only while it runs; positions are checked, stored once, limited, and removed after the retention.
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

interface Stop { id: string; name: string }
interface Route { id: string; stops: Stop[] }
interface Trip { id: string; state: string; stale: boolean; last: { lat: number; lng: number; speedKmh: number | null; recordedAt: string } | null; stops: Array<{ id: string; name: string; reached: boolean; etaMinutes: number | null }>; children: Array<{ id: string; name: string; stopId: string }>; route: { id: string } }

describe.skipIf(!ready)('trips and positions against the real emulators (P5-5a)', { timeout: 300_000 }, () => {
  afterAll(async () => { vi.restoreAllMocks(); await app?.close(); });
  const A = () => w!.schools.A;
  const driver = () => w!.roles.A.DRIVER;
  const manager = () => w!.roles.A.TRANSPORT_MANAGER;
  const hr = () => w!.roles.A.HR_MANAGER;
  const parent = () => w!.roles.A.PARENT;
  const call = (who: Person, method: 'get' | 'post' | 'put' | 'patch', path: string, school = A()) => agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const audit = async (action: string) => (await w!.db.listAuditLog({ schoolId: A().replaceAll('-', ''), limit: 800, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  const uniq = () => randomUUID().slice(0, 6);
  let driverStaffId = '';
  // three stops about 1.1 km apart on a meridian
  const STOPS = [{ name: 'First', lat: 12.0, lng: 77.0 }, { name: 'Second', lat: 12.01, lng: 77.0 }, { name: 'Third', lat: 12.02, lng: 77.0 }];
  const makeRoute = async (over: Record<string, unknown> = {}) => {
    const r = (await call(manager(), 'post', '/transport/routes').send({ name: `Trip ${uniq()}`, direction: 'MORNING', driverId: driverStaffId, ...over }).expect(201)).body as Route;
    return (await call(manager(), 'put', `/transport/routes/${r.id}/stops`).send({ stops: STOPS }).expect(200)).body as Route;
  };
  const start = (routeId: string, id: string = randomUUID(), who = driver()) => call(who, 'post', '/trips').send({ id, routeId });
  const ping = (lat: number, ageMs = 0, speedKmh?: number) => ({ lat, lng: 77.0, recordedAt: new Date(Date.now() - ageMs).toISOString(), ...(speedKmh === undefined ? {} : { speedKmh }) });
  const send = (tripId: string, pings: unknown[], who = driver()) => call(who, 'post', `/trips/${tripId}/pings`).send({ pings });
  const active = async (who: Person, school = A()) => ((await call(who, 'get', '/trips/active', school).expect(200)).body as { items: Trip[] }).items;

  beforeAll(async () => {
    driverStaffId = ((await call(hr(), 'post', '/staff').send({ firstName: 'Ravi', lastName: `D${uniq()}`, designation: 'Driver' }).expect(201)).body as { id: string }).id;
    await call(hr(), 'put', `/staff/${driverStaffId}/account`).send({ userId: driver().uid }).expect(200);
  }, 180_000);

  it('only the driver of the route starts a trip: once at a time, and asking again with the same id is the same trip', async () => {
    const route = await makeRoute();
    const foreign = await makeRoute({ driverId: undefined });
    for (const p of [manager(), w!.roles.A.PRINCIPAL, w!.roles.A.TEACHER, parent(), hr()]) expect([403, 404], p.email).toContain((await start(route.id, randomUUID(), p)).status);
    await start(foreign.id).expect(404); // a route the driver does not drive
    await start(randomUUID()).expect(404);
    const id = randomUUID();
    const first = (await start(route.id, id).expect(201)).body as Trip;
    expect(first).toMatchObject({ id, state: 'IN_PROGRESS', last: null, stale: true });
    const same = (await start(route.id, id).expect(201)).body as Trip;
    expect(same.id).toBe(id);
    expect((await start(route.id).expect(409)).body.error.details[0].rule).toMatch(/already has a trip/);
    await start(route.id, 'not-a-uuid').expect(400);
    expect((await audit('trip.start')).length).toBeGreaterThan(0);
    await call(driver(), 'post', `/trips/${id}/end`).expect(200);
  });

  it('positions: checked, stored once, only for the driver\'s own running trip; the newest one is the last', async () => {
    const route = await makeRoute();
    const t = (await start(route.id).expect(201)).body as Trip;
    for (const bad of [[], Array.from({ length: 51 }, () => ping(12)), [{ ...ping(12), lat: 91 }], [{ ...ping(12), lng: 181 }], [{ ...ping(12), recordedAt: 'yesterday' }], [{ ...ping(12), speedKmh: 500 }], [{ lat: 12 }]]) await send(t.id, bad).expect(400);
    await call(driver(), 'post', `/trips/${t.id}/pings`).send({ pings: [ping(12), { ...ping(12), extra: 1 }] }).expect(400); // unknown fields are refused
    const batch = [ping(12.0, 60_000, 30), ping(12.003, 30_000, 32), ping(12.004, 0, 31)];
    const res = (await send(t.id, batch).expect(200)).body as { accepted: number; ignored: number };
    expect(res).toEqual({ accepted: 3, ignored: 0 });
    const old = (await send(t.id, batch.slice(0, 2)).expect(200)).body; // a batch sent twice stores each position once
    expect(old).toEqual({ accepted: 0, ignored: 2 });
    const odd = (await send(t.id, [ping(12.0, 3 * 24 * 3600_000), ping(12.0, -10 * 60_000)]).expect(200)).body; // from three days ago, from ten minutes ahead
    expect(odd).toEqual({ accepted: 0, ignored: 2 });
    const seen = (await call(driver(), 'get', `/trips/${t.id}`).expect(200)).body as Trip;
    expect(seen.last).toMatchObject({ lat: 12.004, lng: 77, speedKmh: 31 });
    expect(seen.stale).toBe(false);
    for (const p of [manager(), w!.roles.A.TEACHER, parent(), w!.roles.A.PRINCIPAL]) expect([403, 404], p.email).toContain((await send(t.id, [ping(12)], p)).status);
    await send(randomUUID(), [ping(12)]).expect(404);
    await call(driver(), 'post', `/trips/${t.id}/end`).expect(200);
    await send(t.id, [ping(12.005)]).expect(404); // the trip is over
  });

  it('the school sees every bus in progress with where it is and when it reaches each stop; the driver sees their own; an ended trip is not active', async () => {
    const route = await makeRoute();
    const t = (await start(route.id).expect(201)).body as Trip;
    await send(t.id, [ping(11.99, 120_000, 30), ping(12.0003, 60_000, 30), ping(12.005, 0, 30)]).expect(200);
    for (const who of [manager(), w!.roles.A.PRINCIPAL, driver()]) {
      const mine = (await active(who)).find((x) => x.id === t.id)!;
      expect(mine, who.email).toBeTruthy();
      expect(mine.last).toMatchObject({ lat: 12.005 });
      expect(mine.stops.map((s) => [s.name, s.reached])).toEqual([['First', true], ['Second', false], ['Third', false]]);
      expect(mine.stops[0]!.etaMinutes).toBeNull();
      expect(mine.stops[1]!.etaMinutes).toBeGreaterThanOrEqual(1);
      expect(mine.stops[2]!.etaMinutes!).toBeGreaterThan(mine.stops[1]!.etaMinutes!);
    }
    for (const who of [w!.roles.A.TEACHER, w!.roles.A.BURSAR, hr()]) expect([403, 404], who.email).toContain((await call(who, 'get', '/trips/active')).status);
    expect(await active(w!.roles.B.TRANSPORT_MANAGER, B())).toEqual([]);
    await call(w!.roles.B.TRANSPORT_MANAGER, 'get', `/trips/${t.id}`, B()).expect(404);
    await call(driver(), 'post', `/trips/${t.id}/end`).expect(200);
    const again = (await call(driver(), 'post', `/trips/${t.id}/end`).expect(200)).body as Trip;
    expect(again.state).toBe('ENDED'); // ending twice is the same answer
    expect((await active(manager())).find((x) => x.id === t.id)).toBeUndefined();
    expect((await call(manager(), 'get', `/trips/${t.id}`).expect(200)).body).toMatchObject({ state: 'ENDED' });
    expect((await audit('trip.end')).length).toBeGreaterThan(0);
  });
  const B = () => w!.schools.B;

  it('a parent sees the bus only while it runs and only if their own child rides that route', async () => {
    const route = await makeRoute();
    const other = await makeRoute();
    const academic = w!.roles.A.ACADEMIC_ADMIN;
    const kid = (await call(academic, 'post', '/students').send({ firstName: 'Mine', lastName: `R${uniq()}` }).expect(201)).body as { id: string };
    const stranger = (await call(academic, 'post', '/students').send({ firstName: 'Other', lastName: `R${uniq()}` }).expect(201)).body as { id: string };
    await call(manager(), 'put', `/transport/students/${kid.id}/seat`).send({ routeId: route.id, stopId: route.stops[1]!.id }).expect(200);
    await call(manager(), 'put', `/transport/students/${stranger.id}/seat`).send({ routeId: other.id, stopId: other.stops[0]!.id }).expect(200);
    const t = (await start(route.id).expect(201)).body as Trip;
    const o = (await call(driver(), 'post', '/trips').send({ id: randomUUID(), routeId: other.id }).expect(201)).body as Trip;
    await send(t.id, [ping(12.0003, 30_000, 30), ping(12.004, 0, 30)]).expect(200);
    expect(await active(parent())).toEqual([]); // not linked to any child yet
    await call(parent(), 'get', `/trips/${t.id}`).expect(404);
    await call(academic, 'post', `/students/${kid.id}/parent-accounts`).send({ userId: parent().uid, relationship: 'FATHER' }).expect(201);
    const mine = await active(parent());
    expect(mine.map((x) => x.id)).toEqual([t.id]); // not the other bus, though it is running
    expect(mine[0]!.children).toMatchObject([{ id: kid.id, name: expect.stringContaining('Mine'), stopId: route.stops[1]!.id }]);
    expect(mine[0]!.stops[1]!.etaMinutes).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(mine)).not.toContain(stranger.id); // nothing of another family's child
    await call(parent(), 'get', `/trips/${t.id}`).expect(200);
    await call(parent(), 'get', `/trips/${o.id}`).expect(404);
    for (const path of [`/trips/${t.id}/end`]) await call(parent(), 'post', path).expect(403);
    await send(t.id, [ping(12.01)], parent()).expect(403);
    await call(driver(), 'post', `/trips/${t.id}/end`).expect(200);
    await call(driver(), 'post', `/trips/${o.id}/end`).expect(200);
    expect(await active(parent())).toEqual([]);
    await call(parent(), 'get', `/trips/${t.id}`).expect(404); // a parent sees no trip that is over
  });

  it('positions older than the retention are removed', async () => {
    const route = await makeRoute();
    const t = (await start(route.id).expect(201)).body as Trip;
    await send(t.id, [ping(12.001)]).expect(200);
    const left = async () => (await w!.db.pingsOfTrip({ schoolId: A(), tripId: t.id })).data.locationPings.length;
    expect(await left()).toBe(1);
    await w!.db.purgeOldPings({ schoolId: A(), before: new Date(Date.now() - 7 * 24 * 3600_000).toISOString() });
    expect(await left()).toBe(1); // today's position stays
    await w!.db.purgeOldPings({ schoolId: A(), before: new Date(Date.now() + 60_000).toISOString() });
    expect(await left()).toBe(0);
    await call(driver(), 'post', `/trips/${t.id}/end`).expect(200);
  });
});
