import type { Options } from 'pino-http';
import { genReqId } from './request-id.js';

/** Request logging: one line per request with its id; credentials and bodies are never logged. */
export function pinoHttpOptions(level: string): Options {
  return {
    level,
    genReqId,
    redact: { paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'], remove: true },
    autoLogging: { ignore: (req) => req.url === '/health' },
  };
}
