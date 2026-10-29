# Messaging and the school notice board (plan, nothing built)

Status: **plan, proposed 2026-10-30, for owner review.** Nothing here exists in code. It becomes work in Phase 5 after the ADR in section 8 is accepted
(`documentation/project_plan.md` Phase 5 already names messaging and finding F7; `documentation/audit_2026-10-15.md` F7 says an ADR is needed first).

## 1. What the owner asked for

1. A **class teacher can send one collective message to the parents of the whole class**, as a single act (a class broadcast).
2. A **one-on-one conversation about a single student** between a teacher (or other staff) and that student's parent or guardian.
3. A **school-wide notice board for communication with parents** (holidays, exams, events, fees, transport), not just a push.

## 2. Rules that already exist and bind this design

- `documentation/guardrails.md` section 3: teachers and parents cannot initiate unrestricted, un-auditable messaging; direct messaging runs inside **office hours**; **every message is logged to a central audit trail the System Admin can read**.
- `documentation/OruSchools SSOT.md` section 6: 1:1 direct messaging teacher to parent with office hours; grade-wide broadcast as one-way announcements; moderated community groups (clubs, PTA) are a separate, later item and are **not** part of this plan.
- ADR-0007 (silos): a parent reaches only the staff of their own children; staff see only the parents they are allowed to. ADR-0006: every user-visible string comes from `packages/i18n`.
- CLAUDE.md rules 1 to 4: no client talks to the database; the gateway decides who may write to whom; the phone saves first and sends later (offline-first).
- F7 (open): the old chat design put Firestore in front of clients, which breaks "all access through the gateway". This plan assumes **gateway-mediated messaging** and asks the ADR to confirm it.
- `packages/rbac` today: Teacher and Parent hold `messages: own read, create`; every staff role reads `announcements` (staff-only, built in P4-S4); the System Admin reads the audit log.

## 3. The three features

### 3.1 Class broadcast (one to many, one way)
- **Who sends:** the class teacher of that class (the gateway already knows this: `classTeacherOf`). The Principal and the Academic admin may send to any class or grade. A subject teacher cannot broadcast (open decision D3).
- **Who receives:** every guardian with an account who is linked to a student **currently placed** in that class. The sender sees "reached N of M students" and which students have **no reachable guardian** (no account, no device), so the teacher knows to call.
- **One way.** Parents read it; they cannot reply into the broadcast. A "Reply privately" action opens a one-on-one thread (3.2) about that parent's own child, so the reply never reaches other parents.
- **Content:** a title and a text in the sender's language (D6 asks whether per-language versions are needed). No attachments in version 1.
- **Delivery:** a push notification and an entry in the parent's list; read counts per message for the sender (how many parents opened it), never who among them replied to whom.
- **Not office-hours bound as a conversation**, but the push is held until the school's quiet-hours end (D2).

### 3.2 Student conversation (one to one)
- A thread belongs to **one student** and has exactly two sides: one staff member (class teacher, a teacher of that student, or a role with a reason, for example the Bursar about a fee, the Principal) and the student's guardian(s) (D4: one thread per guardian, or one shared thread for both guardians).
- **Either side starts it**, but a parent can only start one with a staff member who teaches or is class teacher of their child (or the office roles the school allows). The title shows the student's name so the teacher never confuses two children of one family.
- **Office hours** (guardrail): each staff member has office hours (set in Settings by the System Admin, a school default plus an optional personal override). Outside them a message is still **saved and sent**, but the staff member is not notified until hours begin, and the parent is told when the reply will be seen. A message **to a parent** is also queued to the parent's quiet hours. The exact rule is decision D2, because the guardrail says "enforced".
- **No deleting.** A message can be hidden from view by its sender within a short window (D7) but stays in the audit trail. No editing.
- **Safeguarding:** no phone numbers or emails are shown to the other side; no contact between two parents through the school; a **Report** action on any message flags it to the Principal.
- Staff to staff messaging is **not** in this plan (staff use announcements; revisit if asked).

### 3.3 School notice board (school to parents)
- A parent-facing list of **posts** from the school: title, text, a category (Holiday, Exam, Event, Fees, Transport, General), an optional **pinned** flag, **publish-from** and **expire-on** dates, and an **audience**: all parents, or chosen grade levels, or chosen classes (and optionally staff).
- **Who posts:** the Principal and the Academic admin (the same people who post staff announcements today); the Bursar for the Fees category and the transport role for Transport (D5).
- **Where it shows:** a Notice board tab in the Parent app (cached, readable offline, expired posts drop off), a web page for the school to manage it, and a push when the poster chooses.
- **Relation to what exists:** staff **Announcements** (P4-S4) already have title, body, author, withdraw, notices and push. The proposal is to **extend announcements with an audience** (staff, parents, a grade, a class) rather than build a second system, and to rename the parent view "Notice board". The word "notice" is already used inside the code for a notification (`Notice` records), so the table keeps the name `Announcement` and only the screen title says Notice board (D8).
- A withdrawn or expired post is removed from phones through the existing tombstone rule.

## 4. How it would be built (sketch, to be fixed by the ADR)

Data Connect (every table has `schoolId`, every operation takes `$schoolId` and uses `@auth(level: NO_ACCESS)`):

| Table | Holds |
|---|---|
| `Conversation` | id, schoolId, kind (`STUDENT_THREAD`), studentId, staffMemberId, guardianUserId, createdAt, updatedAt |
| `Message` | id (the sender's `clientId`, so a resend is one message), conversationId or broadcastId, senderUserId, body, `sentAt` (the server's clock), `withinOfficeHours`, `hiddenAt` |
| `MessageReceipt` | messageId, recipientUserId, deliveredAt, readAt |
| `Broadcast` | id, schoolId, classId, senderUserId, title, body, sentAt, reachedCount, targetCount |
| `BroadcastRecipient` | broadcastId, guardianUserId, studentId, readAt |
| `OfficeHours` | schoolId, staffMemberId (null for the school default), weekday, from, to |
| `Announcement` (extended) | audience kind (`STAFF`, `PARENTS`, `GRADE`, `CLASS`, `ALL`), audience ids, category, pinned, publishFrom, expiresAt |

Gateway (routes under `/v1/messages`, `/v1/broadcasts`, `/v1/announcements`, each with `@Permission`, `@Audit` on writes, DTOs, in `openapi.json`, in the generated tenant and RBAC matrix):
`POST /v1/messages/threads` (start), `POST /v1/messages/threads/:id/messages` (send, idempotent on `clientId`), `GET /v1/messages/threads` and `.../:id` (with `updatedSince` and `next`), `POST .../:id/read`, `POST .../:id/report`; `POST /v1/broadcasts` (resolves the recipients on the server from the class's current students and their guardians, never from the request body), `GET /v1/broadcasts` (sender's list with counts; parent's list), `POST /v1/broadcasts/:id/read`; the announcements routes gain `audience`; `GET/PUT /v1/settings/office-hours`; `GET /v1/audit/messages` for the System Admin (reading it is itself audited).

RBAC (`packages/rbac`): `messages` for the staff roles that may converse (Teacher own, Principal, Academic admin, Bursar, Accountant, HR as the school allows) and Parent linked; a new `broadcasts` resource (create: Teacher own class, Principal and Academic admin school-wide); `announcements` create stays Principal and Academic admin, `read` becomes audience-filtered for parents. A role is added in `ROLES`, the `SchoolRole` enum and the matrix together (an eval enforces it); this plan adds **no** role.

Phones (offline-first, rule 4): a message or broadcast is saved in the outbox with its id as the `clientId` (kind `message.send`, `broadcast.send`), shown at once as "saved, not sent", sent when possible, read receipts sent as `message.read`; threads and the board are pulled with `updatedSince` and kept for reading offline; the six sync states apply. **Teacher app:** a Messages tab (my classes' broadcasts, my threads) and a "Message parents" action on a class and on a student. **Parent app (P5-6):** Messages and Notice board tabs. **Staff app:** Messages for the office roles. **Web admin:** the notice board page, office hours settings, and the audit view for the System Admin.

## 5. Tasks (these are also in the Hub's plan, Phase 5)

| ID | Task | Gate |
|---|---|---|
| P5-3a | **ADR: messaging backend and rules** (confirms gateway-mediated over Firestore, fixes D1 to D8 below) | the ADR is accepted before any code |
| P5-3b | Schema and gateway: threads, messages, receipts, office hours, the audit read; RBAC and the generated matrix | E-MSG-1 to E-MSG-4 on the real emulators |
| P5-3c | Class broadcast: recipient resolution from guardians of the class's current students, counts, read receipts, push | E-MSG-5 |
| P5-3d | Teacher app: Messages tab, "Message parents" on a class and a student, offline send | E-MSG-6 |
| P5-3e | Staff app Messages for office roles; web: office hours settings and the audit view | E-MSG-2 on the web |
| P5-8a | Announcements get an audience, category, pinned, publish and expiry; parents' read route | E-BOARD-1, E-BOARD-2 |
| P5-8b | Web admin Notice board page (post, pin, schedule, withdraw, preview who is reached) | web tests as for Announcements |
| P5-8c | Parent app Notice board and Messages (with P5-6 Parent app), push and offline reading | E-BOARD-3 |

Evals to write first (CLAUDE.md "definition of done"):
- **E-MSG-1** a message sent outside office hours is saved, audited and not notified until the hours begin, in the way the ADR fixes.
- **E-MSG-2** every message and every broadcast is in the audit trail, with sender, recipients and the server's time; the System Admin can read it and that read is audited; nobody can delete or edit one.
- **E-MSG-3** a parent can reach only staff who teach their own child, and can read only threads they are in (cross-tenant and cross-family route matrix, generated).
- **E-MSG-4** a thread is about one student and shows that student; a teacher cannot open a thread about a student they do not teach.
- **E-MSG-5** a broadcast reaches exactly the guardians linked to the students placed in that class at that moment (property test over random placements and withdrawals), and the counts add up.
- **E-MSG-6** sending offline then replaying the queue any number of times leaves one message.
- **E-BOARD-1** a parent sees only posts for their children's grade or class (or all parents), never staff-only ones; expired and withdrawn posts are gone from phones.
- **E-BOARD-2** only the roles with the grant post; the audience is resolved on the server.
- **E-BOARD-3** the board is readable with the network off after one sync.

## 6. Not in this plan
Parent-to-parent chat, community groups and PTA chat (SSOT section 6, a later, moderated item), attachments and voice notes, SMS and WhatsApp fallback for unreachable parents (the teacher is only **told** who was not reached), automatic translation, and staff-to-staff messaging.

## 7. Dependencies
The Parent app (P5-6) and the guardian-to-account link (a guardian record becomes a parent account through the existing invitation flow; **the link between a parent account and a student already exists as `linked` scope for `PARENT`**, to be verified against the schema in P5-3b). Push registration and the inbox exist (P4-S2, P4-6) but the real FCM and APNs connection does not (ADR-0014 decision 12).

## 8. Decisions needed from the owner (for the ADR)
- **D1 Backend:** confirm gateway-mediated messages with Data Connect (recommended; the alternative breaks rule 3).
- **D2 Office hours:** a message outside hours is (a) saved and held, notified later (recommended), or (b) refused? Do quiet hours apply to parents too? What is the school default (for example 09:00 to 17:00, Monday to Saturday)?
- **D3 Who may broadcast:** class teacher only, or also subject teachers to their classes, and may the Principal and the Academic admin send to a whole grade?
- **D4 Guardians:** one thread per guardian (private) or one shared thread for both guardians of a child?
- **D5 Notice board posters:** Principal and Academic admin only, or also the Bursar (fees) and a transport role?
- **D6 Languages:** one text in the sender's language, or optional versions per language with the reader's chosen language shown?
- **D7 Hiding and reporting:** may a sender hide a message for a short time (kept in the audit), and who reviews reports (the Principal)?
- **D8 Naming:** parent screen called "Notice board", table `Announcement` extended (recommended), or a separate table?

## 9. Gap noticed while writing this (outside this plan)
A **teacher's own check-in and check-out** is not in any phone app: the Staff app has it but a Teacher account cannot sign in there, and the Teacher app has no such screen. HR enters teachers' times on the web (corrections). Tracked as P4-9 in `documentation/phase4_plan.md`.
