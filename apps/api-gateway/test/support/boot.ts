import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { serve } from './serve.js';

export interface BootOptions {
  controllers?: unknown[];
  env?: Record<string, string>;
  db?: object;
  auth?: object;
}

const NOOP_DB = { listSchools: async () => ({ data: { schools: [] } }), createAuditLog: async () => ({ data: {} }), getMembership: async () => ({ data: { schoolMembers: [] } }) };

/** Boots the real AppModule with the data layer and Firebase replaced by fakes, serving on a persistent loopback port. */
export async function bootApp(opts: BootOptions = {}): Promise<INestApplication> {
  Object.assign(process.env, { NODE_ENV: 'test', LOG_LEVEL: 'silent', CORS_ORIGINS: 'http://localhost:3002', THROTTLE_LIMIT: '100000', THROTTLE_USER_LIMIT: '100000', TENANT_CACHE_TTL_MS: '0', ...opts.env });
  const { vi } = await import('vitest');
  vi.resetModules(); // ConfigModule validates process.env when app.module is first evaluated
  const { AppModule } = await import('../../src/app.module.js');
  const { configureApp } = await import('../../src/configure-app.js');
  const { DATABASE } = await import('@oruschools/database');
  const { FIREBASE_AUTH } = await import('../../src/auth/firebase-auth.js');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule], controllers: (opts.controllers ?? []) as never[] })
    .overrideProvider(DATABASE).useValue(opts.db ?? NOOP_DB)
    .overrideProvider(FIREBASE_AUTH).useValue(opts.auth ?? { verifyIdToken: async (t: string) => ({ uid: `u-${t}` }) })
    .compile();
  const app = moduleRef.createNestApplication({ bufferLogs: true });
  configureApp(app);
  return serve(app);
}
