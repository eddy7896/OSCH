import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { serve } from '../support/serve.js';

/** The REAL application: real AppModule, real Data Connect and Auth through the emulators. Only `overrides` (object storage) are replaced. */
export async function bootRealApp(extraControllers: unknown[] = [], env: Record<string, string> = {}, overrides: Array<[unknown, unknown]> = []): Promise<INestApplication> {
  Object.assign(process.env, { NODE_ENV: 'test', LOG_LEVEL: 'silent', CORS_ORIGINS: 'http://localhost:3002', FIREBASE_PROJECT_ID: 'demo-oruschools', THROTTLE_LIMIT: '1000000', THROTTLE_USER_LIMIT: '1000000', THROTTLE_STRICT_LIMIT: '1000000', TENANT_CACHE_TTL_MS: '0', ...env });
  // ConfigModule validates process.env when app.module is first evaluated, so a boot with its own settings needs fresh modules.
  if (Object.keys(env).length > 0) (await import('vitest')).vi.resetModules();
  const { AppModule } = await import('../../src/app.module.js');
  const { configureApp } = await import('../../src/configure-app.js');
  let builder = Test.createTestingModule({ imports: [AppModule], controllers: extraControllers as never[] });
  for (const [token, value] of overrides) builder = builder.overrideProvider(token as never).useValue(value); // only for things that talk to the outside world (object storage)
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication({ bufferLogs: true });
  configureApp(app);
  return serve(app);
}
