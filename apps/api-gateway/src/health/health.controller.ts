import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator.js';
import { DatabaseHealthIndicator } from './database.health.js';

/** Unauthenticated by design and outside /v1 (load balancers call it). `/health` is liveness, `/health/db` is readiness. */
@Controller('health')
@Public()
@SkipThrottle({ ip: true, user: true }) // names must match app.module.ts: a bare @SkipThrottle() only skips a throttler called 'default'
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DatabaseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([]);
  }

  @Get('db')
  @HealthCheck()
  checkDb() {
    return this.health.check([() => this.database.isHealthy('database')]);
  }
}
