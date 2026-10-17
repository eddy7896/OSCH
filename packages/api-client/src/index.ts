import { bindApi, type Api } from './generated/api.gen.js';
import { client as defaultClient } from './generated/client.gen.js';
import { createClient, createConfig } from './generated/client/index.js';
import { createTransport, type TransportOptions } from './transport.js';

export { ApiError, type ApiErrorCode, type ClientErrorCode, type FieldProblem, type GatewayErrorCode } from './api-error.js';
export { formatMinor, minorToDecimal, parseInt64, toInt64String } from './money.js';
export { matchRoute, type TokenRequest, type TransportOptions } from './transport.js';
export { ROUTES, type Access, type RouteInfo } from './generated/routes.gen.js';
export type * from './generated/types.gen.js';
export type { Api };

export interface ApiClientOptions extends TransportOptions {
  /** The gateway's origin, for example `https://api.oruschools.com` (no trailing path). */
  baseUrl: string;
}

/**
 * The typed gateway client. Every method returns the payload and throws an ApiError on any failure:
 *
 *   const api = createApi({ baseUrl, getToken: () => user.getIdToken(), getSchoolId: () => activeSchoolId });
 *   const me = await api.meGet({});
 *   await api.platformSchoolsCreate({ body: { name, subDomain, defaultLanguage } });
 *
 * Credentials, the active school, the single retry after a 401, timeouts and error mapping live in the transport.
 */
export function createApi(options: ApiClientOptions): Api {
  const client = createClient(createConfig({ baseUrl: options.baseUrl.replace(/\/+$/, ''), fetch: createTransport(options), throwOnError: true }));
  return bindApi(client);
}

/** The generated default client, for code that wants the raw SDK functions (rare). */
export { defaultClient };
