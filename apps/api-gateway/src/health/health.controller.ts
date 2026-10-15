import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';

/** Liveness only for now; the database indicator joins when the DatabaseModule exists (P1-2b). Unauthenticated by design. */
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private readonly health: HealthCheckService) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([]);
  }
}
