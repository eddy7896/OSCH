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
