# Offline sync: what Phase 3 gives the engine, and the rules it must follow

Status: **groundwork** (P3-10, ADR-0013 decision 9). The sync engine itself (local database, queue, background push and pull) is Phase 4. This page is the contract between the two: the server pieces that exist today, and the conflict rule for every Phase 3 entity, so the engine can be built without guessing.

## The model in one paragraph

The mobile apps write to a local database first and queue each change. The queue sends a change to the gateway when there is a connection and **may send it more than once** (the answer can be lost). The gateway therefore makes every such write **safe to repeat**. A device also needs to learn that a record was **removed** while it was away, so removals leave a **tombstone**. The gateway stays the system of record: on conflict the server's rule below decides, never the device's clock.

## What exists today

| Piece | Where | Behaviour |
|---|---|---|
| Client-supplied submission id | `PUT /v1/attendance/classes/:id/days/:date` (`submissionId`), `PUT /v1/grades/exams/:id/marks` (`submissionId`) | The same id again returns the current state and writes nothing, not even an audit row. |
| Client-supplied request id | `POST /v1/leave/requests` (`clientId`) | The same id again returns the first request. Two at the same instant make one (unique key on staff + `clientId`). |
| Idempotent by nature | timetable slot (`PUT`), substitution (`PUT`, id derived from lesson and date), attendance status label, staff check-in and check-out, balance and allowance changes | The same request repeated leaves the same state. |
| Tombstones | `GET /v1/sync/tombstones?since=<UTC moment>&entityType=&limit=` | A removal of a lesson (`TimetableEntry`), cover (`Substitution`), attendance exception (`AttendanceMark`) or `Mark` leaves a row written **in the same transaction**. Pages are ordered by time; pass `next` as the next `since`. A device hears only about what it may read: a Teacher about their own classes and cover duties, a Parent about their children's classes, the school-wide roles about everything their grants allow. |

Tests: `apps/api-gateway/test/harness/sync.integration.ts` ("replaying any submission any number of times leaves one result"), `packages/database/test/notifications.integration.ts` (tombstones are in the same transaction).

## Rules the engine must follow

1. **Ids.** The device makes the id (a UUID) for anything it creates, and a `submissionId`/`clientId` for any batch it submits. It keeps them until the server has answered. Reusing an id is always safe; changing the body under an id already answered has no effect (the first answer stands).
2. **Order.** Changes are sent oldest first. A change that depends on a parent (a mark on an exam) waits until the parent is confirmed.
3. **Pull.** After a push, pull the school's current state for the entities it shows, then ask for tombstones since the last `next`. A tombstone for a parent means its children are gone too (a removed lesson takes its cover with it; no tombstone is written per child in that case).
4. **Never invent a clock.** `deletedAt` and every `createdAt` are the server's time. The device's clock is used only to show "saved on this device".
5. **Refusals are final.** A 4xx answer (a locked day, a clash, a mark above the maximum) is shown to the user and the queued change is dropped; it is not retried.

## Conflict rule for every Phase 3 entity

"Server wins" means the server's current value is shown after the next pull and the device's queued change, if refused, is surfaced to the user.

| Entity | Who writes | Rule when two writes meet | Replay |
|---|---|---|---|
| Bell schedule, working days, periods | Academic admin (web) | Last write wins; a period in use cannot be deleted or become a break (409). Not edited offline. | n/a |
| Teacher subjects, class teachers, parent links | Academic admin / System admin (web) | Unique keys decide; a repeat is a 409 the client treats as done. Not edited offline. | safe |
| Timetable entry | Academic admin | **Clash refused by the database** (class and teacher, per day and period): the second writer gets 409 naming `classBusy`/`teacherBusy`. Same slot written twice: the later replaces. | safe |
| Substitution | Academic admin | One substitute per lesson per date and one place per period per date, by database key. Choosing again replaces. Removing a lesson removes its cover (tombstone of the lesson). | safe |
| Attendance day and marks | Class teacher (offline) | While the day is **unlocked**, the later submit replaces the exceptions list (the list is the whole truth for the day). Once **locked**, a teacher's submit is refused (409 `dayLocked`) and only the Academic admin's audited correction changes it. A removed exception leaves a tombstone. | `submissionId` |
| Staff attendance | The person (offline) | One row per person per day; check-in is kept at the first time; check-out at the first time. HR corrects, audited. | safe |
| Exam, term, grade bands | Academic admin (web) | Last write wins; an exam with marks cannot be deleted or have its maximum lowered below a mark. | n/a |
| Marks | Subject teacher (offline) | Per student: the later entry replaces; **a mark above the maximum is refused by the database**. Only the students listed are touched. A cleared mark leaves a tombstone. | `submissionId` |
| Leave request | The employee (offline) | A person cannot hold two overlapping requests (409). Decisions are the Principal's, online only; a decided request is never changed by the device. | `clientId` |
| Leave types, allowances | HR (web) | Last write wins; an allowance cannot go below days taken (409). | n/a |
| Notifications | The server | Read-only for devices; "read" markers are per person and merge by union. | safe |

## What the phone's engine does with these rules (P4-2b, built)

`packages/flutter-sync`: the outbox id is the `submissionId`/`clientId` (rule 1); changes go one at a time, oldest first, a child only after its parent was accepted (rule 2); a 4xx is final, shown, and fails whatever depended on it (rule 5); the device clock only times retries (rule 4). A 5xx, rate limit, timeout or lost connection keeps the change and backs it off (2 s doubling to 5 min, half random), and never holds up the changes behind it. Tested against the real gateway: `packages/flutter-sync/test/real_gateway_sync_test.dart` (E-SYNC-1, 3, 4).

## Not decided yet (Phase 4)

- The shape of the pull for each entity ("changes since") beyond tombstones; today a device reads the normal list endpoints.
- Compaction: tombstones are kept for now; a retention rule comes with the engine.
- Push delivery (FCM) of notifications, which needs the apps' device tokens (ADR-0013 decision 9).
