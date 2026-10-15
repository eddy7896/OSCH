import { Writable } from 'node:stream';
import express from 'express';
import { pinoHttp } from 'pino-http';
import request from 'supertest';
import { pinoHttpOptions } from './logging.js';
import { genReqId } from './request-id.js';

const fakeRes = () => {
  const headers: Record<string, string> = {};
  return { res: { setHeader: (k: string, v: string) => (headers[k] = v) } as never, headers };
};

describe('genReqId', () => {
  it('keeps a safe caller id and echoes it on the response', () => {
    const { res, headers } = fakeRes();
    expect(genReqId({ headers: { 'x-request-id': 'abc-12345.XYZ' } } as never, res)).toBe('abc-12345.XYZ');
    expect(headers['x-request-id']).toBe('abc-12345.XYZ');
  });

  it.each(['short', 'has space in it 123', 'x'.repeat(65), 'new\nline-12345', '<script>alert(1)</script>'])('replaces the unsafe id %j', (bad) => {
    const { res, headers } = fakeRes();
    const id = genReqId({ headers: { 'x-request-id': bad } } as never, res);
    expect(id).not.toBe(bad);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(headers['x-request-id']).toBe(id);
  });
});

describe('request logging', () => {
  it('writes one line with the request id and never the Authorization header or cookie', async () => {
    const lines: string[] = [];
    const sink = new Writable({ write: (chunk, _e, cb) => (lines.push(String(chunk)), cb()) });
    const app = express();
    app.use(pinoHttp(pinoHttpOptions('info'), sink));
    app.get('/x', (_req, res) => res.send('ok'));

    await request(app).get('/x').set('Authorization', 'Bearer SECRET-TOKEN').set('Cookie', 'sid=SECRET-COOKIE').set('X-Request-Id', 'req-abcdef12').expect(200);

    const log = lines.join('');
    expect(log).toContain('req-abcdef12');
    expect(log).not.toContain('SECRET-TOKEN');
    expect(log).not.toContain('SECRET-COOKIE');
  });
});
