import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDatabase, DATABASE, type Database } from '@oruschools/database';
import type { Env } from '../config/env.js';

/** The only provider of the data layer in the gateway; modules inject it with `@Inject(DATABASE)`. */
export const DEV_PROJECT_ID = 'demo-oruschools';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      inject: [ConfigService],
      // Production requires FIREBASE_PROJECT_ID (env.ts); development falls back to the emulator's demo project.
      useFactory: (config: ConfigService<Env, true>): Database => createDatabase({ projectId: config.get('FIREBASE_PROJECT_ID', { infer: true }) ?? DEV_PROJECT_ID }),
    },
  ],
  exports: [DATABASE],
})
export class GatewayDatabaseModule {}
