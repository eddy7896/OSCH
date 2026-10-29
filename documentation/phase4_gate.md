# Phase 4 gate review (status, not yet closed)

The gate is in `documentation/phase4_plan.md` section 5. This page says, for each criterion, which test proves it and what was run, and what
is **not proven**. Phase 4 **cannot close yet**: P4-7 (physical phones) and P4-8 (release pipeline) need real phones, store accounts and a
Firebase project (ADR-0014 decision 12), and the real push connection (P4-6) needs `firebase_messaging` and that project. Everything that can be
proven on simulators and the real gateway on the emulators has been.

## What was run (2026-10-29/30, `staging` after PR #136 and this change)

| Command | Result |
|---|---|
| `npm run eval` | 130 passed, 0 failed |
| `npm run check:drift` | 0 errors, 1 old warning |
| `npm test` | 23 tasks successful |
| `flutter test` in `packages/flutter-app` against the real gateway on the emulators (`ORU_GATEWAY_URL`, `ORU_AUTH_EMULATOR`) | 103 passed (3 skipped without the stack) |
| `flutter test` in `packages/flutter-sync` and `packages/flutter-auth` | 60 and 47 passed |
| `apps/web-admin`: `npx vitest run` | 281 passed, 38 skipped |
| iOS simulator integration tests: `apps/mobile-teacher/integration_test/{signin,attendance,marks,leave}_test.dart`, `apps/mobile-staff/integration_test/{signin,home}_test.dart` | passed when last run (each after its own task); not re-run together for this page |
| `npm run test:gateway` for the routes added after P4-S4 (`GET /v1/school/geofence`) | **not run locally** (a demo stack held the emulator ports); the CI shards run it |

## The criteria

| ID | Criterion | Proven by |
|---|---|---|
| E-SYNC-1 | Attendance taken offline syncs once; replay leaves one result | `packages/flutter-sync/test/real_gateway_sync_test.dart :: E-SYNC-1` and `E-SYNC-1b`; also leave (`packages/flutter-app/test/real_leave_test.dart`, a request made offline is sent once) and check-in (same file, the clerk's check-in and out) |
| E-SYNC-2 | The queue survives a kill mid-sync | `packages/flutter-sync/test/sync_engine_test.dart :: E-SYNC-2` (a process kill is simulated; **not** a kill of an app on a phone: P4-7) |
| E-SYNC-3 | A refused item does not block the rest and is shown | `packages/flutter-sync/test/real_gateway_sync_test.dart :: E-SYNC-3`; `sync_engine_test.dart` |
| E-SYNC-4 | Two devices, the written rule, both orders | `packages/flutter-sync/test/real_gateway_sync_test.dart :: E-SYNC-4` |
| E-SYNC-5 | Six states match the queue; a removal on the server removes the record | `real_gateway_sync_test.dart :: E-SYNC-5`; `sync_pull_test.dart :: E-SYNC-5` |
| E-MOB-1 | analyze and test green; no literal copy, hex colour or dark theme; 48 px targets and right to left proved by widget tests | `flutter analyze` clean in every package; `npm run check:drift`; the Urdu and size checks in `packages/flutter-app/test/*_screen_test.dart` for the Today, attendance and marks screens. **Not covered:** a right-to-left and size test for the Leave, Check-in, Approvals, Notifications and Announcements screens (they use the same widgets, but the test is not written) |
| E-RBAC-FULL | Every new route is in the generated matrix | the matrix is generated from the registered routes (`apps/api-gateway/test/harness/matrix-suite.ts`), so devices, announcements, the stamp and `updatedSince` are covered; `GET /v1/school/geofence` is covered the same way once CI runs it |
| E-AUD-1 | Every new write route is audited | `apps/api-gateway/test/audit-binding.e2e-spec.ts` (every audited route bound to an operation) |
| Physical phones | results recorded or listed as not proven | listed below as not proven |
| Docs | `CLAUDE.md`, the Hub, this page | `CLAUDE.md` updated each task; the Hub's plan data and dashboard are current, its Git tab and screen previews are not |

## What the apps do, in one line each

Teacher app: Today (with her own check-in card), Attendance, Marks, Leave (request, queued and sent once), her own check-in and check-out, Cover duties, My classes with report cards, Notifications.
Staff app: Home, Attendance (check-in and check-out with the location stamp and a reason outside the rings), Leave, Announcements, Notifications, and the Principal's Approvals (online only).
Web admin gained: where each check-in was and HR's confirmation, the school location (System Admin), and Announcements (post and withdraw).

## Not proven

- **Everything on real phones** (P4-7): 2G throttling, airplane mode, a low-end Android, an app killed mid-sync, clock skew, Urdu right to left on a device, a 64 px target on the Driver's first screen (the Driver app has no screens yet).
- **The Android builds** of both apps (the simulator is iOS only); the `geolocator` and secure-storage plugins on Android; the iOS location prompt on a real phone.
- **Push delivery** (P4-6): no FCM or APNs connection exists; the apps use `NoPush` and read notices on the next pull. A real push, its registration on a real token and "tap opens the inbox" are tested with a fake push service only.
- **The check-in reason path against the gateway**: the demo school has no point set; the rules are tested on the phone (same numbers as `geofence.spec.ts`) and on the gateway (`geofence.integration.ts`), not end to end together.
- **Hindi and Urdu strings** are drafts, never reviewed by a native speaker.
- **The school's time zone** is not modelled: "today" on the phones is the phone's date; the gateway uses its own.
- **Production data**: the new Data Connect columns and tables (geofence, device tokens, `updatedAt`, announcements) need the owner's deploy.
- **Hub**: Git tab and screen previews not updated since P4-4.
