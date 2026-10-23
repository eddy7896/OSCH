import { ApiError, toApiError } from './api-error.js';
import { ROUTES, type Access, type RouteInfo } from './generated/routes.gen.js';

export interface TokenRequest {
  /** True on the single retry after a 401: get a fresh token from the identity provider, do not reuse a cached one. */
  forceRefresh: boolean;
}

export interface TransportOptions {
  /** The Firebase ID token of the signed-in user, or nothing when signed out. Called per request; may be async. */
  getToken?: (request: TokenRequest) => Promise<string | null | undefined> | string | null | undefined;
  /** The active school (a uuid), or nothing. Sent as X-School-Id on school routes (required) and on user routes (optional). */
  getSchoolId?: () => string | null | undefined;
  /** Milliseconds before a request is given up on. Default 15000. */
  timeoutMs?: number;
  /** For tests and special runtimes. Default: global fetch. */
  fetch?: typeof fetch;
  /** Path prefix of the gateway behind a proxy (default none): the part of the base URL path to strip when matching routes. */
  basePath?: string;
}

const compile = (r: RouteInfo) => ({ route: r, re: new RegExp(`^${r.path.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{[^}]+\}/g, '[^/]+')}/?$`) });
// A fixed path wins over a parameterised one (`/v1/staff/departments` before `/v1/staff/{id}`), whatever order the contract lists them in.
const TABLE = ROUTES.map(compile).sort((a, b) => (a.route.path.match(/\{/g)?.length ?? 0) - (b.route.path.match(/\{/g)?.length ?? 0));

/** The route a request belongs to (so the transport knows what it needs), or undefined for an unknown path. */
export function matchRoute(method: string, pathname: string): RouteInfo | undefined {
  const m = method.toUpperCase();
  return TABLE.find((t) => t.route.method === m && t.re.test(pathname))?.route;
}

/**
 * The fetch the generated client uses. It, and only it, knows about credentials:
 *  - public routes get NO token and no school (nothing to leak to an unauthenticated endpoint);
 *  - every other route gets the bearer token; an unknown path is treated as non-public (fail towards sending nothing extra);
 *  - school routes REQUIRE an active school (no request is sent without one: SCHOOL_REQUIRED); user routes send it when there is one;
 *    platform routes never send it;
 *  - a 401 gets exactly one retry with a freshly requested token (the cached one may simply have expired);
 *  - a timeout, a cancel, no network and the gateway's error envelope all surface as ApiError.
 * Tokens are never logged or put in an error message.
 */
export function createTransport(options: TransportOptions): typeof fetch {
  const doFetch = options.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
  const timeoutMs = options.timeoutMs ?? 15_000;
  const basePath = (options.basePath ?? '').replace(/\/+$/, '');

  return async function send(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const original = new Request(input, init);
    const url = new URL(original.url);
    const pathname = basePath && url.pathname.startsWith(basePath) ? url.pathname.slice(basePath.length) || '/' : url.pathname;
    const route = matchRoute(original.method, pathname);
    const access: Access | undefined = route?.access;

    let schoolId: string | undefined;
    if (access === 'tenant' || access === 'user' || access === undefined) {
      schoolId = options.getSchoolId?.() || undefined;
      if (access === 'tenant' && !schoolId) throw new ApiError('SCHOOL_REQUIRED', 0, 'Choose a school first.');
    }

    const attempt = async (forceRefresh: boolean, knownToken?: string): Promise<{ response: Response; token: string | null | undefined }> => {
      const headers = new Headers(original.headers);
      let token: string | null | undefined;
      if (access !== 'public') token = knownToken ?? (options.getToken ? await options.getToken({ forceRefresh }) : undefined);
      headers.delete('authorization');
      if (token) headers.set('authorization', `Bearer ${token}`);
      headers.delete('x-school-id');
      if (schoolId) headers.set('x-school-id', schoolId);

      const signal = withTimeout(original.signal, timeoutMs);
      try {
        return { response: await doFetch(new Request(original.clone(), { headers, signal })), token };
      } catch (e) {
        if (original.signal?.aborted) throw new ApiError('ABORTED', 0, 'The request was cancelled.');
        if (e instanceof DOMException && e.name === 'TimeoutError') throw new ApiError('TIMEOUT', 0, 'The server took too long to answer.');
        if (e instanceof DOMException && e.name === 'AbortError') throw new ApiError('ABORTED', 0, 'The request was cancelled.');
        throw new ApiError('NETWORK_ERROR', 0, 'Could not reach the server.');
      }
    };

    let { response, token } = await attempt(false);
    if (response.status === 401 && access !== 'public' && options.getToken && token) {
      // Once: an expired cached token is the usual reason. If the provider has nothing newer to offer, a retry is pointless.
      const fresh = await options.getToken({ forceRefresh: true });
      if (fresh && fresh !== token) ({ response } = await attempt(false, fresh));
    }
    if (!response.ok) throw await toApiError(response);
    return response;
  };
}

/** The caller's cancel signal plus a time limit. AbortSignal.any / .timeout exist in current browsers and Node 22; older engines get a manual equivalent. */
function withTimeout(caller: AbortSignal | undefined, ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function' && (!caller || typeof AbortSignal.any === 'function')) {
    const limit = AbortSignal.timeout(ms);
    return caller ? AbortSignal.any([caller, limit]) : limit;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), ms);
  const stop = () => {
    clearTimeout(timer);
    controller.abort(caller?.reason);
  };
  if (caller?.aborted) stop();
  else caller?.addEventListener('abort', stop, { once: true });
  controller.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
  return controller.signal;
}
