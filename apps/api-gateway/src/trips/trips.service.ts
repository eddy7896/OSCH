import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import { TeachingScope } from '../teaching/teaching-scope.service.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import { etas, reachedIndex, type Fix, type StopPoint } from './eta.js';
import type { PingResultDto, PingsDto, StartTripDto, TripChildDto, TripDto, TripListDto } from './dto/trips.dto.js';

type Scope = 'school' | 'own' | 'linked';
interface Stop { id: string; sequence: number; name: string; latMicro?: number | null; lngMicro?: number | null; arrivalTime?: string | null }
interface TripRow {
  id: string; startedAt: string; endedAt?: string | null; status: 'IN_PROGRESS' | 'ENDED';
  driver: { id: string; displayName?: string | null; email: string };
  route: { id: string; name: string; direction: 'MORNING' | 'AFTERNOON'; vehicle?: { registration: string; label: string } | null; driver?: { userId?: string | null } | null; routeStops_on_route: Stop[] };
}

const RETENTION_MS = 7 * 24 * 3600_000;
const FUTURE_MS = 2 * 60_000;
const PAST_MS = 24 * 3600_000;
const STALE_MS = 3 * 60_000;
const CHUNK = 10;
const notFound = () => new ApiException(ErrorCode.NOT_FOUND, 404);
const kindOf = (e: unknown) => (e as { kind?: string }).kind;
const micro = (deg: number) => Math.round(deg * 1_000_000);

/** The same trip and the same moment always give the same row id, so a batch sent twice stores each position once. */
export function pingId(tripId: string, recordedAtMs: number): string {
  const h = createHash('sha256').update(`${tripId}:${recordedAtMs}`).digest();
  h[6] = (h[6]! & 0x0f) | 0x50;
  h[8] = (h[8]! & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

/**
 * Trips and vehicle positions (P5-5a, ADR-0015 decisions 4 and 5). The driver of a route starts a trip, the phone sends the vehicle's position about every 30 seconds (in batches after being
 * offline), and the driver ends it. Parents see only a trip in progress on a route their own child rides; the school sees every trip in progress; a driver the trips of their own routes. Positions
 * are kept 7 days. Only the vehicle is located, never a child.
 */
@Injectable()
export class TripsService {
  constructor(@Inject(DATABASE) private readonly db: Database, private readonly scope: TeachingScope) {}

  private async row(t: TenantContext, id: string): Promise<TripRow | null> {
    return ((await this.db.getTrip({ schoolId: t.schoolId, id: dashed(id) })).data.trips[0] as unknown as TripRow | undefined) ?? null;
  }

  /** For a parent: the route of each seat of each child, so only the buses of their own children can be seen. */
  private async seatsOfMyChildren(t: TenantContext): Promise<Array<{ routeId: string; child: TripChildDto }>> {
    const kids = (await this.scope.mine(t)).children;
    if (kids.length === 0) return [];
    const rows = (await this.db.studentRoutesOfStudents({ schoolId: t.schoolId, studentIds: kids.map((k) => dashed(k.id)) })).data.studentRoutes as unknown as Array<{ studentId: string; route: { id: string }; stop: { id: string } }>;
    const name = new Map(kids.map((k) => [dashed(k.id), k.name]));
    return rows.map((r) => ({ routeId: dashed(r.route.id), child: { id: dashed(r.studentId), name: name.get(dashed(r.studentId)) ?? '', stopId: dashed(r.stop.id) } }));
  }

  private async view(t: TenantContext, r: TripRow, children: TripChildDto[]): Promise<TripDto> {
    const pings = (await this.db.pingsOfTrip({ schoolId: t.schoolId, tripId: dashed(r.id) })).data.locationPings as unknown as Array<{ latMicro: number; lngMicro: number; speedKmh?: number | null; recordedAt: string }>;
    const fixes: Fix[] = pings.map((p) => ({ lat: p.latMicro / 1e6, lng: p.lngMicro / 1e6, speedKmh: p.speedKmh ?? null, at: Date.parse(p.recordedAt) }));
    const stops: StopPoint[] = r.route.routeStops_on_route.map((s) => ({ id: dashed(s.id), sequence: s.sequence, lat: s.latMicro == null ? null : s.latMicro / 1e6, lng: s.lngMicro == null ? null : s.lngMicro / 1e6 }));
    const running = r.status === 'IN_PROGRESS';
    const reached = running ? reachedIndex(stops, fixes) : stops.length - 1;
    const eta = running ? etas(stops, fixes) : stops.map(() => null);
    const newest = pings[0];
    return {
      id: dashed(r.id), state: r.status, route: { id: dashed(r.route.id), name: r.route.name, direction: r.route.direction },
      vehicle: r.route.vehicle ? `${r.route.vehicle.label} (${r.route.vehicle.registration})` : null, driver: r.driver.displayName ?? r.driver.email, startedAt: r.startedAt, endedAt: r.endedAt ?? null,
      last: newest ? { lat: newest.latMicro / 1e6, lng: newest.lngMicro / 1e6, speedKmh: newest.speedKmh ?? null, recordedAt: newest.recordedAt } : null,
      stale: running ? !newest || Date.now() - Date.parse(newest.recordedAt) > STALE_MS : false,
      stops: r.route.routeStops_on_route.map((s, i) => ({ id: dashed(s.id), sequence: s.sequence, name: s.name, lat: stops[i]!.lat, lng: stops[i]!.lng, plannedTime: s.arrivalTime ?? null, reached: i <= reached, etaMinutes: eta[i] ?? null })),
      children,
    };
  }

  /** Whether this caller may see this trip, and which of their own children ride it. */
  private async visible(t: TenantContext, scope: Scope, rows: TripRow[]): Promise<Array<{ row: TripRow; children: TripChildDto[] }>> {
    if (scope === 'school') return rows.map((row) => ({ row, children: [] }));
    if (scope === 'own') return rows.filter((r) => r.route.driver?.userId === t.userId).map((row) => ({ row, children: [] }));
    const seats = await this.seatsOfMyChildren(t);
    return rows.flatMap((row) => {
      const mine = seats.filter((s) => s.routeId === dashed(row.route.id)).map((s) => s.child);
      return mine.length > 0 ? [{ row, children: mine }] : [];
    });
  }

  /** The trips in progress that the caller may see, each with its newest position and the arrival estimates. */
  async active(t: TenantContext, scope: Scope): Promise<TripListDto> {
    const rows = (await this.db.tripsInProgress({ schoolId: t.schoolId })).data.trips as unknown as TripRow[];
    const shown = await this.visible(t, scope, rows);
    return { items: await Promise.all(shown.map((s) => this.view(t, s.row, s.children))) };
  }

  /** One trip, in progress or ended. A parent sees it only while it runs and only for a route their child rides. */
  async one(t: TenantContext, scope: Scope, id: string): Promise<TripDto> {
    const r = await this.row(t, id);
    if (!r) throw notFound();
    if (scope === 'linked' && r.status !== 'IN_PROGRESS') throw notFound();
    const shown = (await this.visible(t, scope, [r]))[0];
    if (!shown) throw notFound();
    return this.view(t, shown.row, shown.children);
  }

  /** The driver of the route starts a trip. Asking again with the same id returns the same trip. A route with a trip already in progress is refused. */
  async start(t: TenantContext, dto: StartTripDto): Promise<TripDto> {
    const again = await this.row(t, dto.id);
    if (again) {
      if (again.driver.id !== t.userId) throw notFound();
      return this.view(t, again, []);
    }
    const route = (await this.db.getTransportRoute({ schoolId: t.schoolId, id: dashed(dto.routeId) })).data.transportRoutes[0] as unknown as { driver?: { userId?: string | null } | null } | undefined;
    if (!route || route.driver?.userId !== t.userId) throw notFound();
    const running = (await this.db.tripsInProgress({ schoolId: t.schoolId })).data.trips as unknown as TripRow[];
    if (running.some((r) => dashed(r.route.id) === dashed(dto.routeId))) throw new ApiException(ErrorCode.CONFLICT, 409, [{ field: 'routeId', rule: 'this route already has a trip in progress' }]);
    try {
      await this.db.startTrip({ schoolId: t.schoolId, id: dashed(dto.id), routeId: dashed(dto.routeId), actorId: t.userId, details: { routeId: dashed(dto.routeId) } });
    } catch (e) {
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw notFound();
      throw e;
    }
    void this.db.purgeOldPings({ schoolId: t.schoolId, before: new Date(Date.now() - RETENTION_MS).toISOString() }).catch(() => undefined); // housekeeping, best effort
    return this.view(t, (await this.row(t, dto.id))!, []);
  }

  /** Stores the positions of the driver's own trip while it runs. Positions from the future or from more than a day ago are not stored; a position already stored is not stored twice. */
  async record(t: TenantContext, id: string, dto: PingsDto): Promise<PingResultDto> {
    const now = Date.now();
    const seen = new Set<number>();
    const fresh = dto.pings
      .map((p) => ({ p, at: Date.parse(p.recordedAt) }))
      .filter(({ at }) => Number.isFinite(at) && at <= now + FUTURE_MS && at >= now - PAST_MS)
      .filter(({ at }) => (seen.has(at) ? false : (seen.add(at), true)));
    let accepted = 0;
    for (let i = 0; i < fresh.length; i += CHUNK) {
      const results = await Promise.all(
        fresh.slice(i, i + CHUNK).map(async ({ p, at }) => {
          try {
            await this.db.recordPing({ schoolId: t.schoolId, tripId: dashed(id), id: pingId(dashed(id), at), actorId: t.userId, latMicro: micro(p.lat), lngMicro: micro(p.lng), speedKmh: p.speedKmh ?? null, recordedAt: new Date(at).toISOString() });
            return 'stored' as const;
          } catch (e) {
            if (kindOf(e) === 'CONFLICT') return 'duplicate' as const;
            if (kindOf(e) === 'FORBIDDEN_REFERENCE') return 'refused' as const;
            throw e;
          }
        }),
      );
      if (results.includes('refused')) throw notFound(); // not this driver's trip, or it is no longer in progress
      accepted += results.filter((r) => r === 'stored').length;
    }
    return { accepted, ignored: dto.pings.length - accepted };
  }

  async end(t: TenantContext, id: string): Promise<TripDto> {
    const r = await this.row(t, id);
    if (!r || r.driver.id !== t.userId) throw notFound();
    if (r.status === 'IN_PROGRESS') {
      try {
        await this.db.endTrip({ schoolId: t.schoolId, id: dashed(id), actorId: t.userId, details: { routeId: dashed(r.route.id) } });
      } catch (e) {
        if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw notFound();
        throw e;
      }
    }
    return this.view(t, (await this.row(t, id))!, []); // ending twice is the same answer
  }
}
