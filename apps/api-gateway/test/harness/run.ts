import type { INestApplication } from '@nestjs/common';
import type { RouteFacts } from '../../src/permission/route-decision.check.js';
import { agent } from '../support/serve.js';
import type { Case } from './matrix.js';

export async function runCase(app: INestApplication, route: RouteFacts, c: Case) {
  const method = (route.method ?? 'GET').toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';
  let req = agent(app)[method](urlFor(route));
  if (c.token) req = req.set('Authorization', `Bearer ${c.token}`);
  if (c.schoolId) req = req.set('X-School-Id', c.schoolId);
  if (c.query) req = req.query(c.query);
  return c.body ? req.send(c.body) : req;
}

import { urlFor } from './matrix.js';
