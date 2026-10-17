import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { createValidationPipe } from './common/validation.js';
import { REQUEST_ID_HEADER } from './common/request-id.js';
import { Env, parseOrigins } from './config/env.js';

/** Shared by main.ts and the e2e tests so tests exercise the real HTTP setup. */
export function configureApp(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const { origins } = parseOrigins(config.get('CORS_ORIGINS', { infer: true }));

  app.useLogger(app.get(Logger));
  app.use(helmet());
  // Exact-match allow list; Bearer tokens, not cookies, so no credentials mode.
  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-School-Id', 'X-Request-Id'],
    exposedHeaders: [REQUEST_ID_HEADER, 'Retry-After'],
    maxAge: 600,
  });
  app.setGlobalPrefix('v1', { exclude: ['health', 'health/db'] });
  app.useGlobalPipes(createValidationPipe());
  app.enableShutdownHooks();
}
