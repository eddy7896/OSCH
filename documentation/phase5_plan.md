# Phase 5 Plan: Parent and Transport

> Status: **started 2026-10-30, owner said "start implementation for phase 5" and to keep real-phone testing on hold (P4-7 stays open).** Task IDs follow `implementation_plan.md` Phase 5. Statuses are updated here as work lands. Decisions the owner still has to make are in `documentation/decisions/ADR-0015-phase5-parent-transport.md` (**Proposed**) and `documentation/modules/messaging-and-notice-board.md`.

**Phase goal (unchanged):** parents see their child's day and pay fees; buses are tracked.

## 1. Starting point (verified 2026-10-30)
| Fact | Evidence |
|---|---|
| Phase 4 is built except physical phones, release and the real push connection | `documentation/phase4_gate.md` |
| Parent accounts are linked to students: `ParentLink` resolves the `linked` scope (which children, so which classes) | `dataconnect/schema/schema.gql` type `ParentLink`; `TeachingScope.mine()` returns `children`; attendance and report cards already serve `linked` |
| The RBAC matrix already has `transport` for every role in this phase | `packages/rbac/src/matrix.ts`: Transport manager school CRUD and export, Driver own read and update, Parent linked read, Principal read |
| The navigation already has a Transport module | `packages/rbac/src/navigation.ts` key `transport` |
| No transport tables, routes or screens exist | no `Vehicle`, `Route`, `Stop`, `Trip` in `schema.gql` |
| `mobile-parent` and `mobile-driver` are themed shells | `apps/mobile-parent`, `apps/mobile-driver` |
| Fees are school-wide only; a parent seeing a child's invoices is "served later" | `apps/api-gateway/src/fees/fees.controller.ts` header comment |
| Messaging and the notice board are planned, not built | `documentation/modules/messaging-and-notice-board.md` |
| No payment provider, SMS provider or maps provider is chosen | ADR-0015 |

## 2. Order of work
The owner's answers are needed for payments, messaging, SMS and maps, so the work that needs none of them goes first.

1. **Transport in the ERP** (P5-4): vehicles, routes, stops, student assignments, drivers, manifests. Server first, then the web screens.
2. **Parent privacy and the Parent app foundation** (P5-9, P5-6): sign-in, linked children and a child switcher, "How is my child today?" from endpoints that already serve `linked` (attendance, report card, timetable), then fees once the fee routes serve `linked`.
3. **Driver app and location** (P5-7, P5-5): after the routes exist; drivers need the manifest. Ping ingest has its own decisions (interval, retention, maps) in ADR-0015.
4. **Payments** (P5-2) after ADR-0015 is accepted.
5. **Messaging and the notice board** (P5-3, P5-8) after the messaging ADR.

## 3. Tasks
| ID | Task | Size | Acceptance |
|---|---|---|---|
| P5-1 | ADR-0015 (Proposed): payment provider, messaging backend (F7), SMS fallback, maps and ETA, location retention | S | accepted by the owner |
| P5-4a BUILT (the server half: `Vehicle`, `TransportRoute` and `RouteStop` tables (stop coordinates as micro-degree integers); `GET/POST /v1/transport/vehicles`, `PATCH/DELETE .../vehicles/:id`, `GET/POST /v1/transport/routes`, `GET/PATCH/DELETE .../routes/:id`, `PUT .../routes/:id/stops` (the whole ordered list replaces the old one: positions are 1, 2, 3, a repeated name or a lone latitude is refused before anything is written); a plate is unique in a school; a vehicle on a route cannot be deleted; a route's driver must be a member of staff with an account that is an ACTIVE DRIVER here; a vehicle or driver of another school is refused (checked in the database for the vehicle and the staff record, in the gateway for the role); only the Transport manager writes, the Principal reads; a driver (own scope) sees only the routes they drive and no vehicle list, a parent (linked) sees none until P5-4b; every change writes its audit row; verified: 6 tests on the real emulators (`transport.integration.ts`: roles, input checks, plates, a vehicle in use, routes with vehicle and driver, a non-driver refused with no half-made route left, stop order, atomic refusals of bad lists, a driver's own routes, deletion with stops, another school sees nothing and cannot use this school's vehicle or driver, the same plate in two schools), all four matrix parts (5925 tests, the new routes included), `test:database` 145, `test:dataconnect` 40, `npm test`; **found:** the Operations manager has no `transport` grant (the Transport manager does), so the earlier line in this plan was wrong and is fixed; a Data Connect `_Data` list variable is not supported by the generated Admin SDK, so stops are written one at a time like marks (a failure part way leaves a shorter list that the same call puts right); a PATCH body's DTO has every field as an own key, so "nothing to change" is judged on defined values; **not built:** student assignment and manifests (P5-4b), the web screens (P5-4c); the production database needs the owner's deploy of the new tables) | Transport in the ERP, part 1: vehicles, routes, stops | M | a stop order is gap-free and unique per route; a driver must be an active member with the driver role (ADR-0011) |
| P5-4b | Student assignment to a route and stop, the manifest per route, a parent's `linked` read of their child's route | M | a student is on at most one route per direction; a parent sees only their own children's routes |
| P5-4c | Web admin Transport screens: vehicles, routes and stops, assigning students, the manifest, printable | M | web tests as for the other screens |
| P5-9 | Parent privacy: linked children only (tested for every parent-facing route), guardian verification flow | M | E-TEN and E-RBAC for the linked scope on every route a parent may call |
| P5-6a | `mobile-parent` foundation: sign-in, linked children and switcher, "How is my child today?" | L | works with the network off after one sync |
| P5-6b | Parent app: attendance, report card, timetable, calendar | M | as above |
| P5-6c | Fees and receipts for a parent (the fee routes serve `linked`), payment initiation after P5-2 | M | a parent cannot see another child's invoice |
| P5-7 | `mobile-driver`: Today, Routes, Active Route Mode (56 to 72 px targets), boarding and drop-off, an emergency action, an offline trip log | XL | driver UI target-size check |
| P5-5 | Location pipeline: pings, ingest with tenant check and rate limits, retention, ETA | L | location ingest rate limits |
| P5-2 | Payments | XL | webhook replay and forgery tests; provider sandbox |
| P5-3, P5-8 | Messaging and the notice board | XL, M | E-MSG-*, E-BOARD-* (`documentation/modules/messaging-and-notice-board.md`) |

## 4. Gate (the phase closes only when all pass)
- E-MSG-* and E-BOARD-* (office hours, audit completeness, audience), as in the messaging plan.
- Payment webhook replay and forgery tests; payments tested in the provider's sandbox.
- A parent cannot read an unlinked student's attendance, grades, fees, route or messages (E-TEN, E-RBAC, the generated matrix).
- Driver UI target-size check (56 px and above on Active Route Mode).
- Location ingest rate limits and tenant check.
- Physical-phone results (P4-7) recorded or listed as not proven; a gate review page `phase5_gate.md`; `CLAUDE.md` "Current reality" and the Hub updated.

## 5. Risks
| Risk | Mitigation |
|---|---|
| A parent sees another family's child | every parent-facing route is `linked`-scoped in the gateway and is in the generated matrix; a test per route with two families |
| Live location of children is sensitive | pings are kept for a short, fixed period (ADR-0015); a parent sees only their child's bus and only while a trip is running; no raw coordinates in logs |
| Payments: duplicate or forged webhooks, double receipts | idempotency key per provider event; signature check before any write; receipts numbered in the existing gap-free sequence |
| Scope | vertical slices as in Phase 4; the ERP side first so the apps have data |
| No physical phones | stays open and is stated, as in Phase 4 |

## 6. Open items for the owner
ADR-0015 lists them: payment provider, messaging backend, SMS fallback provider, maps and ETA provider, how long location pings are kept and how often a driver sends them. Messaging decisions D1 to D8 are in the messaging plan.
