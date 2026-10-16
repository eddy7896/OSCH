import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import type { Env } from '../config/env.js';
import { DEV_PROJECT_ID } from '../database/database.module.js';
import { UserThrottlerGuard } from '../common/throttle.guards.js';
import { AuthGuard } from './auth.guard.js';
import { createFirebaseAuth, FIREBASE_AUTH } from './firebase-auth.js';

@Global()
@Module({
  providers: [
    {
      provide: FIREBASE_AUTH,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => createFirebaseAuth(config.get('FIREBASE_PROJECT_ID', { infer: true }) ?? DEV_PROJECT_ID),
    },
    // Registered after the IP throttler (AppModule order): IP limit, authenticate, per-user limit.
    { provide: APP_GUARD, useClass: AuthGuard },
    // Per-user limit needs the verified uid, so it runs right after authentication.
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
  ],
  exports: [FIREBASE_AUTH],
})
export class AuthModule {}
