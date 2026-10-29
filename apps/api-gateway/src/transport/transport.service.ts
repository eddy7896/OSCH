import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { randomUUID } from 'node:crypto';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import type { CreateRouteDto, CreateVehicleDto, RouteDto, RouteListDto, SetStopsDto, UpdateRouteDto, UpdateVehicleDto, VehicleDto, VehicleListDto } from './dto/transport.dto.js';

interface VehicleRow { id: string; registration: string; label: string; capacity: number; status: string }
interface StopRow { id: string; sequence: number; name: string; latMicro?: number | null; lngMicro?: number | null; arrivalTime?: string | null }
interface RouteRow {
  id: string; name: string; direction: string; startTime?: string | null;
  vehicle?: VehicleRow | null;
  driver?: { id: string; employeeId: string; firstName: string; lastName: string; userId?: string | null } | null;
  routeStops_on_route: StopRow[];
}

const notFound = () => new ApiException(ErrorCode.NOT_FOUND, 404);
const invalid = (field: string, rule: string) => new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field, rule }]);
const conflict = (field: string, rule: string) => new ApiException(ErrorCode.CONFLICT, 409, [{ field, rule }]);
const kindOf = (e: unknown) => (e as { kind?: string }).kind;
const micro = (deg: number): number => Math.round(deg * 1e6);
/** The fields a PATCH body really carries (a DTO instance has every declared field as an own key, mostly undefined). */
const given = (dto: object): string[] => Object.entries(dto).filter(([, v]) => v !== undefined).map(([k]) => k);

/** Vehicles, routes and a route's ordered stops (P5-4a). Student assignment and manifests are P5-4b. */
@Injectable()
export class TransportService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  private vehicle(r: VehicleRow): VehicleDto {
    return { id: dashed(r.id), registration: r.registration, label: r.label, capacity: r.capacity, status: r.status };
  }

  private route(r: RouteRow): RouteDto {
    return {
      id: dashed(r.id), name: r.name, direction: r.direction, startTime: r.startTime ?? null,
      vehicle: r.vehicle ? this.vehicle(r.vehicle) : null,
      driver: r.driver ? { id: dashed(r.driver.id), employeeId: r.driver.employeeId, name: `${r.driver.firstName} ${r.driver.lastName}` } : null,
      stops: r.routeStops_on_route.map((s) => ({ id: dashed(s.id), sequence: s.sequence, name: s.name, lat: s.latMicro == null ? null : s.latMicro / 1e6, lng: s.lngMicro == null ? null : s.lngMicro / 1e6, arrivalTime: s.arrivalTime ?? null })),
    };
  }

  // ---- vehicles
  async vehicles(t: TenantContext): Promise<VehicleListDto> {
    return { items: ((await this.db.listVehicles({ schoolId: t.schoolId })).data.vehicles as unknown as VehicleRow[]).map((v) => this.vehicle(v)) };
  }

  async createVehicle(t: TenantContext, dto: CreateVehicleDto): Promise<VehicleDto> {
    const id = randomUUID();
    try {
      await this.db.createVehicle({ schoolId: t.schoolId, id, registration: dto.registration, label: dto.label, capacity: dto.capacity, actorId: t.userId, details: { registration: dto.registration } });
    } catch (e) {
      if (kindOf(e) === 'CONFLICT') throw conflict('registration', 'registrationInUse');
      throw e;
    }
    return this.oneVehicle(t, id);
  }

  private async oneVehicle(t: TenantContext, id: string): Promise<VehicleDto> {
    const v = (await this.vehicles(t)).items.find((x) => x.id === dashed(id));
    if (!v) throw notFound();
    return v;
  }

  async updateVehicle(t: TenantContext, id: string, dto: UpdateVehicleDto): Promise<VehicleDto> {
    await this.oneVehicle(t, id);
    if (given(dto).length === 0) throw invalid('body', 'nothingToChange');
    try {
      await this.db.updateVehicle({ schoolId: t.schoolId, id: dashed(id), ...dto, status: dto.status as never, actorId: t.userId, details: { fields: given(dto) } });
    } catch (e) {
      if (kindOf(e) === 'CONFLICT') throw conflict('registration', 'registrationInUse');
      throw e;
    }
    return this.oneVehicle(t, id);
  }

  async deleteVehicle(t: TenantContext, id: string): Promise<void> {
    await this.oneVehicle(t, id);
    try {
      await this.db.deleteVehicle({ schoolId: t.schoolId, id: dashed(id), actorId: t.userId, details: {} });
    } catch (e) {
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw conflict('vehicle', 'vehicleInUse'); // a route still uses it
      throw e;
    }
  }

  // ---- routes
  /** `school` sees every route; `own` (a driver) the routes they drive; `linked` (a parent) none until students are assigned to routes (P5-4b). */
  async routes(t: TenantContext, scope: 'school' | 'own' | 'linked' = 'school'): Promise<RouteListDto> {
    const rows = (await this.db.listTransportRoutes({ schoolId: t.schoolId })).data.transportRoutes as unknown as RouteRow[];
    const mine = scope === 'school' ? rows : scope === 'own' ? rows.filter((r) => r.driver?.userId === t.userId) : [];
    return { items: mine.map((r) => this.route(r)) };
  }

  async readRoute(t: TenantContext, scope: 'school' | 'own' | 'linked', id: string): Promise<RouteDto> {
    const r = (await this.routes(t, scope)).items.find((x) => x.id === dashed(id));
    if (!r) throw notFound();
    return r;
  }

  async oneRoute(t: TenantContext, id: string): Promise<RouteDto> {
    const r = (await this.db.getTransportRoute({ schoolId: t.schoolId, id: dashed(id) })).data.transportRoutes[0] as unknown as RouteRow | undefined;
    if (!r) throw notFound();
    return this.route(r);
  }

  /** A driver is a member of staff with an account that holds the DRIVER role here and is active (ADR-0011). */
  private async assertDriver(t: TenantContext, staffId: string): Promise<void> {
    const staff = (await this.db.getStaffProfile({ schoolId: t.schoolId, id: dashed(staffId) })).data.staffProfiles[0] as unknown as { userId?: string | null; status: string } | undefined;
    if (!staff) throw invalid('driverId', 'notFound');
    if (!staff.userId) throw invalid('driverId', 'noAccount');
    const m = (await this.db.getMembership({ schoolId: t.schoolId, userId: staff.userId })).data.schoolMembers[0] as unknown as { schoolRole: string; status: string } | undefined;
    if (!m || m.schoolRole !== 'DRIVER' || m.status !== 'ACTIVE') throw invalid('driverId', 'notADriver');
  }

  private async setVehicle(t: TenantContext, id: string, vehicleId: string | null): Promise<void> {
    try {
      if (vehicleId === null) await this.db.clearRouteVehicle({ schoolId: t.schoolId, id: dashed(id), actorId: t.userId, details: {} });
      else await this.db.setRouteVehicle({ schoolId: t.schoolId, id: dashed(id), vehicleId: dashed(vehicleId), actorId: t.userId, details: { vehicleId } });
    } catch (e) {
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw invalid('vehicleId', 'notFound');
      throw e;
    }
  }

  private async setDriver(t: TenantContext, id: string, driverId: string | null): Promise<void> {
    if (driverId !== null) await this.assertDriver(t, driverId);
    try {
      if (driverId === null) await this.db.clearRouteDriver({ schoolId: t.schoolId, id: dashed(id), actorId: t.userId, details: {} });
      else await this.db.setRouteDriver({ schoolId: t.schoolId, id: dashed(id), driverId: dashed(driverId), actorId: t.userId, details: { driverId } });
    } catch (e) {
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw invalid('driverId', 'notFound');
      throw e;
    }
  }

  async createRoute(t: TenantContext, dto: CreateRouteDto): Promise<RouteDto> {
    // Checked before anything is written, so a bad vehicle or driver leaves no half-made route behind.
    if (dto.vehicleId && !(await this.vehicles(t)).items.some((v) => v.id === dto.vehicleId!.toLowerCase())) throw invalid('vehicleId', 'notFound');
    if (dto.driverId) await this.assertDriver(t, dto.driverId);
    const id = randomUUID();
    try {
      await this.db.createTransportRoute({ schoolId: t.schoolId, id, name: dto.name, direction: dto.direction as never, ...(dto.startTime ? { startTime: dto.startTime } : {}), actorId: t.userId, details: { name: dto.name, direction: dto.direction } });
    } catch (e) {
      if (kindOf(e) === 'CONFLICT') throw conflict('name', 'routeNameInUse');
      throw e;
    }
    if (dto.vehicleId) await this.setVehicle(t, id, dto.vehicleId);
    if (dto.driverId) await this.setDriver(t, id, dto.driverId);
    return this.oneRoute(t, id);
  }

  async updateRoute(t: TenantContext, id: string, dto: UpdateRouteDto): Promise<RouteDto> {
    await this.oneRoute(t, id);
    if (given(dto).length === 0) throw invalid('body', 'nothingToChange');
    if (dto.vehicleId) await this.assertVehicle(t, dto.vehicleId);
    if (dto.driverId) await this.assertDriver(t, dto.driverId);
    if (dto.name !== undefined || dto.direction !== undefined || dto.startTime !== undefined) {
      try {
        await this.db.updateTransportRoute({ schoolId: t.schoolId, id: dashed(id), ...(dto.name !== undefined ? { name: dto.name } : {}), ...(dto.direction !== undefined ? { direction: dto.direction as never } : {}), ...(dto.startTime !== undefined ? { startTime: dto.startTime } : {}), actorId: t.userId, details: { fields: given(dto) } });
      } catch (e) {
        if (kindOf(e) === 'CONFLICT') throw conflict('name', 'routeNameInUse');
        throw e;
      }
    }
    if (dto.vehicleId !== undefined) await this.setVehicle(t, id, dto.vehicleId);
    if (dto.driverId !== undefined) await this.setDriver(t, id, dto.driverId);
    return this.oneRoute(t, id);
  }

  private async assertVehicle(t: TenantContext, vehicleId: string): Promise<void> {
    if (!(await this.vehicles(t)).items.some((v) => v.id === vehicleId.toLowerCase())) throw invalid('vehicleId', 'notFound');
  }

  async deleteRoute(t: TenantContext, id: string): Promise<void> {
    await this.oneRoute(t, id);
    await this.db.deleteTransportRoute({ schoolId: t.schoolId, id: dashed(id), actorId: t.userId, details: {} });
  }

  /**
   * Replaces the stops with the given list, in order. The list is checked whole first (no empty name, no repeated name, a sensible position); the old stops are
   * then cleared and the new ones added one at a time (like marks), so a failure part way leaves a shorter list that the same call puts right.
   */
  async setStops(t: TenantContext, id: string, dto: SetStopsDto): Promise<RouteDto> {
    await this.oneRoute(t, id);
    const names = new Set<string>();
    for (const [i, s] of dto.stops.entries()) {
      const key = s.name.toLocaleLowerCase();
      if (names.has(key)) throw invalid(`stops.${i}.name`, 'duplicateStop');
      names.add(key);
      if ((s.lat === undefined) !== (s.lng === undefined)) throw invalid(`stops.${i}.lat`, 'latAndLngTogether');
    }
    await this.db.clearRouteStops({ schoolId: t.schoolId, routeId: dashed(id), actorId: t.userId, details: { count: dto.stops.length } });
    for (const [i, s] of dto.stops.entries()) {
      await this.db.addRouteStop({
        schoolId: t.schoolId, id: randomUUID(), routeId: dashed(id), sequence: i + 1, name: s.name,
        ...(s.lat !== undefined && s.lng !== undefined ? { latMicro: micro(s.lat), lngMicro: micro(s.lng) } : {}),
        ...(s.arrivalTime ? { arrivalTime: s.arrivalTime } : {}), actorId: t.userId,
      });
    }
    return this.oneRoute(t, id);
  }
}
