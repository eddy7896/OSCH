import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { serve } from '../support/serve.js';

/** The REAL application: real AppModule, real Data Connect and Auth through the emulators, no provider overridden. */
export async function bootRealApp(extraControllers: unknown[] = []): Promise<INestApplication> {
  Object.assign(process.env, { NODE_ENV: 'test', LOG_LEVEL: 'silent', CORS_ORIGINS: 'http://localhost:3002', FIREBASE_PROJECT_ID: 'demo-oruschools', THROTTLE_LIMIT: '1000000', THROTTLE_USER_LIMIT: '1000000', TENANT_CACHE_TTL_MS: '0' });
  const { AppModule } = await import('../../src/app.module.js');
  const { configureApp } = await import('../../src/configure-app.js');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule], controllers: extraControllers as never[] }).compile();
  const app = moduleRef.createNestApplication({ bufferLogs: true });
  configureApp(app);
  return serve(app);
}
