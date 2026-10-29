import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { Audit } from '../audit/audit.decorators.js';
import { Granted, Permission, type GrantedPermission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import { AssignStudentDto, type ChildrenSeatsDto, CreateRouteDto, CreateVehicleDto, IdParamDto, type ManifestDto, type RouteDto, type RouteListDto, type RouteWithSeatsDto, SetStopsDto, StudentDirectionParamDto, StudentParamDto, type StudentSeatsDto, UpdateRouteDto, UpdateVehicleDto, type VehicleDto, type VehicleListDto } from './dto/transport.dto.js';
import { TransportService } from './transport.service.js';

/**
 * Transport in the ERP (P5-4a, ADR-0015): vehicles, routes and their stops. School routes: `X-School-Id` + the `transport` grant (the Transport manager writes, the Principal
 * reads). A driver (own scope) reads only the routes they drive; a parent (linked scope) gets nothing until P5-4b assigns students to routes.
 */
@Controller('transport')
export class TransportController {
  constructor(private readonly transport: TransportService) {}

  @Permission('transport', 'read')
  @Get('vehicles')
  vehicles(@Tenant() t: TenantContext, @Granted() g: GrantedPermission): Promise<VehicleListDto> {
    return g.scope === 'school' ? this.transport.vehicles(t) : Promise.resolve({ items: [] }); // a driver or parent reaches a vehicle through their route
  }

  @Permission('transport', 'create')
  @Audit({ action: 'transport.vehicle.create', operation: 'CreateVehicle' })
  @Post('vehicles')
  createVehicle(@Tenant() t: TenantContext, @Body() dto: CreateVehicleDto): Promise<VehicleDto> {
    return this.transport.createVehicle(t, dto);
  }

  @Permission('transport', 'update')
  @Audit({ action: 'transport.vehicle.update', operation: 'UpdateVehicle' })
  @Patch('vehicles/:id')
  updateVehicle(@Tenant() t: TenantContext, @Param() p: IdParamDto, @Body() dto: UpdateVehicleDto): Promise<VehicleDto> {
    return this.transport.updateVehicle(t, p.id, dto);
  }

  @Permission('transport', 'delete')
  @Audit({ action: 'transport.vehicle.delete', operation: 'DeleteVehicle' })
  @HttpCode(204)
  @Delete('vehicles/:id')
  async deleteVehicle(@Tenant() t: TenantContext, @Param() p: IdParamDto): Promise<void> {
    await this.transport.deleteVehicle(t, p.id);
  }

  @Permission('transport', 'read')
  @Get('routes')
  routes(@Tenant() t: TenantContext, @Granted() g: GrantedPermission): Promise<RouteListDto> {
    return this.transport.routes(t, g.scope);
  }

  @Permission('transport', 'read')
  @Get('routes/:id')
  route(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto): Promise<RouteDto> {
    return this.transport.readRoute(t, g.scope, p.id);
  }

  @Permission('transport', 'create')
  @Audit({ action: 'transport.route.create', operation: 'CreateTransportRoute' })
  @Post('routes')
  createRoute(@Tenant() t: TenantContext, @Body() dto: CreateRouteDto): Promise<RouteDto> {
    return this.transport.createRoute(t, dto);
  }

  @Permission('transport', 'update')
  @Audit({ action: 'transport.route.update', operation: 'UpdateTransportRoute' })
  @Patch('routes/:id')
  updateRoute(@Tenant() t: TenantContext, @Param() p: IdParamDto, @Body() dto: UpdateRouteDto): Promise<RouteDto> {
    return this.transport.updateRoute(t, p.id, dto);
  }

  @Permission('transport', 'delete')
  @Audit({ action: 'transport.route.delete', operation: 'DeleteTransportRoute' })
  @HttpCode(204)
  @Delete('routes/:id')
  async deleteRoute(@Tenant() t: TenantContext, @Param() p: IdParamDto): Promise<void> {
    await this.transport.deleteRoute(t, p.id);
  }

  /** The whole ordered list of stops replaces the old one. */
  @Permission('transport', 'update')
  @Audit({ action: 'transport.route.stops', operation: 'ClearRouteStops' })
  @HttpCode(200)
  @Put('routes/:id/stops')
  setStops(@Tenant() t: TenantContext, @Param() p: IdParamDto, @Body() dto: SetStopsDto): Promise<RouteWithSeatsDto> {
    return this.transport.setStops(t, p.id, dto);
  }

  /** Who rides a route, stop by stop. The school reads any; a driver the routes they drive. */
  @Permission('transport', 'read')
  @Get('routes/:id/manifest')
  manifest(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto): Promise<ManifestDto> {
    return this.transport.manifest(t, g.scope, p.id);
  }

  /** The caller's own children and where each rides (the Parent app's home). */
  @Permission('transport', 'read')
  @Get('children')
  children(@Tenant() t: TenantContext, @Granted() g: GrantedPermission): Promise<ChildrenSeatsDto> {
    return this.transport.childrenSeats(t, g.scope);
  }

  /** A student's seats: the school any student, a parent only a linked child. */
  @Permission('transport', 'read')
  @Get('students/:studentId')
  student(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StudentParamDto): Promise<StudentSeatsDto> {
    return this.transport.studentSeats(t, g.scope, p.studentId);
  }

  /** Seats a student on a stop of a route (in the route's direction), replacing their earlier seat in that direction. School scope only: a driver's `update` is for boarding, not for seating. */
  @Permission('transport', 'update')
  @Audit({ action: 'transport.student.assign', operation: 'SetStudentRoute' })
  @HttpCode(200)
  @Put('students/:studentId/seat')
  assign(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StudentParamDto, @Body() dto: AssignStudentDto): Promise<StudentSeatsDto> {
    if (g.scope !== 'school') throw new ForbiddenException();
    return this.transport.assign(t, p.studentId, dto);
  }

  @Permission('transport', 'update')
  @Audit({ action: 'transport.student.unassign', operation: 'RemoveStudentRoute' })
  @HttpCode(204)
  @Delete('students/:studentId/seat/:direction')
  async unassign(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StudentDirectionParamDto): Promise<void> {
    if (g.scope !== 'school') throw new ForbiddenException();
    await this.transport.unassign(t, p.studentId, p.direction);
  }
}
