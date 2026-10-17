# Environment, configuration and secrets

## Rules
1. **Secrets live only in the API gateway** (`apps/api-gateway/.env.local`) or the VPS secret store. Web and mobile apps receive **public** configuration only.
2. `NEXT_PUBLIC_*` variables are embedded in the browser bundle. They must never hold secrets. The Firebase web API key is public by design (it identifies the project; access is controlled by Auth + gateway).
3. Real values are never committed. `.gitignore` ignores `.env*` except `*.env.example`; `npm run check:drift` fails if an `.env*` file is not ignored or if a key in a local `.env.local` is missing from `.env.example`.
4. **Flutter apps must not be built with the gateway's secrets.** Earlier guidance ("pass `.env.local` down to ... the mobile apps during build") was wrong: R2 and Admin credentials would end up inside an APK/IPA. Pass only public values: `flutter build apk --dart-define=API_URL=https://api.example.com --dart-define=FIREBASE_PROJECT_ID=...`.
5. If a secret was ever shared, pasted into chat, or committed: **rotate it**. The R2 credentials currently in the local `.env.local` should be rotated if that file has left this machine.

## Where each variable goes
See the sections of the root `.env.example` (single reference). Per-app templates: `apps/*/.env.example`.

| App | File | Contains |
|---|---|---|
| api-gateway | `apps/api-gateway/.env.local` | secrets (R2, Firebase project), `PORT`, `CORS_ORIGINS` |
| saas-admin, web-admin, landing-page | `apps/<app>/.env.local` | `NEXT_PUBLIC_*` only (Next.js loads env from the app directory, **not** the monorepo root) |
| Flutter apps | none | `--dart-define` at build time |

## Validation approach (implemented in P1-1, `apps/api-gateway/src/config/env.ts`)
The gateway validates `process.env` once at startup with a class-validator schema (ADR-0008; zod is not used): `PORT` is 1-65535, `LOG_LEVEL`/`NODE_ENV` are from fixed lists, `CORS_ORIGINS` entries are bare http(s) origins (no paths or wildcards), and in production `CORS_ORIGINS` and `FIREBASE_PROJECT_ID` are required. Boot fails with one message listing every problem by variable name (never printing values). No other code reads `process.env` directly. Next apps validate `NEXT_PUBLIC_*` in a single `env.ts` module imported by the root layout.

## Local ports
`api-gateway` 3000, `saas-admin` 3001, `web-admin` 3002, `landing-page` 3003, Data Connect emulator 9399.

## Creating the first platform owner (SUPER_ADMIN)
Run once, on the owner's machine, after the owner has signed in once to the project (so the account exists):

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json     # stays on this machine, never committed
node tools/bootstrap-super-admin.mjs --email you@example.com --project <firebase-project-id>           # dry run
node tools/bootstrap-super-admin.mjs --email you@example.com --project <firebase-project-id> --apply   # grant
```
`--revoke` removes the role. Sign out and in again afterwards (the role is carried in the ID token). Against the emulators set `FIREBASE_AUTH_EMULATOR_HOST` and `DATA_CONNECT_EMULATOR_HOST` instead of credentials. The script never creates accounts and is never exposed over HTTP.

