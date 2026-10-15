/**
 * Writes (or with --check, verifies) apps/api-gateway/openapi.json from the registered routes.
 *   npm run openapi:generate -w api-gateway      after changing a route or DTO
 *   npm run openapi:check -w api-gateway         part of `npm test`; fails when the committed file is stale
 * Needs no database, Firebase or network: the data layer and Auth objects are created but never called.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Generation must not depend on a developer's local configuration.
Object.assign(process.env, { NODE_ENV: 'test', LOG_LEVEL: 'silent', CORS_ORIGINS: 'http://localhost:3002', FIREBASE_PROJECT_ID: 'demo-oruschools' });
for (const k of ['FIREBASE_AUTH_EMULATOR_HOST', 'DATA_CONNECT_EMULATOR_HOST']) delete process.env[k];

const { NestFactory } = await import('@nestjs/core');
const { AppModule } = await import('../app.module.js');
const { configureApp } = await import('../configure-app.js');
const { RouteDecisionCheck } = await import('../permission/route-decision.check.js');
const { buildOpenApi, stableStringify } = await import('./build-openapi.js');

const target = resolve(dirname(fileURLToPath(import.meta.url)), '../../openapi.json');
const app = await NestFactory.create(AppModule, { logger: false, bufferLogs: true });
configureApp(app);
await app.init();
const text = stableStringify(buildOpenApi(app, app.get(RouteDecisionCheck).collect()));
await app.close();

if (process.argv.includes('--check')) {
  let committed = '';
  try {
    committed = readFileSync(target, 'utf8');
  } catch {
    /* missing counts as stale */
  }
  if (committed !== text) {
    console.error('apps/api-gateway/openapi.json is out of date with the routes. Run: npm run openapi:generate -w api-gateway, and commit the result.');
    process.exit(1);
  }
  console.log('openapi.json is current');
} else {
  writeFileSync(target, text);
  console.log(`wrote ${target}`);
}
