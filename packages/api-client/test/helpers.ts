import { createApi, type ApiClientOptions } from '../src/index.js';

export interface Seen {
  method: string;
  url: string;
  headers: Headers;
  body: string;
}

export const json = (status: number, body: unknown, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
export const envelope = (code: string, status: number, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) => json(status, { error: { code, message: `fallback for ${code}`, requestId: 'req-1234567890', ...extra } }, headers);

/** A fake gateway: records each request and answers from `respond`. */
export function harness(respond: (seen: Seen, n: number) => Response | Promise<Response>, options: Partial<ApiClientOptions> = {}) {
  const seen: Seen[] = [];
  const api = createApi({
    baseUrl: 'https://api.example.test',
    fetch: async (input, init) => {
      const req = new Request(input, init);
      const s: Seen = { method: req.method, url: req.url, headers: req.headers, body: req.body ? await req.clone().text() : '' };
      seen.push(s);
      // like a real fetch: rejects with the signal's reason as soon as the request is aborted
      return new Promise<Response>((resolve, reject) => {
        if (req.signal.aborted) return reject(req.signal.reason);
        req.signal.addEventListener('abort', () => reject(req.signal.reason), { once: true });
        Promise.resolve(respond(s, seen.length)).then(resolve, reject);
      });
    },
    ...options,
  });
  return { api, seen };
}

export const ME = { user: { id: 'u1', email: 'a@example.com', displayName: null, globalRole: 'USER' }, memberships: [], activeSchool: null, platform: null, language: { chosen: null, effective: 'en' } };
