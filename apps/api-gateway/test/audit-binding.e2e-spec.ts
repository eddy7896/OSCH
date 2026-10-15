// E-AUD-1, static half, over the REAL route table: every @Audit on a registered route names an operation of the real
// connector whose own audit insert records that exact action. Vacuous today (the only routes are health reads) and
// enforcing from the first Phase 1 module on.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Test } from '@nestjs/testing';
import { auditActionsByOperation, auditBindingProblems } from '../src/audit/audit-binding.js';

describe('audit binding over the registered routes', () => {
  it('every audited route is bound to an operation that records its action', async () => {
    Object.assign(process.env, { NODE_ENV: 'test', LOG_LEVEL: 'silent', CORS_ORIGINS: 'http://localhost:3002' });
    const { AppModule } = await import('../src/app.module.js');
    const { RouteDecisionCheck } = await import('../src/permission/route-decision.check.js');
    const { DATABASE } = await import('@oruschools/database');
    const { FIREBASE_AUTH } = await import('../src/auth/firebase-auth.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(DATABASE).useValue({}).overrideProvider(FIREBASE_AUTH).useValue({}).compile();
    const app = moduleRef.createNestApplication();
    await app.init();
    try {
      const routes = app.get(RouteDecisionCheck).collect();
      expect(routes.length).toBeGreaterThan(0);
      const gql = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../../dataconnect/erp-connector/mutations.gql'), 'utf8');
      expect(auditBindingProblems(routes, auditActionsByOperation(gql))).toEqual([]);
    } finally {
      await app.close();
    }
  });
});
