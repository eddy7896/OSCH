import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Audit, NoAudit } from '../audit/audit.decorators.js';
import { Granted, Permission, type GrantedPermission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import { PingsDto, StartTripDto, TripParamDto, type PingResultDto, type TripDto, type TripListDto } from './dto/trips.dto.js';
import { TripsService } from './trips.service.js';

/**
 * Trips and vehicle positions (P5-5a, ADR-0015). The driver (own scope) starts, reports positions of and ends the trips of the routes they drive; the Principal and the Transport manager (school
 * scope) see every trip in progress; a parent (linked scope) sees a trip in progress only on a route their own child rides.
 */
@Controller('trips')
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Permission('trips', 'read')
  @Get('active')
  active(@Tenant() t: TenantContext, @Granted() g: GrantedPermission): Promise<TripListDto> {
    return this.trips.active(t, g.scope);
  }

  @Permission('trips', 'read')
  @Get(':id')
  one(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: TripParamDto): Promise<TripDto> {
    return this.trips.one(t, g.scope, p.id);
  }

  @Permission('trips', 'create')
  @Audit({ action: 'trip.start', operation: 'StartTrip' })
  @Post()
  start(@Tenant() t: TenantContext, @Body() dto: StartTripDto): Promise<TripDto> {
    return this.trips.start(t, dto);
  }

  /** A batch of positions; the phone sends one about every 30 seconds, or several after being offline. Limited per driver by the per-user limit (240 a minute), which leaves room for a phone catching up after being offline. */
  @Permission('trips', 'update')
  @NoAudit('vehicle positions of a trip that is already audited (trip.start and trip.end); about one every 30 seconds, and the position of a bus is not personal data of a person acting')
  @HttpCode(200)
  @Post(':id/pings')
  pings(@Tenant() t: TenantContext, @Param() p: TripParamDto, @Body() dto: PingsDto): Promise<PingResultDto> {
    return this.trips.record(t, p.id, dto);
  }

  @Permission('trips', 'update')
  @Audit({ action: 'trip.end', operation: 'EndTrip' })
  @HttpCode(200)
  @Post(':id/end')
  end(@Tenant() t: TenantContext, @Param() p: TripParamDto): Promise<TripDto> {
    return this.trips.end(t, p.id);
  }
}
