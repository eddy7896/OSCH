import type { INestApplication } from '@nestjs/common';
import type { AddressInfo } from 'node:net';
import request from 'supertest';

/**
 * Listens once on a loopback port for the lifetime of the app and talks to that URL. supertest's default (a fresh
 * listen/close per request on the bare http server) churns ephemeral ports and showed rare cross-talk between parallel
 * test workers (a request answered by another suite's server: 404 for a route that exists).
 */
export async function serve(app: INestApplication): Promise<INestApplication> {
  await app.listen(0, '127.0.0.1');
  const { port } = app.getHttpServer().address() as AddressInfo;
  (app as unknown as { __base: string }).__base = `http://127.0.0.1:${port}`;
  return app;
}

export const agent = (app: INestApplication) => request((app as unknown as { __base: string }).__base);
