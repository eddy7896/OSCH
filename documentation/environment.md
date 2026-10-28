# Environment, configuration and secrets

## Rules
1. **Secrets live only in the API gateway's process** (read from the master `.env.local` at the repo root) or the VPS secret store. Web and mobile apps receive **public** configuration only.
2. `NEXT_PUBLIC_*` variables are embedded in the browser bundle. They must never hold secrets. The Firebase web API key is public by design (it identifies the project; access is controlled by Auth + gateway).
3. Real values are never committed. `.gitignore` ignores `.env*` except `*.env.example`; `npm run check:drift` fails if an `.env*` file is not ignored or if a key in a local `.env.local` is missing from `.env.example`.
4. **Flutter apps must not be built with the gateway's secrets.** Earlier guidance ("pass `.env.local` down to ... the mobile apps during build") was wrong: R2 and Admin credentials would end up inside an APK/IPA. Pass only public values: `flutter build apk --dart-define=API_URL=https://api.example.com --dart-define=FIREBASE_PROJECT_ID=...`.
5. If a secret was ever shared, pasted into chat, or committed: **rotate it**. The R2 credentials currently in the local `.env.local` should be rotated if that file has left this machine.

## Where each variable goes
See the sections of the root `.env.example` (single reference). Per-app templates: `apps/*/.env.example`.

| App | File | Contains |
|---|---|---|
| everything | `.env.local` at the repo root (the one master file) | gateway secrets (R2, `GOOGLE_APPLICATION_CREDENTIALS`, Firebase project), `PORT`, `CORS_ORIGINS`, and `NEXT_PUBLIC_*` |

The gateway reads it via `ConfigModule` (`../../.env.local`), each Next app via `loadEnvConfig` in `next.config.ts`, and `tools/bootstrap-super-admin.mjs` via `process.loadEnvFile`. Only `NEXT_PUBLIC_*` values reach browsers (Next inlines only those).
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


## Master file and Next apps (fix, 2026-10-21)
`loadEnvConfig` in each `next.config.ts` must be called with `forceReload: true`: Next has already read the app's own folder, and without it the call returns that cached result, so the root `.env.local` was never loaded. Next also inlines only `NEXT_PUBLIC_*` values it saw before the config ran, so an app that needs public values lists them in `env` in its `next.config.ts` (saas-admin does; public values only).

`NEXT_PUBLIC_BASE_DOMAIN` (public): the domain schools live under. In development `localhost`, and a school is opened at `http://<school>.localhost:3002` (browsers resolve `*.localhost` to this machine). `CORS_ORIGINS` then needs `http://*.localhost:3002`.

R2 uploads: see `documentation/r2-setup.md` (bucket, token, public address, `tools/r2-setup.mjs` for CORS, `tools/r2-smoke.mjs` for a real round trip). Leaving the four R2 keys empty is fine: uploads answer 503.

Running the gateway in development: `npm run start:dev -w api-gateway`, one copy only (a second copy on the same port fails to start). The build no longer deletes `dist` while watching (`deleteOutDir: false`) and does not use incremental build info, because a watcher that deleted `dist` while another process was starting left `Cannot find module .../dist/main`. `npm run build` still starts from an empty `dist`.

Deploying the Data Connect schema and connector to production: `npx firebase dataconnect:sql:diff --project oruschools` first (it must print only the statements you expect; if it prints "the complete expected SQL schema" the service cannot read the database), then `npx firebase deploy --only dataconnect --project oruschools`. **Never add a value to an existing enum and use it (as a column default, for example) in the same deploy.** Postgres refuses to use a new enum value in the transaction that adds it; the migration then fails and Data Connect reports only `Deadline exceeded` after several minutes (this happened on 2026-10-22 with `AcademicYearStatus.PLANNED`, and deleted the connector until it was fixed). Deploy the new value first (with the old default), then the change that uses it. The CI emulator starts from an empty database, so it cannot catch this; read the `sql:diff` output before deploying. The CLI's own 5-minute timeout can fire while the service is still working, so check `sql:diff` afterwards. Deploying replaces the connector, so the gateway's database calls fail for the moments in between.

## Demo school and the Auth emulator in the browser
`npm run demo` (see `documentation/demo-school.md`) runs the whole stack against the local emulators. The Next apps connect their Firebase sign-in to the Auth emulator only when `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` is set AND the build is a development build (`config.authEmulatorHost` is empty in production builds, whatever the environment says). Never set it in `.env.local`: it is for the demo command only.

## Flutter packages that use native assets (Drift)
`packages/flutter-sync` depends on `drift`, whose `sqlite3` package builds a native library through a build hook, and the generated database code comes from `build_runner`. Both compile Dart with `dart compile kernel`. A Flutter SDK whose `bin/cache/dart-sdk/bin/snapshots` has no `gen_kernel_aot.dart.snapshot` cannot do that: `flutter test` in `packages/flutter-sync` then fails with "gen_kernel_aot.dart.snapshot is not an AOT snapshot". Repair the Flutter install (for example `flutter precache --force`, or re-download the SDK cache), or run the generator and the tests with a standalone Dart SDK of the same version. CI uses `subosito/flutter-action`, which has the file. After changing the tables in `packages/flutter-sync/lib/src/local_database.dart`, regenerate with `dart run build_runner build` in that folder and commit `local_database.g.dart` (CI fails if it is stale).

### A working local Flutter SDK without touching the installed one
If the installed Flutter lacks `gen_kernel_aot.dart.snapshot` (see above), `flutter test` and `flutter run` fail for anything that uses a native-asset package (`drift`, `flutter_secure_storage`, `local_auth`, `connectivity_plus`). To get a working copy without modifying the install, clone it (copy-on-write on APFS, so it costs no disk space) and add the missing file from a standalone Dart SDK of the same version: `cp -cR /opt/homebrew/share/flutter ~/flutter_fixed`, copy `dart-sdk/bin/snapshots/gen_kernel_aot.dart.snapshot` from the standalone Dart SDK (3.13.4 at the time of writing) into `~/flutter_fixed/bin/cache/dart-sdk/bin/snapshots/`, and run `~/flutter_fixed/bin/flutter`. The phone-app integration tests run on a booted simulator against the stack from `ORU_KEEP=1 bash tools/tests/dart-gateway.sh`: `cd apps/mobile-teacher && flutter test integration_test/signin_test.dart -d <simulator> --dart-define=ORU_GATEWAY_URL=http://127.0.0.1:3200 --dart-define=ORU_AUTH_EMULATOR=127.0.0.1:9099` (the Android emulator reaches the computer at 10.0.2.2).
