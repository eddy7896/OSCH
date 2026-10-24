import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { IpThrottlerGuard, STRICT } from './common/throttle.guards.js';
import { LoggerModule } from 'nestjs-pino';
import { AccountsModule } from './accounts/accounts.module.js';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';
import { InvitationsModule } from './invitations/invitations.module.js';
import { MembershipsModule } from './memberships/memberships.module.js';
import { MeModule } from './me/me.module.js';
import { PermissionModule } from './permission/permission.module.js';
import { PublicModule } from './public/public.module.js';
import { PlatformModule } from './platform/platform.module.js';
import { PayrollModule } from './payroll/payroll.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { FeesModule } from './fees/fees.module.js';
import { ImportsModule } from './imports/imports.module.js';
import { AdmissionsModule } from './admissions/admissions.module.js';
import { StaffModule } from './staff/staff.module.js';
import { StudentsModule } from './students/students.module.js';
import { SchoolModule } from './school/school.module.js';
import { UploadsModule } from './uploads/uploads.module.js';
import { UsersModule } from './users/users.module.js';
import { TenantModule } from './tenant/tenant.module.js';
import { pinoHttpOptions } from './common/logging.js';
import { ErrorEnvelopeFilter } from './common/errors.js';
import { Env, validateEnv } from './config/env.js';
import { GatewayDatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, // The single master file lives at the repo root (cwd is apps/api-gateway under npm workspaces, the root when run from there).
      envFilePath: ['../../.env.local', '.env.local'], validate: validateEnv }),
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
        // Counts only routes marked @Strict(); every other route skips it.
        { name: 'strict', ttl: config.get('THROTTLE_TTL_MS', { infer: true }), limit: config.get('THROTTLE_STRICT_LIMIT', { infer: true }), skipIf: (ctx) => !Reflect.getMetadata(STRICT, ctx.getHandler()) },
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
    UploadsModule,
    MembershipsModule,
    SchoolModule,
    StudentsModule,
    StaffModule,
    AdmissionsModule,
    FeesModule,
    PayrollModule,
    ReportsModule,
    ImportsModule,
    AccountsModule,
    InvitationsModule,
    PlatformModule,
    PublicModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: IpThrottlerGuard },
    { provide: APP_FILTER, useClass: ErrorEnvelopeFilter },
  ],
})
export class AppModule {}
