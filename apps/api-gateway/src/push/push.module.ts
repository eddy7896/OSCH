import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { FIREBASE_APP_NAME } from '@oruschools/database';
import { getApp, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import type { Env } from '../config/env.js';
import { FcmPushSender, type MessagingLike } from './fcm-push-sender.js';
import { PushAfterWriteInterceptor } from './push-after-write.interceptor.js';
import { PushService } from './push.service.js';
import { NoopPushSender, PUSH_SENDER } from './push.types.js';

@Module({
  providers: [
    {
      provide: PUSH_SENDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        if (!config.get('PUSH_ENABLED', { infer: true })) return new NoopPushSender();
        const app = getApps().find((a) => a.name === FIREBASE_APP_NAME) ? getApp(FIREBASE_APP_NAME) : getApp();
        return new FcmPushSender(getMessaging(app) as unknown as MessagingLike);
      },
    },
    PushService,
    { provide: APP_INTERCEPTOR, useClass: PushAfterWriteInterceptor },
  ],
  exports: [PushService],
})
export class PushModule {}
