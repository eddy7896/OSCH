# ADR-0015: Phase 5, parent and transport

Status: **Proposed (2026-10-30).** Nothing below binds the build until the owner accepts it. Each decision has a recommendation; building that needs none of them (transport in the ERP, the Parent app's read screens) goes ahead first (`documentation/phase5_plan.md`).

## Decisions needed
1. **Payment provider: Razorpay or Stripe.** Recommendation: Razorpay. The schools are in India and fees are in rupees; UPI, net banking and cards are native to it, and its fees and settlement suit Indian schools. The design is the same for either: the gateway creates a payment intent, the app opens the provider's checkout, a **signed webhook** is verified before any write, an idempotency key per provider event prevents a second receipt, and the receipt uses the existing gap-free numbering (ADR-0004: money in integer minor units).
2. **Messaging backend (finding F7): gateway-mediated or Firestore in front of clients.** Recommendation: gateway-mediated with Data Connect; Firestore in front of clients breaks the rule that all access goes through the gateway and cannot enforce office hours or the audit trail. The full set of messaging decisions D1 to D8 is in `documentation/modules/messaging-and-notice-board.md`.
3. **SMS fallback for parents who have no app or no push.** Options: none in version 1 (the teacher is told who was not reached), or one provider (for example MSG91 or Twilio). Recommendation: none in version 1.
4. **Maps and ETA.** Options: show a bus on a map with a provider's map tiles, or show a stop list with an "ETA" computed on the server from the route and the last ping. Recommendation: the stop list with a server-side ETA first; a map tile provider is chosen separately because it needs an API key, billing and a privacy review.
5. **Location pings.** Recommendation: a driver app sends a ping every 10 seconds while a trip is active (30 seconds when slow or battery below 20%), in batches when offline; pings are kept 7 days, then deleted; only trips in progress are shown to parents; ingest is limited per driver and per school. A parent sees only their own child's bus.

## What is already decided and not reopened
Tenant isolation (ADR-0001), roles and who approves (ADR-0007), staff and driver accounts (ADR-0011), money in minor units (ADR-0004), mobile offline-first (ADR-0003), languages (ADR-0006).

## Consequences
Until 1 and 2 are accepted, `P5-2` and `P5-3` do not start. Until 4 and 5 are accepted, `P5-5` starts only with the ingest and storage, not the map.
