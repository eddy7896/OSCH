import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module.js';
import { PermissionModule } from './permission/permission.module.js';
import { TenantModule } from './tenant/tenant.module.js';
import { pinoHttpOptions } from './common/logging.js';
import { ErrorEnvelopeFilter } from './common/errors.js';
import { Env, validateEnv } from './config/env.js';
import { GatewayDatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, envFilePath: ['.env.local', '.env'], validate: validateEnv }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: pinoHttpOptions(config.get('LOG_LEVEL', { infer: true })),
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => [
        { ttl: config.get('THROTTLE_TTL_MS', { infer: true }), limit: config.get('THROTTLE_LIMIT', { infer: true }) },
      ],
    }),
    GatewayDatabaseModule,
    AuthModule,
    TenantModule,
    PermissionModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: ErrorEnvelopeFilter },
  ],
})
export class AppModule {}
