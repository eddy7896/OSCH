# ADR-0002: Identity provider

- **Status:** Accepted (2026-10-15, on the instruction to implement Phase 0; reverse by superseding this ADR)
- **Supersedes:** "Auth0 or Firebase Auth" in `system_context.md`, "OAuth2 / Auth0" in SSOT §12

## Context
Docs list Auth0 and Firebase Auth as alternatives. The repo already uses Firebase (`.firebaserc`, `NEXT_PUBLIC_FIREBASE_*` env, `User.id` keyed by Firebase Auth UID, Data Connect).

## Decision
**Firebase Auth only.** Gateway verifies ID tokens with the Admin SDK. Roles are not trusted from client claims alone: the gateway loads `SchoolMember.schoolRole` per request (cacheable, short TTL). Custom claims may carry `globalRole` for SUPER_ADMIN only.

## Consequences
- One provider, no Auth0 dependency. Phone/OTP login for parents/drivers available via Firebase.
- Multi-school users: token identifies the user; the active school is chosen explicitly and checked against membership.

See ADR-0011 for how staff and driver accounts are created (admin-created, set-password link or phone code); it supersedes the invitation-only onboarding for those roles.
