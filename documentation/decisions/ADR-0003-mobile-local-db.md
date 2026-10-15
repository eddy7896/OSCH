# ADR-0003: Flutter local database and sync

- **Status:** Proposed (2026-10-15) — needs owner sign-off
- **Supersedes:** "SQLite / Isar / WatermelonDB" lists in `agent_contexts.md`, `system_memory.md`, roadmap, SSOT

## Context
Docs leave the choice open. WatermelonDB is a React Native library and does not apply to Flutter; Isar's maintenance is uncertain (verify current status before choosing it).

## Decision
**Drift (typed SQLite)** as the local source of truth + an **outbox table** for the sync queue. Each queued mutation has a client-generated UUID (idempotency key), `createdAt`, `deviceId`, `baseVersion`. The gateway applies mutations idempotently and resolves conflicts per entity rules (attendance: last-writer-wins per student/day with audit; gradebook: per-assessment lock/merge) — rules to be written in `modules/offline-sync.md` before Phase 4.

## Consequences
- Verify Drift's current version/API from `pubspec.lock` and its docs before coding.
- Sync protocol (idempotency, ordering, partial failure) is the riskiest piece of Phase 4; it gets its own eval group (E-SYNC-*).
