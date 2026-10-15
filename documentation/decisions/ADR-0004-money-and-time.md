# ADR-0004: Money and time representation

- **Status:** Accepted (2026-10-15, Phase 0 schema hardening; audit findings F5, F11)
- **Supersedes:** `Float` amounts and date-only `createdAt` in the original schema

## Context
`Invoice.amount` and `Payroll.amount` were `Float`: binary floating point cannot represent most decimal amounts exactly, so totals, refunds and reconciliation drift by paise. `createdAt` was a calendar `Date` (no time), which makes ordering, audit and sync conflict resolution ambiguous.

## Decision
- **Money is an integer count of minor units** (paise for INR) stored as `Int64` in fields named `*Minor` (`amountMinor`). Never `Float`/`Double`. `Int32` is not enough: ₹2.14 crore overflows it.
- The **currency and display locale belong to the school** (`School.currency` default `INR`, `School.locale` default `en-IN`); rows do not carry a currency.
- Formatting/rounding lives in one shared money library (task P2-6), used by gateway, web and Flutter. Indian grouping (₹1,82,40,000) is a *formatting* concern of the `en-IN` locale, not a constant.
- **Timestamps** (`createdAt`, audit time) are `Timestamp`, defaulting to `request.time`. Business calendar dates (due date, pay date, exam date, leave range) stay `Date`.
- Statuses and roles are Data Connect **enums**, not free strings, so invalid values are rejected by the database.

## Consequences
- JSON clients receive `Int64` as a string; the API client must parse it with `BigInt`/string-safe code.
- Changing an existing database from `Float amount` to `Int64 amountMinor` and string→enum is **not an in-place migration** (the local emulator's planner fails on it). There is no production data yet; any database that already holds data needs a hand-written migration before this schema is deployed.
- Enforced by `evals/spec.test.mjs` (E-FIN-S1, E-FIN-S2, E-RBAC-S2).
