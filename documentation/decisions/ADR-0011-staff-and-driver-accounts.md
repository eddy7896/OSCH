# ADR-0011: Staff and driver accounts are created by the System Admin

- **Status:** Accepted (2026-10-17), owner decision
- **Builds on:** ADR-0002 (Firebase Auth only), ADR-0007 (roles; only the System Admin grants roles), ADR-0008 (gateway)

## Context
Invitations (P1-6d) bring in a person who proves, with a verified email, that the link was meant for them. That does not fit staff and drivers: many have only a phone, and the school wants to onboard its own people without waiting for each to accept a link. The owner asked for admin-created credentials: phone-only people sign in by one-time code; email people receive credentials by email.

## Decision
`POST /v1/memberships/accounts` (school route, `memberships` grant: System Admin only) creates the Firebase account, the User row and the membership in one audited step (`membership.add`, details `via: account`, no contact details).
- **Email accounts get a password nobody knows** (32 random bytes, used once and discarded). The person sets their own through a **one-time Firebase set-password link**; the response says `nextStep: SEND_SET_PASSWORD_EMAIL` and the client asks Firebase to email it (`sendPasswordResetEmail`), which needs no email provider of our own. Chosen over emailing a generated password because a password in a mailbox is a credential at rest, and Firebase has no forced-change flag (it would need a claim enforced on every route). With a link the person sets their own password before ever signing in, so no forced change is needed.
- **The gateway never returns, stores, logs or emails a password or a reset link.** In particular it must never hand a reset link to the admin: with it the admin could set the password and take over the account. A resend is the client asking Firebase again.
- **Phone-only accounts have no password**: the person signs in by one-time code and lands in a school where the membership already waits. This also removes the "phone-only users cannot accept an email invitation" gap for staff and drivers.
- **An address or number that already has an account is never touched** (`409 ACCOUNT_EXISTS`): that person has not consented, so they are invited instead. Cost: a System Admin can learn that an address has an account, so the route is `@Strict()` (10 a minute per admin) and audited.
- **Atomic enough:** if anything fails after the Firebase account exists, it is deleted again; a failed attempt leaves no account behind (a crash between the two steps could still leave an unused account, which is harmless but blocks that address until support removes it).
- **PARENT is not creatable here.** Parents arrive through admissions and guardian links (Phase 2/5) or invitation. The admin cannot choose a password, an id or a school (all rejected); the role is exactly what the admin selects, and nobody changes their own membership (P1-6c).

## Consequences
- The web client (P1-9/P1-10) must, after a `SEND_SET_PASSWORD_EMAIL` response, call Firebase's `sendPasswordResetEmail(auth, email)`, and offer the same call as "resend". The email comes from Firebase's template and sender; deliverability, branding and quotas are not verified and need a test on a real project before launch.
- The Auth emulator reproduces both sign-in paths with its own endpoints (password reset via oobCode, phone via verification code); `accounts.integration.ts` proves them end to end.
- Invitations remain for people who already have, or should create, their own account (including a person at a second school).

## Addendum (2026-10-21): the platform owner creates a school's first System Admin
A new school has nobody who can sign in, and the platform owner has no tenant powers (ADR-0007: only a System Admin grants roles). So the one exception is narrow and owner-decided:
- `POST /v1/platform/schools/{id}/admins` (`@Platform()`, `platform_schools` update, `@Strict()`, audited as `platform.school.admin.create`): creates the Firebase account (same rules as staff accounts: unknown random password, set-password link sent by the client, existing address is a 409, a failure after creation deletes the account) and an ACTIVE `SYSTEM_ADMIN` membership in one audited Data Connect transaction (`ProvisionSchoolAdmin`).
- The role is not a field: it is `SYSTEM_ADMIN` in the mutation. The body cannot carry a role or school.
- **Only while the school has no active System Admin** (409 `CONFLICT` otherwise), checked in the gateway for a clean error and again inside the transaction. After that the school's own System Admin grants roles; the platform owner cannot add more. If a school loses its only admin, that is a support case (not built).
- Who the caller is rests on the verified `globalRole` claim: the `User` row keeps `globalRole USER`, so the database cannot check it. The database guards what it can see (school exists, no active System Admin).
- Contact details never go into the audit row.
