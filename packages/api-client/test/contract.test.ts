import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createApi, matchRoute, ROUTES } from '../src/index.js';

const spec = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../../apps/api-gateway/openapi.json'), 'utf8'));
const operations = Object.entries(spec.paths).flatMap(([path, item]) => Object.entries(item as Record<string, { operationId: string; ['x-access']: string }>).map(([method, op]) => ({ method: method.toUpperCase(), path, access: op['x-access'], id: op.operationId })));

describe('the client matches the committed contract', () => {
  it('has a route entry and a method for every operation, and none extra', () => {
    expect(ROUTES.map((r) => `${r.method} ${r.path} ${r.access}`).sort()).toEqual(operations.map((o) => `${o.method} ${o.path} ${o.access}`).sort());
    const api = createApi({ baseUrl: 'https://x.test' });
    expect(Object.keys(api)).toHaveLength(operations.length);
  });

  it('every operation URL resolves to itself, with parameters filled in, trailing slash tolerated, wrong method refused', () => {
    for (const o of operations) {
      const concrete = o.path.replace(/\{[^}]+\}/g, 'abc-123');
      expect(matchRoute(o.method, concrete)?.operationId).toBe(o.id);
      expect(matchRoute(o.method, `${concrete}/`)?.operationId).toBe(o.id);
      expect(matchRoute('TRACE', concrete)).toBeUndefined();
    }
    expect(matchRoute('GET', '/v1/nope')).toBeUndefined();
    expect(matchRoute('GET', '/v1/platform/schools/abc/extra')).toBeUndefined();
    expect(matchRoute('GET', '/v1/platform/schools/a/b')).toBeUndefined();
  });

  it('school routes are exactly those that need a school, and public routes exactly those without a token', () => {
    expect(ROUTES.filter((r) => r.access === 'tenant').map((r) => r.path).every((p) => /^\/v1\/(memberships|invitations|uploads)/.test(p))).toBe(true);
    expect(ROUTES.filter((r) => r.access === 'public').map((r) => r.path).sort()).toEqual(['/health', '/health/db', '/v1/public/schools/by-subdomain/{sub}']);
    expect(ROUTES.filter((r) => r.access === 'platform').every((r) => r.path.startsWith('/v1/platform/'))).toBe(true);
  });
});
