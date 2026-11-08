# ADR-0018: Messaging and the school notice board

- **Status:** Accepted (2026-11-08), owner answers in chat to the questions D1 to D8 of `documentation/modules/messaging-and-notice-board.md` (D8 and the unanswered details take the recommendation, marked **default**).
- **Plan:** `documentation/modules/messaging-and-notice-board.md`. Tasks P5-3 and P5-8 in `documentation/phase5_plan.md`.
- **Builds on:** ADR-0001 (tenant isolation), ADR-0007 (roles; silos), ADR-0013 (notices in the cause's transaction), ADR-0014 (offline sync), ADR-0015 decision 2, ADR-0016 (comments: a different thing, in the open under a worksheet).

## Decisions
1. **Backend (D1):** messages go **through the gateway** and are stored in Data Connect. Nothing in front of the clients talks to a database.
2. **Office hours (D2): changed by the owner.** A message sent at any hour is **delivered at once** to the other person; the receiver may read and **reply whenever they choose**. There is no holding of notifications and no refusal outside office hours. This **amends** `documentation/guardrails.md` section 3 ("direct messaging operates strictly within Office Hours"), which is edited in the same change. What stays: **every message is logged to the central audit trail the System Admin can read**, and no unrestricted un-auditable messaging exists. Consequence for ADR-0016: the teacher's notice about a new comment (not held for office hours) is now consistent with this rule.
3. **Who may send one message to the whole class (D3):** the **class teacher** of that class; the **Principal and the Academic admin** may send to any class or grade. A subject teacher cannot broadcast (one-to-one only).
4. **Guardians (D4):** **a separate private conversation per parent account** for each student. Neither parent sees the other's messages.
5. **Notice board posters (D5):** the **Principal and the Academic admin**, and also the **Bursar for the Fees category** and the **transport manager for the Transport category**; each of the last two can post only in their own category.
6. **Languages (D6):** the sender writes **one text in one language**; screens around it are in the reader's chosen language. No per-language versions in version 1.
7. **Hiding and reporting (D7):** a sender may **hide** their own message for a short time (**default: 5 minutes**, like comments); a hidden message stays in the audit trail. A **Report** action on any message sends it to the **Principal**, who reviews reports.
8. **Naming (D8, default):** the table stays `Announcement`, extended with an audience (staff, parents, a grade, a class, all), category, pinned, publish and expiry dates; the parent-facing screen is called **Notice board**.
9. Unchanged from the plan: one way broadcasts (a parent replies privately about their own child, never into the broadcast); no phone numbers or emails shown to the other side; no attachments in version 1; no staff-to-staff messaging; no parent-to-parent chat; recipients of a broadcast are resolved on the server from the class's current students and their guardians; sending offline is saved on the phone and sent once.

## Consequences
- `P5-3a` (this ADR) is done; `P5-3b` onwards and `P5-8a` onwards can start. Office hours as a school setting are **not** needed for enforcement now; the System Admin audit view is.
- The guardrail text is changed; the golden hallucination set must not contain a question that still says messaging is limited to office hours (checked when the messaging module is built).
- Messages are children-related personal data: the children's data plan (`documentation/modules/children-data-protection.md`) applies (no child details in push text, retention, erasure).

## Status of the work
Decided only; nothing built.
