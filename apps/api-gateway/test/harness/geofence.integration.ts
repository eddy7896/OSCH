// P4-S3 against the REAL stack: the school's geofence, and the evidence kept with a staff check-in (ADR-0014 decisions 9 and 10).
// A check-in is never refused for where the person is, only for a missing reason that the rules require.
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

const SCHOOL = { lat: 12.9716, lng: 77.5946 };
/** A point `m` metres due north of the school. */
const north = (m: number) => ({ lat: SCHOOL.lat + m / 111_195, lng: SCHOOL.lng });

interface Day { date: string; checkIn: string | null; checkOut: string | null; checkInStamp: string | null; checkInDistanceM: number | null; checkInReason: string | null; checkInDeviceTime: string | null; needsConfirmation: boolean; confirmedAt: string | null; checkOutStamp: string | null; checkOutReason: string | null }

describe.skipIf(!ready)('geofenced check-in against the real emulators (P4-S3)', { timeout: 240_000 }, () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const hr = () => w!.roles.A.HR_MANAGER;
  const sysadmin = () => w!.roles.A.SYSTEM_ADMIN;
  const call = (who: Person, method: 'get' | 'post' | 'put' | 'delete', path: string, school = A()) => agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const uniq = () => randomUUID().slice(0, 6);
  const audit = async (action: string) => (await w!.db.listAuditLog({ schoolId: A().replaceAll('-', ''), limit: 800, offset: 0 })).data.auditLogs.filter((a) => a.action === action);

  // one person per scenario: a person checks in once a day
  const who = () => ({ inside: w!.roles.A.TEACHER, middle: w!.roles.A.STAFF, far: w!.roles.A.BURSAR, none: w!.roles.A.ACCOUNTANT, plain: w!.roles.A.ADMISSIONS_OFFICER, repeat: w!.roles.A.OPERATIONS_MANAGER });
  const staffIds: Record<string, string> = {};

  beforeAll(async () => {
    for (const [k, person] of Object.entries(who())) {
      const id = ((await call(hr(), 'post', '/staff').send({ firstName: k, lastName: `G${uniq()}` }).expect(201)).body as { id: string }).id;
      await call(hr(), 'put', `/staff/${id}/account`).send({ userId: person.uid }).expect(200);
      staffIds[k] = id;
    }
  }, 180_000);

  it('a school with no geofence asks nobody for anything: the check-in is recorded with an UNKNOWN stamp', async () => {
    expect((await call(who().plain, 'get', '/attendance/staff/geofence').expect(200)).body).toMatchObject({ configured: false, lat: null, hardRingM: 500, marginM: 50 });
    const d = (await call(who().plain, 'post', '/attendance/staff/check-in').send({ position: north(9000) }).expect(200)).body as Day;
    expect(d).toMatchObject({ checkInStamp: 'UNKNOWN', checkInDistanceM: null, needsConfirmation: false });
  });

  it('only the System Admin sets where the school is; everyone who checks in may read it; bad values are refused', async () => {
    const put = (p: Person, body: object) => call(p, 'put', '/school/geofence').send(body);
    for (const p of [hr(), who().inside, w!.roles.A.PRINCIPAL]) expect([403, 404]).toContain((await put(p, { ...SCHOOL, radiusM: 150 })).status);
    await put(sysadmin(), { lat: 91, lng: 0, radiusM: 150 }).expect(400);
    await put(sysadmin(), { lat: 0, lng: 181, radiusM: 150 }).expect(400);
    await put(sysadmin(), { ...SCHOOL, radiusM: 5 }).expect(400);
    await put(sysadmin(), { ...SCHOOL, radiusM: 150, marginM: 9999 }).expect(400);
    await put(sysadmin(), { ...SCHOOL, radiusM: 150, extra: 1 }).expect(400);
    const set = (await put(sysadmin(), { ...SCHOOL, radiusM: 150 }).expect(200)).body;
    expect(set).toMatchObject({ configured: true, radiusM: 150, marginM: 50, hardRingM: 500 });
    expect((await call(who().inside, 'get', '/attendance/staff/geofence').expect(200)).body).toMatchObject({ configured: true, lat: SCHOOL.lat, lng: SCHOOL.lng });
    expect((await audit('school.geofence.set')).length).toBeGreaterThan(0);
  });

  it('inside the soft ring (grounds plus margin): INSIDE, no question, and the phone\'s own time is kept only as a note', async () => {
    const deviceTime = '2026-01-01T08:00:00.000Z';
    const d = (await call(who().inside, 'post', '/attendance/staff/check-in').send({ position: north(120), deviceTime }).expect(200)).body as Day;
    expect(d).toMatchObject({ checkInStamp: 'INSIDE', needsConfirmation: false, checkInReason: null });
    expect(Date.parse(d.checkInDeviceTime!)).toBe(Date.parse(deviceTime));
    expect(d.checkInDistanceM).toBeGreaterThanOrEqual(119);
    expect(d.checkInDistanceM).toBeLessThanOrEqual(121);
    expect(Date.parse(d.checkIn!)).not.toBe(Date.parse(deviceTime)); // the record's time is the server's
    expect(Math.abs(Date.parse(d.checkIn!) - Date.now())).toBeLessThan(120_000);
  });

  it('between the soft ring and 500 m: a reason is asked (400 without it), the day is recorded with it, HR need not confirm', async () => {
    const p = who().middle;
    const without = await call(p, 'post', '/attendance/staff/check-in').send({ position: north(350) }).expect(400);
    expect(JSON.stringify(without.body)).toContain('reasonRequired');
    const d = (await call(p, 'post', '/attendance/staff/check-in').send({ position: north(350), reason: '  Visiting the district office  ' }).expect(200)).body as Day;
    expect(d).toMatchObject({ checkInStamp: 'OUTSIDE', checkInReason: 'Visiting the district office', needsConfirmation: false });
    expect(d.checkInDistanceM).toBeGreaterThanOrEqual(349);
    // a repeat is the same answer: the first stamp stands, whatever the repeat says
    const again = (await call(p, 'post', '/attendance/staff/check-in').send({ position: north(10), reason: 'x' }).expect(200)).body as Day;
    expect(again).toMatchObject({ checkInStamp: 'OUTSIDE', checkIn: d.checkIn, checkInReason: 'Visiting the district office' });
    // checking out far away also needs a reason; with one it is recorded
    await call(p, 'post', '/attendance/staff/check-out').send({ position: north(900) }).expect(400);
    const out = (await call(p, 'post', '/attendance/staff/check-out').send({ position: north(900), reason: 'Sent to the bank' }).expect(200)).body as Day;
    expect(out).toMatchObject({ checkOutStamp: 'OUTSIDE', checkOutReason: 'Sent to the bank' });
    expect(out.checkOut).not.toBeNull();
  });

  it('beyond 500 m: a reason is required, the day is recorded, and it waits for HR; only HR confirms, once, audited', async () => {
    const p = who().far;
    await call(p, 'post', '/attendance/staff/check-in').send({ position: north(2500) }).expect(400);
    const d = (await call(p, 'post', '/attendance/staff/check-in').send({ position: north(2500), reason: 'Bus broke down' }).expect(200)).body as Day;
    expect(d).toMatchObject({ checkInStamp: 'OUTSIDE', needsConfirmation: true, confirmedAt: null });

    // HR sees the stamp, the distance, the reason, both times, and what waits
    const row = ((await call(hr(), 'get', '/attendance/staff').expect(200)).body.items as Array<{ staff: { id: string }; checkInStamp: string; checkInDistanceM: number; checkInReason: string; needsConfirmation: boolean; checkIn: string }>).find((i) => i.staff.id === staffIds['far'])!;
    expect(row).toMatchObject({ checkInStamp: 'OUTSIDE', checkInReason: 'Bus broke down', needsConfirmation: true });
    expect(row.checkInDistanceM).toBeGreaterThan(2400);

    const date = d.date;
    expect([403, 404]).toContain((await call(p, 'post', `/attendance/staff/${staffIds['far']}/days/${date}/confirm`)).status); // not their own, not anyone's but HR's
    expect([403, 404]).toContain((await call(who().inside, 'post', `/attendance/staff/${staffIds['far']}/days/${date}/confirm`)).status);
    const before = (await audit('attendance.staff.confirm')).length;
    const ok = (await call(hr(), 'post', `/attendance/staff/${staffIds['far']}/days/${date}/confirm`).expect(200)).body as Day;
    expect(ok).toMatchObject({ needsConfirmation: false });
    expect(ok.confirmedAt).not.toBeNull();
    const again = (await call(hr(), 'post', `/attendance/staff/${staffIds['far']}/days/${date}/confirm`).expect(200)).body as Day;
    expect(again.confirmedAt).toBe(ok.confirmedAt);
    expect((await audit('attendance.staff.confirm')).length).toBe(before + 1);
    // a day that needs no confirmation cannot be confirmed
    await call(hr(), 'post', `/attendance/staff/${staffIds['inside']}/days/${date}/confirm`).expect(409);
    await call(hr(), 'post', `/attendance/staff/${randomUUID()}/days/${date}/confirm`).expect(404);
  });

  it('a phone with no position is asked for a reason like the middle case, and stamped UNKNOWN', async () => {
    const p = who().none;
    await call(p, 'post', '/attendance/staff/check-in').send({}).expect(400);
    const d = (await call(p, 'post', '/attendance/staff/check-in').send({ reason: 'No signal in the basement' }).expect(200)).body as Day;
    expect(d).toMatchObject({ checkInStamp: 'UNKNOWN', checkInDistanceM: null, checkInReason: 'No signal in the basement', needsConfirmation: false });
  });

  it('refuses what is not a position, a time or a sensible reason; unknown fields are refused', async () => {
    const p = who().repeat;
    const bad = (body: object) => call(p, 'post', '/attendance/staff/check-in').send(body).expect(400);
    await bad({ position: { lat: 'north', lng: 1 } });
    await bad({ position: { lat: 95, lng: 1 } });
    await bad({ position: { lat: 1, lng: 190 } });
    await bad({ position: north(10), deviceTime: 'noon' });
    await bad({ position: north(10), reason: 'x'.repeat(301) });
    await bad({ position: north(10), hacker: true });
    await bad({ position: { ...north(10), extra: 1 } });
  });

  it('keeps no position: the audit rows and the day carry the stamp and the distance, never the coordinates', async () => {
    const rows = [...(await audit('attendance.staff.checkin')), ...(await audit('attendance.staff.checkout'))];
    expect(rows.length).toBeGreaterThan(0);
    const text = JSON.stringify(rows.map((r) => r.details));
    expect(text).not.toMatch(/12\.97|77\.59|\blat\b|\blng\b/);
    expect(text).toContain('OUTSIDE');
  });

  it('switching the geofence off asks nobody again', async () => {
    await call(sysadmin(), 'delete', '/school/geofence').expect(200);
    expect((await call(who().plain, 'get', '/attendance/staff/geofence').expect(200)).body).toMatchObject({ configured: false });
    expect((await audit('school.geofence.clear')).length).toBeGreaterThan(0);
  });
});
