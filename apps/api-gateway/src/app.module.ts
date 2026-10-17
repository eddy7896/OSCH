import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { IpThrottlerGuard } from './common/throttle.guards.js';
import { LoggerModule } from 'nestjs-pino';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';
import { MembershipsModule } from './memberships/memberships.module.js';
import { MeModule } from './me/me.module.js';
import { PermissionModule } from './permission/permission.module.js';
import { PlatformModule } from './platform/platform.module.js';
import { UsersModule } from './users/users.module.js';
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
        { name: 'ip', ttl: config.get('THROTTLE_TTL_MS', { infer: true }), limit: config.get('THROTTLE_LIMIT', { infer: true }) },
        { name: 'user', ttl: config.get('THROTTLE_TTL_MS', { infer: true }), limit: config.get('THROTTLE_USER_LIMIT', { infer: true }) },
      ],
    }),
    GatewayDatabaseModule,
    UsersModule,
    AuditModule,
    AuthModule,
    TenantModule,
    PermissionModule,
    HealthModule,
    MeModule,
    MembershipsModule,
    PlatformModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: IpThrottlerGuard },
    { provide: APP_FILTER, useClass: ErrorEnvelopeFilter },
  ],
})
export class AppModule {}
