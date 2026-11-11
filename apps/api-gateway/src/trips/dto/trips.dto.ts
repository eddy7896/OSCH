import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsISO8601, IsNumber, IsOptional, IsString, Matches, Max, Min, ValidateNested } from 'class-validator';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class TripParamDto {
  @IsString() @Matches(UUID) id!: string;
}

export class StartTripDto {
  /** Chosen by the phone, so asking twice (a lost reply) is still one trip. */
  @IsString() @Matches(UUID) id!: string;
  @IsString() @Matches(UUID) routeId!: string;
}

export class PingDto {
  @IsNumber({ maxDecimalPlaces: 7 }) @Min(-90) @Max(90) lat!: number;
  @IsNumber({ maxDecimalPlaces: 7 }) @Min(-180) @Max(180) lng!: number;
  @IsOptional() @IsInt() @Min(0) @Max(200) speedKmh?: number;
  /** The phone's clock. A position from the future, or from more than a day ago, is not stored. */
  @IsISO8601() recordedAt!: string;
}

export class PingsDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => PingDto) pings!: PingDto[];
}

export class TripPositionDto {
  lat!: number;
  lng!: number;
  speedKmh!: number | null;
  recordedAt!: string;
}

export class TripStopDto {
  id!: string;
  sequence!: number;
  name!: string;
  lat!: number | null;
  lng!: number | null;
  plannedTime!: string | null;
  /** The bus has been within 100 metres of this stop (or of a later one). */
  reached!: boolean;
  /** Minutes until the bus gets here, worked out on the server from the last position; null once reached or when the stop has no map position. */
  etaMinutes!: number | null;
}

export class TripChildDto {
  id!: string;
  name!: string;
  stopId!: string;
}

export class TripDto {
  id!: string;
  state!: 'IN_PROGRESS' | 'ENDED';
  route!: { id: string; name: string; direction: 'MORNING' | 'AFTERNOON' };
  vehicle!: string | null;
  driver!: string;
  startedAt!: string;
  endedAt!: string | null;
  /** The newest position; null before the first one arrives. */
  last!: TripPositionDto | null;
  /** True when the newest position is more than 3 minutes old: the phone may be offline. */
  stale!: boolean;
  stops!: TripStopDto[];
  /** A parent's own children who ride this route (empty for everyone else). */
  children!: TripChildDto[];
}

export class TripListDto {
  items!: TripDto[];
}

export class PingResultDto {
  accepted!: number;
  /** Positions not stored: from the future, from more than a day ago, or already stored. */
  ignored!: number;
}
