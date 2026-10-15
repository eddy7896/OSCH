import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorService, type HealthIndicatorResult } from '@nestjs/terminus';
import { DATABASE, type Database } from '@oruschools/database';

/** Readiness: one cheap, tenant-free read proves the gateway can reach Data Connect. Reports only up/down, never the cause. */
@Injectable()
export class DatabaseHealthIndicator {
  constructor(
    private readonly indicators: HealthIndicatorService,
    @Inject(DATABASE) private readonly db: Database,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.indicators.check(key);
    try {
      await this.db.listSchools({ limit: 1, offset: 0 });
      return indicator.up();
    } catch {
      return indicator.down();
    }
  }
}
