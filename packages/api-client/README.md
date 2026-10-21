# @oruschools/api-client

The typed client of the API gateway, **generated** from the committed contract (`apps/api-gateway/openapi.json`) with `@hey-api/openapi-ts`, plus a small hand-written transport. Web apps use this; they never call the gateway by hand.

```ts
import { ApiError, createApi } from '@oruschools/api-client';

const api = createApi({
  baseUrl: 'https://api.example.com',
  getToken: ({ forceRefresh }) => firebaseUser?.getIdToken(forceRefresh), // async is fine; undefined when signed out
  getSchoolId: () => activeSchoolId,                                    // the active school (a uuid) or undefined
});

const me = await api.meGet({});                                          // typed payload, throws ApiError on any failure
await api.platformSchoolsCreate({ body: { name, subDomain, defaultLanguage: 'hi' } });

try { await api.membershipsList({}); }
catch (e) { if (e instanceof ApiError && e.is('FORBIDDEN')) /* show the translation of FORBIDDEN */; }
```

## What the transport does (and callers must not)
- **Public routes** (`x-access: public`) get no token and no school. **Platform** routes get the token only. **User** routes get the token and, if there is one, the active school. **School** routes require an active school: without one nothing is sent and you get `SCHOOL_REQUIRED`. Credential headers a caller adds are overwritten.
- A **401** is retried exactly once with `getToken({ forceRefresh: true })`, only if that returns a different token.
- Every failure is an **`ApiError`** with a machine `code` (the gateway's closed list, plus `NETWORK_ERROR`, `TIMEOUT`, `ABORTED`, `SCHOOL_REQUIRED`, `UNEXPECTED_RESPONSE`), `status`, `requestId`, field `details`, `retryAfterSeconds`. **Translate from `code`; the English `message` is a fallback.** Tokens never appear in errors.
- Timeout (default 15 s) and cancel (`signal`) are built in.
- **Money** is `Int64String`: use `parseInt64`, `toInt64String`, `minorToDecimal`, `formatMinor` (BigInt, exact above 2^53), never `Number`.

## Regenerating
`npm run generate -w @oruschools/api-client` after the gateway's `openapi.json` changes; `npm test` fails when `src/generated` is stale. Never edit `src/generated`. The `X-School-Id` header is removed from the generated types on purpose (the transport sends it from the active school); `routes.gen.ts` records each route's access class from the contract.
