import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, Min, ValidateIf, ValidateNested } from 'class-validator';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export const DIRECTIONS = ['MORNING', 'AFTERNOON'] as const;
export const VEHICLE_STATUSES = ['ACTIVE', 'OUT_OF_SERVICE'] as const;

export class IdParamDto {
  @IsString() @Matches(UUID) id!: string;
}

export class CreateVehicleDto {
  /** The number plate, as the school writes it. Unique in the school. */
  @Transform(trim) @IsString() @Length(2, 20) registration!: string;
  /** What staff call it ("Bus 3"). */
  @Transform(trim) @IsString() @Length(1, 60) label!: string;
  @IsInt() @Min(1) @Max(200) capacity!: number;
}

export class UpdateVehicleDto {
  @IsOptional() @Transform(trim) @IsString() @Length(2, 20) registration?: string;
  @IsOptional() @Transform(trim) @IsString() @Length(1, 60) label?: string;
  @IsOptional() @IsInt() @Min(1) @Max(200) capacity?: number;
  @IsOptional() @IsIn([...VEHICLE_STATUSES]) status?: string;
}

export class CreateRouteDto {
  @Transform(trim) @IsString() @Length(1, 80) name!: string;
  @IsIn([...DIRECTIONS]) direction!: string;
  /** When the run starts, `HH:MM`. */
  @IsOptional() @IsString() @Matches(HHMM) startTime?: string;
  @IsOptional() @IsString() @Matches(UUID) vehicleId?: string;
  /** A member of staff who holds the DRIVER role in this school. */
  @IsOptional() @IsString() @Matches(UUID) driverId?: string;
}

export class UpdateRouteDto {
  @IsOptional() @Transform(trim) @IsString() @Length(1, 80) name?: string;
  @IsOptional() @IsIn([...DIRECTIONS]) direction?: string;
  @IsOptional() @IsString() @Matches(HHMM) startTime?: string;
  /** `null` takes the vehicle off the route. */
  @IsOptional() @ValidateIf((_o, v) => v !== null) @IsString() @Matches(UUID) vehicleId?: string | null;
  @IsOptional() @ValidateIf((_o, v) => v !== null) @IsString() @Matches(UUID) driverId?: string | null;
}

export class StopDto {
  @Transform(trim) @IsString() @Length(1, 80) name!: string;
  /** Degrees; kept to six decimals (micro-degrees), never a float in the database. */
  @IsOptional() @Min(-90) @Max(90) lat?: number;
  @IsOptional() @Min(-180) @Max(180) lng?: number;
  @IsOptional() @IsString() @Matches(HHMM) arrivalTime?: string;
}

/** The whole ordered list of stops: the order of the array is the order the bus calls. */
export class SetStopsDto {
  @IsArray() @ArrayMaxSize(60) @ValidateNested({ each: true }) @Type(() => StopDto) stops!: StopDto[];
}

export class VehicleDto {
  id!: string;
  registration!: string;
  label!: string;
  capacity!: number;
  status!: string;
}

export class StopViewDto {
  id!: string;
  sequence!: number;
  name!: string;
  lat!: number | null;
  lng!: number | null;
  arrivalTime!: string | null;
}

export class RouteDto {
  id!: string;
  name!: string;
  direction!: string;
  startTime!: string | null;
  vehicle!: VehicleDto | null;
  driver!: { id: string; employeeId: string; name: string } | null;
  stops!: StopViewDto[];
}

export class DirectionParamDto {
  @IsIn([...DIRECTIONS]) direction!: string;
}

export class StudentParamDto {
  @IsString() @Matches(UUID) studentId!: string;
}

export class StudentDirectionParamDto extends StudentParamDto {
  @IsIn([...DIRECTIONS]) direction!: string;
}

/** Seats a student on a route at a stop. The route's direction is the seat's direction. */
export class AssignStudentDto {
  @IsString() @Matches(UUID) routeId!: string;
  @IsString() @Matches(UUID) stopId!: string;
}

/** The stops of a route have been replaced; `droppedSeats` students whose stop is no longer on the list lost their seat (a stop of the same name keeps its students). */
export class RouteWithSeatsDto extends RouteDto {
  droppedSeats!: number;
}

export class ManifestStudentDto {
  id!: string;
  name!: string;
  enrollmentId!: string;
  className!: string | null;
}

export class ManifestStopDto {
  id!: string;
  sequence!: number;
  name!: string;
  arrivalTime!: string | null;
  students!: ManifestStudentDto[];
}

export class ManifestDto {
  route!: RouteDto;
  /** The vehicle's seats, or null when the route has no vehicle. */
  capacity!: number | null;
  assigned!: number;
  stops!: ManifestStopDto[];
}

export class SeatDto {
  direction!: string;
  route!: { id: string; name: string; startTime: string | null };
  stop!: { id: string; name: string; sequence: number; arrivalTime: string | null };
  vehicle!: { registration: string; label: string } | null;
  /** The driver's name only: no phone number or address is ever sent to a parent. */
  driverName!: string | null;
}

export class StudentSeatsDto {
  studentId!: string;
  items!: SeatDto[];
}

export class ChildrenSeatsDto {
  items!: StudentSeatsDto[];
}

export class VehicleListDto {
  items!: VehicleDto[];
}

export class RouteListDto {
  items!: RouteDto[];
}
