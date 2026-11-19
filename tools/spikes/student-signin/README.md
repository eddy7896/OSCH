# Student sign-in without a personal email (spike, 2026-11-19)

Settles ADR-0019 open decision 3 (and prepares task P8-2): can a student sign in with a school-scoped name and a temporary password, with no personal email?

**Run:** `npx firebase emulators:start --only auth --project demo-spike`, then `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 node tools/spikes/student-signin/run.mjs`. It refuses to run against anything but a local Auth emulator.

## Result on the Auth emulator: 15 of 15 checks pass
- An account can be created with a synthetic address on a reserved, never-routable domain (`<enrolment id>.<school code>@students.oruschools.invalid`, RFC 2606), unverified, with a password the System Admin chooses.
- The student signs in with it; the ID token carries the uid and `email_verified: false`, which is what the gateway's guard reads (the verified-email rule applies only to invitations, so a student account is not affected).
- The student changes their own password with their own token; the temporary one then stops working.
- A forgotten password has no mailbox to reset by: the System Admin sets a new temporary password (`updateUser`), and the old one stops working.
- The name is case-insensitive; the same enrolment id in another school is another account; the same name in the same school is refused (`auth/email-already-exists`); a disabled or deleted account cannot sign in.

## What this does NOT prove (unverified, to check against a real Firebase project before P8-2 is called done)
1. That a **real project accepts** the `.invalid` address (it is syntactically valid, and the existing staff accounts never needed a real mailbox, but no real project was touched).
2. The real project's **password policy** (minimum length and character rules) against the temporary passwords the gateway would generate.
3. That **refresh tokens are revoked** when the admin resets a password. The emulator does not model it (it answered 200 to an old refresh token); real Firebase documents that it does.
4. Sign-in rate limits and abuse protection for guessable names (`S0001.greenfield` is easy to guess), which is why a temporary password must be random and a first sign-in must force a change.

## Design this supports (for ADR-0019, owner to confirm)
- The sign-in name is shown to the student as **enrolment id plus school** (the student app asks for the school, then the id and password); the app adds the domain. No student ever types an email.
- The System Admin creates accounts for one student or a whole class and gets a **printable sheet of temporary passwords, shown once**. This differs on purpose from ADR-0011 (staff accounts, where the gateway never returns a password): a child has no mailbox, so the school must hand the password over. The cost is that the admin knows the password until the student's forced first change; credential issue and every reset are audited.
- A reset is by the System Admin only. There is no self-service "forgot password by email" for students.
- Parent consent for the account is recorded with the consent flow (P6-5c) before the account is made.
