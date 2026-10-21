# ADR-0009: Web authentication and school selection

- **Status:** Accepted (2026-10-15) — owner accepted all decisions
- **Builds on:** ADR-0002 (Firebase Auth only), ADR-0006 (locale in the URL), ADR-0008 (gateway)

## Context
The web apps use `cacheComponents` and next-intl URL locales. The bundled Next 16 docs (`node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md`) state that with Cache Components "a session read happens at request time, so it can't be prerendered into the static shell"; authenticated UI must stream in behind `<Suspense>`, per-user cached data uses `use cache: private`, and the Proxy should only do optimistic cookie checks, never database lookups (`authentication.md`, "Optimistic checks with Proxy"). Cookie reads in a root layout block the route (the reason ADR-0006 moved locale into the URL).

## Decision (Phase 1)
**Browser signs in with the Firebase Auth web SDK and calls the gateway directly with `Authorization: Bearer <ID token>`.** The ERP/platform *shell* (layout, navigation frame, language) stays statically prerendered; authenticated content is a client island that fetches from the gateway through `packages/api-client`. Tokens live in the Firebase SDK's own persistence (IndexedDB), are refreshed by the SDK, and are never written to cookies or to Next server code. The gateway remains the only place that authorises, so no Next server code needs the user.
- **School selection:** the client sends `X-School-Id`. Web apps resolve the school from the subdomain through a public, rate-limited gateway endpoint (`/v1/public/schools/by-subdomain/:sub`, minimal fields); the gateway still validates membership on every request and never trusts the subdomain itself.
- **Navigation and permissions** come from `GET /v1/me` (computed by `packages/rbac`), so web code holds no role logic; UI hiding is cosmetic, the gateway enforces.
- **SUPER_ADMIN** signs in to `saas-admin` with no school; the claim `globalRole=SUPER_ADMIN` is set only by a bootstrap script using the Admin SDK (never an endpoint).
- **Hardening:** strict CSP (no inline script except Next's nonce), `helmet` on the gateway, CORS allow-list from `CORS_ORIGINS`, no tokens in URLs or logs.

## Alternatives
- **Session cookie minted by the gateway** (`createSessionCookie`, httpOnly, shared parent domain) would allow server-rendered authenticated data and removes tokens from JS-readable storage, but adds CSRF handling, cross-subdomain cookie configuration and a second auth path. **Revisit when** a screen needs server-side rendered user data or the threat model rejects token-in-IndexedDB (an XSS-sensitive trade-off accepted for the internal admin tools of Phase 1). Mobile apps always use Bearer tokens.
- **Next BFF holding the session:** rejected, it puts a second authorisation surface in front of the gateway.

## Consequences
- Authenticated pages are client-rendered islands in a static shell; first paint of user data waits for a gateway call.
- The gateway must accept Bearer tokens only in Phase 1; adding cookies later is additive.
- Testing authenticated UI uses the Auth emulator (no real credentials).

## Addendum (2026-10-17): the public school lookup is built
`GET /v1/public/schools/by-subdomain/:sub` (`@Public()`, the only unauthenticated read in the API) lets a school's login page learn which school an address is, before anyone signs in.
- **Returns exactly `{ id, name, subDomain, defaultLanguage }`.** No status, dates, currency, counts or contact details (tested). Credentials sent with the request are ignored: the route is public, not "optional auth".
- **One 404 for everything unusable:** a malformed name, a reserved name (`www`, `api`, `admin`, ...), an unknown school and a **suspended** school give byte-identical bodies, so the endpoint cannot be used to explore beyond what a school's public address already says, nor to learn which schools are suspended. Consequence: a suspended school's login page shows "not found"; its members learn the reason from `403 SCHOOL_SUSPENDED` once signed in.
- **Cheap and bounded:** answers are cached in memory (hits 60 s, misses 10 s, at most 5000 names, oldest dropped), so spraying random names reaches the database at most once per name per 10 s and cannot grow memory. A platform rename, suspension or reactivation clears that school's entry at once on the instance that handled it (other instances within 60 s). Browsers may cache a hit for 60 s (`Cache-Control: public, max-age=60`).
- **Rate limit:** the general per-IP limit (default 120 a minute per IP). Many parents behind one school network each load the login page once, so a stricter limit would lock the school out; raise `THROTTLE_LIMIT` if a pilot school's network proves busier.
- The web apps resolve the school from the request host, call this once per visit, then send `X-School-Id` from the id it returns (the gateway still verifies membership on every request and never trusts the subdomain itself).
- OpenAPI now documents `404` on every operation with a path parameter.

## Addendum (2026-10-17): the typed client (P1-8)
`packages/api-client` is generated from the committed `apps/api-gateway/openapi.json` (`@hey-api/openapi-ts`; CI fails if `src/generated` is stale) and wrapped by a hand-written transport (`createApi`). The web apps use only this client.
- **Credentials live in the transport, not in screens:** `getToken({ forceRefresh })` and `getSchoolId()` are callbacks. Public routes carry neither token nor school; platform routes the token only; user routes the token and, if any, the school; school routes require a school (no request is sent without one: `SCHOOL_REQUIRED`). Headers a screen adds are overwritten. The generated types do not mention `X-School-Id`.
- **One retry on 401** with a freshly requested token (only if it differs); never on 403. Tokens never appear in messages.
- **Every failure is an `ApiError`** with a closed `code` (the gateway's list plus `NETWORK_ERROR`, `TIMEOUT`, `ABORTED`, `SCHOOL_REQUIRED`, `UNEXPECTED_RESPONSE`), `status`, `requestId`, field `details` and `retryAfterSeconds`. The code list is checked exhaustively at compile time against the contract. Screens switch on `code` and translate it (ADR-0006).
- **Money** helpers (`parseInt64`, `formatMinor`, ...) go through BigInt, exact above 2^53 (ADR-0004).
- **Contract fixes found while building it:** `/v1/me` documented its optional school header as required (now `ActiveSchoolId`, optional); the throttler's `Retry-After-<limit>` headers are now exposed as the standard `Retry-After` (also in CORS `exposedHeaders`) so a browser can read it.
- Proven against the real gateway and emulators (`api-client.integration.ts`): create school, public lookup, role refusals, cross-tenant, suspended school, validation details, a real expired-token retry, invitations, rate limiting.
- Browser support note: `AbortSignal.timeout`/`any` exist in current browsers and Node 22; the transport falls back to a manual timer on older engines.


## Addendum (2026-10-21): saas-admin sign-in is built (P1-9)
- Firebase Auth web SDK (v13), created in an effect so nothing runs while prerendering; methods: email and password, Google popup, and a code sent by SMS (invisible reCAPTCHA).
- `isOwner` comes from the `globalRole` claim of the verified ID token. A signed-in person without it sees a "no access" screen and no gateway call is made; the gateway still refuses every platform route to anyone else.
- Sign-in failures are reduced to a closed list (`AuthFailure`), and a wrong password and an unknown email are the same message. Screens show translated text from the error code, never Firebase's or the gateway's.
- Not yet exercised: a real sign-in against the live project and the live gateway (the app tests use a fake sign-in service and a fake client; the typed client itself is proven against the real stack in `api-client.integration.ts`).

## Addendum (2026-10-21): web-admin's shell and the shared sign-in package (P1-10)
- **`packages/web-auth`** holds what both Next apps need: the Firebase port, the session provider (`AuthProvider`: the app's `firebase` config, the gateway URL, and a `getSchoolId` callback read on every request), the sign-in screen (`SignIn`, the app passes the heading) and the error-to-message mapping. saas-admin and web-admin use the same tested code.
- **Which school:** web-admin reads the single label in front of `NEXT_PUBLIC_BASE_DOMAIN` (`greenfield.oruschools.com`; in development `greenfield.localhost:3002`), asks the public lookup, and sends that school's id as `X-School-Id`. Unknown, malformed and suspended schools are one "not found" (the lookup says no more); a failed lookup is an error with Retry. The address is only a hint: membership is checked by the gateway on every request.
- **After sign-in** the shell calls `GET /v1/me`. No active membership in this school (or a different school than the address) is a clear "no access", never a half-working screen. The navigation is exactly what the gateway sent (modules the person cannot open are not sent), shown in our words and icons from `packages/i18n`; an item without a word yet falls back to the gateway's English text. Screens other than the dashboard say they are not ready.
- **CORS for school addresses:** `CORS_ORIGINS` accepts `scheme://*.domain[:port]` entries (one label deep, never a bare public suffix, https-only in production), so every school's own address can call the gateway without listing each one.
- **Known limit, not solved here:** Firebase's authorized domains do not accept wildcards. Email and password and phone-code sign-in work on any school address; Google sign-in (a popup) works only on addresses listed under Authentication, Settings, Authorized domains. Decide before the pilot: list each school's address when it is created, or move Google sign-in to one central address.
